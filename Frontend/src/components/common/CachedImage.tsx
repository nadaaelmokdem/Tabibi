import React, { useState, useEffect } from 'react';
import { getFileUrl } from '../../utils/fileUtils';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackSrc?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ src, fallbackSrc, ...props }) => {
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    
    if (src.startsWith('data:')) {
      return;
    }

    const fullUrl = src.startsWith('http') ? src : getFileUrl(src);

    let isMounted = true;

    const fetchImage = async () => {
      try {
        const cache = await caches.open('tabibi-image-cache');
        const cachedResponse = await cache.match(fullUrl);
        
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          if (isMounted) setCachedSrc(URL.createObjectURL(blob));
          return;
        }

        const response = await fetch(fullUrl);
        if (response.ok) {
          await cache.put(fullUrl, response.clone());
          const blob = await response.blob();
          if (isMounted) setCachedSrc(URL.createObjectURL(blob));
        } else {
           if (isMounted) setCachedSrc(fullUrl);
        }
      } catch {
         if (isMounted) setCachedSrc(fullUrl);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [src]);

  const displaySrc = cachedSrc || (src ? (src.startsWith('http') || src.startsWith('data:') ? src : getFileUrl(src)) : fallbackSrc);

  if (!displaySrc) {
    return <div className={"bg-gray-200 " + (props.className || '')} {...(props as any)} />;
  }

  return <img src={displaySrc} loading="lazy" {...props} />;
};
