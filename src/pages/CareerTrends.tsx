import type { CSSProperties } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  DollarSign,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export const CareerTrends = () => {
  const trendingSkills = [
    { name: 'AI/Machine Learning', growth: 85, demand: 'Very High', avgSalary: '$145k' },
    { name: 'Cloud Computing', growth: 72, demand: 'High', avgSalary: '$130k' },
    { name: 'Cybersecurity', growth: 68, demand: 'Very High', avgSalary: '$125k' },
    { name: 'DevOps', growth: 65, demand: 'High', avgSalary: '$120k' },
    { name: 'React/Frontend', growth: 58, demand: 'High', avgSalary: '$110k' },
    { name: 'Data Science', growth: 55, demand: 'Medium', avgSalary: '$135k' },
  ];

  const industryTrends = [
    { industry: 'Technology', growth: '+24%', jobs: '125K', trend: 'up' },
    { industry: 'Healthcare', growth: '+18%', jobs: '98K', trend: 'up' },
    { industry: 'Finance', growth: '+12%', jobs: '76K', trend: 'up' },
    { industry: 'E-commerce', growth: '+15%', jobs: '64K', trend: 'up' },
    { industry: 'Manufacturing', growth: '-5%', jobs: '42K', trend: 'down' },
    { industry: 'Retail', growth: '-8%', jobs: '38K', trend: 'down' },
  ];

  const insights = [
    {
      title: 'Remote Work Revolution',
      description: 'Remote positions increased by 340% year-over-year, with hybrid models becoming the new standard.',
      icon: Briefcase,
      tone: 'primary',
    },
    {
      title: 'AI Skills Premium',
      description: 'Professionals with AI/ML skills command 35% higher salaries than their peers in similar roles.',
      icon: Zap,
      tone: 'warning',
    },
    {
      title: 'Competitive Talent Market',
      description: 'Tech unemployment at historic low of 2.1%, creating fierce competition for top talent.',
      icon: Users,
      tone: 'success',
    },
    {
      title: 'Salary Growth Acceleration',
      description: 'Average tech salaries increased 12% this year, outpacing inflation by 2x.',
      icon: DollarSign,
      tone: 'secondary',
    },
  ];

  const snapshot = [
    { label: 'Hot Skills', value: `${trendingSkills.length}`, note: 'with rising demand', icon: Sparkles },
    { label: 'Industries Tracking Up', value: `${industryTrends.filter((i) => i.trend === 'up').length}`, note: 'high-growth sectors', icon: TrendingUp },
    { label: 'Top Salary Band', value: '$145k', note: 'for AI roles', icon: DollarSign },
    { label: 'Open Roles', value: '443K+', note: 'across listed sectors', icon: BarChart3 },
  ];

  const demandClass = (demand: string) => {
    if (demand === 'Very High') return 'demand-vhigh';
    if (demand === 'High') return 'demand-high';
    return 'demand-medium';
  };

  const stagger = (index: number, delay = 0): CSSProperties => ({
    ['--i' as string]: index,
    ['--d' as string]: `${delay}ms`,
  });

  return (
    <div className="trends-pro">
      <div className="trends-glow trends-glow-a" />
      <div className="trends-glow trends-glow-b" />

      <section className="trends-hero trends-panel trends-fade delay-0">
        <div className="hero-copy">
          <p className="hero-kicker">Career Intelligence</p>
          <h1>Trends That Shape Your Next Move</h1>
          <p>
            Follow real market signals, salary shifts, and in-demand skill trajectories
            to plan your career with confidence.
          </p>
        </div>
        <div className="hero-stats">
          {snapshot.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="hero-stat trends-fade delay-1" style={stagger(index, 90)}>
                <div className="hero-stat-icon"><Icon size={16} /></div>
                <div>
                  <small>{item.label}</small>
                  <h3>{item.value}</h3>
                  <p>{item.note}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="insights-grid">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <article
              key={insight.title}
              className={`insight-card tone-${insight.tone} trends-fade delay-1`}
              style={stagger(index)}
            >
              <div className="insight-icon">
                <Icon size={20} />
              </div>
              <h3>{insight.title}</h3>
              <p>{insight.description}</p>
            </article>
          );
        })}
      </section>

      <section className="trends-panel trends-fade delay-2">
        <div className="section-head">
          <div>
            <h2>Top Skills Momentum</h2>
            <p>Skills with strongest growth and compensation outlook.</p>
          </div>
          <span className="section-chip">2026 Outlook</span>
        </div>

        <div className="skills-list">
          {trendingSkills.map((skill, index) => (
            <article key={skill.name} className="skill-card trends-fade delay-2" style={stagger(index, 120)}>
              <div className="skill-top">
                <div className="skill-title-wrap">
                  <span className="skill-rank">#{index + 1}</span>
                  <div>
                    <h3>{skill.name}</h3>
                    <small>Projected growth trend</small>
                  </div>
                </div>
                <div className="skill-meta">
                  <span className={`demand-pill ${demandClass(skill.demand)}`}>{skill.demand}</span>
                  <span className="skill-salary">{skill.avgSalary}</span>
                </div>
              </div>

              <div className="skill-progress-row">
                <div className="skill-progress">
                  <span style={{ width: `${skill.growth}%` }} />
                </div>
                <span className="growth-value">+{skill.growth}%</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="trends-panel trends-fade delay-3">
        <div className="section-head">
          <div>
            <h2>Industry Growth Signals</h2>
            <p>Sector-level expansion and open role momentum.</p>
          </div>
          <span className="section-chip">Year-over-Year</span>
        </div>

        <div className="industry-grid">
          {industryTrends.map((industry, index) => (
            <article key={industry.industry} className="industry-card trends-fade delay-3" style={stagger(index)}>
              <div className="industry-head">
                <h3>{industry.industry}</h3>
                {industry.trend === 'up' ? (
                  <span className="trend trend-up"><TrendingUp size={18} /> Rising</span>
                ) : (
                  <span className="trend trend-down"><TrendingDown size={18} /> Cooling</span>
                )}
              </div>

              <div className="industry-stats">
                <div>
                  <small>Growth Rate</small>
                  <strong className={industry.trend === 'up' ? 'text-up' : 'text-down'}>{industry.growth}</strong>
                </div>
                <div>
                  <small>Open Positions</small>
                  <strong>{industry.jobs}</strong>
                </div>
              </div>

              <button className="industry-link">
                Explore roles
                <ArrowUpRight size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Manrope:wght@500;600;700&display=swap');

        .trends-pro {
          --tr-ease: cubic-bezier(0.22, 1, 0.36, 1);
          width: 100%;
          position: relative;
          display: grid;
          gap: 16px;
          padding-bottom: 6px;
          isolation: isolate;
        }

        .trends-glow {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 999px;
          filter: blur(84px);
          z-index: -1;
          opacity: 0.35;
          pointer-events: none;
          animation: tr-drift 10s ease-in-out infinite alternate;
        }

        .trends-glow-a {
          top: -120px;
          right: 7%;
          background: #67e8f9;
        }

        .trends-glow-b {
          bottom: 6%;
          left: -90px;
          background: #5eead4;
          animation-delay: -3s;
        }

        .trends-fade {
          opacity: 0;
          transform: translateY(14px) scale(0.986);
          animation: tr-rise 620ms var(--tr-ease) forwards;
          animation-delay: calc(var(--d, 0ms) + var(--i, 0) * 72ms);
        }

        .delay-0 { --d: 20ms; }
        .delay-1 { --d: 80ms; }
        .delay-2 { --d: 120ms; }
        .delay-3 { --d: 160ms; }

        .trends-panel {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), #ffffff);
          border: 1px solid #dbe5ef;
          border-radius: 20px;
          box-shadow: 0 22px 40px -34px rgba(15, 23, 42, 0.45);
          padding: 18px;
        }

        .trends-hero {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 16px;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.16), transparent 42%),
            linear-gradient(145deg, #ffffff 0%, #f7fbff 100%);
        }

        .hero-kicker {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #0f766e;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: 'Manrope', var(--font-family);
        }

        .hero-copy h1 {
          margin: 10px 0;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
          font-size: clamp(1.85rem, 3.5vw, 2.6rem);
          line-height: 1.07;
          letter-spacing: -0.03em;
          color: #0f172a;
        }

        .hero-copy p {
          margin: 0;
          color: #64748b;
          max-width: 60ch;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .hero-stat {
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          background: #ffffff;
          padding: 12px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          transition: transform 200ms var(--tr-ease), border-color 200ms ease;
        }

        .hero-stat:hover {
          transform: translateY(-2px);
          border-color: #99f6e4;
        }

        .hero-stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          flex-shrink: 0;
        }

        .hero-stat h3 {
          margin: 2px 0;
          font-size: 1.18rem;
          line-height: 1.1;
          color: #0f172a;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
        }

        .hero-stat small {
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .hero-stat p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.72rem;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .insight-card {
          border: 1px solid #dbe5ef;
          border-radius: 16px;
          background: #ffffff;
          padding: 14px;
          transition: transform 200ms var(--tr-ease), box-shadow 200ms var(--tr-ease), border-color 200ms ease;
        }

        .insight-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 30px -30px rgba(15, 23, 42, 0.8);
          border-color: #bae6fd;
        }

        .insight-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
        }

        .tone-primary .insight-icon {
          background: linear-gradient(145deg, rgba(20, 184, 166, 0.18), rgba(14, 165, 233, 0.18));
          color: #0f766e;
        }

        .tone-warning .insight-icon {
          background: linear-gradient(145deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.16));
          color: #b45309;
        }

        .tone-success .insight-icon {
          background: linear-gradient(145deg, rgba(16, 185, 129, 0.19), rgba(52, 211, 153, 0.16));
          color: #047857;
        }

        .tone-secondary .insight-icon {
          background: linear-gradient(145deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.15));
          color: #6d28d9;
        }

        .insight-card h3 {
          margin: 0 0 6px;
          font-size: 0.98rem;
          line-height: 1.2;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
        }

        .insight-card p {
          margin: 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.5;
        }

        .section-head {
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .section-head h2 {
          margin: 0;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
          font-size: 1.2rem;
          color: #0f172a;
        }

        .section-head p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.86rem;
        }

        .section-chip {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          color: #0c4a6e;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .skills-list {
          display: grid;
          gap: 10px;
        }

        .skill-card {
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          padding: 12px;
          background: linear-gradient(165deg, #ffffff, #f9fbff);
          transition: transform 200ms var(--tr-ease), border-color 200ms ease, box-shadow 200ms var(--tr-ease);
        }

        .skill-card:hover {
          transform: translateY(-2px);
          border-color: #99f6e4;
          box-shadow: 0 16px 24px -24px rgba(15, 23, 42, 0.85);
        }

        .skill-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .skill-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .skill-rank {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.8rem;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          flex-shrink: 0;
        }

        .skill-title-wrap h3 {
          margin: 0;
          font-size: 0.97rem;
          line-height: 1.2;
          color: #0f172a;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
        }

        .skill-title-wrap small {
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .skill-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .demand-pill {
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .demand-vhigh {
          background: #ecfdf5;
          color: #047857;
          border-color: #a7f3d0;
        }

        .demand-high {
          background: #ecfeff;
          color: #0e7490;
          border-color: #a5f3fc;
        }

        .demand-medium {
          background: #fffbeb;
          color: #b45309;
          border-color: #fde68a;
        }

        .skill-salary {
          color: #0f766e;
          font-size: 0.86rem;
          font-weight: 700;
        }

        .skill-progress-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .skill-progress {
          flex: 1;
          height: 8px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .skill-progress span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #14b8a6, #0ea5e9);
          border-radius: 999px;
          animation: tr-fill 900ms var(--tr-ease) both;
        }

        .growth-value {
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          min-width: 56px;
          text-align: right;
        }

        .industry-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .industry-card {
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          padding: 12px;
          background: #ffffff;
          display: grid;
          gap: 10px;
          transition: transform 200ms var(--tr-ease), border-color 200ms ease, box-shadow 200ms var(--tr-ease);
        }

        .industry-card:hover {
          transform: translateY(-2px);
          border-color: #bae6fd;
          box-shadow: 0 18px 24px -24px rgba(15, 23, 42, 0.82);
        }

        .industry-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .industry-head h3 {
          margin: 0;
          font-size: 0.95rem;
          color: #0f172a;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
        }

        .trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .trend-up { color: #047857; }
        .trend-down { color: #b91c1c; }

        .industry-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .industry-stats small {
          display: block;
          color: #94a3b8;
          font-size: 0.7rem;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .industry-stats strong {
          color: #0f172a;
          font-size: 1rem;
          line-height: 1;
        }

        .industry-stats .text-up { color: #047857; }
        .industry-stats .text-down { color: #b91c1c; }

        .industry-link {
          margin-top: 2px;
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          background: #ffffff;
          color: #334155;
          padding: 8px 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 180ms var(--tr-ease), border-color 180ms ease, color 180ms ease;
        }

        .industry-link:hover {
          transform: translateY(-1px);
          border-color: #14b8a6;
          color: #0f766e;
        }

        @keyframes tr-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.986); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes tr-fill {
          from { width: 0 !important; }
          to { width: inherit; }
        }

        @keyframes tr-drift {
          from { transform: translateY(0) translateX(0); }
          to { transform: translateY(-12px) translateX(10px); }
        }

        @media (max-width: 1100px) {
          .trends-hero {
            grid-template-columns: 1fr;
          }

          .hero-stats {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .insights-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .industry-grid {
            grid-template-columns: 1fr;
          }

          .hero-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .trends-panel {
            padding: 12px;
            border-radius: 14px;
          }

          .insights-grid,
          .hero-stats {
            grid-template-columns: 1fr;
          }

          .section-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .skill-top {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .trends-pro *,
          .trends-glow {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};
