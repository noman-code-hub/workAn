import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Bot, FileText, Lightbulb, Send, Sparkles, TrendingUp, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ChatMessage } from '../types';
import { apiUrl, parseApiJson } from '../config/api';

export const AICopilot = () => {
  const FASTAPI_LOCAL_BASE = 'http://127.0.0.1:8000';
  const VERCEL_COPILOT_PATH = '/api/copilot/chat';
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const greeting: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}. I am your AI Career Copilot.\n\nI can help with:\n- Job matching\n- Resume improvement\n- Career trend insights\n- Interview preparation\n- Skill development plans\n\nWhat would you like to work on first?`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [user]);

  useEffect(() => {
    const el = chatMessagesRef.current;
    if (!el) return;
    // Scroll only the chat panel — never jumps the whole page
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const normalizeChatEndpoint = (base: string) => {
    const trimmed = base.trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    return trimmed.endsWith('/chat') ? trimmed : `${trimmed}/chat`;
  };

  const getCopilotEndpoints = () => {
    const envBase = (import.meta.env.VITE_COPILOT_API_BASE || '').trim();
    const envEndpoint = normalizeChatEndpoint(envBase);
    if (envEndpoint) {
      return [envEndpoint];
    }

    if (typeof window !== 'undefined') {
      const isLocalRuntime = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalRuntime) {
        return [`${FASTAPI_LOCAL_BASE}/chat`];
      }
    }

    return [VERCEL_COPILOT_PATH, apiUrl('/copilot/chat')];
  };

  const requestCopilotResponse = async (conversation: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => {
    const sessionId = user?.id || undefined;

    let lastError: unknown = null;

    for (const endpoint of getCopilotEndpoints()) {
      try {
        const isNodeCopilot = endpoint.includes('/copilot/chat');
        const payload = isNodeCopilot
          ? {
              messages: conversation,
              userProfile: {
                name: user?.name,
                profession: user?.profession,
                country: user?.country,
                skills: user?.skills ?? [],
              },
            }
          : { message: conversation[conversation.length - 1]?.content || '' };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify(payload),
        });

        const data = await parseApiJson<{ message?: string; reply?: string }>(response);
        const content = (data?.reply || data?.message || '').trim();
        if (content) return content;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to reach the copilot service.');
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversation = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const content = await requestCopilotResponse(conversation);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Network problem. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { icon: Sparkles, text: 'What jobs match my profile?' },
    { icon: FileText, text: 'How can I improve my resume?' },
    { icon: TrendingUp, text: 'What are current market trends?' },
    { icon: Lightbulb, text: 'What skills should I learn next?' },
  ];

  const stagger = (index: number, delay = 0): CSSProperties => ({
    ['--i' as string]: index,
    ['--d' as string]: `${delay}ms`,
  });

  return (
    <div className="copilot-pro">
      <div className="copilot-glow copilot-glow-a" />
      <div className="copilot-glow copilot-glow-b" />

      <section className="copilot-hero cp-fade cp-delay-0">
        <div className="hero-left">
          <p className="hero-kicker">AI Copilot</p>
          <h1>Career Guidance, Personalized in Real Time</h1>
          <p>
            Ask strategic questions about jobs, resume quality, interview preparation,
            and market direction. Get clear, practical responses instantly.
          </p>
          <div className="hero-chips">
            <span>{user?.profession || 'Career planning'}</span>
            <span>{user?.country || 'Global market insights'}</span>
            <span>Assistant status: Online</span>
          </div>
        </div>
        <div className="hero-status cp-fade cp-delay-1">
          <div className="status-icon"><Sparkles size={18} /></div>
          <div>
            <small>Current Session</small>
            <h3>{messages.length} messages</h3>
            <p>Adaptive recommendations based on your prompts.</p>
          </div>
        </div>
      </section>

      <section className="chat-shell cp-fade cp-delay-1">
        <div className="chat-head">
          <div className="chat-head-left">
            <div className="assistant-avatar"><Bot size={18} /></div>
            <div>
              <h2>AI Career Copilot</h2>
              <small>Professional mode enabled</small>
            </div>
          </div>
          <span className="chat-status">Live</span>
        </div>

        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((message, index) => (
            <article
              key={message.id}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'} cp-fade cp-delay-2`}
              style={stagger(index)}
            >
              <div className="message-avatar">
                {message.role === 'user' ? (
                  user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name ? `${user.name} avatar` : 'User avatar'}
                      loading="lazy"
                      decoding="async"
                      width={34}
                      height={34}
                    />
                  ) : (
                    <User size={18} />
                  )
                ) : (
                  <Bot size={18} />
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
            </article>
          ))}

          {loading && (
            <article className="message assistant-message cp-fade cp-delay-2">
              <div className="message-avatar">
                <Bot size={18} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          )}


        </div>

        {messages.length <= 1 && (
          <div className="quick-prompts cp-fade cp-delay-2">
            <p>Start with a prompt:</p>
            <div className="prompts-grid">
              {quickPrompts.map((prompt, index) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.text}
                    className="prompt-btn cp-fade cp-delay-2"
                    style={stagger(index, 140)}
                    onClick={() => setInput(prompt.text)}
                  >
                    <Icon size={18} />
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
              placeholder="Ask about jobs, resume, interviews, or growth strategy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              className="btn btn-primary send-btn"
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="input-hint">Tip: include your goal role and timeline for better guidance.</p>
        </div>
      </section>

      <style>{`
        .copilot-pro {
          --cp-ease: cubic-bezier(0.22, 1, 0.36, 1);
          width: 100%;
          min-height: calc(100vh - 72px);
          display: grid;
          gap: 16px;
          position: relative;
          isolation: isolate;
        }

        .copilot-glow {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          filter: blur(84px);
          z-index: -1;
          opacity: 0.35;
          pointer-events: none;
          animation: cp-drift 10s ease-in-out infinite alternate;
        }

        .copilot-glow-a {
          top: -120px;
          right: 7%;
          background: #67e8f9;
        }

        .copilot-glow-b {
          bottom: 8%;
          left: -90px;
          background: #5eead4;
          animation-delay: -3s;
        }

        .cp-fade {
          opacity: 0;
          transform: translateY(14px) scale(0.986);
          animation: cp-rise 620ms var(--cp-ease) forwards;
          animation-delay: calc(var(--d, 0ms) + var(--i, 0) * 72ms);
        }

        .cp-delay-0 { --d: 20ms; }
        .cp-delay-1 { --d: 80ms; }
        .cp-delay-2 { --d: 130ms; }

        .copilot-hero {
          border: 1px solid #dbe5ef;
          border-radius: 20px;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.16), transparent 42%),
            linear-gradient(145deg, #ffffff, #f7fbff);
          box-shadow: 0 24px 42px -34px rgba(15, 23, 42, 0.45);
          padding: 18px;
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 12px;
        }

        .hero-kicker {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #0f766e;
          font-size: 0.74rem;
          font-weight: 700;
          font-family: 'Manrope', var(--font-family);
        }

        .hero-left h1 {
          margin: 10px 0;
          color: #0f172a;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
          font-size: clamp(1.6rem, 3.2vw, 2.2rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
        }

        .hero-left > p {
          margin: 0;
          color: #64748b;
          max-width: 62ch;
          font-size: 0.9rem;
        }

        .hero-chips {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .hero-chips span {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          color: #334155;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .hero-status {
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          background: #ffffff;
          padding: 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .status-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          flex-shrink: 0;
        }

        .hero-status small {
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .hero-status h3 {
          margin: 2px 0;
          color: #0f172a;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
          font-size: 1.15rem;
          line-height: 1.1;
        }

        .hero-status p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.74rem;
        }

        .chat-shell {
          border: 1px solid #dbe5ef;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), #ffffff);
          box-shadow: 0 24px 40px -36px rgba(15, 23, 42, 0.6);
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
          overflow: hidden;
        }

        .chat-head {
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #f8fafc;
        }

        .chat-head-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .assistant-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          color: #ffffff;
          display: grid;
          place-items: center;
        }

        .chat-head h2 {
          margin: 0;
          font-size: 0.94rem;
          color: #0f172a;
          font-family: 'Space Grotesk', 'Manrope', var(--font-family);
        }

        .chat-head small {
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .chat-status {
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid #a7f3d0;
          background: #ecfdf5;
          color: #047857;
          font-size: 0.72rem;
          font-weight: 700;
        }


        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .message {
          display: flex;
          gap: 8px;
          max-width: min(88%, 760px);
        }

        .user-message {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .assistant-message {
          align-self: flex-start;
        }

        .message-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #dbe5ef;
        }

        .user-message .message-avatar {
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          color: #ffffff;
          border: none;
        }

        .assistant-message .message-avatar {
          background: #f8fafc;
          color: #0f766e;
        }

        .message-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          object-fit: cover;
        }

        .message-content {
          min-width: 0;
        }

        .message-text {
          white-space: pre-wrap;
          font-size: 0.86rem;
          line-height: 1.58;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid transparent;
        }

        .assistant-message .message-text {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #1e293b;
          border-bottom-left-radius: 6px;
        }

        .user-message .message-text {
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          color: #ffffff;
          border-bottom-right-radius: 6px;
        }

        .message-time {
          margin-top: 4px;
          color: #94a3b8;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0 8px;
        }

        .user-message .message-time {
          text-align: right;
        }

        .typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 12px;
          background: #f8fafc;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #94a3b8;
          animation: cp-typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        .quick-prompts {
          border-top: 1px solid #e2e8f0;
          padding: 12px 14px;
          background: #f8fafc;
        }

        .quick-prompts > p {
          margin: 0 0 8px;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .prompts-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .prompt-btn {
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          background: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          font-size: 0.78rem;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: transform 180ms var(--cp-ease), border-color 180ms ease, color 180ms ease;
        }

        .prompt-btn:hover {
          transform: translateY(-1px);
          border-color: #14b8a6;
          color: #0f766e;
        }

        .chat-input-container {
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 12px 14px;
        }

        .chat-input {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 6px;
        }

        .chat-input .input {
          border-radius: 11px;
          border: 1px solid #dbe5ef;
          background: #f8fafc;
          font-size: 0.86rem;
        }

        .chat-input .input:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14);
        }

        .send-btn {
          min-width: 44px;
          height: 42px;
          padding: 0;
          border-radius: 11px;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 12px 20px -16px rgba(15, 118, 110, 0.8);
          transition: transform 200ms var(--cp-ease), box-shadow 200ms var(--cp-ease);
        }

        .send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 22px -16px rgba(15, 118, 110, 0.84);
        }

        .input-hint {
          margin: 0;
          color: #94a3b8;
          font-size: 0.72rem;
        }

        [data-theme="dark"] .copilot-glow-a {
          background: #1d4ed8;
          opacity: 0.2;
        }

        [data-theme="dark"] .copilot-glow-b {
          background: #0f766e;
          opacity: 0.22;
        }

        [data-theme="dark"] .copilot-hero {
          border-color: #334155;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 42%),
            linear-gradient(145deg, #111827, #0b1220);
          box-shadow: 0 24px 42px -30px rgba(2, 6, 23, 0.92);
        }

        [data-theme="dark"] .hero-kicker {
          color: #5eead4;
        }

        [data-theme="dark"] .hero-left h1,
        [data-theme="dark"] .hero-status h3,
        [data-theme="dark"] .chat-head h2 {
          color: #e2e8f0;
        }

        [data-theme="dark"] .hero-left > p,
        [data-theme="dark"] .hero-status small,
        [data-theme="dark"] .hero-status p,
        [data-theme="dark"] .chat-head small,
        [data-theme="dark"] .quick-prompts > p,
        [data-theme="dark"] .input-hint,
        [data-theme="dark"] .message-time {
          color: #94a3b8;
        }

        [data-theme="dark"] .hero-chips span {
          border-color: #334155;
          background: #0f172a;
          color: #cbd5e1;
        }

        [data-theme="dark"] .hero-status {
          border-color: #334155;
          background: #111827;
        }

        [data-theme="dark"] .chat-shell {
          border-color: #334155;
          background: linear-gradient(180deg, #111827, #0f172a);
          box-shadow: 0 24px 40px -30px rgba(2, 6, 23, 0.92);
        }

        [data-theme="dark"] .chat-head {
          border-bottom-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .chat-status {
          border-color: rgba(16, 185, 129, 0.45);
          background: rgba(16, 185, 129, 0.16);
          color: #6ee7b7;
        }

        [data-theme="dark"] .message-avatar {
          border-color: #334155;
        }

        [data-theme="dark"] .assistant-message .message-avatar {
          background: #0f172a;
          color: #5eead4;
        }

        [data-theme="dark"] .assistant-message .message-text {
          background: #0f172a;
          border-color: #334155;
          color: #e2e8f0;
        }

        [data-theme="dark"] .typing-indicator {
          border-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .typing-indicator span {
          background: #64748b;
        }

        [data-theme="dark"] .quick-prompts {
          border-top-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .prompt-btn {
          border-color: #334155;
          background: #111827;
          color: #cbd5e1;
        }

        [data-theme="dark"] .prompt-btn:hover {
          border-color: #2dd4bf;
          color: #5eead4;
        }

        [data-theme="dark"] .chat-input-container {
          border-top-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .chat-input .input {
          border-color: #334155;
          background: #111827;
          color: #e2e8f0;
        }

        [data-theme="dark"] .chat-input .input::placeholder {
          color: #94a3b8;
        }

        @keyframes cp-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.986); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cp-drift {
          from { transform: translateY(0) translateX(0); }
          to { transform: translateY(-12px) translateX(10px); }
        }

        @keyframes cp-typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        @media (max-width: 1024px) {
          .copilot-hero {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .prompts-grid {
            grid-template-columns: 1fr;
          }

          .message {
            max-width: 96%;
          }

          .prompt-btn {
            min-height: 44px;
          }
        }

        @media (max-width: 480px) {
          .copilot-hero {
            padding: 14px;
            border-radius: 16px;
          }

          .hero-left h1 {
            font-size: clamp(1.4rem, 6.5vw, 1.8rem);
          }

          /* Prevent iOS Safari auto-zoom on input focus */
          .chat-input .input {
            font-size: 16px !important;
            min-height: 48px;
          }

          .send-btn {
            min-width: 48px;
            height: 48px;
          }

          .prompt-btn {
            font-size: 0.82rem;
            min-height: 44px;
          }

          .prompts-grid {
            grid-template-columns: 1fr 1fr;
          }

          .hero-chips span {
            font-size: 0.7rem;
          }

          .chat-shell {
            border-radius: 14px;
          }
        }

        @media (max-width: 375px) {
          .copilot-hero {
            padding: 12px;
          }

          .hero-left h1 {
            font-size: clamp(1.3rem, 7.5vw, 1.6rem);
          }

          .prompts-grid {
            grid-template-columns: 1fr;
          }

          .chat-messages {
            padding: 10px;
          }

          .chat-input-container {
            padding: 10px 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .copilot-pro *,
          .copilot-glow {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};
