import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeoMeta, getSeoConfig } from '../utils/seo';

export const SeoManager = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/community')) return;
    const config = getSeoConfig(location.pathname);
    applySeoMeta(
      config.title,
      config.description,
      config.canonicalPath ?? location.pathname,
      {
        keywords: config.keywords,
        image: config.image,
        ogType: config.ogType,
      }
    );
  }, [location.pathname]);

  return null;
};
