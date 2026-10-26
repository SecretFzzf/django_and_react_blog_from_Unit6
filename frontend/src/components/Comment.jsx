import { memo } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineTrash } from 'react-icons/hi';

import Avatar from './Avatar';

/**
 * 单条评论。
 *
 * 仅评论作者本人（或站点管理员）可见删除按钮，
 * 删除前会二次确认，避免误触。
 */
const Comment = ({ comment, onDelete, canDelete, index = 0 }) => {
  const { body, username, date_format, user_photo } = comment || {};

  const handleDelete = () => {
    if (!onDelete) return;
    const confirmed = window.confirm('确定要删除这条评论吗？该操作无法撤销。');
    if (confirmed) onDelete(comment.id);
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="glass-card group p-5 transition-colors duration-200 hover:border-white/20"
    >
      <div className="flex items-start gap-3.5">
        <Avatar src={user_photo} name={username} size="md" />

        <div className="min-w-0 flex-1">
          {/* 头部：昵称 + 时间 + 删除 */}
          <div className="flex items-center gap-3">
            <span className="truncate font-semibold text-white">
              {username || '匿名用户'}
            </span>
            <span className="shrink-0 text-xs text-ink-500">
              {date_format}
            </span>

            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-500 opacity-0 transition-all duration-200 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100 focus:opacity-100"
                aria-label="删除这条评论"
                title="删除评论"
              >
                <HiOutlineTrash className="text-base" />
              </button>
            )}
          </div>

          {/* 正文 */}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-200">
            {body}
          </p>
        </div>
      </div>
    </motion.li>
  );
};

export default memo(Comment);
