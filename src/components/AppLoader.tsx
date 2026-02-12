import { Zap } from 'lucide-react';

type AppLoaderProps = {
  message?: string;
  variant?: 'overlay' | 'full';
};

export const AppLoader = ({ message = 'Loading', variant = 'overlay' }: AppLoaderProps) => (
  <div className={`app-loader ${variant}`} role="status" aria-live="polite" aria-busy="true">
    <div className="loader-card">
      <div className="loader-logo">
        <div className="logo-shape">
          <Zap size={28} fill="currentColor" />
        </div>
        <div className="logo-ring" />
      </div>
      <div className="loader-text">CareerPilot</div>
      <div className="loader-subtext">{message}</div>
      <div className="loader-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>

    <style>{`
      .app-loader {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(248, 249, 251, 0.88);
        backdrop-filter: blur(6px);
        z-index: 3000;
      }

      .app-loader.full {
        background: #f8f9fb;
      }

      .loader-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        background: transparent;
        border: none;
        box-shadow: none;
        min-width: 220px;
      }

      .loader-logo {
        position: relative;
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
      }

      .logo-shape {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        background: linear-gradient(135deg, #00d4aa 0%, #00a389 100%);
        color: white;
        display: grid;
        place-items: center;
        box-shadow: 0 12px 24px rgba(0, 212, 170, 0.28);
        animation: loader-float 1.6s ease-in-out infinite;
      }

      .logo-ring {
        position: absolute;
        inset: 0;
        border-radius: 22px;
        border: 2px solid rgba(0, 212, 170, 0.25);
        animation: loader-ring 1.6s ease-in-out infinite;
      }

      .loader-text {
        font-size: 18px;
        font-weight: 800;
        color: #111827;
        letter-spacing: -0.3px;
      }

      .loader-subtext {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.3em;
      }

      .loader-dots {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }

      .loader-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #00d4aa;
        animation: loader-bounce 0.9s ease-in-out infinite;
      }

      .loader-dots span:nth-child(2) {
        animation-delay: 0.12s;
        background: #00c19a;
      }

      .loader-dots span:nth-child(3) {
        animation-delay: 0.24s;
        background: #00a389;
      }

      @keyframes loader-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      @keyframes loader-ring {
        0%, 100% { transform: scale(0.96); opacity: 0.6; }
        50% { transform: scale(1.05); opacity: 0.25; }
      }

      @keyframes loader-bounce {
        0%, 100% { transform: translateY(0); opacity: 0.7; }
        50% { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
  </div>
);
