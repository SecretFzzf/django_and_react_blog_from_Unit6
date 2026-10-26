import { motion } from 'framer-motion';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

/**
 * 分页器。
 *
 * 采用「首尾 + 当前页附近 + 省略号」的经典分页策略，
 * 保证页数很多时控件宽度依然稳定。
 */
const buildPageItems = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push('start-ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push('end-ellipsis');
  items.push(total);

  return items;
};

const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange, className = '' }) => {
  if (totalPages <= 1) return null;

  const pages = buildPageItems(currentPage, totalPages);

  const go = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange?.(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const baseBtn =
    'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-all duration-200 ease-smooth';

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="分页导航"
    >
      {/* 上一页 */}
      <motion.button
        type="button"
        whileHover={{ scale: currentPage > 1 ? 1.04 : 1 }}
        whileTap={{ scale: currentPage > 1 ? 0.96 : 1 }}
        disabled={currentPage <= 1}
        onClick={() => go(currentPage - 1)}
        className={`${baseBtn} border-white/10 bg-white/5 text-ink-200 hover:border-indigo-400/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35`}
        aria-label="上一页"
      >
        <HiChevronLeft className="text-lg" />
        <span className="ml-1 hidden sm:inline">上一页</span>
      </motion.button>

      {/* 页码 */}
      {pages.map((item) =>
        typeof item === 'string' ? (
          <span
            key={item}
            className="inline-flex h-10 w-8 items-center justify-center text-ink-500"
          >
            …
          </span>
        ) : (
          <motion.button
            key={item}
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => go(item)}
            aria-current={item === currentPage ? 'page' : undefined}
            className={
              item === currentPage
                ? `${baseBtn} border-transparent bg-brand-gradient text-white shadow-glow`
                : `${baseBtn} border-white/10 bg-white/5 text-ink-200 hover:border-indigo-400/40 hover:bg-white/10`
            }
          >
            {item}
          </motion.button>
        )
      )}

      {/* 下一页 */}
      <motion.button
        type="button"
        whileHover={{ scale: currentPage < totalPages ? 1.04 : 1 }}
        whileTap={{ scale: currentPage < totalPages ? 0.96 : 1 }}
        disabled={currentPage >= totalPages}
        onClick={() => go(currentPage + 1)}
        className={`${baseBtn} border-white/10 bg-white/5 text-ink-200 hover:border-indigo-400/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35`}
        aria-label="下一页"
      >
        <span className="mr-1 hidden sm:inline">下一页</span>
        <HiChevronRight className="text-lg" />
      </motion.button>

      <span className="ml-2 text-xs text-ink-500">
        第 {currentPage} / {totalPages} 页
      </span>
    </nav>
  );
};

export default Pagination;
