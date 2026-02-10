import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Lightbulb, TrendingUp, FileText, User, Bot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ChatMessage } from '../types';

export const AICopilot = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial greeting
        const greeting: ChatMessage = {
            id: '1',
            role: 'assistant',
            content: `Hello ${user?.name}! 👋 I'm your AI Career Copilot. I can help you with:\n\n• Finding jobs that match your skills\n• Improving your resume\n• Career guidance and trends\n• Interview preparation\n• Skill development advice\n\nWhat would you like to know?`,
            timestamp: new Date(),
        };
        setMessages([greeting]);
    }, [user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Simulate AI response
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const aiResponse = generateAIResponse(input);
        const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
    };

    const generateAIResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('job') || lowerQuery.includes('position')) {
            return `Based on your profile as a **${user?.profession || 'professional'}**, I recommend focusing on:\n\n🎯 **Top Matches:**\n- Senior Full Stack Developer positions\n- Remote-first companies\n- Tech companies with strong AI/ML focus\n\n💡 **Tips:**\n- Update your LinkedIn with recent projects\n- Highlight your experience with ${user?.skills?.[0] || 'key technologies'}\n- Consider companies like TechCorp, Innovate Labs, and DataTech\n\nWould you like me to show you specific job listings?`;
        }

        if (lowerQuery.includes('resume') || lowerQuery.includes('cv')) {
            return `Let me help you optimize your resume! Here are key recommendations:\n\n📝 **Structure:**\n- Start with a strong summary highlighting your ${user?.interviewReadinessScore || 0}% readiness score\n- Use action verbs (Built, Designed, Implemented)\n- Quantify achievements with metrics\n\n✨ **Keywords to Include:**\n- ${user?.skills?.slice(0, 3).join(', ')}\n- Agile/Scrum methodologies\n- Team leadership\n\n🎯 **ATS Optimization:**\n- Use standard section headers\n- Avoid images and complex formatting\n- Include relevant keywords from job descriptions\n\nWould you like me to analyze your current resume?`;
        }

        if (lowerQuery.includes('trend') || lowerQuery.includes('future') || lowerQuery.includes('outlook')) {
            return `Great question! Here's the outlook for **${user?.profession || 'your field'}**:\n\n📈 **Growth Projections:**\n- **+25%** job growth over next 3 years\n- Average salary: $120k - $180k\n- High demand in AI/ML and cloud technologies\n\n🔥 **Hot Skills:**\n1. AI/Machine Learning\n2. Cloud Architecture (AWS, Azure)\n3. TypeScript & Modern Frameworks\n4. DevOps & CI/CD\n5. System Design\n\n💼 **Market Insights:**\n- Remote positions increased by 40%\n- Companies prioritizing full-stack versatility\n- Strong demand for senior-level talent\n\nWant to explore specific trends or skills?`;
        }

        if (lowerQuery.includes('interview') || lowerQuery.includes('prepare')) {
            return `Let's get you interview-ready! 💪\n\n🎯 **Common Questions:**\n- Tell me about your experience with ${user?.skills?.[0]}\n- Describe a challenging project you've worked on\n- How do you approach problem-solving?\n\n✅ **Preparation Tips:**\n1. Research the company thoroughly\n2. Prepare STAR method examples\n3. Practice technical problems on LeetCode\n4. Prepare thoughtful questions to ask\n\n💡 **Your Strengths:**\n- Strong technical foundation in ${user?.skills?.slice(0, 2).join(' and ')}\n- ${user?.interviewReadinessScore}% readiness score\n\nWould you like mock interview questions?`;
        }

        if (lowerQuery.includes('skill') || lowerQuery.includes('learn')) {
            return `Based on market trends, here are skills to focus on:\n\n🚀 **High-Impact Skills:**\n- **TypeScript**: Essential for modern development\n- **System Design**: Critical for senior roles\n- **Cloud Platforms**: AWS, Azure, or GCP\n- **AI/ML Basics**: Increasingly important across roles\n\n📚 **Learning Resources:**\n- Coursera for structured courses\n- Frontend Masters for deep dives\n- LeetCode for coding practice\n- System Design Primer on GitHub\n\n⏰ **Learning Plan:**\n- 2-3 hours per week recommended\n- Focus on one skill at a time\n- Build projects to apply knowledge\n\nWhich skill interests you most?`;
        }

        // Default response
        return `I understand you're asking about "${query}". I can help you with:\n\n• **Job Search**: Find positions matching your skills\n• **Resume Help**: Optimize your CV for ATS and recruiters\n• **Career Trends**: Explore future opportunities in your field\n• **Interview Prep**: Get ready for your next interview\n• **Skill Development**: Learn what's in demand\n\nCould you please clarify what you'd like help with?`;
    };

    const quickPrompts = [
        { icon: Sparkles, text: 'What jobs match my profile?' },
        { icon: FileText, text: 'How can I improve my resume?' },
        { icon: TrendingUp, text: 'What are the trends in my field?' },
        { icon: Lightbulb, text: 'What skills should I learn?' },
    ];

    return (
        <div className="ai-copilot-page">
            <div className="page-header">
                <div className="header-content">
                    <div className="ai-icon">
                        <Sparkles size={32} />
                    </div>
                    <div>
                        <h1>AI Career Copilot</h1>
                        <p>Get personalized career guidance powered by AI</p>
                    </div>
                </div>
            </div>

            <div className="chat-container">
                <div className="chat-messages">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                        >
                            <div className="message-avatar">
                                {message.role === 'user' ? (
                                    user?.photoURL ? (
                                        <img src={user.photoURL} alt={user.name} />
                                    ) : (
                                        <User size={20} />
                                    )
                                ) : (
                                    <Bot size={20} />
                                )}
                            </div>
                            <div className="message-content">
                                <div className="message-text">{message.content}</div>
                                <div className="message-time">
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="message assistant-message">
                            <div className="message-avatar">
                                <Bot size={20} />
                            </div>
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {messages.length <= 1 && (
                    <div className="quick-prompts">
                        <p>Quick prompts:</p>
                        <div className="prompts-grid">
                            {quickPrompts.map((prompt) => {
                                const Icon = prompt.icon;
                                return (
                                    <button
                                        key={prompt.text}
                                        className="prompt-btn"
                                        onClick={() => setInput(prompt.text)}
                                    >
                                        <Icon size={20} />
                                        <span>{prompt.text}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="chat-input-container">
                    <div className="chat-input">
                        <input
                            type="text"
                            className="input"
                            placeholder="Ask me anything about your career..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <p className="input-hint">
                        💡 Tip: Ask about job recommendations, resume tips, or career trends
                    </p>
                </div>
            </div>

            <style>{`
        .ai-copilot-page {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px - var(--spacing-xl) * 2);
        }

        .page-header {
          margin-bottom: var(--spacing-xl);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .ai-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .page-header h1 {
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-xs);
        }

        .page-header p {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .chat-container {
          flex: 1;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .message {
          display: flex;
          gap: var(--spacing-md);
          max-width: 85%;
        }

        .user-message {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .assistant-message {
          align-self: flex-start;
        }

        .message-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-message .message-avatar {
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          color: white;
        }

        .assistant-message .message-avatar {
          background: var(--color-bg-tertiary);
          color: var(--color-primary);
        }

        .message-avatar img {
          width: 100%;
          height: 100%;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .message-content {
          flex: 1;
        }

        .message-text {
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-sm);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .user-message .message-text {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
          color: white;
          border-bottom-right-radius: var(--radius-sm);
        }

        .assistant-message .message-text {
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          border-bottom-left-radius: var(--radius-sm);
        }

        .message-time {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
          margin-top: var(--spacing-xs);
          padding: 0 var(--spacing-lg);
        }

        .user-message .message-time {
          text-align: right;
        }

        .typing-indicator {
          display: flex;
          gap: var(--spacing-xs);
          padding: var(--spacing-md) var(--spacing-lg);
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: var(--color-text-tertiary);
          border-radius: var(--radius-full);
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .quick-prompts {
          padding: 0 var(--spacing-xl) var(--spacing-lg);
        }

        .quick-prompts > p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-md);
        }

        .prompts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-sm);
        }

        .prompt-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all var(--transition-base);
          text-align: left;
        }

        .prompt-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: var(--color-bg-secondary);
        }

        .chat-input-container {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
        }

        .chat-input {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .chat-input input {
          flex: 1;
        }

        .chat-input .btn {
          padding: 0.625rem 1.25rem;
        }

        .input-hint {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
          margin: 0;
        }

        @media (max-width: 768px) {
          .message {
            max-width: 95%;
          }

          .prompts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
};
