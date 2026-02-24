import { useState, useEffect } from 'react';
import { Upload, FileText, Code, Image as ImageIcon, Loader, Edit3, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiUrl, parseApiJson } from '../config/api';

export const AdminTemplates = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Upload Form State
    const [name, setName] = useState("");
    const [htmlFile, setHtmlFile] = useState<File | null>(null);
    const [cssFile, setCssFile] = useState<File | null>(null);
    const [jsFile, setJsFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Template Editor State
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [editorLoading, setEditorLoading] = useState(false);
    const [editorSaving, setEditorSaving] = useState(false);
    const [editorMessage, setEditorMessage] = useState<string | null>(null);
    const [htmlCode, setHtmlCode] = useState("");
    const [cssCode, setCssCode] = useState("");
    const [jsCode, setJsCode] = useState("");

    // Fetch Templates
    const fetchTemplates = async () => {
        let merged: any[] = [];
        const seenIds = new Set<string>();

        // 1. DB Templates (from backend API)
        try {
            const res = await fetch(apiUrl('/templates'));
            const data = await parseApiJson<any>(res);
            if (Array.isArray(data)) {
                data.forEach(t => {
                    if (!seenIds.has(t.id)) {
                        merged.push(t);
                        seenIds.add(t.id);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch templates from DB:', error);
        }

        // 2. Storage Templates (from Supabase - Root and 'templates' folder)
        try {
            const paths = ['', 'templates'];

            for (const path of paths) {
                const { data: storageData, error } = await supabase.storage.from('resume_templates').list(path);

                if (error) {
                    console.error(`Storage List Error (${path || 'root'}):`, error);
                    continue;
                }

                if (storageData) {
                    const storageTemplates = storageData
                        .filter(f => f.name.toLowerCase().endsWith('.html'))
                        .map(f => {
                            const fullName = path ? `${path}/${f.name}` : f.name;
                            const publicUrl = supabase.storage.from('resume_templates').getPublicUrl(fullName).data.publicUrl;

                            // Check if we already have this URL from DB templates
                            const isDuplicate = merged.some(t => t.html_url === publicUrl);
                            if (isDuplicate) return null;

                            // Simple ID based on filename
                            const id = f.name;
                            if (seenIds.has(id)) return null;

                            return {
                                id: id,
                                name: f.name.replace(/\.html$/i, '').replace(/_/g, ' ').toUpperCase() + (path ? ' (Storage)' : ' (Storage)'),
                                html_url: publicUrl,
                                thumbnail_url: null,
                                created_at: f.created_at || new Date().toISOString()
                            };
                        })
                        .filter(t => t !== null);

                    storageTemplates.forEach((t: any) => {
                        merged.push(t);
                        seenIds.add(t.id);
                    });
                }
            }
        } catch (e) {
            console.error('Storage Fetch Error:', e);
        }

        setTemplates(merged || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const getStoragePath = (publicUrl?: string | null) => {
        if (!publicUrl) return null;
        try {
            const url = new URL(publicUrl);
            const marker = '/resume_templates/';
            const idx = url.pathname.indexOf(marker);
            if (idx === -1) return null;
            return decodeURIComponent(url.pathname.slice(idx + marker.length));
        } catch (error) {
            console.error('Failed to parse storage path:', error);
            return null;
        }
    };

    const fetchText = async (url?: string | null) => {
        if (!url) return '';
        const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        return res.text();
    };

    const loadTemplateForEdit = async (template: any) => {
        setEditingTemplate(template);
        setEditorLoading(true);
        setEditorMessage(null);
        setHtmlCode('');
        setCssCode('');
        setJsCode('');

        try {
            const [html, css, js] = await Promise.all([
                fetchText(template.html_url),
                fetchText(template.css_url),
                fetchText(template.js_url),
            ]);
            setHtmlCode(html);
            setCssCode(css);
            setJsCode(js);
        } catch (error: any) {
            console.error('Failed to load template code:', error);
            setEditorMessage(`Error: ${error.message || 'Failed to load template code.'}`);
        } finally {
            setEditorLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;
        setEditorSaving(true);
        setEditorMessage(null);

        try {
            const uploads: Array<Promise<any>> = [];
            const htmlPath = getStoragePath(editingTemplate.html_url);
            if (!htmlPath) throw new Error('Cannot resolve HTML file path for this template.');

            uploads.push(
                supabase.storage.from('resume_templates').upload(
                    htmlPath,
                    new Blob([htmlCode], { type: 'text/html' }),
                    { contentType: 'text/html', upsert: true }
                )
            );

            if (editingTemplate.css_url) {
                const cssPath = getStoragePath(editingTemplate.css_url);
                if (!cssPath) throw new Error('Cannot resolve CSS file path for this template.');
                uploads.push(
                    supabase.storage.from('resume_templates').upload(
                        cssPath,
                        new Blob([cssCode], { type: 'text/css' }),
                        { contentType: 'text/css', upsert: true }
                    )
                );
            }

            if (editingTemplate.js_url) {
                const jsPath = getStoragePath(editingTemplate.js_url);
                if (!jsPath) throw new Error('Cannot resolve JS file path for this template.');
                uploads.push(
                    supabase.storage.from('resume_templates').upload(
                        jsPath,
                        new Blob([jsCode], { type: 'application/javascript' }),
                        { contentType: 'application/javascript', upsert: true }
                    )
                );
            }

            const results = await Promise.all(uploads);
            const firstError = results.find((result: any) => result?.error)?.error;
            if (firstError) throw firstError;

            setEditorMessage('Template saved successfully.');
            fetchTemplates();
        } catch (error: any) {
            console.error('Failed to save template:', error);
            setEditorMessage(`Error: ${error.message || 'Failed to save template. Check console.'}`);
        } finally {
            setEditorSaving(false);
        }
    };

    const handleCloseEditor = () => {
        setEditingTemplate(null);
        setEditorMessage(null);
        setHtmlCode('');
        setCssCode('');
        setJsCode('');
    };

    // Handle File Selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    // Handle Upload
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!name || !htmlFile || !thumbnailFile) {
            setMessage("Error: Name, HTML file, and Thumbnail are required.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('html', htmlFile);
        if (cssFile) formData.append('css', cssFile);
        if (jsFile) formData.append('js', jsFile);
        formData.append('thumbnail', thumbnailFile);

        try {
            const res = await fetch(apiUrl('/templates/upload'), {
                method: 'POST',
                body: formData,
            });

            await parseApiJson<any>(res);
            setMessage("Success: Template uploaded!");

            // Reset form
            setName("");
            setHtmlFile(null);
            setCssFile(null);
            setJsFile(null);
            setThumbnailFile(null);
            // Ideally trigger file input reset here but state clear is decent enough for now

            // Refresh list
            fetchTemplates();
        } catch (error: any) {
            console.error(error);
            setMessage(`Error: ${error?.message || 'Upload failed. Check console.'}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin: Resume Templates</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Section */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Upload size={20} className="text-primary" />
                        Upload New Template
                    </h2>

                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="e.g. Modern Professional"
                            />
                        </div>

                        {/* File Inputs */}
                        <div className="space-y-3">
                            <FileInput label="HTML Template (Required)" icon={<FileText size={16} />} accept=".html" onChange={(e: any) => handleFileChange(e, setHtmlFile)} file={htmlFile} />
                            <FileInput label="CSS Styles (Optional)" icon={<Code size={16} />} accept=".css" onChange={(e: any) => handleFileChange(e, setCssFile)} file={cssFile} />
                            <FileInput label="JS Script (Optional)" icon={<Code size={16} />} accept=".js" onChange={(e: any) => handleFileChange(e, setJsFile)} file={jsFile} />
                            <FileInput label="Thumbnail (Required)" icon={<ImageIcon size={16} />} accept="image/*" onChange={(e: any) => handleFileChange(e, setThumbnailFile)} file={thumbnailFile} />
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploading}
                            className={`w-full py-2.5 rounded-lg text-white font-semibold transition-all ${uploading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark shadow-md hover:shadow-lg'}`}
                        >
                            {uploading ? <span className="flex items-center justify-center gap-2"><Loader size={18} className="animate-spin" /> Uploading...</span> : 'Upload Template'}
                        </button>
                    </form>
                </div>

                {/* Templates List */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-6">Existing Templates</h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                            No templates found. Upload your first one!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {templates.map((template) => (
                                <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                                    <div className="relative aspect-video bg-gray-100 overflow-hidden">
                                        {template.thumbnail_url ? (
                                            <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">No Preview</div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-xs">ID: {template.id}</p>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-800 text-lg mb-1">{template.name}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
                                            {template.html_url && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1"><FileText size={10} /> HTML</span>}
                                            {template.css_url && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><Code size={10} /> CSS</span>}
                                            {template.js_url && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Code size={10} /> JS</span>}
                                        </div>
                                        <div className="mt-3 text-xs text-gray-400">
                                            Uploaded: {new Date(template.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => loadTemplateForEdit(template)}
                                                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                                            >
                                                <Edit3 size={14} />
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {editingTemplate && (
                        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">Edit Template</h3>
                                    <p className="text-xs text-gray-500">{editingTemplate.name}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleSaveTemplate}
                                        disabled={editorSaving || editorLoading}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition ${editorSaving ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'}`}
                                    >
                                        {editorSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                        {editorSaving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={handleCloseEditor}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                                    >
                                        <X size={16} />
                                        Close
                                    </button>
                                </div>
                            </div>

                            {editorMessage && (
                                <div className={`mb-4 p-3 rounded-lg text-sm ${editorMessage.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {editorMessage}
                                </div>
                            )}

                            {editorLoading ? (
                                <div className="text-gray-500">Loading template code...</div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">HTML</label>
                                        <textarea
                                            value={htmlCode}
                                            onChange={(e) => setHtmlCode(e.target.value)}
                                            rows={12}
                                            className="w-full border rounded-lg p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>

                                    {editingTemplate.css_url ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">CSS</label>
                                            <textarea
                                                value={cssCode}
                                                onChange={(e) => setCssCode(e.target.value)}
                                                rows={8}
                                                className="w-full border rounded-lg p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-primary/50 outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">No CSS file linked. Add styles in HTML or upload a template with CSS.</p>
                                    )}

                                    {editingTemplate.js_url ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">JavaScript</label>
                                            <textarea
                                                value={jsCode}
                                                onChange={(e) => setJsCode(e.target.value)}
                                                rows={6}
                                                className="w-full border rounded-lg p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-primary/50 outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">No JavaScript file linked. Add scripts in HTML or upload a template with JS.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Component for File Input
const FileInput = ({ label, icon, accept, onChange, file }: any) => (
    <div className="border border-dashed border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition-colors">
        <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
                {icon}
                <span className="font-medium">{label}</span>
            </div>
            <input type="file" accept={accept} onChange={onChange} className="hidden" />
            <span className={`text-xs px-2 py-1 rounded ${file ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {file ? 'Selected' : 'Select File'}
            </span>
        </label>
        {file && <div className="mt-1 text-xs text-gray-500 truncate pl-6">{file.name}</div>}
    </div>
);
