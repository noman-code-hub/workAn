import { Check, Crown, Zap, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Subscription = () => {
    const { user } = useAuth();

    const plans = [
        {
            name: 'Free',
            price: 0,
            period: 'forever',
            description: 'Perfect for getting started with your career journey',
            features: [
                'Basic job search',
                'Limited AI recommendations',
                'Resume upload (1 resume)',
                'Basic career insights',
                '5 job applications per month',
                'Community support',
            ],
            limitations: [
                'No advanced AI features',
                'Limited match scores',
            ],
            color: 'default',
            icon: Star,
            current: user?.subscription === 'free',
        },
        {
            name: 'Premium',
            price: 29,
            period: 'month',
            description: 'Unlock the full power of AI-driven career growth',
            features: [
                'Unlimited job search',
                'Advanced AI recommendations',
                'Unlimited resume uploads',
                'AI resume optimization',
                'Full match score analytics',
                'Unlimited applications',
                'Career trend predictions',
                'AI Copilot (unlimited)',
                'Interview preparation',
                'Priority support',
                'Early access to new features',
            ],
            popular: true,
            color: 'primary',
            icon: Crown,
            current: user?.subscription === 'premium',
        },
        {
            name: 'Enterprise',
            price: 99,
            period: 'month',
            description: 'For teams and organizations',
            features: [
                'Everything in Premium',
                'Team management (up to 10 members)',
                'Custom integrations',
                'API access',
                'Dedicated account manager',
                'Custom reporting',
                'Advanced analytics',
                'SSO/SAML authentication',
                'SLA guarantee',
            ],
            color: 'secondary',
            icon: Zap,
            current: (user?.subscription as any) === 'enterprise',
        },
    ];

    const features = [
        {
            title: 'AI-Powered Matching',
            description: 'Get personalized job recommendations using advanced AI algorithms',
        },
        {
            title: 'Resume Optimization',
            description: 'Improve your resume with AI-driven suggestions and ATS optimization',
        },
        {
            title: 'Career Insights',
            description: 'Access real-time market trends and salary data for informed decisions',
        },
        {
            title: 'Interview Prep',
            description: 'Practice with AI-generated interview questions tailored to your role',
        },
    ];

    return (
        <div className="subscription-page">
            <div className="page-header">
                <h1>Choose Your Plan</h1>
                <p>Unlock your career potential with the right plan for you</p>
            </div>

            {/* Pricing Cards */}
            <div className="pricing-grid">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    return (
                        <div
                            key={plan.name}
                            className={`pricing-card ${plan.popular ? 'popular' : ''} ${plan.current ? 'current' : ''}`}
                        >
                            {plan.popular && <div className="popular-badge">Most Popular</div>}
                            {plan.current && <div className="current-badge">Current Plan</div>}

                            <div className="plan-header">
                                <div className={`plan-icon plan-icon-${plan.color}`}>
                                    <Icon size={32} />
                                </div>
                                <h3>{plan.name}</h3>
                                <p className="plan-description">{plan.description}</p>
                            </div>

                            <div className="plan-price">
                                <span className="price-amount">${plan.price}</span>
                                <span className="price-period">/{plan.period}</span>
                            </div>

                            <button
                                className={`btn ${plan.current ? 'btn-ghost' : plan.popular ? 'btn-primary' : 'btn-secondary'} btn-block`}
                                disabled={plan.current}
                            >
                                {plan.current ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Upgrade Now'}
                            </button>

                            <div className="plan-features">
                                <div className="features-label">What's included:</div>
                                <ul>
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>
                                            <Check size={18} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                {plan.limitations && plan.limitations.length > 0 && (
                                    <>
                                        <div className="features-label limitations-label">Not included:</div>
                                        <ul className="limitations-list">
                                            {plan.limitations.map((limitation, index) => (
                                                <li key={index}>
                                                    <span className="limitation-icon">×</span>
                                                    {limitation}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Features Grid */}
            <div className="features-section">
                <h2>Why Choose Premium?</h2>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="feature-icon">
                                <Crown size={24} />
                            </div>
                            <h4>{feature.title}</h4>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ */}
            <div className="faq-section">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-grid">
                    <div className="faq-item">
                        <h4>Can I cancel anytime?</h4>
                        <p>Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period.</p>
                    </div>
                    <div className="faq-item">
                        <h4>What payment methods do you accept?</h4>
                        <p>We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Is there a free trial?</h4>
                        <p>Premium users get a 14-day free trial with full access to all features. No credit card required.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Can I upgrade or downgrade my plan?</h4>
                        <p>Absolutely! You can change your plan at any time. Changes take effect immediately.</p>
                    </div>
                </div>
            </div>

            <style>{`
        .subscription-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: var(--spacing-2xl);
        }

        .page-header h1 {
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-sm);
        }

        .page-header p {
          font-size: var(--font-size-xl);
          color: var(--color-text-secondary);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--spacing-xl);
          margin-bottom: var(--spacing-2xl);
        }

        .pricing-card {
          position: relative;
          background: var(--color-surface);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          transition: all var(--transition-base);
        }

        .pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
        }

        .pricing-card.popular {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .pricing-card.current {
          border-color: var(--color-success);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.03), rgba(22, 163, 74, 0.03));
        }

        .popular-badge {
          position: absolute;
          top: -12px;
          right: var(--spacing-xl);
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          color: white;
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .current-badge {
          position: absolute;
          top: -12px;
          right: var(--spacing-xl);
          background: var(--color-success);
          color: white;
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: 700;
          text-transform: uppercase;
        }

        .plan-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .plan-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto var(--spacing-md);
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .plan-icon-default {
          background: linear-gradient(135deg, #6b7280, #4b5563);
        }

        .plan-icon-primary {
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        }

        .plan-icon-secondary {
          background: linear-gradient(135deg, var(--color-secondary), #a855f7);
        }

        .plan-header h3 {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--spacing-sm);
        }

        .plan-description {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
        }

        .plan-price {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .price-amount {
          font-size: 3.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .price-period {
          color: var(--color-text-secondary);
          font-size: var(--font-size-lg);
        }

        .btn-block {
          width: 100%;
          margin-bottom: var(--spacing-xl);
        }

        .plan-features {
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--color-border);
        }

        .features-label {
          font-size: var(--font-size-sm);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-text-tertiary);
          margin-bottom: var(--spacing-md);
        }

        .limitations-label {
          margin-top: var(--spacing-lg);
        }

        .plan-features ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .plan-features li {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .plan-features li svg {
          color: var(--color-success);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .limitations-list li {
          opacity: 0.6;
        }

        .limitation-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-bg-tertiary);
          color: var(--color-text-tertiary);
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .features-section {
          margin-bottom: var(--spacing-2xl);
        }

        .features-section h2 {
          text-align: center;
          font-size: var(--font-size-2xl);
          margin-bottom: var(--spacing-xl);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--spacing-lg);
        }

        .feature-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          text-align: center;
        }

        .feature-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto var(--spacing-md);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
        }

        .feature-card h4 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
        }

        .feature-card p {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.6;
        }

        .faq-section h2 {
          text-align: center;
          font-size: var(--font-size-2xl);
          margin-bottom: var(--spacing-xl);
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--spacing-lg);
        }

        .faq-item {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
        }

        .faq-item h4 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
        }

        .faq-item p {
          color: var(--color-text-secondary);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }

          .price-amount {
            font-size: 2.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .faq-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .pricing-card {
            padding: var(--spacing-lg);
          }

          .price-amount {
            font-size: 2rem;
          }

          .page-header h1 {
            font-size: clamp(1.6rem, 5vw, 2rem);
          }

          .btn-block {
            min-height: 48px;
            font-size: 1rem;
          }
        }
      `}</style>
        </div>
    );
};
