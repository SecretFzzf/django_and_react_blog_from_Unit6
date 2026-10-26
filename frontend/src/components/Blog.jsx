import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineFire,
} from 'react-icons/hi';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { BiCommentDetail } from 'react-icons/bi';
import { FiArrowRight } from 'react-icons/fi';

import Avatar from './Avatar';
import { categoryColor, categoryLabel, compactNumber, mediaUrl } from '../utils/format';

/**
 * 文章卡片。
 *
 * 交互细节：
 *   · 鼠标移动时卡片轻微 3D 倾斜 + 跟随光斑
 *   · 封面图 Hover 缓慢放大
 *   · 卡片底部渐变描边在 Hover 时点亮
 */
const Blog = ({
  id,
  title,
  summary,
  content,
  author_name,
  author_photo,
  author_username,
  date_created,
  date_short,
  image,
  image_url,
  category,
  category_label,
  total_likes,
  is_liked,
  reading_time,
  comment_count,
  views,
  is_top,
  tags = [],
  index = 0,
}) => {
  const cardRef = useRef(null);

  // 鼠标位置驱动的轻微倾斜
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), {
    stiffness: 220,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 220,
    damping: 24,
  });

  const handleMouseMove = (event) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);

    // 供 CSS 用来定位高光位置
    cardRef.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
    cardRef.current.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const cover = mediaUrl(image_url || image);
  const excerpt = summary || (content ? `${String(content).slice(0, 110)}…` : '');
  const label = categoryLabel(category, category_label);

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.06, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className="card-spotlight glass-card group relative flex h-full flex-col overflow-hidden transition-all duration-300 ease-smooth hover:border-indigo-400/35 hover:shadow-glass-hover"
    >
      {/* ---------------- 封面 ---------------- */}
      <Link
        to={`/blog/${id}`}
        className="relative block aspect-[16/9] overflow-hidden bg-ink-800"
        aria-label={title}
      >
        {cover ? (
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.08]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient-soft">
            <span className="text-4xl font-bold text-white/15">
              {(title || '文').slice(0, 1)}
            </span>
          </div>
        )}

        {/* 渐变遮罩：保证角标可读 */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />

        {/* 分类角标 */}
        <span
          className={`absolute left-4 top-4 rounded-full bg-gradient-to-r ${categoryColor(
            category
          )} px-3 py-1 text-xs font-medium text-white shadow-glow backdrop-blur-sm`}
        >
          {label}
        </span>

        {/* 置顶角标 */}
        {is_top && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200 backdrop-blur-md">
            <HiOutlineFire className="text-sm" />
            置顶
          </span>
        )}
      </Link>

      {/* ---------------- 内容 ---------------- */}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        {/* 作者 + 日期 */}
        <div className="mb-3 flex items-center gap-2.5">
          <Avatar
            src={author_photo}
            name={author_name || author_username}
            size="sm"
          />
          <span className="truncate text-sm font-medium text-ink-200">
            {author_name || author_username || '匿名作者'}
          </span>
          <span className="ml-auto shrink-0 text-xs text-ink-500">
            {date_short || date_created}
          </span>
        </div>

        {/* 标题 */}
        <Link to={`/blog/${id}`} className="group/title">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white transition-colors duration-200 group-hover/title:text-cyan-300 md:text-xl">
            {title}
          </h3>
        </Link>

        {/* 摘要 */}
        {excerpt && (
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-400">
            {excerpt}
          </p>
        )}

        {/* 标签 */}
        {tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.id ?? tag.name}
                to={`/tags?tag=${encodeURIComponent(tag.name)}`}
                className="badge-glass transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                # {tag.name}
              </Link>
            ))}
            {tags.length > 3 && (
              <span className="badge-glass text-ink-500">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 统计与阅读入口 */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-3.5 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1">
              {is_liked ? (
                <AiFillHeart className="text-sm text-rose-400" />
              ) : (
                <AiOutlineHeart className="text-sm" />
              )}
              {compactNumber(total_likes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BiCommentDetail className="text-sm" />
              {compactNumber(comment_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <HiOutlineEye className="text-sm" />
              {compactNumber(views)}
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <HiOutlineClock className="text-sm" />
              {reading_time}
            </span>
          </div>

          <Link
            to={`/blog/${id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-300 transition-all duration-200 hover:gap-2 hover:text-cyan-300"
            aria-label={`阅读全文：${title}`}
          >
            阅读全文
            <FiArrowRight className="text-base" />
          </Link>
        </div>
      </div>

      {/* 底部渐变描边：Hover 时点亮 */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-brand-gradient transition-transform duration-500 ease-smooth group-hover:scale-x-100" />
    </motion.article>
  );
};

export default Blog;
