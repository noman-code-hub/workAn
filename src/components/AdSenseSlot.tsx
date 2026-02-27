import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

type AdSenseSlotProps = {
  slot: string;
  enabled?: boolean;
  className?: string;
  style?: CSSProperties;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
};

const AD_SCRIPT_ID = 'adsense-script';

export const AdSenseSlot = ({
  slot,
  enabled = true,
  className,
  style,
  format = 'auto',
  fullWidthResponsive = true,
}: AdSenseSlotProps) => {
  const adClient = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim();
  const adSlot = slot.trim();
  const canUseAds = import.meta.env.PROD && enabled && Boolean(adClient) && Boolean(adSlot);
  const slotRef = useRef<HTMLModElement | null>(null);
  const hasPushedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!canUseAds) return;

    const existingScript = document.getElementById(AD_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.dataset.loaded === '1') {
        setScriptReady(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = AD_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
    script.onload = () => {
      script.dataset.loaded = '1';
      setScriptReady(true);
    };
    script.onerror = () => {
      setBlocked(true);
    };
    document.head.appendChild(script);
  }, [adClient, canUseAds]);

  useEffect(() => {
    if (!canUseAds || !scriptReady || blocked || hasPushedRef.current || !slotRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      hasPushedRef.current = true;
    } catch {
      setBlocked(true);
    }
  }, [blocked, canUseAds, scriptReady]);

  if (!canUseAds || blocked) return null;

  return (
    <ins
      ref={slotRef}
      className={`adsbygoogle${className ? ` ${className}` : ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
    />
  );
};
