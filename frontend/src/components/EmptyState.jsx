import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * 空状态 / 错误状态展示组件。
 * 使用内联 SVG 插画，无需额外图片资源，天然适配深色主题。
 */

const ILLUSTRATIONS = {
  empty: (
    <svg viewBox="0 0 200 140" className="h-40 w-40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="empty-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="120" rx="62" ry="10" fill="#6366f1" opacity="0.12" />
      <rect x="46" y="30" width="108" height="76" rx="12" fill="url(#empty-grad)" opacity="0.16" />
      <rect x="46" y="30" width="108" height="76" rx="12" stroke="url(#empty-grad)" strokeWidth="2" />
      <rect x="62" y="48" width="52" height="6" rx="3" fill="#9aa7c2" opacity="0.7" />
      <rect x="62" y="62" width="76" height="5" rx="2.5" fill="#9aa7c2" opacity="0.45" />
      <rect x="62" y="74" width="66" height="5" rx="2.5" fill="#9aa7c2" opacity="0.45" />
      <circle cx="140" cy="86" r="16" fill="url(#empty-grad)" opacity="0.35" />
      <path d="M133 86h14M140 79v14" stroke="#e6eaf3" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 140" className="h-40 w-40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="search-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="122" rx="58" ry="9" fill="#22d3ee" opacity="0.12" />
      <circle cx="90" cy="62" r="34" stroke="url(#search-grad)" strokeWidth="3" opacity="0.85" />
      <circle cx="90" cy="62" r="34" fill="url(#search-grad)" opacity="0.1" />
      <path d="M115 87l22 22" stroke="url(#search-grad)" strokeWidth="4" strokeLinecap="round" />
      <path d="M78 60h24M78 70h16" stroke="#9aa7c2" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 200 140" className="h-40 w-40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="error-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="120" rx="56" ry="9" fill="#f87171" opacity="0.12" />
      <circle cx="100" cy="60" r="38" fill="url(#error-grad)" opacity="0.14" />
      <circle cx="100" cy="60" r="38" stroke="url(#error-grad)" strokeWidth="2.5" />
      <path d="M100 40v26" stroke="#f87171" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="100" cy="78" r="3.2" fill="#f87171" />
    </svg>
  ),
  favorite: (
    <svg viewBox="0 0 200 140" className="h-40 w-40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fav-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="120" rx="54" ry="9" fill="#f472b6" opacity="0.12" />
      <path
        d="M100 96S60 72 60 50a21 21 0 0 1 40-11 21 21 0 0 1 40 11c0 22-40 46-40 46z"
        fill="url(#fav-grad)"
        opacity="0.18"
      />
      <path
        d="M100 96S60 72 60 50a21 21 0 0 1 40-11 21 21 0 0 1 40 11c0 22-40 46-40 46z"
        stroke="url(#fav-grad)"
        strokeWidth="2.5"
      />
    </svg>
  ),
};

const EmptyState = ({
  variant = 'empty',
  title = '这里还什么都没有',
  description,
  actionLabel,
  actionTo,
  onAction,
  className = '',
}) => {
  const illustration = ILLUSTRATIONS[variant] || ILLUSTRATIONS.empty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}
    >
      <div className="animate-float">{illustration}</div>

      <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>

      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
          {description}
        </p>
      )}

      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-brand mt-7">
          {actionLabel}
        </Link>
      )}

      {actionLabel && !actionTo && onAction && (
        <button type="button" onClick={onAction} className="btn-brand mt-7">
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
