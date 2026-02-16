import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Briefcase, MapPin, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';

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
              CareerPilot uses advanced AI to analyze your skills and preferences, matching you
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

      <style>{`
        .landing-pro {
          min-height: 100vh;
          background: #f5fbfb;
        }

        .landing-main {
          position: relative;
          overflow: hidden;
          height: calc(100vh - 72px);
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
          padding: 24px 24px 18px;
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
          font-size: clamp(2rem, 4.8vw, 4.2rem);
          line-height: 1.06;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: #0d1532;
          animation: fadeSlide 620ms ease-out both;
          animation-delay: 130ms;
        }

        .hero-title span {
          color: #0fc3a4;
          background-image: linear-gradient(120deg, #0fc3a4 0%, #0aa7c9 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-subtitle {
          max-width: 650px;
          margin: 14px auto 0;
          color: #53627a;
          font-size: clamp(1rem, 1.55vw, 1.25rem);
          line-height: 1.42;
          padding-left: 10px;
          border-left: 2px solid #d6e4f2;
          text-align: left;
          animation: fadeSlide 680ms ease-out both;
          animation-delay: 220ms;
        }

        .hero-search {
          margin: 20px auto 0;
          width: min(100%, 960px);
          border: 1px solid #b4dfd8;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          display: grid;
          grid-template-columns: 1.2fr 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 7px;
          box-shadow: 0 14px 42px rgba(11, 77, 102, 0.12);
          animation: fadeSlide 780ms ease-out both;
          animation-delay: 300ms;
        }

        .hero-search-field {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 50px;
          padding: 0 10px;
          color: #9ca7bb;
        }

        .hero-search-location {
          border-left: 1px solid #e6ecf1;
        }

        .hero-search-field input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 0.95rem;
          color: #2f3b52;
          background: transparent;
        }

        .hero-search-field input::placeholder {
          color: #9ca7bb;
        }

        .hero-search-button {
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #0fc3a4 0%, #0c9ec7 100%);
          color: #ffffff;
          min-width: 140px;
          height: 50px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .hero-search-button:hover {
          background: linear-gradient(135deg, #0db999 0%, #0a8db3 100%);
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(10, 141, 179, 0.32);
        }

        .hero-popular {
          margin-top: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          animation: fadeSlide 850ms ease-out both;
          animation-delay: 380ms;
        }

        .hero-popular-label {
          font-size: 0.9rem;
          color: #6f7d94;
          font-weight: 700;
        }

        .hero-popular-chips {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .hero-popular-chip {
          border: 1px solid #d5dde6;
          background: rgba(255, 255, 255, 0.72);
          color: #223049;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }

        .hero-popular-chip:hover {
          background: #ffffff;
          border-color: #b8c8d9;
          transform: translateY(-1px);
        }

        .hero-insights {
          margin-top: 14px;
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          animation: fadeSlide 900ms ease-out both;
          animation-delay: 470ms;
        }

        .insight-card {
          margin: 0;
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 11px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid #dce8ee;
          box-shadow: 0 8px 20px rgba(31, 60, 77, 0.08);
          text-align: left;
        }

        .insight-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0fc3a4 0%, #0b9ebd 100%);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .insight-value {
          margin: 0;
          color: #11203f;
          font-size: 0.9rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .insight-label {
          margin: 2px 0 0;
          color: #6a7892;
          font-size: 0.74rem;
          font-weight: 600;
        }

        .ai-chat-pill {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: linear-gradient(160deg, #0fc3a4 0%, #0c9ec7 100%);
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          gap: 12px;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          border-radius: 12px 0 0 12px;
          padding: 12px 9px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(12, 158, 199, 0.34);
          z-index: 60;
        }

        .ai-chat-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.95);
          color: #11c4a6;
          writing-mode: horizontal-tb;
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroRise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes networkFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 0.8;
          }
        }

        @media (max-width: 1024px) {
          .landing-main {
            height: auto;
            min-height: calc(100vh - 72px);
          }

          .hero-shell {
            height: auto;
            padding-top: 20px;
            padding-bottom: 24px;
          }

          .hero-content {
            margin-top: 0;
          }

          .hero-subtitle {
            text-align: center;
            border-left: none;
            padding-left: 0;
          }

          .hero-search {
            grid-template-columns: 1fr;
            border-radius: 26px;
            gap: 0;
            padding: 8px;
          }

          .hero-search-location {
            border-left: none;
            border-top: 1px solid #e6ecf1;
          }

          .hero-search-button {
            width: 100%;
            min-width: 0;
            border-radius: 18px;
            margin-top: 8px;
          }

          .hero-insights {
            margin-top: 14px;
          }

          .ai-chat-pill {
            top: auto;
            bottom: 18px;
            transform: none;
            writing-mode: horizontal-tb;
            border-radius: 14px;
            right: 18px;
            padding: 12px 16px;
            font-size: 0.86rem;
          }
        }

        @media (max-width: 640px) {
          .landing-main {
            min-height: auto;
            height: auto;
          }

          .hero-shell {
            display: block;
            padding-left: 14px;
            padding-right: 14px;
            padding-top: 14px;
            padding-bottom: 92px;
          }

          .hero-network {
            display: none;
          }

          .landing-grid {
            background-size: 34px 34px;
          }

          .hero-content {
            text-align: left;
            max-width: 100%;
          }

          .hero-kicker {
            font-size: 0.74rem;
            padding: 5px 10px;
            margin-bottom: 12px;
          }

          .hero-title {
            font-size: clamp(1.95rem, 9vw, 2.4rem);
            line-height: 1.08;
          }

          .hero-subtitle {
            max-width: 100%;
            font-size: 0.92rem;
            text-align: left;
            border-left: none;
            padding-left: 0;
            margin-top: 12px;
          }

          .hero-search-field {
            min-height: 48px;
            padding: 0 8px;
          }

          .hero-search {
            margin-top: 16px;
            border-radius: 20px;
            padding: 8px;
          }

          .hero-search-location {
            border-top: 1px solid #e2e8ef;
          }

          .hero-search-button {
            height: 46px;
            border-radius: 12px;
          }

          .hero-popular {
            margin-top: 14px;
            display: block;
          }

          .hero-popular-label {
            display: block;
            font-size: 0.8rem;
            margin-bottom: 8px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .hero-popular-chips {
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 2px;
            scrollbar-width: none;
          }

          .hero-popular-chips::-webkit-scrollbar {
            display: none;
          }

          .hero-popular-chip {
            font-size: 0.82rem;
            padding: 8px 12px;
            white-space: nowrap;
          }

          .hero-insights {
            margin-top: 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .insight-card {
            min-width: 0;
            width: 100%;
            gap: 8px;
            padding: 8px;
            border-radius: 12px;
          }

          .insight-icon {
            width: 28px;
            height: 28px;
          }

          .ai-chat-pill {
            right: 12px;
            bottom: 12px;
            padding: 10px 12px;
            border-radius: 999px;
            box-shadow: 0 8px 24px rgba(12, 158, 199, 0.3);
          }

          .ai-chat-icon-wrap {
            width: 28px;
            height: 28px;
          }
        }

        @media (max-width: 420px) {
          .hero-title {
            font-size: 1.8rem;
          }

          .hero-subtitle {
            font-size: 0.88rem;
            line-height: 1.38;
          }

          .hero-insights {
            grid-template-columns: 1fr;
          }

          .ai-chat-pill span {
            display: none;
          }

          .ai-chat-pill {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
};
