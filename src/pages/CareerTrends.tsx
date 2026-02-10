import { TrendingUp, TrendingDown, DollarSign, Users, Briefcase, Zap } from 'lucide-react';

export const CareerTrends = () => {
    // Mock trends data
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
            color: 'primary',
        },
        {
            title: 'AI Skills Premium',
            description: 'Professionals with AI/ML skills command 35% higher salaries than their peers in similar roles.',
            icon: Zap,
            color: 'warning',
        },
        {
            title: 'Competitive Talent Market',
            description: 'Tech unemployment at historic low of 2.1%, creating fierce competition for top talent.',
            icon: Users,
            color: 'success',
        },
        {
            title: 'Salary Growth Acceleration',
            description: 'Average tech salaries increased 12% this year, outpacing inflation by 2x.',
            icon: DollarSign,
            color: 'secondary',
        },
    ];

    const getDemandColor = (demand: string) => {
        if (demand === 'Very High') return 'var(--color-success)';
        if (demand === 'High') return 'var(--color-primary)';
        return 'var(--color-warning)';
    };

    return (
        <div className="trends-page">
            <div className="page-header">
                <div>
                    <h1>Career Trends & Insights</h1>
                    <p>Stay ahead with data-driven market intelligence</p>
                </div>
            </div>

            {/* Market Insights */}
            <div className="insights-grid">
                {insights.map((insight, index) => {
                    const Icon = insight.icon;
                    return (
                        <div key={index} className={`insight-card card-${insight.color}`}>
                            <div className="insight-icon">
                                <Icon size={24} />
                            </div>
                            <h3>{insight.title}</h3>
                            <p>{insight.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Trending Skills */}
            <div className="card">
                <div className="card-header-with-subtitle">
                    <div>
                        <h2>Trending Skills in 2024</h2>
                        <p>Top skills with highest growth and demand</p>
                    </div>
                </div>
                <div className="skills-list">
                    {trendingSkills.map((skill, index) => (
                        <div key={index} className="skill-item">
                            <div className="skill-header">
                                <div className="skill-info">
                                    <span className="skill-rank">#{index + 1}</span>
                                    <span className="skill-name">{skill.name}</span>
                                </div>
                                <div className="skill-meta">
                                    <span className="badge" style={{ backgroundColor: getDemandColor(skill.demand) }}>
                                        {skill.demand}
                                    </span>
                                    <span className="skill-salary">{skill.avgSalary}</span>
                                </div>
                            </div>
                            <div className="skill-growth">
                                <div className="growth-bar">
                                    <div
                                        className="growth-fill"
                                        style={{ width: `${skill.growth}%` }}
                                    />
                                </div>
                                <span className="growth-label">+{skill.growth}% growth</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Industry Trends */}
            <div className="card">
                <div className="card-header-with-subtitle">
                    <div>
                        <h2>Industry Growth Trends</h2>
                        <p>Year-over-year growth by industry sector</p>
                    </div>
                </div>
                <div className="industry-grid">
                    {industryTrends.map((industry, index) => (
                        <div key={index} className="industry-card">
                            <div className="industry-header">
                                <h4>{industry.industry}</h4>
                                {industry.trend === 'up' ? (
                                    <TrendingUp size={20} className="trend-up" />
                                ) : (
                                    <TrendingDown size={20} className="trend-down" />
                                )}
                            </div>
                            <div className="industry-stats">
                                <div className="industry-stat">
                                    <div className={`stat-value ${industry.trend === 'up' ? 'text-success' : 'text-danger'}`}>
                                        {industry.growth}
                                    </div>
                                    <div className="stat-label">Growth Rate</div>
                                </div>
                                <div className="industry-stat">
                                    <div className="stat-value">{industry.jobs}</div>
                                    <div className="stat-label">Open Positions</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .trends-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-xs);
        }

        .page-header p {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .insight-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          transition: all var(--transition-base);
        }

        .insight-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .insight-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--spacing-md);
        }

        .card-primary .insight-icon {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          color: var(--color-primary);
        }

        .card-warning .insight-icon {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1));
          color: var(--color-warning);
        }

        .card-success .insight-icon {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1));
          color: var(--color-success);
        }

        .card-secondary .insight-icon {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
          color: var(--color-secondary);
        }

        .insight-card h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
        }

        .insight-card p {
          color: var(--color-text-secondary);
          line-height: 1.6;
          font-size: var(--font-size-sm);
        }

        .card-header-with-subtitle {
          margin-bottom: var(--spacing-xl);
        }

        .card-header-with-subtitle h2 {
          font-size: var(--font-size-2xl);
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .card-header-with-subtitle p {
          color: var(--color-text-secondary);
        }

        .skills-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .skill-item {
          padding: var(--spacing-lg);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          transition: all var(--transition-base);
        }

        .skill-item:hover {
          background: var(--color-bg-tertiary);
        }

        .skill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .skill-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .skill-rank {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          color: white;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--font-size-sm);
        }

        .skill-name {
          font-weight: 600;
          font-size: var(--font-size-lg);
        }

        .skill-meta {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .skill-salary {
          font-weight: 700;
          color: var(--color-success);
          font-size: var(--font-size-lg);
        }

        .skill-growth {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .growth-bar {
          flex: 1;
          height: 8px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .growth-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
          border-radius: var(--radius-full);
          transition: width var(--transition-slow);
        }

        .growth-label {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .industry-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--spacing-lg);
        }

        .industry-card {
          padding: var(--spacing-lg);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          transition: all var(--transition-base);
        }

        .industry-card:hover {
          background: var(--color-bg-tertiary);
          transform: translateY(-2px);
        }

        .industry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .industry-header h4 {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .trend-up {
          color: var(--color-success);
        }

        .trend-down {
          color: var(--color-danger);
        }

        .industry-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }

        .industry-stat {
          text-align: center;
        }

        .stat-value {
          font-size: var(--font-size-xl);
          font-weight: 700;
          margin-bottom: var(--spacing-xs);
        }

        .stat-label {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
        }

        .text-danger {
          color: var(--color-danger);
        }

        @media (max-width: 768px) {
          .insights-grid {
            grid-template-columns: 1fr;
          }

          .industry-grid {
            grid-template-columns: 1fr;
          }

          .skill-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
          }
        }
      `}</style>
        </div>
    );
};
