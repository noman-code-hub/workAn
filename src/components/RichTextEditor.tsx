import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { AlignLeft, Highlighter, List, ListOrdered } from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number | string;
  toolbarHostId?: string;
  compact?: boolean;
  spellCheck?: boolean;
};

const FONT_OPTIONS = [
  { label: 'Poppins', value: '"Poppins", "Arial", sans-serif' },
  { label: 'Default Serif', value: '"Cormorant Garamond", Georgia, "Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Arial', value: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { label: 'Trebuchet', value: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
] as const;

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const DEFAULT_FONT_SIZE_PX = 14;
const MIN_FONT_SIZE_PX = 8;
const MAX_FONT_SIZE_PX = 72;
const RICH_TEXT_TOOLBAR_EVENT = 'hirevo-rich-text-toolbar-activate';
const activeDetachedToolbarByHost = new Map<string, string>();
const registeredDetachedToolbarsByHost = new Map<string, string[]>();

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});

const normalizeHtml = (html: string) => {
  const trimmed = html.trim();
  return trimmed === '<p></p>' ? '' : trimmed;
};

const toMinHeight = (value: number | string | undefined) => {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string' && value.trim()) return value;
  return '110px';
};

const preventToolbarMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

const getToolbarButtonClassName = (isActive: boolean, compact = false) =>
  ['rte-tool-button', compact ? 'is-compact' : '', isActive ? 'is-active' : '']
    .filter(Boolean)
    .join(' ');

const syncToolbarState = (
  editor: Editor | null,
  setTextColor: (value: string) => void,
  setHighlightColor: (value: string) => void,
  setFontFamily: (value: string) => void,
  setFontSize: (value: number) => void
) => {
  if (!editor) return;

  const textStyleAttributes = editor.getAttributes('textStyle') as {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
  };
  const highlightAttributes = editor.getAttributes('highlight') as { color?: string };

  if (typeof textStyleAttributes.color === 'string' && /^#[0-9a-f]{6}$/i.test(textStyleAttributes.color)) {
    setTextColor(textStyleAttributes.color);
  }
  if (
    typeof textStyleAttributes.fontFamily === 'string'
    && textStyleAttributes.fontFamily.trim()
  ) {
    setFontFamily(textStyleAttributes.fontFamily);
  }
  if (typeof textStyleAttributes.fontSize === 'string' && textStyleAttributes.fontSize.trim()) {
    const parsedSize = Number.parseInt(textStyleAttributes.fontSize, 10);
    if (Number.isFinite(parsedSize)) {
      setFontSize(parsedSize);
    }
  } else {
    setFontSize(DEFAULT_FONT_SIZE_PX);
  }
  if (typeof highlightAttributes.color === 'string' && /^#[0-9a-f]{6}$/i.test(highlightAttributes.color)) {
    setHighlightColor(highlightAttributes.color);
  }
};

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  className,
  minHeight = 110,
  toolbarHostId,
  compact = false,
  spellCheck = true,
}: RichTextEditorProps) => {
  const [textColor, setTextColor] = useState<string>('#111827');
  const [highlightColor, setHighlightColor] = useState<string>('#fef08a');
  const [fontFamily, setFontFamily] = useState<string>(FONT_OPTIONS[0].value);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE_PX);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
  const [showDetachedToolbar, setShowDetachedToolbar] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const instanceIdRef = useRef(`rte-${Math.random().toString(36).slice(2, 10)}`);

  const updateToolbarState = useCallback(
    (instance: Editor | null) => {
      syncToolbarState(instance, setTextColor, setHighlightColor, setFontFamily, setFontSize);
    },
    []
  );

  const resolveToolbarHost = useCallback(() => {
    if (!toolbarHostId) {
      setToolbarHost(null);
      return null;
    }

    const nextHost = document.getElementById(toolbarHostId);
    setToolbarHost((previousHost) => (previousHost === nextHost ? previousHost : nextHost));
    return nextHost;
  }, [toolbarHostId]);

  const activateDetachedToolbar = useCallback(() => {
    if (!toolbarHostId) return;
    resolveToolbarHost();
    activeDetachedToolbarByHost.set(toolbarHostId, instanceIdRef.current);
    setShowDetachedToolbar(true);
    window.dispatchEvent(new CustomEvent(RICH_TEXT_TOOLBAR_EVENT, {
      detail: {
        hostId: toolbarHostId,
        instanceId: instanceIdRef.current,
      },
    }));
  }, [resolveToolbarHost, toolbarHostId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily.configure({
        types: ['textStyle', 'heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    onCreate: ({ editor: instance }) => updateToolbarState(instance),
    onFocus: ({ editor: instance }) => {
      updateToolbarState(instance);
      if (toolbarHostId) {
        activateDetachedToolbar();
      }
    },
    onSelectionUpdate: ({ editor: instance }) => updateToolbarState(instance),
    onUpdate: ({ editor: instance }) => {
      updateToolbarState(instance);
      onChange(instance.isEmpty ? '' : normalizeHtml(instance.getHTML()));
    },
    editorProps: {
      attributes: {
        class: 'hirevo-rich-text-content',
        spellcheck: spellCheck ? 'true' : 'false',
        style: 'color:#0f172a; caret-color:#0f172a; text-align:left;',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = normalizeHtml(value || '');
    const currentValue = normalizeHtml(editor.getHTML());
    if (nextValue !== currentValue) {
      editor.commands.setContent(nextValue || '');
      updateToolbarState(editor);
    }
  }, [editor, updateToolbarState, value]);

  useEffect(() => {
    if (!toolbarHostId) {
      setToolbarHost(null);
      return;
    }

    let isDisposed = false;
    let hostObserver: MutationObserver | null = null;

    const syncHost = () => {
      if (isDisposed) return true;
      const nextHost = resolveToolbarHost();
      return Boolean(nextHost);
    };

    if (!syncHost()) {
      hostObserver = new MutationObserver(() => {
        if (syncHost() && hostObserver) {
          hostObserver.disconnect();
          hostObserver = null;
        }
      });

      if (document.body) {
        hostObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    }

    return () => {
      isDisposed = true;
      if (hostObserver) {
        hostObserver.disconnect();
      }
    };
  }, [resolveToolbarHost, toolbarHostId]);

  useEffect(() => {
    if (!toolbarHostId || !showDetachedToolbar) return;
    if (!toolbarHost || !toolbarHost.isConnected) {
      resolveToolbarHost();
    }
  }, [resolveToolbarHost, showDetachedToolbar, toolbarHost, toolbarHostId]);

  useEffect(() => {
    if (!toolbarHostId) return;
    const handleToolbarActivation = (event: Event) => {
      const detail = (event as CustomEvent<{ hostId?: string; instanceId?: string | null }>).detail;
      if (!detail || detail.hostId !== toolbarHostId) return;
      setShowDetachedToolbar(detail.instanceId === instanceIdRef.current);
    };

    window.addEventListener(RICH_TEXT_TOOLBAR_EVENT, handleToolbarActivation as EventListener);
    return () => {
      window.removeEventListener(RICH_TEXT_TOOLBAR_EVENT, handleToolbarActivation as EventListener);
    };
  }, [toolbarHostId]);

  useEffect(() => {
    if (!toolbarHostId || !editor) return;
    const instanceId = instanceIdRef.current;
    const registeredInstances = registeredDetachedToolbarsByHost.get(toolbarHostId) ?? [];

    if (!registeredInstances.includes(instanceId)) {
      registeredDetachedToolbarsByHost.set(toolbarHostId, [...registeredInstances, instanceId]);
    }

    const nextRegisteredInstances = registeredDetachedToolbarsByHost.get(toolbarHostId) ?? [];
    const activeInstanceId = activeDetachedToolbarByHost.get(toolbarHostId);

    if (!activeInstanceId || !nextRegisteredInstances.includes(activeInstanceId)) {
      activateDetachedToolbar();
    } else {
      setShowDetachedToolbar(activeInstanceId === instanceId);
    }

    return () => {
      const currentInstances = registeredDetachedToolbarsByHost.get(toolbarHostId) ?? [];
      const remainingInstances = currentInstances.filter((id) => id !== instanceId);

      if (remainingInstances.length > 0) {
        registeredDetachedToolbarsByHost.set(toolbarHostId, remainingInstances);
      } else {
        registeredDetachedToolbarsByHost.delete(toolbarHostId);
      }

      if (activeDetachedToolbarByHost.get(toolbarHostId) !== instanceId) return;

      const nextActiveInstanceId = remainingInstances[0] ?? null;
      if (nextActiveInstanceId) {
        activeDetachedToolbarByHost.set(toolbarHostId, nextActiveInstanceId);
      } else {
        activeDetachedToolbarByHost.delete(toolbarHostId);
      }

      window.dispatchEvent(new CustomEvent(RICH_TEXT_TOOLBAR_EVENT, {
        detail: {
          hostId: toolbarHostId,
          instanceId: nextActiveInstanceId,
        },
      }));
    };
  }, [activateDetachedToolbar, editor, toolbarHostId]);

  const editorMinHeight = toMinHeight(minHeight);
  const isEmpty = (editor?.isEmpty ?? !normalizeHtml(value || '')) && !editor?.isFocused;
  const rootClassName = [
    'hirevo-rich-text-root',
    compact ? 'is-compact' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');
  const shouldRenderDetachedToolbar = Boolean(toolbarHostId && toolbarHost && showDetachedToolbar);
  const activeBlockStyle = HEADING_LEVELS.find((level) => editor?.isActive('heading', { level }))
    ? `h${HEADING_LEVELS.find((level) => editor?.isActive('heading', { level }))}`
    : 'paragraph';
  const updateEditorFontSize = (nextSize: number) => {
    const clamped = Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, nextSize));
    setFontSize(clamped);
    editor?.chain().focus().setFontSize(`${clamped}px`).run();
  };
  const toolbarMarkup = (
    <div
      className={`hirevo-rich-text-toolbar ${shouldRenderDetachedToolbar ? 'is-detached' : ''}`}
      role="toolbar"
      aria-label="Rich text formatting"
    >
      <div className="hirevo-rich-text-toolbar-strip">
        <label className="rte-toolbar-control rte-toolbar-control-select">
          <select
            value={fontFamily}
            className="rte-toolbar-select"
            onChange={(e) => {
              const nextFont = e.target.value;
              setFontFamily(nextFont);
              editor?.chain().focus().setFontFamily(nextFont).run();
            }}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rte-toolbar-divider" />
        <div className="rte-toolbar-size-stepper" aria-label="Font size">
          <button
            type="button"
            className="rte-toolbar-stepper-btn"
            onMouseDown={preventToolbarMouseDown}
            onClick={() => updateEditorFontSize(fontSize - 1)}
            title="Decrease font size"
          >
            -
          </button>
          <span className="rte-toolbar-size-value">{fontSize}</span>
          <button
            type="button"
            className="rte-toolbar-stepper-btn"
            onMouseDown={preventToolbarMouseDown}
            onClick={() => updateEditorFontSize(fontSize + 1)}
            title="Increase font size"
          >
            +
          </button>
        </div>
        <label className="rte-toolbar-control rte-toolbar-control-select">
          <select
            value={activeBlockStyle}
            className="rte-toolbar-select rte-toolbar-select-compact"
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue === 'paragraph') {
                editor?.chain().focus().setParagraph().run();
                return;
              }

              const level = Number(nextValue.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
              editor?.chain().focus().setHeading({ level }).run();
            }}
          >
            <option value="paragraph">aA</option>
            {HEADING_LEVELS.map((level) => (
              <option key={`style-${level}`} value={`h${level}`}>
                {`H${level}`}
              </option>
            ))}
          </select>
        </label>
        <div className="rte-toolbar-divider" />
        <label className="rte-toolbar-color-button" title="Text color">
          <span className="rte-color-glyph">A</span>
          <span className="rte-color-underline" style={{ backgroundColor: textColor }} />
          <input
            type="color"
            aria-label="Text color"
            value={textColor}
            onChange={(e) => {
              const nextColor = e.target.value;
              setTextColor(nextColor);
              editor?.chain().focus().setColor(nextColor).run();
            }}
          />
        </label>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive('bold')))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive('italic')))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <span className="rte-italic-text">I</span>
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive('underline')))}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <span className="rte-underline-text">U</span>
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive('strike')))}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <span className="rte-strike-text">S</span>
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive('bulletList')))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive('orderedList')))}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onMouseDown={preventToolbarMouseDown}
          className={getToolbarButtonClassName(Boolean(editor?.isActive({ textAlign: 'left' })))}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          title="Align left"
        >
          <AlignLeft size={16} strokeWidth={2.2} />
        </button>
        <label className="rte-toolbar-color-button" title="Highlight color">
          <Highlighter size={15} strokeWidth={2.1} />
          <span className="rte-highlight-glyph" style={{ backgroundColor: highlightColor }} />
          <input
            type="color"
            aria-label="Highlight color"
            value={highlightColor}
            onChange={(e) => {
              const nextColor = e.target.value;
              setHighlightColor(nextColor);
              editor?.chain().focus().setHighlight({ color: nextColor }).run();
            }}
          />
        </label>
        <div className="rte-toolbar-divider" />
        <div className="rte-toolbar-control rte-toolbar-action">
          <button
            type="button"
            onMouseDown={preventToolbarMouseDown}
            className="rte-toolbar-text-button"
            onClick={() => editor?.chain().focus().unsetHighlight().unsetColor().unsetFontFamily().clearNodes().unsetAllMarks().run()}
          >
            Reset
          </button>
        </div>
        <div className="rte-toolbar-divider" />
        <button type="button" className="rte-toolbar-label-button" onMouseDown={preventToolbarMouseDown} title="Style controls">
          Effects
        </button>
        <button type="button" className="rte-toolbar-label-button" onMouseDown={preventToolbarMouseDown} title="Formatting controls">
          Animate
        </button>
        <button type="button" className="rte-toolbar-label-button" onMouseDown={preventToolbarMouseDown} title="Text position controls">
          Position
        </button>
      </div>
    </div>
  );

  return (
    <div className={rootClassName}>
      {shouldRenderDetachedToolbar && toolbarHost
        ? createPortal(toolbarMarkup, toolbarHost)
        : null}
      <div ref={shellRef} className="hirevo-rich-text-shell">
        {!toolbarHostId && toolbarMarkup}
        <div
          className="hirevo-rich-text-editor-body"
          style={{ minHeight: editorMinHeight }}
        >
          {isEmpty && (
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '16px',
                color: '#94a3b8',
                pointerEvents: 'none',
                fontSize: '0.95rem',
              }}
            >
              {placeholder}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
      <style>{`
        .hirevo-rich-text-root {
          display: grid;
          gap: 10px;
        }

        .hirevo-rich-text-shell {
          border: 1px solid #dbe5ef;
          border-radius: 18px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 20px 35px -32px rgba(15, 23, 42, 0.45);
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }

        .hirevo-rich-text-shell:focus-within {
          border-color: #93c5fd;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 24px 40px -34px rgba(37, 99, 235, 0.4);
        }

        .hirevo-rich-text-toolbar {
          padding: 9px 10px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid #dbe5ef;
        }

        .hirevo-rich-text-toolbar.is-detached {
          border: 1px solid #dbe5ef;
          border-radius: 16px;
          border-bottom: 1px solid #dbe5ef;
          box-shadow: 0 18px 28px -24px rgba(15, 23, 42, 0.28);
        }

        .hirevo-rich-text-toolbar-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          white-space: nowrap;
        }

        .hirevo-rich-text-toolbar-strip::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .rte-toolbar-control {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
        }

        .rte-toolbar-action {
          margin-left: 2px;
        }

        .rte-toolbar-divider {
          width: 1px;
          height: 22px;
          background: #dbe5ef;
          border-radius: 999px;
          flex: 0 0 1px;
          margin: 0 2px;
        }

        .rte-tool-button {
          border: none;
          background: transparent;
          color: #0f172a;
          border-radius: 8px;
          height: 34px;
          min-width: 34px;
          padding: 0 8px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .rte-tool-button:hover {
          background: #f8fafc;
        }

        .rte-tool-button.is-active {
          background: #eef2ff;
          color: #1d4ed8;
        }

        .rte-tool-button.is-compact {
          min-width: 42px;
        }

        .rte-toolbar-select {
          height: 32px;
          min-width: 126px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 0 10px;
          background: #ffffff;
          color: #0f172a;
          font-size: 0.88rem;
          font-weight: 600;
          outline: none;
        }

        .rte-toolbar-select-compact {
          min-width: 64px;
        }

        .rte-toolbar-select:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .rte-toolbar-size-stepper {
          display: inline-flex;
          align-items: center;
          height: 32px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #ffffff;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .rte-toolbar-stepper-btn {
          border: none;
          background: transparent;
          color: #0f172a;
          width: 32px;
          height: 100%;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
        }

        .rte-toolbar-stepper-btn:hover {
          background: #f8fafc;
        }

        .rte-toolbar-size-value {
          min-width: 26px;
          text-align: center;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }

        .rte-toolbar-color-button {
          position: relative;
          border: none;
          background: transparent;
          color: #0f172a;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
          flex: 0 0 auto;
        }

        .rte-toolbar-color-button:hover {
          background: #f8fafc;
        }

        .rte-toolbar-color-button input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .rte-color-glyph {
          font-size: 1.06rem;
          font-weight: 700;
          line-height: 1;
        }

        .rte-color-underline {
          position: absolute;
          bottom: 7px;
          width: 14px;
          height: 2.5px;
          border-radius: 999px;
        }

        .rte-highlight-glyph {
          position: absolute;
          bottom: 6px;
          width: 14px;
          height: 3px;
          border-radius: 4px;
          border: none;
        }

        .rte-toolbar-text-button {
          border: none;
          background: transparent;
          color: #334155;
          font-size: 0.92rem;
          font-weight: 700;
          padding: 0 4px;
          cursor: pointer;
          transition: color 160ms ease;
        }

        .rte-toolbar-text-button:hover {
          color: #0f172a;
        }

        .rte-toolbar-label-button {
          border: none;
          background: transparent;
          color: #334155;
          font-size: 0.88rem;
          font-weight: 700;
          padding: 0 6px;
          height: 34px;
          border-radius: 8px;
          cursor: default;
          flex: 0 0 auto;
        }

        .rte-italic-text {
          font-style: italic;
        }

        .rte-underline-text {
          text-decoration: underline;
          text-underline-offset: 0.14em;
        }

        .rte-strike-text {
          text-decoration: line-through;
        }

        .hirevo-rich-text-editor-body {
          position: relative;
          background: #ffffff;
          padding: 14px 16px 16px;
          color: #0f172a;
        }

        .hirevo-rich-text-content {
          outline: none;
          color: #0f172a;
          caret-color: #0f172a;
          -webkit-text-fill-color: #0f172a;
          text-align: left;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .hirevo-rich-text-content,
        .hirevo-rich-text-content * {
          caret-color: #0f172a !important;
        }

        .hirevo-rich-text-content p {
          margin: 0;
          color: inherit;
        }

        .hirevo-rich-text-root.is-compact {
          gap: 6px;
        }

        .hirevo-rich-text-root.is-compact .hirevo-rich-text-editor-body {
          padding: 10px 14px;
        }

        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content {
          min-height: 1.45em;
          line-height: 1.45;
        }

        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content p + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content ul + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content ol + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content h1 + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content h2 + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content h3 + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content h4 + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content h5 + p,
        .hirevo-rich-text-root.is-compact .hirevo-rich-text-content h6 + p {
          margin-top: 0.3em;
        }

        .hirevo-rich-text-content p + p,
        .hirevo-rich-text-content ul + p,
        .hirevo-rich-text-content ol + p,
        .hirevo-rich-text-content h1 + p,
        .hirevo-rich-text-content h2 + p,
        .hirevo-rich-text-content h3 + p,
        .hirevo-rich-text-content h4 + p,
        .hirevo-rich-text-content h5 + p,
        .hirevo-rich-text-content h6 + p {
          margin-top: 0.55em;
        }

        .hirevo-rich-text-content ul,
        .hirevo-rich-text-content ol {
          margin: 0.55em 0;
          padding-left: 1.2rem;
        }

        .hirevo-rich-text-content h1,
        .hirevo-rich-text-content h2,
        .hirevo-rich-text-content h3,
        .hirevo-rich-text-content h4,
        .hirevo-rich-text-content h5,
        .hirevo-rich-text-content h6 {
          margin: 0.45em 0 0.25em;
          line-height: 1.2;
        }

        .hirevo-rich-text-content h1 { font-size: 2rem; }
        .hirevo-rich-text-content h2 { font-size: 1.65rem; }
        .hirevo-rich-text-content h3 { font-size: 1.35rem; }
        .hirevo-rich-text-content h4 { font-size: 1.15rem; }
        .hirevo-rich-text-content h5 { font-size: 1rem; }
        .hirevo-rich-text-content h6 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.04em; }

        @media (max-width: 720px) {
          .hirevo-rich-text-toolbar {
            padding: 12px;
          }

          .rte-tool-button {
            min-height: 38px;
            padding: 0 12px;
          }

          .rte-toolbar-select {
            min-width: 120px;
          }

          .hirevo-rich-text-editor-body {
            padding: 12px 14px 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
