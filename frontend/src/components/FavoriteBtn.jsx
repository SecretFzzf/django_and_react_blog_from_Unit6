import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineBookmark, HiBookmark } from 'react-icons/hi';

/**
 * 收藏按钮。
 * 收藏成功时星标横向扩散一圈光晕，取消时保持安静。
 */
const FavoriteBtn = ({
  count = 0,
  isFavorited = false,
  onToggle,
  disabled = false,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const [burst, setBurst] = useState(false);
  const [pending, setPending] = useState(false);

  const iconSize = size === 'lg' ? 'text-2xl' : 'text-xl';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  const handleClick = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (disabled || pending) return;

    if (!isFavorited) {
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    }

    if (!onToggle) return;
    setPending(true);
    try {
      await onToggle();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      aria-pressed={isFavorited}
      aria-label={isFavorited ? '取消收藏' : '收藏文章'}
      className={`group relative inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-medium transition-all duration-200 ease-smooth disabled:cursor-not-allowed disabled:opacity-50 ${
        isFavorited
          ? 'border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_-6px_rgba(251,191,36,0.6)]'
          : 'border-white/10 bg-white/5 text-ink-200 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-200'
      } ${className}`}
    >
      <span className="relative flex items-center justify-center">
        <motion.span
          animate={
            burst
              ? { scale: [1, 1.35, 0.95, 1], rotate: [0, -12, 8, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`flex items-center ${iconSize}`}
        >
          {isFavorited ? <HiBookmark /> : <HiOutlineBookmark />}
        </motion.span>

        <AnimatePresence>
          {burst && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0.75 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="pointer-events-none absolute h-6 w-6 rounded-full border-2 border-amber-400/60"
            />
          )}
        </AnimatePresence>
      </span>

      {showLabel && (
        <span className={textSize}>
          {isFavorited ? '已收藏' : '收藏'}
        </span>
      )}

      {count > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-ink-300">
          {count}
        </span>
      )}
    </button>
  );
};

export default FavoriteBtn;
