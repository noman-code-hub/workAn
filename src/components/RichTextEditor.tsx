import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export const RichTextEditor = ({ value, onChange, placeholder, minHeight = 160 }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rte-content',
        'data-placeholder': placeholder || '',
      },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.state.doc;
      const plain = doc.textBetween(0, doc.content.size, '\n').trimEnd();
      onChange(plain);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const doc = editor.state.doc;
    const plain = doc.textBetween(0, doc.content.size, '\n').trimEnd();
    if (plain !== (value || '').trimEnd()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL', previousUrl || '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rte-shell" style={{ minHeight }}>
      <div className="rte-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''}>List</button>
        <button type="button" onClick={setLink} className={editor.isActive('link') ? 'active' : ''}>Link</button>
      </div>
      <EditorContent editor={editor} />
      <style>{`
        .rte-shell {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }
        .rte-toolbar {
          display: flex;
          gap: 8px;
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .rte-toolbar button {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
        }
        .rte-toolbar button.active {
          border-color: rgba(37, 99, 235, 0.45);
          background: rgba(37, 99, 235, 0.08);
          color: #1d4ed8;
          font-weight: 700;
        }
        .rte-content {
          padding: 10px 12px;
          outline: none;
          min-height: 120px;
          font-size: 14px;
          line-height: 1.5;
          color: #0f172a;
        }
        .rte-content p {
          margin: 0 0 10px;
        }
        .rte-content ul {
          padding-left: 18px;
          margin: 0 0 10px;
        }
      `}</style>
    </div>
  );
};
