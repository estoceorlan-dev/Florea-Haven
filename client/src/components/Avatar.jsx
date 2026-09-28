import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { imageVariant } from '../utils/image.js';

export function Avatar({ user, className = 'size-8' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const src = user?.profile_image_url;
  return src && failedUrl !== src ? (
    <img
      src={imageVariant(src, 128)}
      alt={user.name}
      width="48"
      height="48"
      className={`rounded-full object-cover ${className}`}
      onError={() => setFailedUrl(src)}
    />
  ) : (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-brand-soft text-brand ${className}`}
    >
      <UserRound size={19} aria-hidden="true" />
    </span>
  );
}
