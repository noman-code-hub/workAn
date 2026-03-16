import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';

const slugify = (v: string) =>
  v.toLowerCase().replace(/\.html$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const categories = ['All', 'Professional', 'Creative', 'Modern', 'Simple'];

export const ResumeBuilderTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templates, templateLoading, templateError } = useResumeTemplate(user, { autoSelectFirst: false });

  const templatesWithSlugs = useMemo(
    () => templates.map(t => ({ ...t, slug: slugify(t.name) })),
    [templates],
  );

  return (
    <div className="rbt-root">

      {/* top bar */}
      <div className="rbt-topbar">
        <div className="rbt-topbar-inner">
          <div className="rbt-back-wrap">
            <button type="button" className="rbt-back" onClick={() => navigate('/resume-builder')}>
              <ArrowLeft size={18} /> Back
            </button>
          </div>
          <div className="rbt-topbar-center">
            <h1>Choose a template</h1>
            <p>Select one to open the editor and start customising instantly.</p>
          </div>
        </div>
      </div>

      {/* category chips */}
      <div className="rbt-cats">
        {categories.map(c => (
          <button key={c} type="button" className={`rbt-cat${c === 'All' ? ' active' : ''}`}>{c}</button>
        ))}
      </div>

      {/* grid */}
      <div className="rbt-content">
        {templateLoading && (
          <div className="rbt-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rbt-card rbt-card--skeleton" />
            ))}
          </div>
        )}

        {!templateLoading && templateError && (
          <div className="rbt-state is-error">{templateError}</div>
        )}

        {!templateLoading && !templateError && templatesWithSlugs.length === 0 && (
          <div className="rbt-state">
            No templates found. Upload HTML files to the <code>resume_templates</code> bucket.
          </div>
        )}

        {!templateLoading && !templateError && templatesWithSlugs.length > 0 && (
          <div className="rbt-grid">
            {templatesWithSlugs.map(t => (
              <div key={t.name} className="rbt-card" onClick={() => navigate(`/resume-builder/editor?template=${t.slug}`)}>
                <div className="rbt-card-preview">
                  {t.thumbnailUrl ? (
                    <img
                      src={t.thumbnailUrl}
                      alt={`${t.displayName} template`}
                      loading="lazy"
                      decoding="async"
                      width={420}
                      height={594}
                    />
                  ) : (
                    <div className="rbt-card-placeholder">
                      <div className="rbt-paper" />
                    </div>
                  )}
                  <div className="rbt-card-overlay">
                    <button type="button" className="rbt-use-btn" onClick={() => navigate(`/resume-builder/editor?template=${t.slug}`)}>
                      <Sparkles size={14} /> Use template
                    </button>
                  </div>
                </div>
                <div className="rbt-card-meta">
                  <span className="rbt-card-name">{t.displayName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <style>{`
        .rbt-root {
          --blue: var(--color-primary, #17c9b0);
          --bg: var(--color-bg-primary, #f5f7fa);
          --card: var(--color-surface, #ffffff);
          --border: var(--color-border, #e2e8f0);
          --text: var(--color-text-primary, #0f172a);
          --muted: var(--color-text-secondary, #64748b);
          background: var(--bg);
          min-height: calc(100vh - 72px);
          font-family: var(--font-family, 'Inter', sans-serif);
          color: var(--text);
          padding-bottom: 60px;
        }

        /* TOP BAR */
        .rbt-topbar {
          background: var(--bg);
          padding: 60px 24px 32px;
        }
        .rbt-topbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .rbt-back-wrap {
          position: absolute;
          left: 0;
          display: flex;
          align-items: center;
        }
        .rbt-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #475569;
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          transition: all .2s;
          font-size: 1rem;
          cursor: pointer;
        }
        .rbt-back:hover { border-color: #94a3b8; color: #0f172a; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }

        .rbt-topbar-center { text-align: center; }
        .rbt-topbar-center h1 {
          font-size: clamp(1.8rem, 2.8vw, 2.4rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 12px;
        }
        .rbt-topbar-center p { color: #64748b; font-size: 1.05rem; margin: 0; }

        /* CATEGORIES */
        .rbt-cats {
          max-width: 1200px;
          margin: 0 auto 36px;
          padding: 0 24px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rbt-cat {
          padding: 8px 20px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 1rem;
          font-weight: 500;
          color: #475569;
          transition: all .2s;
          cursor: pointer;
        }
        .rbt-cat:hover {
          border-color: #94a3b8;
          color: #0f172a;
        }
        .rbt-cat.active {
          background: var(--blue);
          border-color: var(--blue);
          color: #ffffff;
        }

        /* CONTENT */
        .rbt-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .rbt-state {
          padding: 24px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid var(--border);
          color: var(--muted);
        }
        .rbt-state.is-error { color: #b91c1c; border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.06); }

        /* GRID */
        .rbt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        /* CARD */
        .rbt-card {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          overflow: hidden;
          cursor: pointer;
          transition: transform .25s ease, box-shadow .25s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .rbt-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px -16px rgba(0,0,0,0.12);
          border-color: #cbd5e1;
        }
        .rbt-card--skeleton {
          height: 400px;
          background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size: 200% auto;
          animation: rbt-shimmer 1.4s linear infinite;
        }
        @keyframes rbt-shimmer { to { background-position: -200% center; } }

        .rbt-card-preview { position: relative; background: #ffffff; flex-grow: 1; }
        .rbt-card-preview img { width: 100%; height: auto; display: block; object-fit: cover; }

        .rbt-card-placeholder { padding: 32px; height: 100%; display: flex; flex-direction: column; }
        .rbt-paper {
          flex: 1;
          width: 100%;
          aspect-ratio: 1 / 1.414;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid var(--border);
        }

        .rbt-card-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(15,23,42,.3);
          opacity: 0; transition: opacity .22s;
        }
        .rbt-card:hover .rbt-card-overlay { opacity: 1; }
        .rbt-use-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: #ffffff; color: #0f172a;
          padding: 12px 24px; border-radius: 999px;
          font-weight: 700; font-size: .9rem;
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
          transition: transform .15s;
          border: none;
        }
        .rbt-use-btn:hover { transform: scale(1.05); }

        .rbt-card-meta {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          border-top: 1px solid var(--border);
          background: #ffffff;
        }
        .rbt-card-name { font-weight: 800; font-size: 1rem; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }

        /* FOOTER */
        .rb-footer {
          border-top: 1px solid var(--border);
          padding: 48px 40px 32px;
          background: var(--card);
          font-size: .85rem;
          color: var(--muted);
        }
        .rb-footer-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; flex-wrap: wrap; justify-content: space-between; gap: 32px;
        }
        .rb-footer-logo {
          font-weight: 800; font-size: 1.2rem; color: var(--text); margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .rb-footer-nav {
          display: flex; gap: 32px; flex-wrap: wrap;
        }
        .rb-footer-col { display: flex; flex-direction: column; gap: 8px; }
        .rb-footer-col h4 { font-size: .9rem; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .rb-footer-col a { color: var(--muted); transition: color .2s; }
        .rb-footer-col a:hover { color: var(--blue); }
        .rb-footer-bottom {
          max-width: 1200px; margin: 32px auto 0; padding-top: 24px;
          border-top: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .rbt-topbar { padding: 40px 20px 24px; }
          .rbt-topbar-inner { flex-direction: column; align-items: flex-start; gap: 24px; }
          .rbt-back-wrap { position: static; }
          .rbt-topbar-center { text-align: left; }
          .rbt-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        }
        @media (max-width: 480px) {
          .rbt-topbar { padding: 24px 16px 20px; }
          .rbt-content, .rbt-cats { padding: 0 16px; margin-bottom: 24px; }
        }
      `}</style>
    </div>
  );
};
