import { BRAND } from '../config/brand';

const splashLogo = BRAND.logo.loader;

type AppLoaderProps = {
  variant?: 'overlay' | 'full';
};

export const AppLoader = ({ variant = 'overlay' }: AppLoaderProps) => (
  <div className={`app-loader ${variant}`} role="status" aria-live="polite" aria-busy="true">
      <div className="loader-card">
        <div className="loader-logo">
          <img
            src={splashLogo}
            alt={`${BRAND.name} logo`}
            className="logo-image"
            loading="lazy"
            decoding="async"
          />
        </div>
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
        gap: 6px;
        padding: 12px 18px;
        background: transparent;
        border: none;
        box-shadow: none;
        min-width: 120px;
      }

      .loader-logo {
        position: relative;
        width: 112px;
        height: 112px;
        display: grid;
        place-items: center;
      }

      .logo-image {
        width: 100px;
        height: 100px;
        border-radius: 0;
        object-fit: contain;
        box-shadow: none;
        animation: loader-float 1.6s ease-in-out infinite;
      }

      .loader-dots {
        display: flex;
        gap: 6px;
        margin-top: -2px;
      }

      .loader-dots span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #1dbf73;
        animation: loader-bounce 0.9s ease-in-out infinite;
      }

      .loader-dots span:nth-child(2) {
        animation-delay: 0.12s;
        background: #17a864;
      }

      .loader-dots span:nth-child(3) {
        animation-delay: 0.24s;
        background: #149457;
      }

      [data-theme="dark"] .app-loader {
        background: rgba(2, 6, 23, 0.76);
      }

      [data-theme="dark"] .app-loader.full {
        background:
          radial-gradient(circle at 82% 12%, rgba(56, 189, 248, 0.14), transparent 40%),
          radial-gradient(circle at 12% 88%, rgba(20, 184, 166, 0.12), transparent 42%),
          #020617;
      }

      [data-theme="dark"] .logo-image {
        box-shadow: none;
      }

      [data-theme="dark"] .loader-dots span {
        background: #34d399;
      }

      [data-theme="dark"] .loader-dots span:nth-child(2) {
        background: #10b981;
      }

      [data-theme="dark"] .loader-dots span:nth-child(3) {
        background: #059669;
      }

      @keyframes loader-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      @keyframes loader-bounce {
        0%, 100% { transform: translateY(0); opacity: 0.7; }
        50% { transform: translateY(-5px); opacity: 1; }
      }

    `}</style>
  </div>
);
