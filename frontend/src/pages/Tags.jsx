import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineX,
} from 'react-icons/hi';

import Blog from '../components/Blog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import { GetContent } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';

const PAGE_SIZE = 8;

/** 依据热度映射标签的视觉大小 */
function sizeClass(count, maxCount) {
  if (maxCount <= 0) return 'text-sm';
  const ratio = count / maxCount;
  if (ratio >= 0.8) return 'text-2xl';
  if (ratio >= 0.6) return 'text-xl';
  if (ratio >= 0.4) return 'text-lg';
  if (ratio >= 0.2) return 'text-base';
  return 'text-sm';
}

const Tags = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') || '';

  const [tags, setTags] = useState([]);
  const [maxCount, setMaxCount] = useState(0);
  const [loadingTags, setLoadingTags] = useState(true);

  const [filter, setFilter] = useState('');
  const [data, setData] = useState({
    results: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
  });
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // ---------------- 拉取标签墙 ----------------
  useEffect(() => {
    GetContent.fetchTags()
      .then((result) => {
        setTags(result.results || []);
        setMaxCount(result.max_count || 0);
      })
      .catch(() => {
        setTags([]);
        setMaxCount(0);
      })
      .finally(() => setLoadingTags(false));
  }, []);

  // ---------------- 拉取筛选后的文章 ----------------
  const loadBlogs = useCallback(async () => {
    if (!activeTag) {
      setData({ results: [], count: 0, total_pages: 1, current_page: 1 });
      return;
    }

    setLoadingBlogs(true);
    setError('');
    try {
      const result = await GetContent.fetchBlogsByTag(activeTag, {
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(extractErrorMessage(err));
      setData({ results: [], count: 0, total_pages: 1, current_page: 1 });
    } finally {
      setLoadingBlogs(false);
    }
  }, [activeTag, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTag]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const filteredTags = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(keyword));
  }, [tags, filter]);

  const selectTag = (name) => {
    if (name === activeTag) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tag: name }, { replace: true });
    }
  };

  const clearTag = () => setSearchParams({}, { replace: true });

  return (
    <div className="container py-10">
      {/* ==================== 页头 ==================== */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <span className="badge-glass mx-auto inline-flex">
          <HiOutlineTag className="text-cyan-300" />
          标签云
        </span>

        <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
          用<span className="text-gradient-flow">标签</span>串联知识
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-400">
          每个标签都是一条线索，循着它就能找到同一主题下的所有文章。
        </p>
      </motion.header>

      {/* ==================== 标签墙 ==================== */}
      <section className="glass-card mb-10 p-6 md:p-8">
        {/* 标签搜索 */}
        <div className="relative mb-6 max-w-sm">
          <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="筛选标签…"
            className="input-glass pl-11"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-500 transition-colors hover:text-white"
              aria-label="清空筛选"
            >
              <HiOutlineX />
            </button>
          )}
        </div>

        {loadingTags ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 14 }).map((_, index) => (
              <div
                key={index}
                className="skeleton h-9"
                style={{ width: `${70 + (index % 5) * 26}px` }}
              />
            ))}
          </div>
        ) : filteredTags.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">
            {filter ? '没有匹配的标签。' : '还没有任何标签，发布文章时添加标签即可。'}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <AnimatePresence mode="popLayout">
              {filteredTags.map((tag, index) => {
                const active = tag.name === activeTag;
                return (
                  <motion.button
                    key={tag.id}
                    layout
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.28,
                      delay: Math.min(index * 0.02, 0.3),
                    }}
                    whileHover={{ scale: 1.06, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => selectTag(tag.name)}
                    className={`group relative inline-flex items-center gap-2 rounded-2xl border px-4 py-2 transition-colors duration-200 ${
                      active
                        ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                        : 'border-white/10 bg-white/5 text-ink-200 hover:border-indigo-400/40 hover:text-white'
                    }`}
                    title={`${tag.name} · ${tag.count} 篇文章`}
                  >
                    <span
                      className={`font-semibold ${sizeClass(tag.count, maxCount)}`}
                    >
                      {tag.name}
                    </span>
                    <span
                      className={`text-xs ${
                        active ? 'text-white/70' : 'text-ink-500'
                      }`}
                    >
                      {tag.count}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <p className="mt-6 text-xs text-ink-500">
          共 {tags.length} 个标签
          {activeTag && (
            <>
              {' · '}
              当前筛选：
              <button
                type="button"
                onClick={clearTag}
                className="ml-1 inline-flex items-center gap-1 font-medium text-cyan-300 hover:text-cyan-200"
              >
                # {activeTag}
                <HiOutlineX className="text-sm" />
              </button>
            </>
          )}
        </p>
      </section>

      {/* ==================== 筛选结果 ==================== */}
      <AnimatePresence mode="wait">
        {activeTag ? (
          <motion.section
            key={activeTag}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-white">
                标签「
                <span className="text-gradient-flow">{activeTag}</span>
                」下的文章
                <span className="ml-3 text-sm font-normal text-ink-500">
                  {data.count} 篇
                </span>
              </h2>

              <button
                type="button"
                onClick={clearTag}
                className="btn-ghost-glass !px-4 !py-2 text-sm"
              >
                <HiOutlineX />
                查看全部标签
              </button>
            </div>

            {loadingBlogs ? (
              <Skeleton type="list" count={4} />
            ) : error ? (
              <EmptyState
                variant="error"
                title="加载失败"
                description={error}
                actionLabel="重新加载"
                onAction={loadBlogs}
              />
            ) : data.results.length === 0 ? (
              <EmptyState
                variant="search"
                title="该标签下暂无文章"
                description="换一个标签看看，或者自己写一篇填补这个主题的空白。"
                actionLabel="撰写文章"
                actionTo="/create"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                  {data.results.map((blog, index) => (
                    <Blog key={blog.id} {...blog} index={index} />
                  ))}
                </div>

                <Pagination
                  className="mt-12"
                  currentPage={data.current_page}
                  totalPages={data.total_pages}
                  onPageChange={setPage}
                />
              </>
            )}
          </motion.section>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 text-center text-sm text-ink-500"
          >
            点击上方的任意标签，即可查看该标签下的全部文章 ↑
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tags;
