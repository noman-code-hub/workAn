
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { uploadImage } from '../services/supabaseStorage';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Paragraph from '@tiptap/extension-paragraph';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => (attributes.class ? { class: attributes.class } : {}),
      },
    };
  },
});

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

const PAGE_NOTICE_DURATION = 2800;
const FONT_SIZE_OPTIONS = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px'];
const TEXT_COLOR_PRESETS = ['#111827', '#0f766e', '#1d4ed8', '#b91c1c', '#7c3aed', '#0f172a', '#475569'];
const HIGHLIGHT_PRESETS = ['#fef08a', '#bae6fd', '#fecdd3', '#bbf7d0', '#e9d5ff', '#fde68a'];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const formatDate = (value?: string | null) => {
  if (!value) return 'Unpublished';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unpublished';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

type BlogRow = {
  id: string;
  title: string | null;
  slug: string | null;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[] | null;
  faqs?: { question?: string | null; answer?: string | null }[] | null;
  published: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BlogSummary = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type BlogSummaryRow = Pick<BlogRow, 'id' | 'title' | 'slug' | 'published' | 'updated_at' | 'created_at'>;

type Notice = { type: 'success' | 'error' | 'info'; message: string };
type FaqItem = { question: string; answer: string };
type AdminCommunityDraft = {
  blogId: string | null;
  title: string;
  slug: string;
  slugEdited: boolean;
  metaTitle: string;
  metaDescription: string;
  category: string;
  categoryMode: 'select' | 'custom';
  tags: string[];
  tagInput: string;
  faqs: FaqItem[];
  coverImage: string;
  published: boolean;
  contentHtml: string;
};

export const AdminCommunity = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blogId, setBlogId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [categoryMode, setCategoryMode] = useState<'select' | 'custom'>('select');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [published, setPublished] = useState(false);
  const [contentHtml, setContentHtml] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [posts, setPosts] = useState<BlogSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [customFontSize, setCustomFontSize] = useState('');
  const [textColor, setTextColor] = useState('#111827');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const restoredDraftRef = useRef(false);
  const draftStorageKey = useMemo(() => {
    if (!user?.id) return null;
    return `hirevo:admin-community-draft:${user.id}`;
  }, [user?.id]);
  const createNewRequested = searchParams.get('new') === '1';

  useEffect(() => {
    restoredDraftRef.current = false;
  }, [draftStorageKey]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
        paragraph: false,
      }),
      CustomParagraph,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: 'blog-inline-image' } }),
    ],
    content: contentHtml || '<p></p>',
    editorProps: {
      transformPastedHTML: (html) => html,
    },
    onUpdate: ({ editor }) => {
      setContentHtml(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

  useEffect(() => {
    if (editor && contentHtml && editor.getHTML() !== contentHtml) {
      editor.commands.setContent(contentHtml, { emitUpdate: false });
    }
  }, [contentHtml, editor]);

  useEffect(() => {
    if (!draftStorageKey || !editor || restoredDraftRef.current || createNewRequested) return;

    restoredDraftRef.current = true;

    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (!rawDraft) return;

      const parsed = JSON.parse(rawDraft) as Partial<AdminCommunityDraft>;
      const nextTitle = typeof parsed.title === 'string' ? parsed.title : '';
      const nextSlug = typeof parsed.slug === 'string' ? parsed.slug : '';
      const nextMetaTitle = typeof parsed.metaTitle === 'string' ? parsed.metaTitle : '';
      const nextMetaDescription = typeof parsed.metaDescription === 'string' ? parsed.metaDescription : '';
      const nextCategory = typeof parsed.category === 'string' && parsed.category.trim() ? parsed.category : 'General';
      const nextCategoryMode = parsed.categoryMode === 'custom' ? 'custom' : 'select';
      const nextCoverImage = typeof parsed.coverImage === 'string' ? parsed.coverImage : '';
      const nextContentHtml = typeof parsed.contentHtml === 'string' ? parsed.contentHtml : '';

      setBlogId(typeof parsed.blogId === 'string' ? parsed.blogId : null);
      setTitle(nextTitle);
      setSlug(nextSlug);
      setSlugEdited(Boolean(parsed.slugEdited));
      setMetaTitle(nextMetaTitle);
      setMetaDescription(nextMetaDescription);
      setCategory(nextCategory);
      setCategoryMode(nextCategoryMode);
      setTags(
        Array.isArray(parsed.tags)
          ? parsed.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
          : []
      );
      setTagInput(typeof parsed.tagInput === 'string' ? parsed.tagInput : '');
      setFaqs(
        Array.isArray(parsed.faqs)
          ? parsed.faqs.map((item) => ({
              question: typeof item?.question === 'string' ? item.question : '',
              answer: typeof item?.answer === 'string' ? item.answer : '',
            }))
          : []
      );
      setCoverImage(nextCoverImage);
      setPublished(Boolean(parsed.published));
      setContentHtml(nextContentHtml);
      editor.commands.setContent(nextContentHtml || '<p></p>', { emitUpdate: false });
    } catch (error) {
      console.error('Failed to restore admin blog draft:', error);
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [createNewRequested, draftStorageKey, editor]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), PAGE_NOTICE_DURATION);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const showNotice = (type: Notice['type'], message: string) => setNotice({ type, message });

  const resetForm = useCallback(() => {
    setBlogId(null);
    setTitle('');
    setSlug('');
    setSlugEdited(false);
    setMetaTitle('');
    setMetaDescription('');
    setCategory('General');
    setCategoryMode('select');
    setTags([]);
    setTagInput('');
    setFaqs([]);
    setCoverImage('');
    setPublished(false);
    setContentHtml('');
    if (editor) {
      editor.commands.clearContent(true);
    }
    if (draftStorageKey) {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, editor]);

  useEffect(() => {
    if (!createNewRequested || !editor) return;

    resetForm();
    showNotice('info', 'Ready to write a new article.');
    navigate('/admin/community', { replace: true });
  }, [createNewRequested, editor, navigate, resetForm]);

  useEffect(() => {
    if (!draftStorageKey || !restoredDraftRef.current) return;

    const hasDraft =
      Boolean(blogId) ||
      title.trim().length > 0 ||
      slug.trim().length > 0 ||
      metaTitle.trim().length > 0 ||
      metaDescription.trim().length > 0 ||
      category.trim().length > 0 ||
      tagInput.trim().length > 0 ||
      tags.length > 0 ||
      faqs.some((item) => item.question.trim().length > 0 || item.answer.trim().length > 0) ||
      coverImage.trim().length > 0 ||
      published ||
      !['', '<p></p>', '<p><br></p>'].includes(contentHtml.trim());

    try {
      if (!hasDraft) {
        window.localStorage.removeItem(draftStorageKey);
        return;
      }

      const draft: AdminCommunityDraft = {
        blogId,
        title,
        slug,
        slugEdited,
        metaTitle,
        metaDescription,
        category,
        categoryMode,
        tags,
        tagInput,
        faqs,
        coverImage,
        published,
        contentHtml,
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save admin blog draft:', error);
    }
  }, [
    blogId,
    category,
    categoryMode,
    contentHtml,
    coverImage,
    draftStorageKey,
    faqs,
    metaDescription,
    metaTitle,
    published,
    slug,
    slugEdited,
    tagInput,
    tags,
    title,
  ]);

  const loadCategories = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase.from('blogs').select('category').eq('published', true);
      if (error) throw error;
      const unique = new Set<string>();
      (data || []).forEach((row: { category?: string | null }) => {
        const value = row.category?.trim();
        if (value) unique.add(value);
      });
      setCategories(Array.from(unique));
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setListLoading(true);
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, slug, published, updated_at, created_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const normalized = ((data || []) as BlogSummaryRow[]).map((row) => ({
        id: row.id,
        title: row.title?.trim() || 'Untitled draft',
        slug: row.slug?.trim() || row.id,
        published: Boolean(row.published),
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      }));
      setPosts(normalized);
    } catch (err) {
      console.error('Failed to load blogs list:', err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadPosts();
  }, [loadCategories, loadPosts]);

  const loadBlog = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase.from('blogs').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return;
      const row = data as BlogRow;
      setBlogId(row.id);
      setTitle(row.title || '');
      setSlug(row.slug || '');
      setSlugEdited(true);
      setMetaTitle(row.meta_title || '');
      setMetaDescription(row.meta_description || '');
      setCategory(row.category || 'General');
      setCategoryMode(categories.includes(row.category || '') ? 'select' : 'custom');
      setTags(row.tags || []);
      setFaqs(
        Array.isArray(row.faqs)
          ? row.faqs
              .map((item) => ({
                question: (item?.question || '').toString().trim(),
                answer: (item?.answer || '').toString().trim(),
              }))
              .filter((item) => item.question || item.answer)
          : []
      );
      setCoverImage(row.cover_image || '');
      setPublished(Boolean(row.published));
      setContentHtml(row.content || '');
      if (editor) {
        editor.commands.setContent(row.content || '<p></p>', { emitUpdate: false });
      }
      showNotice('info', 'Loaded blog draft.');
    } catch (err) {
      console.error('Failed to load blog:', err);
      showNotice('error', 'Could not load the selected blog.');
    }
  }, [categories, editor]);

  const getUniqueSlug = useCallback(async (baseSlug: string) => {
    if (!baseSlug) return baseSlug;
    if (!isSupabaseConfigured || !supabase) return baseSlug;

    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, slug')
        .ilike('slug', `${baseSlug}%`);

      if (error) throw error;

      const used = new Set<string>();
      (data || []).forEach((row: { id?: string; slug?: string | null }) => {
        if (!row.slug) return;
        if (blogId && row.id === blogId) return;
        used.add(row.slug);
      });

      if (!used.has(baseSlug)) return baseSlug;

      let counter = 2;
      while (used.has(`${baseSlug}-${counter}`)) {
        counter += 1;
      }
      return `${baseSlug}-${counter}`;
    } catch (err) {
      console.error('Failed to generate unique slug:', err);
      return baseSlug;
    }
  }, [blogId]);

  const buildPayload = useCallback(
    (nextPublished: boolean) => ({
      title: title.trim() || null,
      slug: slug.trim() || null,
      content: contentHtml || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      cover_image: coverImage || null,
      category: category.trim() || null,
      tags,
      faqs,
      published: nextPublished,
      updated_at: new Date().toISOString(),
    }),
    [category, contentHtml, coverImage, faqs, metaDescription, metaTitle, slug, tags, title]
  );

  const saveBlog = useCallback(
    async (nextPublished: boolean) => {
      if (!isSupabaseConfigured || !supabase) {
        showNotice('error', 'Supabase is not configured.');
        return;
      }
      if (!user) {
        showNotice('error', 'You must be signed in to save.');
        return;
      }

      const baseSlug = slug.trim() || slugify(title);
      if (!baseSlug) {
        showNotice('error', 'Please provide a title or slug.');
        return;
      }

      setSaving(true);
      try {
        const uniqueSlug = await getUniqueSlug(baseSlug);
        const slugChanged = uniqueSlug !== baseSlug;
        const payload = { ...buildPayload(nextPublished), slug: uniqueSlug };
        let savedId = blogId;

        if (blogId) {
          const { error } = await supabase.from('blogs').update(payload).eq('id', blogId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from('blogs').insert(payload).select('id').single();
          if (error) throw error;
          savedId = data?.id || null;
        }

        setPublished(nextPublished);
        setBlogId(savedId);
        setSlug(uniqueSlug);
        setSlugEdited(true);
        const baseMessage = nextPublished ? 'Blog published successfully.' : 'Draft saved successfully.';
        const message = slugChanged ? `${baseMessage} Slug updated to ${uniqueSlug}.` : baseMessage;
        showNotice('success', message);
        await loadPosts();
      } catch (err) {
        console.error('Save failed:', err);
        showNotice('error', 'Unable to save blog.');
      } finally {
        setSaving(false);
      }
    },
    [blogId, buildPayload, getUniqueSlug, loadPosts, slug, title, user]
  );

  const deleteBlog = useCallback(async () => {
    if (!blogId) return;
    if (!window.confirm('Delete this blog permanently?')) return;
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from('blogs').delete().eq('id', blogId);
      if (error) throw error;
      showNotice('success', 'Blog deleted.');
      resetForm();
      await loadPosts();
    } catch (err) {
      console.error('Failed to delete blog:', err);
      showNotice('error', 'Unable to delete blog.');
    }
  }, [blogId, loadPosts, resetForm]);

  const handleCoverUpload = async (file: File) => {
    if (!user) {
      showNotice('error', 'Sign in to upload images.');
      return;
    }
    setCoverUploading(true);
    try {
      const { publicUrl } = await uploadImage(user.id, file, 'post');
      setCoverImage(publicUrl);
      showNotice('success', 'Cover image uploaded.');
    } catch (err) {
      console.error('Cover upload failed:', err);
      showNotice('error', 'Failed to upload cover image.');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleInlineImageUpload = async (file: File) => {
    if (!user || !editor) {
      showNotice('error', 'Sign in to upload images.');
      return;
    }
    setInlineUploading(true);
    try {
      const { publicUrl } = await uploadImage(user.id, file, 'post');
      const caption = window.prompt('Optional caption for this image?')?.trim();
      editor.chain().focus().setImage({ src: publicUrl, alt: caption || title || 'Blog image' }).run();
      if (caption) {
        editor.chain().focus().insertContent({
          type: 'paragraph',
          attrs: { class: 'image-caption' },
          content: [{ type: 'text', text: caption }],
        }).run();
      }
      showNotice('success', 'Image inserted.');
    } catch (err) {
      console.error('Inline upload failed:', err);
      showNotice('error', 'Could not insert image.');
    } finally {
      setInlineUploading(false);
    }
  };

  const handleTagAdd = () => {
    const next = tagInput.trim();
    if (!next) return;
    if (!tags.includes(next)) {
      setTags((prev) => [...prev, next]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((item) => item !== tag));

  const addFaq = () => {
    setFaqs((prev) => [...prev, { question: '', answer: '' }]);
  };

  const updateFaq = (index: number, next: Partial<FaqItem>) => {
    setFaqs((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...next } : item))
    );
  };

  const removeFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toolbarButton = (active: boolean) => `editor-btn ${active ? 'active' : ''}`;
  const currentFontSize = editor?.getAttributes('textStyle')?.fontSize || '';

  if (loading) {
    return <div className="admin-community-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="admin-community-loading">
        <p>You must be signed in to access the blog admin.</p>
        <button className="admin-link" onClick={() => navigate('/login')}>Go to login</button>
      </div>
    );
  }

  return (
    <div className="admin-community-page">
      <header className="admin-community-header">
        <div>
          <p className="admin-community-eyebrow">Admin Console</p>
          <h1>Community Blog Manager</h1>
          <p className="admin-community-sub">Create, publish, and manage long-form content with live preview.</p>
        </div>
        <div className="admin-community-actions">
          <button className="ghost" onClick={resetForm} type="button">New Blog</button>
          <button className="ghost" onClick={() => saveBlog(false)} disabled={saving} type="button">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="primary" onClick={() => saveBlog(true)} disabled={saving} type="button">
            {saving ? 'Publishing...' : 'Publish'}
          </button>
          {blogId ? (
            <button className="danger" onClick={deleteBlog} type="button">Delete</button>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div className={`admin-notice ${notice.type}`}>{notice.message}</div>
      ) : null}

      <div className="admin-community-layout">
        <aside className="admin-panel">
          <section className="panel-section">
            <h3>Blog Settings</h3>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter blog title" />
            </label>
            <label>
              Slug
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                onBlur={() => setSlug(slugify(slug))}
                placeholder="auto-generated-slug"
              />
            </label>
            <label>
              Meta Title
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title" />
            </label>
            <label>
              Meta Description
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="SEO description"
                rows={3}
              />
            </label>
            <label>
              Category
              {categoryMode === 'select' ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCategoryMode('custom');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                >
                  <option value="General">General</option>
                  {categories.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
              ) : (
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Custom category"
                />
              )}
            </label>
            <label>
              Tags
              <div className="tag-input">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                />
                <button type="button" onClick={handleTagAdd}>Add</button>
              </div>
              <div className="tag-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>x</button>
                  </span>
                ))}
              </div>
            </label>
            <label>
              FAQs
              <div className="faq-list">
                {faqs.length === 0 ? (
                  <p className="muted">No FAQs yet.</p>
                ) : null}
                {faqs.map((faq, index) => (
                  <div key={`faq-${index}`} className="faq-item">
                    <input
                      value={faq.question}
                      onChange={(e) => updateFaq(index, { question: e.target.value })}
                      placeholder="Question"
                    />
                    <textarea
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, { answer: e.target.value })}
                      placeholder="Answer"
                      rows={2}
                    />
                    <button type="button" className="faq-remove" onClick={() => removeFaq(index)}>
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="faq-add" onClick={addFaq}>
                  Add FAQ
                </button>
              </div>
            </label>
            <label>
              Cover Image
              <div className="cover-upload">
                {coverImage ? (
                  <img src={coverImage} alt="Cover" />
                ) : (
                  <div className="cover-placeholder">No cover selected</div>
                )}
                <div className="cover-actions">
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleCoverUpload(file);
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    disabled={coverUploading}
                  >
                    {coverUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  {coverImage ? (
                    <button type="button" className="ghost" onClick={() => setCoverImage('')}>Remove</button>
                  ) : null}
                </div>
              </div>
            </label>
            <label className="toggle-row">
              <span>Published</span>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
            </label>
          </section>

          <section className="panel-section">
            <h3>Recent Blogs</h3>
            {listLoading ? <p className="muted">Loading list...</p> : null}
            <div className="blog-list">
              {posts.length === 0 && !listLoading ? <p className="muted">No posts yet.</p> : null}
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={`blog-list-item ${post.id === blogId ? 'active' : ''}`}
                  onClick={() => loadBlog(post.id)}
                >
                  <div>
                    <strong>{post.title}</strong>
                    <span>{formatDate(post.updatedAt || post.createdAt)}</span>
                  </div>
                  <span className={`status ${post.published ? 'published' : 'draft'}`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="editor-panel">
          <div className="editor-toolbar">
            <select
              className="editor-select"
              value={currentFontSize}
              onChange={(event) => {
                const value = event.target.value;
                if (!editor) return;
                if (!value) {
                  editor.chain().focus().unsetFontSize().run();
                  return;
                }
                editor.chain().focus().setFontSize(value).run();
              }}
            >
              <option value="">Font size</option>
              {FONT_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <div className="editor-custom-size">
              <input
                className="editor-input"
                value={customFontSize}
                onChange={(event) => setCustomFontSize(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (!editor) return;
                  const raw = customFontSize.trim();
                  if (!raw) {
                    editor.chain().focus().unsetFontSize().run();
                    return;
                  }
                  const value = /^\d+$/.test(raw) ? `${raw}px` : raw;
                  editor.chain().focus().setFontSize(value).run();
                }}
                placeholder="Custom px"
              />
              <button
                type="button"
                className="editor-apply"
                onClick={() => {
                  if (!editor) return;
                  const raw = customFontSize.trim();
                  if (!raw) {
                    editor.chain().focus().unsetFontSize().run();
                    return;
                  }
                  const value = /^\d+$/.test(raw) ? `${raw}px` : raw;
                  editor.chain().focus().setFontSize(value).run();
                }}
              >
                Apply
              </button>
            </div>
            <div className="editor-color">
              <label>
                Text
                <input
                  type="color"
                  value={textColor}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTextColor(value);
                    if (!editor) return;
                    editor.chain().focus().setColor(value).run();
                  }}
                />
              </label>
              <div className="editor-swatches">
                {TEXT_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="swatch"
                    style={{ background: color }}
                    onClick={() => {
                      setTextColor(color);
                      editor?.chain().focus().setColor(color).run();
                    }}
                    aria-label={`Set text color ${color}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="editor-btn"
                onClick={() => editor?.chain().focus().unsetColor().run()}
              >
                Clear
              </button>
            </div>
            <div className="editor-color">
              <label>
                Highlight
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(event) => {
                    const value = event.target.value;
                    setHighlightColor(value);
                    if (!editor) return;
                    editor.chain().focus().toggleHighlight({ color: value }).run();
                  }}
                />
              </label>
              <div className="editor-swatches">
                {HIGHLIGHT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="swatch"
                    style={{ background: color }}
                    onClick={() => {
                      setHighlightColor(color);
                      editor?.chain().focus().toggleHighlight({ color }).run();
                    }}
                    aria-label={`Set highlight color ${color}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="editor-btn"
                onClick={() => editor?.chain().focus().unsetHighlight().run()}
              >
                Clear
              </button>
            </div>
            <button
              className={toolbarButton(editor?.isActive('heading', { level: 1 }) ?? false)}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              type="button"
            >
              H1
            </button>
            <button
              className={toolbarButton(editor?.isActive('heading', { level: 2 }) ?? false)}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              type="button"
            >
              H2
            </button>
            <button
              className={toolbarButton(editor?.isActive('heading', { level: 3 }) ?? false)}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              type="button"
            >
              H3
            </button>
            <button
              className={toolbarButton(editor?.isActive('bold') ?? false)}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              type="button"
            >
              Bold
            </button>
            <button
              className={toolbarButton(editor?.isActive('italic') ?? false)}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              type="button"
            >
              Italic
            </button>
            <button
              className={toolbarButton(editor?.isActive('underline') ?? false)}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              type="button"
            >
              Underline
            </button>
            <button
              className={toolbarButton(editor?.isActive('bulletList') ?? false)}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              type="button"
            >
              List
            </button>
            <button
              className={toolbarButton(editor?.isActive('orderedList') ?? false)}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              type="button"
            >
              1. List
            </button>
            <button
              className={toolbarButton(editor?.isActive('link') ?? false)}
              onClick={() => {
                if (!editor) return;
                const previousUrl = editor.getAttributes('link').href as string | undefined;
                const url = window.prompt('Enter link URL', previousUrl || '');
                if (url === null) return;
                if (url.trim() === '') {
                  editor.chain().focus().unsetLink().run();
                  return;
                }
                editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
              }}
              type="button"
            >
              Link
            </button>
            <button
              className="editor-btn"
              onClick={() => inlineFileRef.current?.click()}
              disabled={inlineUploading}
              type="button"
            >
              {inlineUploading ? 'Uploading...' : 'Image'}
            </button>
            <input
              ref={inlineFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleInlineImageUpload(file);
                if (inlineFileRef.current) inlineFileRef.current.value = '';
              }}
            />
          </div>
          <div className="editor-layout">
            <div className="editor-surface">
              <EditorContent editor={editor} />
            </div>
            <div className="preview-surface">
              <div className="preview-header">
                <span className="preview-pill">Live Preview</span>
                <span className="preview-status">{published ? 'Published' : 'Draft'}</span>
              </div>
              <article className="preview-article">
                {coverImage ? (
                  <img className="preview-cover" src={coverImage} alt={title || 'Cover'} />
                ) : null}
                <h1>{title || 'Untitled story'}</h1>
                <p className="preview-meta">
                  {user.name} - {formatDate(blogId ? posts.find((p) => p.id === blogId)?.updatedAt : null)}
                </p>
                <div
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
                {faqs.length > 0 ? (
                  <div className="preview-faq">
                    <h2>FAQ</h2>
                    {faqs.map((faq, index) => (
                    <div key={`preview-faq-${index}`} className="preview-faq-item">
                        <h3>{faq.question || 'Untitled question'}</h3>
                        <p>{faq.answer || 'Answer goes here.'}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .admin-community-page {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          color: #0f172a;
          background: #f8fafc;
          min-height: 100vh;
        }

        .admin-community-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }

        .admin-community-header h1 {
          font-size: 32px;
          margin: 0 0 8px 0;
          font-weight: 700;
        }

        .admin-community-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-size: 11px;
          font-weight: 700;
          color: #0f766e;
          margin-bottom: 10px;
        }

        .admin-community-sub {
          margin: 0;
          color: #475569;
          max-width: 520px;
        }

        .admin-community-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .admin-community-actions button {
          border: none;
          border-radius: 999px;
          padding: 10px 22px;
          font-weight: 600;
          cursor: pointer;
        }

        .admin-community-actions .primary {
          background: #0f172a;
          color: white;
        }

        .admin-community-actions .ghost {
          background: #e2e8f0;
          color: #0f172a;
        }

        .admin-community-actions .danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .admin-notice {
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 600;
        }

        .admin-notice.success {
          background: #dcfce7;
          color: #166534;
        }

        .admin-notice.error {
          background: #fee2e2;
          color: #b91c1c;
        }

        .admin-notice.info {
          background: #e0f2fe;
          color: #0369a1;
        }

        .admin-community-layout {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 24px;
        }

        .admin-panel {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          border: 1px solid #e2e8f0;
          height: calc(100vh - 200px);
          overflow-y: auto;
        }

        .panel-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
        }

        .panel-section label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .panel-section input,
        .panel-section textarea,
        .panel-section select {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 14px;
          font-family: inherit;
        }

        .toggle-row {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
        }

        .tag-input {
          display: flex;
          gap: 8px;
        }

        .tag-input button {
          border: none;
          background: #0f766e;
          color: white;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag-chip {
          background: #f1f5f9;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .tag-chip button {
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #f8fafc;
        }

        .faq-remove {
          align-self: flex-start;
          border: none;
          background: #fee2e2;
          color: #b91c1c;
          padding: 6px 10px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .faq-add {
          border: none;
          background: #0f766e;
          color: white;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
        }

        .cover-upload {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cover-upload img {
          width: 100%;
          border-radius: 12px;
          object-fit: cover;
        }

        .cover-placeholder {
          background: #f1f5f9;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          color: #94a3b8;
        }

        .cover-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cover-actions button {
          border: none;
          background: #0f172a;
          color: white;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
        }

        .cover-actions .ghost {
          background: #e2e8f0;
          color: #0f172a;
        }

        .blog-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .blog-list-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          cursor: pointer;
          text-align: left;
        }

        .blog-list-item.active {
          border-color: #0f766e;
          box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.25);
        }

        .blog-list-item strong {
          display: block;
        }

        .blog-list-item span {
          display: block;
          font-size: 12px;
          color: #64748b;
        }

        .status {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 4px 8px;
          border-radius: 999px;
        }

        .status.published {
          background: #dcfce7;
          color: #166534;
        }

        .status.draft {
          background: #fef9c3;
          color: #854d0e;
        }

        .editor-panel {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 500px;
        }

        .editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .editor-select {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .editor-color {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          font-size: 11px;
        }

        .editor-color label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .editor-color input[type="color"] {
          width: 28px;
          height: 28px;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .editor-swatches {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .swatch {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.15);
          cursor: pointer;
        }

        .editor-custom-size {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .editor-input {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 12px;
          width: 86px;
        }

        .editor-apply {
          border: 1px solid #e2e8f0;
          background: #0f172a;
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .editor-btn {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .editor-btn.active {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .editor-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 16px;
          height: 100%;
        }

        .editor-surface {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          min-height: 500px;
          overflow-y: auto;
          background: #ffffff;
        }

        .editor-surface .ProseMirror {
          outline: none;
          min-height: 480px;
          caret-color: #111827;
          color: #111827;
          line-height: 1.7;
        }

        .editor-surface .ProseMirror * {
          caret-color: #111827;
        }

        .editor-surface .ProseMirror p {
          margin: 0 0 12px;
          min-height: 1.2em;
        }

        .preview-surface {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          background: #f9fafb;
          overflow-y: auto;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .preview-pill {
          background: #0f766e;
          color: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .preview-status {
          font-size: 12px;
          color: #64748b;
        }

        .preview-article {
          max-width: 620px;
          margin: 0 auto;
        }

        .preview-cover {
          width: 100%;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .preview-article h1 {
          font-size: 28px;
          margin: 0 0 8px 0;
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
        }

        .preview-meta {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .preview-content {
          font-size: 15px;
          line-height: 1.8;
          color: #1f2937;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
        }

        .preview-content h1,
        .preview-content h2,
        .preview-content h3 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          margin-top: 1.8rem;
          margin-bottom: 1rem;
        }

        .preview-content img,
        .blog-inline-image {
          display: block;
          max-width: 100%;
          border-radius: 12px;
          margin: 24px auto;
        }

        .preview-content .image-caption {
          text-align: center;
          font-size: 13px;
          color: #64748b;
          margin-top: -12px;
          margin-bottom: 24px;
        }

        .preview-faq {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .preview-faq h2 {
          font-size: 20px;
          margin: 0 0 12px 0;
        }

        .preview-faq-item h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
        }

        .preview-faq-item p {
          margin: 0 0 16px 0;
          color: #475569;
        }

        .admin-community-loading {
          min-height: 60vh;
          display: grid;
          place-items: center;
          color: #64748b;
        }

        .admin-link {
          margin-top: 12px;
          border: none;
          background: #0f172a;
          color: white;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
        }

        .muted {
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 1100px) {
          .admin-community-layout {
            grid-template-columns: 1fr;
          }

          .editor-layout {
            grid-template-columns: 1fr;
          }

          .admin-panel {
            height: auto;
          }
        }
      `}</style>
    </div>
  );
};
