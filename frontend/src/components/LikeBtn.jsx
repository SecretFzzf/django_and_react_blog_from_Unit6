import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AiFillLike, AiOutlineLike } from 'react-icons/ai';

/**
 * 点赞按钮。
 *
 * 点击时：
 *   · 图标心搏缩放
 *   · 向外扩散的圆环波纹
 *   · 6 个粒子呈放射状绽放
 */
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300];

const LikeBtn = ({
  total_likes = 0,
  isLiked = false,
  onToggle,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const [burst, setBurst] = useState(null);
  const [pending, setPending] = useState(false);

  const iconSize = size === 'lg' ? 'text-2xl' : 'text-xl';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  const handleClick = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (disabled || pending) return;

    // 仅在「点赞」时播放特效，取消点赞保持安静
    if (!isLiked) {
      setBurst(Date.now());
      setTimeout(() => setBurst(null), 800);
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
      aria-pressed={isLiked}
      aria-label={isLiked ? '取消点赞' : '点赞'}
      className={`group relative inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-medium transition-all duration-200 ease-smooth disabled:cursor-not-allowed disabled:opacity-50 ${
        isLiked
          ? 'border-rose-400/40 bg-rose-500/15 text-rose-300 shadow-[0_0_20px_-6px_rgba(244,63,94,0.6)]'
          : 'border-white/10 bg-white/5 text-ink-200 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200'
      } ${className}`}
    >
      {/* 心搏图标 */}
      <span className="relative flex items-center justify-center">
        <motion.span
          key={burst}
          animate={burst ? { scale: [1, 1.4, 0.92, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`flex items-center ${iconSize}`}
        >
          {isLiked ? <AiFillLike /> : <AiOutlineLike />}
        </motion.span>

        {/* 扩散波纹 */}
        <AnimatePresence>
          {burst && (
            <motion.span
              initial={{ scale: 0.7, opacity: 0.7 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="pointer-events-none absolute h-6 w-6 rounded-full bg-rose-400/40"
            />
          )}
        </AnimatePresence>

        {/* 放射粒子 */}
        <AnimatePresence>
          {burst &&
            PARTICLE_ANGLES.map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <motion.span
                  key={`${burst}-${angle}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(rad) * 26,
                    y: Math.sin(rad) * 26,
                    opacity: 0,
                    scale: 0.3,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-rose-400"
                />
              );
            })}
        </AnimatePresence>
      </span>

      <span className={textSize}>{total_likes}</span>
      <span className="hidden text-xs text-ink-500 sm:inline">
        {isLiked ? '已赞' : '点赞'}
      </span>
    </button>
  );
};

export default LikeBtn;
