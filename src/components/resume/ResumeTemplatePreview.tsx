import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import type {
  ResumeTemplateDefinition,
  ResumeTemplateSection,
  ResumeTemplateBlock,
  ResumeTemplateListBlock,
  ResumeTemplateTableBlock,
  ResumeTemplateTextBlock,
  ResumeTemplateRichTextBlock,
  ResumeTemplateImageBlock,
  ResumeTemplateDividerBlock,
  ResumeTemplateGroupBlock,
  ResumeTemplateStyle,
} from '../../types/resumeTemplate';

type ResumeTemplatePreviewProps = {
  template: ResumeTemplateDefinition;
  data: Record<string, any>;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageCountChange?: (count: number) => void;
  sectionOrder?: string[];
  onSectionOrderChange?: (next: string[]) => void;
  inlineEditing?: boolean;
  onFieldChange?: (path: string, value: string) => void;
  showPageNumber?: boolean;
  className?: string;
};

const DEFAULT_VARIANT_STYLES: Record<string, CSSProperties> = {
  heading: { fontSize: 24, fontWeight: 700 },
  subheading: { fontSize: 16, fontWeight: 600 },
  body: { fontSize: 12 },
  label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase' },
  caption: { fontSize: 10, fontWeight: 500 },
};

const resolveValueByKey = (data: Record<string, any>, key: string | undefined) => {
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  const path = key.split('.');
  let current: any = data;
  for (const segment of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
};

const coerceListValue = (value: any) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value == null) return [];
  return [value];
};

const resolveStyle = (
  style: ResumeTemplateStyle | undefined,
  theme: ResumeTemplateDefinition['theme'],
  variant?: string
): CSSProperties => {
  const base: CSSProperties = {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    lineHeight: theme.spacing.lineHeight,
  };

  if (variant && DEFAULT_VARIANT_STYLES[variant]) {
    Object.assign(base, DEFAULT_VARIANT_STYLES[variant]);
    if (variant === 'heading' || variant === 'subheading') {
      base.fontFamily = theme.fonts.heading;
    }
    if (variant === 'caption') {
      base.color = theme.colors.muted;
    }
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
  if (style.letterSpacingPx !== undefined) base.letterSpacing = style.letterSpacingPx;
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

const InlineTipTap = ({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  style: CSSProperties;
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'inline-tiptap-content',
        'data-placeholder': placeholder || '',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText().trimEnd();
      onChange(text);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const text = editor.getText().trimEnd();
    if (text !== (value || '').trimEnd()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div style={style} className="inline-tiptap-shell">
      <EditorContent editor={editor} />
    </div>
  );
};

const renderText = (
  block: ResumeTemplateTextBlock,
  value: any,
  theme: ResumeTemplateDefinition['theme'],
  options?: { inlineEditing?: boolean; path?: string; onFieldChange?: (path: string, value: string) => void }
) => {
  const text = (value ?? '').toString();
  const style = resolveStyle(block.style, theme, block.variant || 'body');
  if (options?.inlineEditing && options?.path && options?.onFieldChange) {
    return (
      <InlineTipTap
        value={text}
        onChange={(next) => options.onFieldChange?.(options.path || block.key, next)}
        style={style}
        placeholder={block.variant === 'heading' ? 'Name' : undefined}
      />
    );
  }
  if (!text.trim()) return null;
  return <div style={style}>{text}</div>;
};

const renderRichText = (
  block: ResumeTemplateRichTextBlock,
  value: any,
  theme: ResumeTemplateDefinition['theme'],
  options?: { inlineEditing?: boolean; path?: string; onFieldChange?: (path: string, value: string) => void }
) => {
  const html = value?.toString() || '';
  const style = resolveStyle(block.style, theme, 'body');
  if (options?.inlineEditing && options?.path && options?.onFieldChange) {
    return (
      <InlineTipTap
        value={html}
        onChange={(next) => options.onFieldChange?.(options.path || block.key, next)}
        style={style}
      />
    );
  }
  if (!html) return null;
  if (/[<][a-z][\s\S]*>/i.test(html)) {
    return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div style={{ ...style, whiteSpace: 'pre-line' }}>{html}</div>;
};

const renderImage = (block: ResumeTemplateImageBlock, value: any, theme: ResumeTemplateDefinition['theme']) => {
  if (!value) return null;
  const style = resolveStyle(block.style, theme);
  const sizeStyle: CSSProperties = {
    width: block.width ?? 80,
    height: block.height ?? block.width ?? 80,
    objectFit: 'cover',
  };
  if (block.shape === 'circle') sizeStyle.borderRadius = '999px';
  if (block.shape === 'rounded') sizeStyle.borderRadius = '12px';
  return <img src={value.toString()} alt="" style={{ ...style, ...sizeStyle }} />;
};

const renderDivider = (block: ResumeTemplateDividerBlock, theme: ResumeTemplateDefinition['theme']) => {
  const style: CSSProperties = {
    border: 'none',
    borderTop: `${block.thicknessPx ?? 1}px solid ${block.color ?? theme.colors.accent ?? '#e5e7eb'}`,
    marginTop: block.marginTopPx ?? theme.spacing.itemGapPx,
    marginBottom: block.marginBottomPx ?? theme.spacing.itemGapPx,
  };
  return <hr style={style} />;
};

const renderGroup = (
  block: ResumeTemplateGroupBlock,
  data: Record<string, any>,
  theme: ResumeTemplateDefinition['theme'],
  options?: RenderBlockOptions
) => {
  if (!block.items || block.items.length === 0) return null;

  const style = resolveStyle(block.style, theme);
  const isRow = block.direction === 'row';
  const templateColumns = isRow
    ? block.items.map((item) => item.width || 'minmax(0, 1fr)').join(' ')
    : undefined;

  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gap: block.gapPx ?? theme.spacing.itemGapPx,
        gridTemplateColumns: templateColumns,
      }}
    >
      {block.items.map((item, index) => (
        <div
          key={`${block.kind}-${index}`}
          style={{
            display: 'grid',
            gap: theme.spacing.itemGapPx,
            ...resolveStyle(item.style, theme),
          }}
        >
          {item.blocks.map((child, childIndex) => (
            <div key={`${child.kind}-${('key' in child ? child.key : childIndex) ?? childIndex}-${index}`}>
              {renderBlock(child, data, theme, options)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const renderTable = (
  block: ResumeTemplateTableBlock,
  rowsValue: any,
  theme: ResumeTemplateDefinition['theme']
) => {
  const rows = Array.isArray(rowsValue) ? rowsValue : [];
  if (rows.length === 0) return null;
  const style = resolveStyle(block.style, theme);
  return (
    <table style={{ ...style, width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={row.id ?? rowIndex}>
            {block.columns.map((column) => (
              <td
                key={column.key}
                style={{
                  paddingBottom: theme.spacing.itemGapPx,
                  verticalAlign: 'top',
                  textAlign: column.align ?? 'left',
                  width: column.widthPx,
                  ...resolveStyle(column.style, theme),
                }}
              >
                {(row?.[column.key] ?? '').toString()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const renderList = (
  block: ResumeTemplateListBlock,
  listValue: any,
  theme: ResumeTemplateDefinition['theme'],
  options?: { inlineEditing?: boolean; onFieldChange?: (path: string, value: string) => void }
) => {
  const list = coerceListValue(listValue);
  if (list.length === 0) return null;
  const style = resolveStyle(block.style, theme);
  return (
    <div style={{ ...style, display: 'grid', gap: block.itemGapPx ?? theme.spacing.itemGapPx }}>
      {list.map((item, index) => {
        const itemData = typeof item === 'object' && item !== null ? item : { value: item };
        const itemIndex = typeof (itemData as any).__resumeIndex === 'number'
          ? (itemData as any).__resumeIndex
          : index;
        return (
          <div key={(itemData as any).id ?? itemIndex} style={{ display: 'grid', gap: 4 }}>
            {block.itemBlocks.map((child) =>
              renderBlock(child, itemData, theme, {
                inlineEditing: options?.inlineEditing,
                onFieldChange: options?.onFieldChange,
                pathPrefix: `${block.key}[${itemIndex}]`,
              })
            )}
          </div>
        );
      })}
    </div>
  );
};

type RenderBlockOptions = {
  inlineEditing?: boolean;
  pathPrefix?: string;
  onFieldChange?: (path: string, value: string) => void;
  blockOverrides?: Record<string, any>;
};

const renderBlock = (
  block: ResumeTemplateBlock,
  data: Record<string, any>,
  theme: ResumeTemplateDefinition['theme'],
  options?: RenderBlockOptions
) => {
  if (block.kind === 'divider') {
    return <div key={`divider-${block.thicknessPx ?? 1}-${block.color ?? 'default'}`}>{renderDivider(block, theme)}</div>;
  }

  const blockKey = 'key' in block ? block.key : undefined;
  const path = blockKey
    ? (options?.pathPrefix ? `${options.pathPrefix}.${blockKey}` : blockKey)
    : options?.pathPrefix;
  const hasOverride =
    blockKey
    && options?.blockOverrides
    && Object.prototype.hasOwnProperty.call(options.blockOverrides, blockKey);
  const value = hasOverride
    ? options?.blockOverrides?.[blockKey]
    : blockKey
      ? resolveValueByKey(data, blockKey)
      : undefined;
  switch (block.kind) {
    case 'text':
      {
        const content = renderText(block, value, theme, {
          inlineEditing: options?.inlineEditing,
          path,
          onFieldChange: options?.onFieldChange,
        });
        return content ? <div key={block.key}>{content}</div> : null;
      }
    case 'richText':
      {
        const content = renderRichText(block, value, theme, {
          inlineEditing: options?.inlineEditing,
          path,
          onFieldChange: options?.onFieldChange,
        });
        return content ? <div key={block.key}>{content}</div> : null;
      }
    case 'image':
      {
        const content = renderImage(block, value, theme);
        return content ? <div key={block.key}>{content}</div> : null;
      }
    case 'list':
      {
        const content = renderList(block, value, theme, {
          inlineEditing: options?.inlineEditing,
          onFieldChange: options?.onFieldChange,
        });
        return content ? <div key={block.key}>{content}</div> : null;
      }
    case 'table':
      {
        const content = renderTable(block, value, theme);
        return content ? <div key={block.key}>{content}</div> : null;
      }
    case 'group':
      {
        const content = renderGroup(block, data, theme, options);
        return content ? <div key={`${block.kind}-${path ?? 'group'}`}>{content}</div> : null;
      }
    default:
      return null;
  }
};

const SectionRenderer = ({
  section,
  data,
  theme,
  sectionStyle,
  inlineEditing,
  onFieldChange,
  blocksOverride,
  blockOverrides,
  showTitleOverride,
}: {
  section: ResumeTemplateSection;
  data: Record<string, any>;
  theme: ResumeTemplateDefinition['theme'];
  sectionStyle: CSSProperties;
  inlineEditing?: boolean;
  onFieldChange?: (path: string, value: string) => void;
  blocksOverride?: ResumeTemplateBlock[];
  blockOverrides?: Record<string, any>;
  showTitleOverride?: boolean;
}) => {
  const sectionData =
    typeof section.dataKey === 'string' && section.dataKey.length > 0
      ? resolveValueByKey(data, section.dataKey) || data
      : data;
  const blocks = blocksOverride ?? section.blocks;
  const showTitle = (showTitleOverride ?? section.showTitle) && section.label;
  return (
    <section style={sectionStyle} data-resume-section={section.id}>
      {showTitle ? (
        <div style={resolveStyle(section.style, theme, 'label')}>{section.label}</div>
      ) : null}
      <div style={{ display: 'grid', gap: theme.spacing.itemGapPx }}>
        {blocks.map((block) =>
          renderBlock(block, sectionData, theme, {
            inlineEditing,
            onFieldChange,
            blockOverrides,
          })
        )}
      </div>
    </section>
  );
};

type SectionSlice = {
  id: string;
  section: ResumeTemplateSection;
  blocks: ResumeTemplateBlock[];
  blockOverrides?: Record<string, any>;
  showTitleOverride?: boolean;
  isFirstSlice?: boolean;
};

export const ResumeTemplatePreview = ({
  template,
  data,
  currentPage,
  onPageChange,
  onPageCountChange,
  sectionOrder,
  onSectionOrderChange,
  inlineEditing = false,
  onFieldChange,
  showPageNumber = true,
  className,
}: ResumeTemplatePreviewProps) => {
  const sliceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<SectionSlice[][]>([[]]);
  const [internalPage, setInternalPage] = useState(1);
  const [draggingSection, setDraggingSection] = useState<string | null>(null);
  const dataSignature = useMemo(() => JSON.stringify(data ?? {}), [data]);
  const pageSectionGap = template.theme.spacing.sectionGapPx;
  const pageBottomSafetyMargin = 10;
  const pageFooterReserve = showPageNumber ? 28 : 0;
  const pageContentHeight =
    template.page.heightPx
    - template.page.margin.top
    - template.page.margin.bottom
    - pageFooterReserve
    - pageBottomSafetyMargin;
  const pageContentWidth =
    template.page.widthPx - template.page.margin.left - template.page.margin.right;

  const activePage = currentPage ?? internalPage;

  const updatePage = useCallback(
    (next: number) => {
      const total = pages.length || 1;
      const clamped = Math.min(Math.max(next, 1), total);
      if (onPageChange) {
        onPageChange(clamped);
      } else {
        setInternalPage(clamped);
      }
    },
    [onPageChange, pages.length]
  );

  const orderedSections = useMemo(() => {
    if (!sectionOrder || sectionOrder.length === 0) return template.sections;
    const lookup = new Map(template.sections.map((section) => [section.id, section]));
    const ordered: ResumeTemplateSection[] = [];
    sectionOrder.forEach((id) => {
      const match = lookup.get(id);
      if (match) ordered.push(match);
    });
    template.sections.forEach((section) => {
      if (!ordered.includes(section)) ordered.push(section);
    });
    return ordered;
  }, [sectionOrder, template.sections]);

  const handleDragStart = useCallback((sectionId: string) => {
    if (!onSectionOrderChange) return;
    setDraggingSection(sectionId);
  }, [onSectionOrderChange]);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggingSection || draggingSection === targetId) return;
    if (!sectionOrder || !onSectionOrderChange) return;
    const next = [...sectionOrder];
    const fromIndex = next.indexOf(draggingSection);
    const toIndex = next.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggingSection);
    onSectionOrderChange(next);
    setDraggingSection(null);
  }, [draggingSection, onSectionOrderChange, sectionOrder]);

  const sectionSlices = useMemo(() => {
    const slices: SectionSlice[] = [];

    const buildBlockSlices = (blocks: ResumeTemplateBlock[]) => {
      const nextSlices: Array<{ blocks: ResumeTemplateBlock[]; blockOverrides?: Record<string, any> }> = [];
      let buffer: ResumeTemplateBlock[] = [];

      const pushBlocks = (sliceBlocks: ResumeTemplateBlock[], overrides?: Record<string, any>) => {
        nextSlices.push({
          blocks: sliceBlocks,
          blockOverrides: overrides,
        });
      };

      const flushBuffer = () => {
        if (buffer.length === 0) return;
        pushBlocks([...buffer]);
        buffer = [];
      };

      const withListIndex = (item: any, index: number) => {
        if (typeof item === 'object' && item !== null) {
          return { ...item, __resumeIndex: index };
        }
        return { value: item, __resumeIndex: index };
      };

      blocks.forEach((block) => {
        if (block.kind === 'list') {
          const list = coerceListValue(resolveValueByKey(data, block.key))
            .map((item, index) => withListIndex(item, index));
          if (list.length === 0) {
            buffer.push(block);
            return;
          }
          const [first, ...rest] = list;
          const firstBlocks = buffer.length > 0 ? [...buffer, block] : [block];
          pushBlocks(firstBlocks, { [block.key]: [first] });
          buffer = [];
          rest.forEach((item) => {
            pushBlocks([block], { [block.key]: [item] });
          });
          return;
        }

        if (block.kind === 'table') {
          const rowsValue = resolveValueByKey(data, block.key);
          const rows = Array.isArray(rowsValue) ? rowsValue : [];
          if (rows.length === 0) {
            buffer.push(block);
            return;
          }
          const [first, ...rest] = rows;
          const firstBlocks = buffer.length > 0 ? [...buffer, block] : [block];
          pushBlocks(firstBlocks, { [block.key]: [first] });
          buffer = [];
          rest.forEach((row) => {
            pushBlocks([block], { [block.key]: [row] });
          });
          return;
        }

        buffer.push(block);
      });

      if (buffer.length > 0) {
        flushBuffer();
      }

      return nextSlices;
    };

    orderedSections.forEach((section) => {
      let sliceIndex = 0;
      let isFirstSlice = true;

      const pushSlice = (blocks: ResumeTemplateBlock[], overrides?: Record<string, any>) => {
        slices.push({
          id: `${section.id}-${sliceIndex++}`,
          section,
          blocks,
          blockOverrides: overrides,
          showTitleOverride: isFirstSlice ? undefined : false,
          isFirstSlice,
        });
        isFirstSlice = false;
      };

      if (
        section.type === 'custom'
        && section.blocks.length === 1
        && section.blocks[0].kind === 'group'
        && section.blocks[0].direction === 'row'
      ) {
        const topLevelGroup = section.blocks[0];
        const itemSlices = topLevelGroup.items.map((item) => buildBlockSlices(item.blocks));
        const bandCount = Math.max(0, ...itemSlices.map((groupSlices) => groupSlices.length));

        for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
          const bandItems = topLevelGroup.items.map((item, itemIndex) => ({
            ...item,
            blocks: itemSlices[itemIndex][bandIndex]?.blocks ?? [],
          }));

          const bandOverrides = itemSlices.reduce<Record<string, any>>((acc, groupSlices, itemIndex) => {
            const overrides = groupSlices[bandIndex]?.blockOverrides;
            if (!overrides) return acc;
            Object.entries(overrides).forEach(([key, value]) => {
              acc[`${itemIndex}:${key}`] = value;
              acc[key] = value;
            });
            return acc;
          }, {});

          const hasBandContent = bandItems.some((item) => item.blocks.length > 0);
          if (!hasBandContent) continue;

          pushSlice([{
            ...topLevelGroup,
            items: bandItems,
          }], Object.keys(bandOverrides).length > 0 ? bandOverrides : undefined);
        }
      } else {
        const blockSlices = buildBlockSlices(section.blocks);
        blockSlices.forEach((slice) => {
          pushSlice(slice.blocks, slice.blockOverrides);
        });
      }

      if (sliceIndex === 0) {
        pushSlice([]);
      }
    });

    return slices;
  }, [dataSignature, orderedSections]);

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const nextPages: SectionSlice[][] = [];
    let current: SectionSlice[] = [];
    let currentHeight = 0;

    sectionSlices.forEach((slice) => {
      const node = sliceRefs.current[slice.id];
      const height = node?.getBoundingClientRect().height ?? 0;
      const nextHeight = current.length === 0 ? height : currentHeight + pageSectionGap + height;

      if (current.length === 0 || nextHeight <= pageContentHeight) {
        current.push(slice);
        currentHeight = nextHeight;
        return;
      }

      nextPages.push(current);
      current = [slice];
      currentHeight = height;
    });

    if (current.length > 0) nextPages.push(current);
    if (nextPages.length === 0) nextPages.push([]);
    setPages(nextPages);
    onPageCountChange?.(nextPages.length);

    if (activePage > nextPages.length) {
      updatePage(nextPages.length);
    }
  }, [
    pageContentHeight,
    pageSectionGap,
    onPageCountChange,
    activePage,
    updatePage,
    sectionSlices,
  ]);

  const pageViewportStyle: CSSProperties = {
    width: template.page.widthPx,
    height: template.page.heightPx,
    overflow: 'hidden',
    background: template.theme.colors.background,
    borderRadius: 12,
    boxShadow: '0 18px 28px rgba(15, 23, 42, 0.12)',
  };

  const pageInnerStyle: CSSProperties = {
    padding: `${template.page.margin.top}px ${template.page.margin.right}px ${template.page.margin.bottom}px ${template.page.margin.left}px`,
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: pageSectionGap,
    fontFamily: template.theme.fonts.body,
    color: template.theme.colors.text,
  };

  return (
    <div className={className} style={{ display: 'grid', gap: 12 }} data-resume-template-preview>
      <div
        style={{
          ...pageViewportStyle,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div
          data-resume-template-pages
          style={{
            display: 'flex',
            width: 'max-content',
            height: '100%',
            transform: `translateX(-${(activePage - 1) * (template.page.widthPx + 24)}px)`,
            transition: 'transform 220ms ease',
            gap: 24,
          }}
        >
          {pages.map((pageSections, index) => (
            <div
              key={`page-${index}`}
              data-resume-template-page={index + 1}
              style={{ ...pageViewportStyle, position: 'relative' }}
            >
              <div data-resume-template-page-content style={pageInnerStyle}>
                {pageSections.map((slice) => (
                  <div
                    key={slice.id}
                    onDragOver={(event) => {
                      if (onSectionOrderChange) event.preventDefault();
                    }}
                    onDrop={() => handleDrop(slice.section.id)}
                    style={{ position: 'relative' }}
                  >
                    {onSectionOrderChange && slice.isFirstSlice ? (
                      <div
                        className="section-drag-handle"
                        draggable
                        onDragStart={() => handleDragStart(slice.section.id)}
                        title="Drag to reorder"
                      >
                        ::
                      </div>
                    ) : null}
                    <SectionRenderer
                      section={slice.section}
                      data={data}
                      theme={template.theme}
                      inlineEditing={inlineEditing}
                      onFieldChange={onFieldChange}
                      blocksOverride={slice.blocks}
                      blockOverrides={slice.blockOverrides}
                      showTitleOverride={slice.showTitleOverride}
                      sectionStyle={{
                        display: 'grid',
                        gap: template.theme.spacing.itemGapPx,
                      }}
                    />
                  </div>
                ))}
                {showPageNumber ? (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      right: 20,
                      fontSize: 10,
                      color: template.theme.colors.muted,
                    }}
                  >
                    Page {index + 1}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          width: pageContentWidth,
          padding: 0,
          height: 'auto',
          left: -9999,
          top: -9999,
        }}
      >
        <div style={{ display: 'grid', gap: pageSectionGap }}>
          {sectionSlices.map((slice) => (
            <div
              key={`measure-${slice.id}`}
              data-slice-key={slice.id}
              ref={(el) => {
                if (el) {
                  const key = el.dataset.sliceKey;
                  if (key) sliceRefs.current[key] = el;
                }
              }}
            >
              <SectionRenderer
                section={slice.section}
                data={data}
                theme={template.theme}
                inlineEditing={false}
                blocksOverride={slice.blocks}
                blockOverrides={slice.blockOverrides}
                showTitleOverride={slice.showTitleOverride}
                sectionStyle={{
                  display: 'grid',
                  gap: template.theme.spacing.itemGapPx,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .inline-tiptap-shell {
          border: 1px dashed transparent;
          border-radius: 6px;
          cursor: text;
          transition: border-color 120ms ease, background 120ms ease;
        }
        .inline-tiptap-shell:hover {
          border-color: rgba(148, 163, 184, 0.6);
          background: rgba(248, 250, 252, 0.6);
        }
        .inline-tiptap-content {
          outline: none;
          min-height: 16px;
          cursor: text;
          caret-color: currentColor;
          -webkit-text-fill-color: currentColor;
        }
        .inline-tiptap-content p {
          margin: 0 0 6px;
        }
        .inline-tiptap-content:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
        .section-drag-handle {
          position: absolute;
          right: -6px;
          top: -4px;
          font-size: 12px;
          letter-spacing: 2px;
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          color: #0f172a;
          cursor: grab;
          user-select: none;
        }
        .section-drag-handle:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
};
