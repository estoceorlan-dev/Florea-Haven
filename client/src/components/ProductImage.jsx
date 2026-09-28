import { Flower2 } from 'lucide-react';
import { useState } from 'react';
import { imageVariant } from '../utils/image.js';

export function ProductImage({ src, alt, className = '', loading = 'lazy' }) {
  const [failedUrl, setFailedUrl] = useState(null);

  if (!src || failedUrl === src) {
    return (
      <div
        className={`grid place-items-center bg-sage text-evergreen/45 ${className}`}
        role="img"
        aria-label={`${alt} image unavailable`}
      >
        <Flower2 size={44} strokeWidth={1.2} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      srcSet={
        src.startsWith('https://res.cloudinary.com/')
          ? [400, 800, 1600]
              .map((width) => `${imageVariant(src, width)} ${width}w`)
              .join(', ')
          : undefined
      }
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
      alt={alt}
      loading={loading}
      width="800"
      height="800"
      decoding="async"
      onError={() => setFailedUrl(src)}
    />
  );
}
