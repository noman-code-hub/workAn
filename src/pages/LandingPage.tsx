import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Briefcase, MapPin, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const popularRoles = ['Remote Engineer', 'Product Manager', 'Data Scientist'];

const networkNodes = [
  { top: '13%', left: '12%' },
  { top: '22%', left: '30%' },
  { top: '13%', left: '47%' },
  { top: '33%', left: '63%' },
  { top: '58%', left: '30%' },
  { top: '69%', left: '47%' },
  { top: '45%', left: '20%' },
  { top: '45%', left: '57%' },
];

const networkLines = [
  { top: '15%', left: '13%', width: '18%', rotate: '15deg' },
  { top: '23%', left: '31%', width: '16%', rotate: '-13deg' },
  { top: '14%', left: '47%', width: '17%', rotate: '20deg' },
  { top: '24%', left: '31%', width: '18%', rotate: '63deg' },
  { top: '34%', left: '21%', width: '27%', rotate: '15deg' },
  { top: '45%', left: '20%', width: '10%', rotate: '-74deg' },
  { top: '59%', left: '31%', width: '16%', rotate: '17deg' },
  { top: '58%', left: '30%', width: '28%', rotate: '-14deg' },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();

    if (jobTitle.trim()) query.set('q', jobTitle.trim());
    if (location.trim()) query.set('location', location.trim());

    navigate(query.toString() ? `/jobs?${query.toString()}` : '/jobs');
  };

  return (
    <div className="landing-pro">
      <Header />
      <main className="landing-main">
        <div className="landing-aurora landing-aurora-a" aria-hidden="true" />
        <div className="landing-aurora landing-aurora-b" aria-hidden="true" />
        <div className="landing-grid" aria-hidden="true" />

        <section className="hero-shell">
          <div className="hero-network" aria-hidden="true">
            {networkLines.map((line, index) => (
              <span
                key={`line-${index}`}
                className="hero-network-line"
                style={{
                  top: line.top,
                  left: line.left,
                  width: line.width,
                  transform: `rotate(${line.rotate})`,
                }}
              />
            ))}
            {networkNodes.map((node, index) => (
              <span
                key={`node-${index}`}
                className="hero-network-node"
                style={{ top: node.top, left: node.left }}
              />
            ))}
          </div>

          <div className="hero-content">
            <div className="hero-kicker">
              <Sparkles size={16} />
              <span>AI Career Match Engine</span>
            </div>
            <h1 className="hero-title">
              Find the role that <span>fits your DNA.</span>
            </h1>
            <p className="hero-subtitle">
              Workshour uses advanced AI to analyze your skills and preferences, matching you
              with opportunities where you can truly thrive.
            </p>

            <form className="hero-search" onSubmit={handleSearch}>
              <label className="hero-search-field">
                <Search size={22} strokeWidth={2} />
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder="Job title, skills, or keywords"
                  aria-label="Job title, skills, or keywords"
                />
              </label>
              <label className="hero-search-field hero-search-location">
                <MapPin size={22} strokeWidth={2} />
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City, state, or remote"
                  aria-label="City, state, or remote"
                />
              </label>
              <button type="submit" className="hero-search-button">
                Search
              </button>
            </form>

            <div className="hero-popular">
              <span className="hero-popular-label">Popular:</span>
              <div className="hero-popular-chips">
                {popularRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className="hero-popular-chip"
                    onClick={() => setJobTitle(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="hero-insights">
              <article className="insight-card">
                <div className="insight-icon">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="insight-value">50k+</p>
                  <p className="insight-label">roles indexed daily</p>
                </div>
              </article>
              <article className="insight-card">
                <div className="insight-icon">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="insight-value">91%</p>
                  <p className="insight-label">higher relevance match</p>
                </div>
              </article>
            </div>
          </div>

          <button
            type="button"
            className="ai-chat-pill"
            onClick={() => navigate('/ai-copilot')}
            aria-label="Open AI Copilot"
          >
            <span>Chat with AI</span>
            <div className="ai-chat-icon-wrap">
              <Bot size={24} />
            </div>
          </button>
        </section>
      </main>
      <Footer />

      <style>{`
        .landing-pro {
          min-height: 100vh;
          background: #f5fbfb;
          display: flex;
          flex-direction: column;
        }

        .landing-main {
          position: relative;
          overflow: hidden;
          flex: 1;
          min-height: 620px;
          isolation: isolate;
        }

        .landing-aurora {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(32px);
          z-index: 0;
        }

        .landing-aurora-a {
          width: 420px;
          height: 420px;
          top: 80px;
          left: -110px;
          background: radial-gradient(circle at center, rgba(19, 197, 169, 0.22), rgba(19, 197, 169, 0));
        }

        .landing-aurora-b {
          width: 420px;
          height: 420px;
          bottom: -120px;
          right: -80px;
          background: radial-gradient(circle at center, rgba(27, 157, 255, 0.15), rgba(27, 157, 255, 0));
        }

        .landing-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(10, 33, 61, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(10, 33, 61, 0.03) 1px, transparent 1px);
          background-size: 54px 54px;
          z-index: 0;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), transparent 75%);
        }

        .hero-shell {
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          padding: 64px 24px;
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-network {
          position: absolute;
          inset: 30px 12px 0;
          pointer-events: none;
          opacity: 0.8;
          animation: networkFadeIn 900ms ease-out;
        }

        .hero-network-line {
          position: absolute;
          height: 1px;
          background: #c7eeea;
          transform-origin: left center;
        }

        .hero-network-node {
          position: absolute;
          width: 11px;
          height: 11px;
          margin-left: -5px;
          margin-top: -5px;
          border-radius: 50%;
          background: #c7eeea;
          box-shadow: 0 0 0 6px rgba(199, 238, 234, 0.25);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
          animation: heroRise 720ms cubic-bezier(0.2, 1, 0.3, 1);
        }

        .hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0d4f73;
          border: 1px solid #bfe6df;
          background: rgba(255, 255, 255, 0.72);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 0.84rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin-bottom: 10px;
          animation: fadeSlide 550ms ease-out both;
          animation-delay: 40ms;
        }

        .hero-title {
          margin: 0;
          font-size: clamp(2.2rem, 5vw, 4.5rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 800;
          color: #0d1532;
        }

        .hero-title span {
          background: linear-gradient(135deg, #0fc3a4 0%, #0aa7c9 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-subtitle {
          max-width: 650px;
          margin: 20px auto 0;
          color: #53627a;
          font-size: clamp(1.1rem, 1.6vw, 1.35rem);
          line-height: 1.5;
          text-align: center;
        }

        .hero-search {
          margin: 32px auto 0;
          width: min(100%, 800px);
          border: 1px solid #b4dfd8;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          display: grid;
          grid-template-columns: 1.2fr 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 8px;
          box-shadow: 0 20px 50px rgba(11, 77, 102, 0.15);
        }

        .hero-search-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          color: #9ca7bb;
        }

        .hero-search-location {
          border-left: 1px solid #e6ecf1;
        }

        .hero-search-field input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #1e293b;
          background: transparent;
        }

        .hero-search-button {
          height: 54px;
          min-width: 130px;
          border-radius: 999px;
          background: linear-gradient(135deg, #0fc3a4 0%, #0c9ec7 100%);
          color: white;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hero-search-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(12, 158, 199, 0.3);
        }

        .hero-popular {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .hero-popular-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
        }

        .hero-popular-chips {
          display: flex;
          gap: 10px;
        }

        .hero-popular-chip {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hero-popular-chip:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .hero-insights {
          margin-top: 48px;
          display: flex;
          justify-content: center;
          gap: 20px;
        }

        .insight-card {
          padding: 12px 20px;
          background: white;
          border: 1px solid #edf2f7;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .insight-icon {
          width: 40px;
          height: 40px;
          background: #f0fdfa;
          color: #0fc3a4;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .insight-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .insight-label {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .ai-chat-pill {
          position: fixed;
          right: 32px;
          bottom: 32px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #0fc3a4 0%, #0c9ec7 100%);
          color: white;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: none;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 15px 35px rgba(12, 158, 199, 0.4);
          z-index: 100;
          transition: all 0.3s;
        }

        .ai-chat-pill:hover {
          transform: translateY(-4px);
        }

        .ai-chat-icon-wrap {
          width: 32px;
          height: 32px;
          background: white;
          color: #0fc3a4;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes heroRise {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes networkFadeIn {
          from { opacity: 0; }
          to { opacity: 0.8; }
        }

        [data-theme="dark"] .landing-pro {
          background:
            radial-gradient(circle at 10% 8%, rgba(45, 212, 191, 0.12), transparent 26%),
            radial-gradient(circle at 90% 14%, rgba(56, 189, 248, 0.1), transparent 24%),
            linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
        }

        [data-theme="dark"] .landing-grid {
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
        }

        [data-theme="dark"] .hero-network-line,
        [data-theme="dark"] .hero-network-node {
          background: rgba(94, 234, 212, 0.28);
        }

        [data-theme="dark"] .hero-network-node {
          box-shadow: 0 0 0 6px rgba(45, 212, 191, 0.12);
        }

        [data-theme="dark"] .hero-kicker {
          color: #67e8f9;
          border-color: rgba(94, 234, 212, 0.24);
          background: rgba(15, 23, 42, 0.72);
        }

        [data-theme="dark"] .hero-title,
        [data-theme="dark"] .insight-value {
          color: #e5eef8;
        }

        [data-theme="dark"] .hero-subtitle,
        [data-theme="dark"] .hero-popular-label,
        [data-theme="dark"] .insight-label {
          color: #94a3b8;
        }

        [data-theme="dark"] .hero-search,
        [data-theme="dark"] .hero-popular-chip,
        [data-theme="dark"] .insight-card {
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          border-color: #243244;
          box-shadow: 0 20px 40px rgba(2, 6, 23, 0.35);
        }

        [data-theme="dark"] .hero-search-location {
          border-left-color: #243244;
        }

        [data-theme="dark"] .hero-search-field {
          color: #7c8ea5;
        }

        [data-theme="dark"] .hero-search-field input {
          background: transparent !important;
          color: #e5eef8 !important;
        }

        [data-theme="dark"] .hero-search-field input::placeholder {
          color: #7c8ea5 !important;
        }

        [data-theme="dark"] .hero-popular-chip {
          color: #dbe7f5;
        }

        [data-theme="dark"] .hero-popular-chip:hover {
          border-color: #2dd4bf;
          background: #0f172a;
        }

        [data-theme="dark"] .insight-icon {
          background: rgba(45, 212, 191, 0.14);
          color: #5eead4;
        }

        [data-theme="dark"] .ai-chat-icon-wrap {
          background: #0f172a;
          color: #5eead4;
        }

        @media (max-width: 1024px) {
          .hero-search { grid-template-columns: 1fr; border-radius: 24px; }
          .hero-search-location { border-left: none; border-top: 1px solid #edf2f7; }
        }

        @media (max-width: 768px) {
          .hero-popular { flex-wrap: wrap; }
          .hero-insights { flex-direction: column; align-items: center; }
          .ai-chat-pill span { display: none; }
          .ai-chat-pill { padding: 12px; }
        }
      `}</style>
    </div>
  );
};
