import { Flower2 } from 'lucide-react';
import { useState } from 'react';

export function ProductImage({ src, alt, className = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
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
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
