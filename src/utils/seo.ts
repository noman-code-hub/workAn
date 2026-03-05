const upsertMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
  let element = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

export const applySeoMeta = (title: string, description: string, canonicalPath: string) => {
  document.title = title;
  upsertMeta('description', description);
  upsertMeta('og:title', title, 'property');
  upsertMeta('og:description', description, 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertCanonical(`${window.location.origin}${canonicalPath}`);
};
