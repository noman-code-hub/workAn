import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, CheckCircle2, ChevronDown,
  FileText, Sparkles, Star, Upload, Users, Zap,
  BarChart2, BookOpen, MessageSquare, Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import './ResumeBuilderLanding.css';

/* ── helpers ──────────────────── */
const slugify = (v: string) =>
  v.toLowerCase().replace(/\.html$/i,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'');

const NUM_START = 42_773;

/* ── static data ──────────────── */
const stat4 = [
  { icon: Users,     val: '8M+',  lbl: 'Total Users' },
  { icon: FileText,  val: '16M+', lbl: 'Total Resumes' },
  { icon: BookOpen,  val: '180+', lbl: 'Relevant Tips' },
  { icon: BarChart2, val: '50+',  lbl: 'Career Resources' },
];

const feat3 = [
  {
    color: 'blue',
    title: 'AI Writing Tools',
    desc: 'Get instant bullet suggestions that keep your tone professional and compelling.',
    bars: ['blue','','w80','w60','w70'],
  },
  {
    color: 'green',
    title: 'ATS Friendly Templates',
    desc: 'Every layout is tested to pass applicant tracking systems at top companies.',
    bars: ['','w80','green','w70','w50'],
  },
  {
    color: 'violet',
    title: 'Resume Score & Feedback',
    desc: 'Instant, actionable clarity on resume quality so you can improve before applying.',
    bars: ['w80','','w70','green','w60'],
  },
];

const logos = [
  { name: 'Google',    bg: '#4285F4', letter: 'G' },
  { name: 'Amazon',    bg: '#FF9900', letter: 'A' },
  { name: 'Microsoft', bg: '#00A4EF', letter: 'M' },
  { name: 'Apple',     bg: '#555555', letter: '' },
  { name: 'Meta',      bg: '#0866FF', letter: 'M' },
  { name: 'Accenture', bg: '#A100FF', letter: 'A' },
  { name: 'KPMG',      bg: '#00338D', letter: 'K' },
];

const beyondCards = [
  { bg: 'b1', icon: '📝', title: 'Auto-fill from LinkedIn', desc: 'Import your profile in one click and let AI structure your experience.', link: 'Learn more' },
  { bg: 'b2', icon: '✅', title: 'Built-in Spell Check',   desc: 'Polished wording without awkward typos, right inside the editor.', link: 'Learn more' },
  { bg: 'b3', icon: '💼', title: 'Cover Letter Builder',   desc: 'Generate a tailored cover letter that matches your resume in minutes.', link: 'Learn more' },
  { bg: 'b4', icon: '🎯', title: 'Job Match Score',        desc: 'See how well your resume aligns with any job description instantly.', link: 'Learn more' },
  { bg: 'b5', icon: '💬', title: 'Interview Prep',         desc: 'Practice prompts matched to your resume and the role you want.', link: 'Learn more' },
  { bg: 'b6', icon: '📊', title: 'Salary Analyzer',        desc: 'Understand your market worth before negotiating your next offer.', link: 'Learn more' },
];

const testimonials = [
  { name: 'Ayesha R.', role: 'Software Engineer', quote: 'My resume looked completely professional in minutes. I got interview callbacks the very same week!', rating: 5 },
  { name: 'Faisal K.', role: 'Product Manager',   quote: 'The templates are clean and the editor feels effortless. The AI suggestions saved me hours.', rating: 5 },
  { name: 'Mina A.',   role: 'Marketing Lead',    quote: 'The AI prompts helped me fix wording I had struggled with for months. 10/10 experience.', rating: 5 },
];

const blogs = [
  { cls: 'blog1', emoji: '📄', tag: 'Resume Tips', title: 'How to build a resume that gets you hired in 2024', desc: 'A step-by-step breakdown of what hiring managers actually look for.' },
  { cls: 'blog2', emoji: '💼', tag: 'Career Advice', title: 'Best resume format for every career stage', desc: 'Chronological, functional, or hybrid? We help you pick the right one.' },
  { cls: 'blog3', emoji: '🤖', tag: 'AI Tools', title: 'How to use AI to write a better resume', desc: 'Practical tips to leverage AI without making your resume sound robotic.' },
];

const faqs = [
  { q: 'What is the definition of a resume?', a: 'A resume is a concise document summarising your experience, skills, and education tailored to a specific job.' },
  { q: 'What is the difference between a CV and a resume?', a: 'A CV is longer and more comprehensive, while a resume is shorter and customised for a specific application.' },
  { q: 'How long should a resume be?', a: 'Most resumes should fit on one page. Senior professionals may use two pages when necessary.' },
  { q: 'What resume format should I choose?', a: 'Chronological works best for most candidates. We offer several formats to suit every career path.' },
  { q: 'Is this resume builder free to use?', a: 'Yes — you can build, preview, and download your resume completely free of charge.' },
  { q: 'Can I customise the resume templates?', a: 'Absolutely. Every section, colour, font, and layout can be adjusted inside the editor.' },
];

/* ── sub-components ──────────────────────────────────── */
function Stars({ n }: { n: number }) {
  return (
    <div className="rb-stars">
      {Array.from({ length: n }).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rb-faq-item${open ? ' open' : ''}`}>
      <button type="button" className="rb-faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <ChevronDown size={18} className="rb-faq-icon" />
      </button>
      {open && <p className="rb-faq-a">{a}</p>}
    </div>
  );
}

/* Mini resume mock for interview banner */
function MiniResume({ rotate }: { rotate: string }) {
  return (
    <div className="rb-iv-resume-card" style={{ transform: `rotate(${rotate})` }}>
      <div style={{ width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#38bdf8)',marginBottom:6 }} />
      {[80,60,100,70,85,55].map((w,i)=>(
        <div key={i} style={{ height:4,borderRadius:4,background:i===2?'#2563eb':'#e2e8f0',width:`${w}%`,marginBottom:3 }} />
      ))}
    </div>
  );
}

/* ── main ──────────────────────────────────────────────── */
export const ResumeBuilderLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { templates, templateLoading } = useResumeTemplate(user, { autoSelectFirst: false });
  const [count, setCount] = useState(NUM_START);

  useEffect(() => {
    const id = setInterval(() => setCount(p => p + Math.floor(Math.random() * 4 + 1)), 3500);
    return () => clearInterval(id);
  }, []);

  const previews = useMemo(
    () => templates
      .filter((template) => template.thumbnailUrl)
      .map((template) => ({ name: template.displayName, slug: slugify(template.name), thumb: template.thumbnailUrl }))
      .slice(0, 10),
    [templates],
  );

  const goTpl = () => navigate('/resume-builder/templates');

  return (
    <main className="rb">

      {/* ═══ 1. HERO ═══════════════════════════════════════ */}
      <section className="rb-hero">
        <div className="rb-hero-inner">
          {/* Left */}
          <div className="rb-hero-left">
            <span className="rb-badge"><Sparkles size={11} /> Resume Builder</span>
            <h1 className="rb-hero-h1">
              Resume Builder<br />
              gets you <em>hired faster</em>
            </h1>
            <p className="rb-hero-sub">
              Create a polished, ATS-friendly resume using guided sections,
              smart AI writing, and templates trusted by hiring teams worldwide.
            </p>
            <div className="rb-hero-ctas">
              <button type="button" className="rb-btn-primary" onClick={goTpl}>
                Create my resume <ArrowRight size={15} />
              </button>
              <button type="button" className="rb-btn-ghost" onClick={() => navigate('/resume-builder/editor?upload=1')}>
                <Upload size={15} /> Upload my resume
              </button>
            </div>
            <div className="rb-hero-trust">
              <span><Star size={12} fill="currentColor" /> 92% recommend us</span>
              <span><BadgeCheck size={12} /> ATS-optimised</span>
              <span><CheckCircle2 size={12} /> Free to use</span>
            </div>
          </div>

          {/* Right – visual */}
          <div className="rb-hero-right">
            {/* Floating resume mockup */}
            <img
              src="/images/hero-resume-lorna.jpg"
              alt="Free resume builder online preview with ATS-friendly resume template"
              className="rb-hero-resume-card"
              style={{ width: '220px', padding: 0, border: 'none', objectFit: 'cover', transform: 'translateX(-40px)', zIndex: 5 }}
            />
            {/* Floating score pill */}
            <div className="rb-score-float">
              <CheckCircle2 size={13} /> ATS Score: <strong>94%</strong>
            </div>
            {/* AI pill */}
            <div className="rb-ai-float">
              <Sparkles size={12} /> AI-enhanced
            </div>
            {/* Person photo */}
            <div style={{
              width:240, height:300, background:'linear-gradient(160deg,#bfdbfe,#dbeafe)',
              borderRadius:'120px 120px 0 0', position:'relative', zIndex:2,
              display:'flex', alignItems:'flex-end', justifyContent:'center',
              overflow:'hidden'
            }}>
              <img 
                src="/images/hero-woman.jpg" 
                alt="Job seeker using an online resume builder" 
                style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. BIG STAT + 4-STAT ════════════════════════ */}
      <div className="rb-bigstat">
        <div className="rb-bigstat-num">
          ✦ <span>{count.toLocaleString()}</span> resumes created today
        </div>
        <div style={{ height:32 }} />
        <div className="rb-stats4">
          {stat4.map(({ icon: Icon, val, lbl }) => (
            <div key={lbl} className="rb-stat4">
              <div className="rb-stat4-icon"><Icon size={18} /></div>
              <div className="rb-stat4-val">{val}</div>
              <div className="rb-stat4-lbl">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 3. FEATURES 3-COL ═══════════════════════════ */}
      <section className="rb-section">
        <span className="rb-section-tag">Why us</span>
        <h2>Everything you need is here…</h2>
        <p className="rb-section-sub">Built to help you land your next role — fast.</p>
        <div className="rb-feat3">
          {feat3.map(({ color, title, desc, bars }) => (
            <div key={title} className="rb-feat-card">
              <div className={`rb-feat-card-img ${color}`}>
                <div className="rb-mock-mini">
                  {bars.map((b, i) => (
                    <div key={i} className={`rb-mm-h ${b}`} />
                  ))}
                </div>
              </div>
              <div className="rb-feat-card-body">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 4. LOGOS ═════════════════════════════════════ */}
      <div className="rb-logos">
        <div className="rb-logos-inner">
          <span style={{ fontSize:'.8rem', color:'var(--muted)', whiteSpace:'nowrap' }}>
            Trusted by candidates hired at
          </span>
          {logos.map(({ name, bg, letter }) => (
            <div key={name} className="rb-logo-pill">
              <div className="rb-logo-dot" style={{ background: bg }}>
                {letter}
              </div>
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 5. TEMPLATE GALLERY ══════════════════════════ */}
      <section className="rb-section">
        <div className="rb-tpl-header">
          <div className="rb-tpl-header-left">
            <span className="rb-section-tag">Templates</span>
            <h2>Tested resume templates</h2>
            <p className="rb-section-sub">Pick a design and build it with AI — free.</p>
          </div>
          <button type="button" className="rb-btn-ghost" onClick={goTpl}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="rb-tpl-scroll-wrap">
          <div className="rb-tpl-scroll">
            {templateLoading && (
              [...Array(6)].map((_, i) => <div key={i} className="rb-tpl-sk" style={{width:174}} />)
            )}
            {!templateLoading && previews.map(t => (
              <div key={t.slug} className="rb-tpl-card" onClick={goTpl}>
                <div className="rb-tpl-thumb">
                  {t.thumb
                    ? <img src={t.thumb} alt={`${t.name} template preview from our free resume builder online`} loading="lazy" decoding="async" />
                    : <div className="rb-tpl-thumb-ph" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rb-tpl-cta">
          <button type="button" className="rb-btn-green" onClick={goTpl}>
            <Zap size={15} /> Build my resume
          </button>
        </div>
      </section>

      {/* ═══ 6. WAY BEYOND ════════════════════════════════ */}
      <div className="rb-beyond">
        <div className="rb-beyond-inner">
          <span className="rb-section-tag">Features</span>
          <h2>Way beyond a resume builder…</h2>
          <p className="rb-section-sub">A complete career toolkit in one place.</p>
          <div className="rb-beyond-grid">
            {beyondCards.map(({ bg, icon, title, desc, link }) => (
              <div key={title} className="rb-beyond-card">
                <div className={`rb-beyond-img ${bg}`}>
                  <span style={{ fontSize:'3rem' }}>{icon}</span>
                </div>
                <div className="rb-beyond-body">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <span className="rb-beyond-link">{link} <ArrowRight size={12} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 7. INTERVIEW BANNER ══════════════════════════ */}
      <section className="rb-interview">
        <div className="rb-interview-inner">
          <div>
            <span className="rb-interview-tag"><MessageSquare size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> Interview Prep</span>
            <h2>Get the interview with professional resume examples</h2>
            <p>Browse hundreds of role-specific resume examples crafted by industry experts to help you stand out and win interviews.</p>
            <button type="button" className="rb-btn-primary" onClick={goTpl}>
              Explore examples <ArrowRight size={15} />
            </button>
          </div>
          <div className="rb-interview-resumes">
            <MiniResume rotate="-5deg" />
            <MiniResume rotate="2deg" />
            <MiniResume rotate="-2deg" />
          </div>
        </div>
      </section>

      {/* ═══ 8. TESTIMONIALS ══════════════════════════════ */}
      <section className="rb-section">
        <div className="rb-testi-center">
          <span className="rb-section-tag"><Award size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> Reviews</span>
          <h2>92% of customers recommend us</h2>
          <p className="rb-section-sub">Thousands of job seekers trust us every day.</p>
        </div>
        <div className="rb-testi3">
          {testimonials.map(t => (
            <div key={t.name} className="rb-testi-card">
              <Stars n={t.rating} />
              <p className="rb-testi-quote">"{t.quote}"</p>
              <div className="rb-testi-author">
                <div className="rb-testi-avatar">{t.name[0]}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 9. BLOG / EXPERT ADVICE ══════════════════════ */}
      <section className="rb-section">
        <span className="rb-section-tag">Expert Advice</span>
        <h2>Need some expert advice?</h2>
        <p className="rb-section-sub">Read our guides to level up your job search.</p>
        <div className="rb-blog3">
          {blogs.map(({ cls, emoji, tag, title, desc }) => (
            <div key={title} className="rb-blog-card">
              <div className={`rb-blog-img ${cls}`}>
                <span className="rb-blog-emoji">{emoji}</span>
              </div>
              <div className="rb-blog-body">
                <span className="rb-blog-tag">{tag}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 10. FAQ ══════════════════════════════════════ */}
      <section className="rb-section" style={{ textAlign:'center' }}>
        <span className="rb-section-tag">FAQ</span>
        <h2>Frequently Asked Questions</h2>
        <p className="rb-section-sub">Everything you need to know before you start.</p>
        <div className="rb-faq-list">
          {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      <section className="rb-section rb-seo-copy" aria-labelledby="resume-builder-guide">
        <span className="rb-section-tag">Resume Builder Guide</span>
        <div className="rb-seo-intro">
          <p id="resume-builder-guide" className="rb-seo-lead">
            A strong resume builder should do more than fill a blank page. It should help you choose a layout, write clearer bullet points, keep formatting ATS-friendly, and move from draft to download on any device. Workshour is built for job seekers who want the best resume builder experience without slowing down the application process. Whether you need to update an older CV, generate resume online for a new role, or develop resume online while changing careers, the workflow keeps each step simple, readable, and fast.
          </p>
        </div>
        <div className="rb-seo-grid">
          <article className="rb-seo-card">
            <h2>AI Resume Builder Free Tools for Better First Drafts</h2>
            <h3>Resume builder AI suggestions that stay ATS-friendly</h3>
            <p>
              Our ai resume builder free workflow turns rough notes into polished content with guided prompts, achievement-focused suggestions, and live previews. Instead of forcing generic copy, the resume builder ai assistant helps you describe impact, quantify results, and tailor language for the role you want. That means less time staring at empty fields and more time sending applications that feel complete and professional.
            </p>
            <p>
              If you are comparing tools because you want the best resume builder for speed and clarity, useful AI matters most when it still sounds human. This resume builder keeps sections organized, preserves clean formatting, and helps you write content that sounds like you rather than a template packed with filler. The result is a stronger draft from the start, with less rewriting before you apply.
            </p>
          </article>
          <article className="rb-seo-card">
            <h2>Free Resume Builder With Download Free Options</h2>
            <h3>Resume builder free online editing without paywalls</h3>
            <p>
              Workshour is a resume builder free experience from the first edit to the final export. You can choose a design, customize sections, and use the resume builder download free option as soon as your document is ready. For users searching for a resume builder free online, that means you can start on a laptop, review on a phone, and finish quickly without adding extra steps to your job search.
            </p>
            <p>
              If you have tried Canva resume builder, Indeed resume builder, or a Canva resume maker workflow, you already know how frustrating it is when formatting breaks or downloads feel limited. Here, templates stay ATS-friendly, editing stays straightforward, and your final file is ready to share fast. The goal is simple: a free resume builder that helps you move from idea to application without friction.
            </p>
          </article>
          <article className="rb-seo-card">
            <h2>Resume Builder With Cover Letter Support</h2>
            <h3>Resume builder docs, templates, and matching workflows</h3>
            <p>
              Applications often need more than one document, which is why the resume builder cover letter workflow lives in the same experience. Your core details, tone, and job targets stay aligned, so you can create a matching resume and cover letter without rewriting everything from scratch. That makes it easier to send cohesive applications and keep your story consistent across every role you pursue.
            </p>
            <p>
              The platform also gives users the kind of practical guidance people often look for in resume builder docs. You can browse <Link to="/resume-builder/templates" className="rb-inline-link">resume templates</Link>, then continue into the <Link to="/resume-builder/editor" className="rb-inline-link">cover letter builder and editor</Link> to refine both documents in one place. Instead of juggling separate tools, you get one workflow for writing, reviewing, and exporting application materials.
            </p>
          </article>
          <article className="rb-seo-card">
            <h2>Online Resume Builder to Generate Resume Online</h2>
            <h3>Develop resume online from scratch, uploads, or templates</h3>
            <p>
              As an online resume builder, Workshour is designed for flexible, modern job searching. You can generate resume online from scratch, upload an existing file to improve it, or build from a template that matches your industry. The editor works across screen sizes, keeps the workflow easy to follow, and makes it easier to stay productive when you are applying to several jobs at once.
            </p>
            <p>
              For anyone who wants to develop resume online with cleaner structure and faster results, this page keeps the essentials close at hand: templates, AI writing support, cover letters, and free downloads. That combination is what makes a resume builder useful in practice. It is not just about creating a document; it is about building a stronger application package that is ready for hiring teams and ATS systems.
            </p>
          </article>
        </div>
      </section>

      {/* ═══ 11. FINAL CTA ════════════════════════════════ */}
      <section className="rb-final">
        <div className="rb-final-inner">
          <div>
            <h2>Join over {count.toLocaleString()} resume makers</h2>
            <p>Build a resume that matches modern hiring expectations — in minutes, for free.</p>
            <button type="button" className="rb-btn-primary" onClick={goTpl} style={{marginBottom:20}}>
              Create my resume <ArrowRight size={15} />
            </button>
            <div className="rb-final-logos">
              {['Apple','Google','Amazon','Microsoft','Meta'].map(l => (
                <span key={l} className="rb-final-logo">{l}</span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', userSelect:'none' }}>
            <img 
              src="/images/hero-woman.jpg" 
              alt="Job seeker profile from our free resume builder online" 
              style={{ width:160, height:160, borderRadius:'50%', objectFit:'cover', border:'4px solid #fff', boxShadow:'0 10px 25px rgba(0,0,0,0.1)' }} 
            />
          </div>
        </div>
      </section>

    </main>
  );
};
