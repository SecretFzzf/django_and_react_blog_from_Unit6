import { useState } from 'react';

import { gradientOf, initialsOf, mediaUrl } from '../utils/format';

const SIZE_MAP = {
  xs: 'h-6 w-6 text-[0.6rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
  '2xl': 'h-28 w-28 text-4xl',
};

/**
 * 统一头像组件。
 * 未上传头像或图片加载失败时，自动降级为「首字 + 渐变底」占位头像，
 * 避免出现破图。
 */
const Avatar = ({
  src,
  name = '',
  size = 'md',
  ring = false,
  className = '',
  alt,
}) => {
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(src);
  const showFallback = !url || failed;

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const ringClass = ring
    ? 'ring-2 ring-indigo-400/40 ring-offset-2 ring-offset-ink-900'
    : '';

  if (showFallback) {
    return (
      <div
        className={`flex shrink-0 select-none items-center justify-center rounded-full border border-white/15 font-semibold text-white shadow-card ${sizeClass} ${ringClass} ${className}`}
        style={{ backgroundImage: gradientOf(name) }}
        title={name}
        aria-label={name}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt || name || '用户头像'}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full border border-white/15 object-cover shadow-card ${sizeClass} ${ringClass} ${className}`}
    />
  );
};

export default Avatar;
