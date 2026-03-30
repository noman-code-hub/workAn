import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';

const slugifyTemplate = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.html$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const getTemplateSlug = (name: string) => slugifyTemplate(name);

export const ResumeTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templates, templateLoading, templateError } = useResumeTemplate(user, { autoSelectFirst: false });

  const templatesWithSlugs = useMemo(
    () => templates.map((template) => ({ ...template, slug: getTemplateSlug(template.name) })),
    [templates]
  );

  return (
    <div className="resume-templates-page">
      <section className="resume-hero is-templates">
        <div className="resume-hero-content">
          <h1>Resume <span className="highlight">Templates</span></h1>
          <p className="subtitle">
            Choose a template to open the full-screen resume editor.
          </p>
        </div>
      </section>

      <div className="resume-content">
        <section className="template-gallery">
          {templateLoading ? (
            <div className="template-state">Loading templates...</div>
          ) : templateError ? (
            <div className="template-state template-error">{templateError}</div>
          ) : templatesWithSlugs.length === 0 ? (
            <div className="template-state">
              No templates available. Upload HTML files to the resume_templates bucket.
            </div>
          ) : (
            <div className="template-compact-grid">
              {templatesWithSlugs.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className="template-card-compact"
                  onClick={() => navigate(`/resume-editor/${t.slug}`)}
                >
                  <div className="template-card-compact-preview">
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
                      <div className="template-preview-placeholder">
                        <div className="template-preview-paper" />
                      </div>
                    )}
                  </div>
                  <div className="template-card-compact-content">
                    <div className="template-card-compact-header">
                      <h3 className="template-card-compact-title">{t.displayName}</h3>
                    </div>
                    <div className="template-card-compact-footer">
                      <span className="template-tag-compact">Edit</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .resume-templates-page {
          background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          min-height: calc(100vh - 72px);
        }

        .resume-hero {
          margin: 24px auto 16px;
          padding: 48px 24px;
          max-width: 1200px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 20px 36px -30px rgba(15, 23, 42, 0.35);
          text-align: center;
        }

        .resume-hero h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
        }

        .resume-hero .subtitle {
          margin-top: 10px;
          color: #64748b;
        }

        .resume-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px 32px;
        }

        .template-gallery {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .template-state {
          padding: 20px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
        }

        .template-state.template-error {
          color: #b91c1c;
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.08);
        }

        .template-compact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .template-card-compact {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          overflow: hidden;
          text-align: left;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .template-card-compact:hover {
          transform: translateY(-2px);
          border-color: #2563eb;
          box-shadow: 0 16px 28px -20px rgba(37, 99, 235, 0.5);
        }

        .template-card-compact-preview {
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          aspect-ratio: 210 / 297;
          overflow: hidden;
        }

        .template-card-compact-preview img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: top center;
        }

        .template-card-compact-content {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .template-card-compact-title {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.95rem;
        }

        .template-tag-compact {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.1);
          color: #1d4ed8;
          font-size: 0.7rem;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .resume-hero {
            margin: 16px 16px 12px;
            padding: 32px 16px;
          }

          .resume-content {
            padding: 0 16px 24px;
          }
        }
      `}</style>
    </div>
  );
};
