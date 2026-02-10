import Mustache from 'mustache';

export const TEMPLATE_FIELD_REGEX = /{{\s*([^{}]+?)\s*}}/g;

export const normalizeFieldKey = (key: string) => key.toLowerCase().replace(/[\s_-]+/g, '');

export const extractTemplateFields = (html: string) => {
  const seen = new Set<string>();
  const fields: string[] = [];
  for (const match of html.matchAll(TEMPLATE_FIELD_REGEX)) {
    const rawKey = match[1].trim();
    if (!rawKey || rawKey === '.') continue;
    if (rawKey.startsWith('/')) continue;
    const key = rawKey.startsWith('#') || rawKey.startsWith('^')
      ? rawKey.slice(1).trim()
      : rawKey;
    if (!key) continue;
    const normalized = normalizeFieldKey(key);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      fields.push(key);
    }
  }
  return fields;
};

export function renderTemplateWithSchema(html: string, view: Record<string, any>) {
  return Mustache.render(html, view);
}

export function buildBaseHref(templateUrl: string) {
  if (!templateUrl) return '';
  try {
    const url = new URL(templateUrl);
    url.pathname = url.pathname.replace(/[^/]+$/, '');
    return url.toString();
  } catch {
    return templateUrl.replace(/[^/]+$/, '');
  }
}

export function ensureBaseTag(html: string, baseHref: string) {
  if (!baseHref) return html;
  if (/<base\s/i.test(html)) return html;
  const baseTag = `<base href="${baseHref}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n  ${baseTag}`);
  }
  return `${baseTag}\n${html}`;
}

type ApplyTemplateOptions = {
  removeEmpty?: boolean;
};

export function applyTemplateData(
  html: string,
  data: Record<string, string>,
  options: ApplyTemplateOptions = {}
) {
  const shouldRemoveEmpty = options.removeEmpty ?? true;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const getMatches = (value: string) => [...value.matchAll(TEMPLATE_FIELD_REGEX)];
  const lowerKeyMap = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key.toLowerCase(), value])
  );
  const normalizedKeyMap = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [normalizeFieldKey(key), value])
  );
  const valueForKey = (key: string) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
    const lower = key.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(lowerKeyMap, lower)) return lowerKeyMap[lower];
    const normalized = normalizeFieldKey(key);
    if (Object.prototype.hasOwnProperty.call(normalizedKeyMap, normalized)) return normalizedKeyMap[normalized];
    return undefined;
  };
  const hasNonEmptyValue = (key: string) => {
    const value = valueForKey(key);
    return value !== undefined && value.toString().trim().length > 0;
  };

  const elementsWithValue = new WeakSet<Element>();

  const markAncestors = (el: Element | null) => {
    let current: Element | null = el;
    while (current && !['body', 'html'].includes(current.tagName.toLowerCase())) {
      elementsWithValue.add(current);
      current = current.parentElement;
    }
  };

  const markIfHasValue = (value: string, el: Element | null) => {
    for (const match of getMatches(value)) {
      if (hasNonEmptyValue(match[1])) {
        markAncestors(el);
        return;
      }
    }
  };

  const preScanTreeWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  while (preScanTreeWalker.nextNode()) {
    const node = preScanTreeWalker.currentNode as Text;
    const text = node.nodeValue || '';
    if (!text.includes('{{')) continue;
    markIfHasValue(text, node.parentElement);
  }

  const preScanElements = Array.from(doc.querySelectorAll('*'));
  for (const el of preScanElements) {
    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.includes('{{')) continue;
      markIfHasValue(attr.value, el);
    }
  }

  const findRemovableAncestor = (node: Node): HTMLElement | null => {
    let el = node.parentElement;
    let fallback: HTMLElement | null = null;
    while (el && !['body', 'html'].includes(el.tagName.toLowerCase())) {
      const tag = el.tagName.toLowerCase();
      const className = (el.className || '').toString();
      if (el.hasAttribute('data-section') || el.hasAttribute('data-field') || el.hasAttribute('data-block')) {
        return el;
      }
      if (!fallback && (tag === 'p' || tag === 'li' || tag === 'span')) {
        fallback = el;
      }
      if (/section|block|group|card|item|row|column|content/i.test(className)) {
        return el;
      }
      if (tag === 'section' || tag === 'article') {
        return el;
      }
      if (!fallback && (tag === 'div' || tag === 'tr' || tag === 'td')) {
        fallback = el;
      }
      el = el.parentElement;
    }
    return fallback;
  };

  const replaceTextNode = (node: Text) => {
    const text = node.nodeValue || '';
    const matches = getMatches(text);
    if (matches.length === 0) return;

    let updated = text;
    let hasValue = false;
    let hasUnknown = false;
    matches.forEach((match) => {
      const key = match[1];
      const value = valueForKey(key);
      if (value === undefined) {
        hasUnknown = true;
        return;
      }
      const safeValue = value.toString();
      if (safeValue.trim()) hasValue = true;
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      updated = updated.replace(pattern, safeValue);
    });

    if (hasValue) {
      node.parentElement?.setAttribute('data-filled', 'true');
    }

    if (
      shouldRemoveEmpty
      && !hasValue
      && !hasUnknown
      && matches.every((m) => !((valueForKey(m[1]) ?? '').toString().trim()))
    ) {
      const removable = findRemovableAncestor(node);
      if (removable && !elementsWithValue.has(removable)) {
        removable.remove();
        return;
      }
    }

    node.nodeValue = updated;
  };

  const treeWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (treeWalker.nextNode()) {
    textNodes.push(treeWalker.currentNode as Text);
  }
  textNodes.forEach(replaceTextNode);

  const elements = Array.from(doc.querySelectorAll('*'));
  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      const matches = getMatches(attr.value);
      if (matches.length === 0) continue;

      let updated = attr.value;
      let hasValue = false;
      let hasUnknown = false;
      matches.forEach((match) => {
        const key = match[1];
        const value = valueForKey(key);
        if (value === undefined) {
          hasUnknown = true;
          return;
        }
        const safeValue = value.toString();
        if (safeValue.trim()) hasValue = true;
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        updated = updated.replace(pattern, safeValue);
      });

      if (hasValue) {
        el.setAttribute('data-filled', 'true');
      }

      if (
        shouldRemoveEmpty
        && !hasValue
        && !hasUnknown
        && matches.every((m) => !((valueForKey(m[1]) ?? '').toString().trim()))
      ) {
        if (['src', 'href'].includes(attr.name)) {
          el.remove();
          break;
        }
        el.removeAttribute(attr.name);
        continue;
      }

      el.setAttribute(attr.name, updated);
    }
  }

  if (shouldRemoveEmpty) {
    const cleanupElements = Array.from(doc.body.querySelectorAll('*')).reverse();
    cleanupElements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (['body', 'html'].includes(tag)) return;
      if (['img', 'svg', 'canvas', 'iframe', 'video'].includes(tag)) return;
      if (el.hasAttribute('data-filled')) return;
      if (el.querySelector('[data-filled="true"]')) return;
      if (el.children.length > 0) return;
      if ((el.textContent || '').trim()) return;
      el.remove();
    });
  }

  const optionalSectionKeywords = [
    'summary',
    'profile',
    'objective',
    'skills',
    'experience',
    'work experience',
    'employment',
    'education',
    'projects',
    'certifications',
    'awards',
    'languages',
    'interests',
    'activities',
    'volunteer',
    'publications',
    'references',
    'additional',
    'portfolio',
    'contact',
  ];

  if (shouldRemoveEmpty) {
    const sectionCandidates = Array.from(doc.body.querySelectorAll('section, article, div')).reverse();
    sectionCandidates.forEach((el) => {
      const headings = el.querySelectorAll('h2, h3, h4, h5, h6');
      if (headings.length !== 1) return;
      const heading = headings[0];
      const headingText = (heading.textContent || '').trim();
      if (!headingText) return;
      const headingLower = headingText.toLowerCase();
      if (!optionalSectionKeywords.some((keyword) => headingLower.includes(keyword))) return;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (el.innerHTML.includes('{{')) return;
      if (el.hasAttribute('data-filled') || el.querySelector('[data-filled="true"]')) return;
      if (text === headingText) {
        el.remove();
      }
    });
  }

  return doc.documentElement.outerHTML;
}
