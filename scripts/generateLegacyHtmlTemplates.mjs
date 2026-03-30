import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'src', 'data', 'templates', 'builtInResumeTemplates.ts');
const OUTPUT_DIR = path.join(ROOT, 'generated_resume_templates_html');
const EXCLUDED_TEMPLATE_SLUGS = new Set(['accounting-executive']);

const DEFAULT_VARIANT_STYLES = {
  heading: { fontSize: '24px', fontWeight: 700 },
  subheading: { fontSize: '16px', fontWeight: 600 },
  body: { fontSize: '12px' },
  label: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' },
  caption: { fontSize: '10px', fontWeight: 500 },
};

const COLLECTION_ALIAS_MAP = {
  experience: 'experience_items',
  education: 'education_items',
  skills: 'skills_items',
  languages: 'languages_items',
  projects: 'project_items',
  additional: 'additional_items',
  custom_details: 'custom_detail_items',
  customdetails: 'custom_detail_items',
  contact: 'contact_items',
  links: 'link_items',
  header_contact: 'header_contact_rows',
  sidebar_contacts: 'sidebar_contact_items',
};

const SECTION_CONDITION_MAP = {
  summary: 'hasSummary',
  experience: 'hasExperience',
  education: 'hasEducation',
  skills: 'hasSkills',
};

const IMAGE_IMPORT_PATTERN = /\.(png|jpe?g|webp|svg)$/i;
const UNIT_LESS_PROPS = new Set(['fontWeight', 'lineHeight', 'columnCount', 'opacity', 'zIndex']);

const toKebabCase = (value) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const escapeAttribute = (value) => escapeHtml(String(value));

const styleEntriesToCss = (styleObject) => Object.entries(styleObject)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => {
    const cssKey = toKebabCase(key);
    const cssValue =
      typeof value === 'number' && !UNIT_LESS_PROPS.has(key)
        ? `${value}px`
        : String(value);
    return `${cssKey}:${cssValue}`;
  })
  .join(';');

const resolveStyle = (style, theme, variant) => {
  const base = {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    lineHeight: theme.spacing.lineHeight,
    ...(variant ? DEFAULT_VARIANT_STYLES[variant] || {} : {}),
  };

  if (variant === 'heading' || variant === 'subheading') {
    base.fontFamily = theme.fonts.heading;
  }

  if (variant === 'caption') {
    base.color = theme.colors.muted;
  }

  if (!style) return base;

  if (style.align) base.textAlign = style.align;
  if (style.background) base.background = style.background;
  if (style.color) base.color = style.color;
  if (style.font) base.fontFamily = style.font;
  if (style.paddingPx !== undefined) base.padding = style.paddingPx;
  if (style.paddingXpx !== undefined) {
    base.paddingLeft = style.paddingXpx;
    base.paddingRight = style.paddingXpx;
  }
  if (style.paddingYpx !== undefined) {
    base.paddingTop = style.paddingYpx;
    base.paddingBottom = style.paddingYpx;
  }
  if (style.paddingTopPx !== undefined) base.paddingTop = style.paddingTopPx;
  if (style.paddingRightPx !== undefined) base.paddingRight = style.paddingRightPx;
  if (style.paddingBottomPx !== undefined) base.paddingBottom = style.paddingBottomPx;
  if (style.paddingLeftPx !== undefined) base.paddingLeft = style.paddingLeftPx;
  if (style.fontSizePx !== undefined) base.fontSize = style.fontSizePx;
  if (style.fontWeight !== undefined) base.fontWeight = style.fontWeight;
  if (style.lineHeight !== undefined) base.lineHeight = style.lineHeight;
  if (style.letterSpacingPx !== undefined) base.letterSpacing = `${style.letterSpacingPx}px`;
  if (style.textTransform) base.textTransform = style.textTransform;
  if (style.borderWidthPx || style.borderColor) {
    base.borderStyle = 'solid';
    base.borderWidth = style.borderWidthPx ?? 1;
    base.borderColor = style.borderColor ?? 'transparent';
  }
  if (style.borderLeftWidthPx || style.borderLeftColor) {
    base.borderLeftStyle = 'solid';
    base.borderLeftWidth = style.borderLeftWidthPx ?? 1;
    base.borderLeftColor = style.borderLeftColor ?? style.borderColor ?? 'transparent';
  }
  if (style.borderRadiusPx !== undefined) base.borderRadius = style.borderRadiusPx;
  if (style.columns) base.columnCount = style.columns;
  if (style.columnGapPx !== undefined) base.columnGap = style.columnGapPx;
  if (style.width) base.width = style.width;
  if (style.minWidthPx !== undefined) base.minWidth = style.minWidthPx;
  if (style.maxWidthPx !== undefined) base.maxWidth = style.maxWidthPx;
  if (style.display) base.display = style.display;
  if (style.gapPx !== undefined) base.gap = style.gapPx;
  if (style.justifyContent) base.justifyContent = style.justifyContent;
  if (style.alignItems) base.alignItems = style.alignItems;
  if (style.marginTopPx !== undefined) base.marginTop = style.marginTopPx;
  if (style.marginBottomPx !== undefined) base.marginBottom = style.marginBottomPx;
  if (style.marginLeft) base.marginLeft = style.marginLeft;
  if (style.marginRight) base.marginRight = style.marginRight;

  return base;
};

const mustache = (key, triple = false) => (triple ? `{{{${key}}}}` : `{{${key}}}`);

const collectionAlias = (key) => COLLECTION_ALIAS_MAP[key] || key;
const collectionCondition = (key) => `has_${collectionAlias(key)}`;
const isNestedCollectionKey = (key) => key === 'bullets' || key === 'bullet_lines';

const blockWrapper = (content) => `<div class="legacy-block">${content}</div>`;

const renderTextBlock = (block, theme) => {
  const style = styleEntriesToCss(resolveStyle(block.style, theme, block.variant || 'body'));
  return blockWrapper(`<div style="${escapeAttribute(style)}">${mustache(block.key)}</div>`);
};

const renderRichTextBlock = (block, theme) => {
  const style = styleEntriesToCss({
    ...resolveStyle(block.style, theme, 'body'),
    whiteSpace: 'pre-line',
  });
  return blockWrapper(`<div class="legacy-richtext" style="${escapeAttribute(style)}">${mustache(block.key, true)}</div>`);
};

const renderImageBlock = (block, theme) => {
  const imageStyle = resolveStyle(block.style, theme);
  imageStyle.width = block.width ?? 80;
  imageStyle.height = block.height ?? block.width ?? 80;
  imageStyle.objectFit = 'cover';
  if (block.shape === 'circle') imageStyle.borderRadius = '999px';
  if (block.shape === 'rounded') imageStyle.borderRadius = '12px';
  const style = styleEntriesToCss(imageStyle);
  return `{{#${block.key}}}${blockWrapper(`<img src="${mustache(block.key)}" alt="" style="${escapeAttribute(style)}" />`)}{{/${block.key}}}`;
};

const renderDividerBlock = (block, theme) => {
  const style = styleEntriesToCss({
    border: 'none',
    borderTop: `${block.thicknessPx ?? 1}px solid ${block.color ?? theme.colors.accent ?? '#e5e7eb'}`,
    marginTop: block.marginTopPx ?? theme.spacing.itemGapPx,
    marginBottom: block.marginBottomPx ?? theme.spacing.itemGapPx,
  });
  return blockWrapper(`<hr style="${escapeAttribute(style)}" />`);
};

const renderTableBlock = (block, theme) => {
  const alias = collectionAlias(block.key);
  const wrapperStyle = styleEntriesToCss({
    ...resolveStyle(block.style, theme),
    width: '100%',
  });

  const rowHtml = block.columns.map((column) => {
    const cellStyle = styleEntriesToCss({
      paddingBottom: theme.spacing.itemGapPx,
      verticalAlign: 'top',
      textAlign: column.align ?? 'left',
      width: column.widthPx,
      ...resolveStyle(column.style, theme),
    });
    return `<td style="${escapeAttribute(cellStyle)}">${mustache(column.key)}</td>`;
  }).join('');

  return `{{#${collectionCondition(block.key)}}}${blockWrapper(`
    <table style="${escapeAttribute(`${wrapperStyle};border-collapse:collapse`)}">
      <tbody>
        {{#${alias}}}
          <tr>${rowHtml}</tr>
        {{/${alias}}}
      </tbody>
    </table>
  `)}{{/${collectionCondition(block.key)}}}`;
};

const renderListBlock = (block, theme) => {
  const alias = isNestedCollectionKey(block.key) ? block.key : collectionAlias(block.key);
  const conditionKey = isNestedCollectionKey(block.key) ? `has_${block.key}` : collectionCondition(block.key);
  const wrapperStyle = styleEntriesToCss({
    ...resolveStyle(block.style, theme),
    display: 'grid',
    gap: block.itemGapPx ?? theme.spacing.itemGapPx,
  });

  const itemHtml = block.itemBlocks.map((child) => renderBlock(child, theme)).join('');

  return `{{#${conditionKey}}}${blockWrapper(`
    <div style="${escapeAttribute(wrapperStyle)}">
      {{#${alias}}}
        <div style="${escapeAttribute('display:grid;gap:4px')}">${itemHtml}</div>
      {{/${alias}}}
    </div>
  `)}{{/${conditionKey}}}`;
};

const renderGroupBlock = (block, theme) => {
  const style = resolveStyle(block.style, theme);
  style.display = 'grid';
  style.gap = block.gapPx ?? theme.spacing.itemGapPx;
  if (block.direction === 'row') {
    style.gridTemplateColumns = block.items.map((item) => item.width || 'minmax(0, 1fr)').join(' ');
  }

  const groupHtml = block.items.map((item) => {
    const itemStyle = styleEntriesToCss({
      display: 'grid',
      gap: theme.spacing.itemGapPx,
      ...resolveStyle(item.style, theme),
    });
    const childHtml = item.blocks.map((child) => renderBlock(child, theme)).join('');
    return `<div style="${escapeAttribute(itemStyle)}">${childHtml}</div>`;
  }).join('');

  return blockWrapper(`<div style="${escapeAttribute(styleEntriesToCss(style))}">${groupHtml}</div>`);
};

const renderBlock = (block, theme) => {
  switch (block.kind) {
    case 'text':
      return renderTextBlock(block, theme);
    case 'richText':
      return renderRichTextBlock(block, theme);
    case 'image':
      return renderImageBlock(block, theme);
    case 'divider':
      return renderDividerBlock(block, theme);
    case 'table':
      return renderTableBlock(block, theme);
    case 'list':
      return renderListBlock(block, theme);
    case 'group':
      return renderGroupBlock(block, theme);
    default:
      return '';
  }
};

const sectionConditionKey = (section) => {
  if (!section.dataKey) return null;
  return SECTION_CONDITION_MAP[section.dataKey] || null;
};

const renderSection = (section, template) => {
  const theme = template.theme;
  const sectionStyle = styleEntriesToCss({
    display: 'grid',
    gap: theme.spacing.itemGapPx,
  });
  const titleStyle = section.showTitle && section.label
    ? styleEntriesToCss(resolveStyle(section.style, theme, 'label'))
    : '';

  const titleHtml = section.showTitle && section.label
    ? `<div class="legacy-section-title" style="${escapeAttribute(titleStyle)}">${escapeHtml(section.label)}</div>`
    : '';

  const blocksHtml = section.blocks.map((block) => renderBlock(block, theme)).join('');
  const sectionHtml = `
    <section class="legacy-section legacy-section-${escapeAttribute(section.id)}" style="${escapeAttribute(sectionStyle)}">
      ${titleHtml}
      <div class="legacy-section-body" style="${escapeAttribute(`display:grid;gap:${theme.spacing.itemGapPx}px`)}">
        ${blocksHtml}
      </div>
    </section>
  `;

  const conditionKey = sectionConditionKey(section);
  return conditionKey ? `{{#${conditionKey}}}${sectionHtml}{{/${conditionKey}}}` : sectionHtml;
};

const buildHtmlDocument = (template) => {
  const { metadata, page, theme } = template;
  const sectionsHtml = template.sections.map((section) => renderSection(section, template)).join('\n');
  const pageStyle = styleEntriesToCss({
    width: page.widthPx,
    minHeight: page.heightPx,
    background: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    lineHeight: theme.spacing.lineHeight,
    paddingTop: page.margin.top,
    paddingRight: page.margin.right,
    paddingBottom: page.margin.bottom,
    paddingLeft: page.margin.left,
    display: 'grid',
    gap: theme.spacing.sectionGapPx,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.name)} - {{full_name}}</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #eef2f7;
      color: ${theme.colors.text};
    }

    body {
      padding: 24px;
      font-family: ${theme.fonts.body};
    }

    .legacy-template-page {
      margin: 0 auto;
      ${pageStyle};
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
    }

    .legacy-template-page img {
      display: block;
      max-width: 100%;
    }

    .legacy-template-page p {
      margin: 0 0 6px;
    }

    .legacy-template-page p:last-child {
      margin-bottom: 0;
    }

    .legacy-richtext ul,
    .legacy-richtext ol {
      margin: 0;
      padding-left: 18px;
    }

    .legacy-richtext li + li {
      margin-top: 4px;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }

      .legacy-template-page {
        box-shadow: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="legacy-template-page" data-template-slug="${escapeAttribute(metadata.slug)}">
    ${sectionsHtml}
  </div>
</body>
</html>
`;
};

const evaluateExpression = (node, env) => {
  if (!node) return undefined;

  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node)) {
    return evaluateExpression(node.expression, env);
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(node)) {
    const value = evaluateExpression(node.operand, env);
    if (node.operator === ts.SyntaxKind.MinusToken) return -Number(value);
    if (node.operator === ts.SyntaxKind.PlusToken) return Number(value);
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => evaluateExpression(element, env));
  }

  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        const name = ts.isIdentifier(property.name)
          ? property.name.text
          : ts.isStringLiteral(property.name)
            ? property.name.text
            : property.name.getText();
        value[name] = evaluateExpression(property.initializer, env);
        continue;
      }

      if (ts.isShorthandPropertyAssignment(property)) {
        value[property.name.text] = env[property.name.text];
        continue;
      }

      throw new Error(`Unsupported object property in template definition: ${property.getText()}`);
    }
    return value;
  }

  if (ts.isIdentifier(node)) {
    if (Object.prototype.hasOwnProperty.call(env, node.text)) {
      return env[node.text];
    }
    if (node.text === 'undefined') return undefined;
  }

  throw new Error(`Unsupported expression in template definition: ${node.getText()}`);
};

const loadLegacyDefinitions = () => {
  const sourceText = fs.readFileSync(SOURCE_PATH, 'utf8');
  const sourceFile = ts.createSourceFile(SOURCE_PATH, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const env = {};

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const modulePath = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
      if (!IMAGE_IMPORT_PATTERN.test(modulePath)) continue;
      const defaultImport = statement.importClause?.name;
      if (defaultImport) {
        env[defaultImport.text] = '';
      }
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      try {
        env[declaration.name.text] = evaluateExpression(declaration.initializer, env);
      } catch (error) {
        if (
          declaration.name.text.endsWith('Definition')
          || declaration.name.text === 'sectionPillStyle'
          || declaration.name.text === 'CREATED_AT'
        ) {
          throw error;
        }
      }
    }
  }

  return Object.values(env)
    .filter((value) => value && typeof value === 'object' && value.metadata?.slug && value.sections)
    .filter((value) => !EXCLUDED_TEMPLATE_SLUGS.has(value.metadata.slug))
    .sort((left, right) => left.metadata.name.localeCompare(right.metadata.name));
};

const definitions = loadLegacyDefinitions();

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const manifest = definitions.map((template) => {
  const fileName = `${template.metadata.slug}.html`;
  const html = buildHtmlDocument(template);
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), html, 'utf8');
  return {
    name: template.metadata.name,
    slug: template.metadata.slug,
    fileName,
  };
});

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(`Generated ${manifest.length} legacy HTML resume templates in ${OUTPUT_DIR}`);
for (const item of manifest) {
  console.log(`- ${item.fileName}`);
}
