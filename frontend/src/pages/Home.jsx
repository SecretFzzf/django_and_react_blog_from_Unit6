import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineLightningBolt,
  HiOutlineSearch,
  HiOutlineSparkles,
  HiOutlineX,
} from 'react-icons/hi';
import { Link } from 'react-router-dom';

import Blog from '../components/Blog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import { GetContent } from '../services/GetContent';
import { SITE_NAME, SITE_SLOGAN } from '../services/api';
import { compactNumber } from '../utils/format';

const SORT_OPTIONS = [
  { value: 'newest', label: '最新发布', icon: HiOutlineClock },
  { value: 'popular', label: '最多阅读', icon: HiOutlineFire },
  { value: 'oldest', label: '最早发布', icon: HiOutlineSparkles },
];

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 320;

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';

  const [keyword, setKeyword] = useState(initialSearch);
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [ordering, setOrdering] = useState('newest');
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [hot, setHot] = useState([]);

  const [data, setData] = useState({
    results: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchInputRef = useRef(null);
  const requestIdRef = useRef(0);

  // ================= 初始数据 =================
  useEffect(() => {
    GetContent.fetchCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));

    GetContent.fetchSiteStats()
      .then((result) => setStats(result))
      .catch(() => setStats(null));

    GetContent.fetchHotBlogs(5)
      .then((list) => setHot(Array.isArray(list) ? list : []))
      .catch(() => setHot([]));
  }, []);

  // ================= 搜索防抖（实时搜索） =================
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedKeyword(keyword.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [keyword]);

  // 关键词或分类变化时回到第一页
  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, category, ordering]);

  // 同步到 URL，便于分享与刷新保持状态
  useEffect(() => {
    const next = {};
    if (debouncedKeyword) next.search = debouncedKeyword;
    if (category) next.category = category;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, category]);

  // ================= 拉取文章列表 =================
  const loadBlogs = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError('');

    try {
      const result = await GetContent.fetchAllBlogs({
        page,
        page_size: PAGE_SIZE,
        ordering,
        ...(category ? { category } : {}),
        ...(debouncedKeyword ? { search: debouncedKeyword } : {}),
      });

      // 丢弃过期响应，避免快速输入时出现结果错乱
      if (requestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.response ? '文章加载失败，请稍后重试。' : '无法连接到服务器，请确认后端服务已启动。');
      setData({ results: [], count: 0, total_pages: 1, current_page: 1 });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, ordering, category, debouncedKeyword]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  // ================= 快捷键聚焦搜索 =================
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeCategoryLabel = useMemo(() => {
    if (!category) return '全部文章';
    return categories.find((item) => item.value === category)?.label || category;
  }, [category, categories]);

  const clearFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setCategory('');
    setOrdering('newest');
    setPage(1);
  };

  const hasFilter = Boolean(debouncedKeyword || category);

  return (
    <div className="pb-10">
      {/* ==================== Hero 区域 ==================== */}
      <section className="relative overflow-hidden">
        {/* 装饰网格与光晕 */}
        <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-grid opacity-40" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-purple-600/15 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-cyan-500/15 blur-[100px]" />

        <div className="container relative py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="badge-glass mx-auto inline-flex">
              <HiOutlineLightningBolt className="text-amber-300" />
              记录思考 · 分享成长
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              <span className="text-gradient-flow">{SITE_NAME}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-300 md:text-lg">
              {SITE_SLOGAN}
            </p>

            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-500">
              专注于技术沉淀与阅读分享，在这里记录每一段值得回味的思考。
            </p>

            {/* 实时搜索框 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto mt-9 max-w-xl"
            >
              <div className="group relative">
                <div className="absolute -inset-0.5 rounded-2xl bg-brand-gradient opacity-25 blur transition-opacity duration-300 group-focus-within:opacity-60" />
                <div className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 px-5 py-3.5 backdrop-blur-xl">
                  <HiOutlineSearch className="shrink-0 text-xl text-ink-400" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索文章标题、内容、标签或作者…"
                    aria-label="搜索文章"
                    className="flex-1 bg-transparent text-base text-ink-100 placeholder:text-ink-500 focus:outline-none"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={() => setKeyword('')}
                      className="shrink-0 rounded-lg p-1 text-ink-500 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="清空搜索"
                    >
                      <HiOutlineX />
                    </button>
                  )}
                  <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-ink-500 sm:block">
                    /
                  </kbd>
                </div>
              </div>

              {/* 搜索状态提示 */}
              <div className="mt-3 h-5 text-xs text-ink-500">
                <AnimatePresence mode="wait">
                  {keyword && keyword.trim() !== debouncedKeyword && (
                    <motion.span
                      key="typing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      正在输入…
                    </motion.span>
                  )}
                  {debouncedKeyword && keyword.trim() === debouncedKeyword && (
                    <motion.span
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      找到 <span className="font-semibold text-cyan-300">
                        {data.count}
                      </span> 篇与「{debouncedKeyword}」相关的文章
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* 站点统计 */}
            {stats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-4"
              >
                {[
                  { label: '篇文章', value: stats.blog_count },
                  { label: '位作者', value: stats.author_count },
                  { label: '次阅读', value: stats.total_views },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-2xl font-bold text-gradient">
                      {compactNumber(item.value)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">{item.label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ==================== 分类胶囊 + 文章列表 ==================== */}
      <section className="container">
        {/* 分类标签页 */}
        <div className="mb-6">
          <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-2">
            <CategoryPill
              active={!category}
              onClick={() => setCategory('')}
              layoutId="category-pill"
            >
              全部
            </CategoryPill>

            {categories.map((item) => (
              <CategoryPill
                key={item.value}
                active={category === item.value}
                onClick={() => setCategory(item.value)}
                layoutId="category-pill"
              >
                {item.label}
                <span className="ml-1 text-xs opacity-60">{item.count}</span>
              </CategoryPill>
            ))}
          </div>
        </div>

        {/* 工具条：结果概览 + 排序 */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">
              {activeCategoryLabel}
            </h2>
            {!loading && (
              <span className="badge-glass">共 {data.count} 篇</span>
            )}
            {hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-cyan-300"
              >
                <HiOutlineX className="text-sm" />
                清除筛选
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = ordering === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOrdering(option.value)}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'text-white' : 'text-ink-400 hover:text-ink-100'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="sort-pill"
                      className="absolute inset-0 rounded-lg bg-brand-gradient shadow-glow"
                      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon className="text-sm" />
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 文章列表 */}
        {loading ? (
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
            variant={debouncedKeyword ? 'search' : 'empty'}
            title={debouncedKeyword ? '没有找到相关文章' : '这里还空空如也'}
            description={
              debouncedKeyword
                ? `没有匹配「${debouncedKeyword}」的结果，试试换个关键词，或者浏览其它分类。`
                : '还没有发布任何文章，成为第一个写下故事的人吧。'
            }
            actionLabel={debouncedKeyword ? '查看全部文章' : '撰写第一篇文章'}
            actionTo={debouncedKeyword ? '/' : '/create'}
            onAction={debouncedKeyword ? clearFilters : undefined}
          />
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 gap-7 md:grid-cols-2"
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {data.results.map((blog, index) => (
                  <Blog key={blog.id} {...blog} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>

            <Pagination
              className="mt-14"
              currentPage={data.current_page}
              totalPages={data.total_pages}
              onPageChange={setPage}
            />
          </>
        )}

        {/* ==================== 热门文章 ==================== */}
        {hot.length > 0 && (
          <div className="mt-20">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="section-title">热门推荐</h2>
                <p className="ml-0 mt-4 text-sm text-ink-500">
                  编辑部根据阅读量与互动热度精选
                </p>
              </div>
              <Link
                to="/archive"
                className="text-sm text-ink-400 transition-colors hover:text-cyan-300"
              >
                浏览归档 →
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hot.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    to={`/blog/${item.id}`}
                    className="glass-card group flex h-full items-start gap-4 p-5 transition-all duration-300 hover:border-indigo-400/35 hover:shadow-glass-hover"
                  >
                    <span className="text-2xl font-black text-white/10 transition-colors group-hover:text-indigo-400/40">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-semibold text-white transition-colors group-hover:text-cyan-300">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-500">
                        {item.summary}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                        <span>{item.author_name}</span>
                        <span>·</span>
                        <span>{compactNumber(item.views)} 次阅读</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

/** 分类胶囊按钮 */
const CategoryPill = ({ active, onClick, children, layoutId }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
      active ? 'text-white' : 'text-ink-300 hover:text-white'
    }`}
  >
    {active && (
      <motion.span
        layoutId={layoutId}
        className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      />
    )}
    {!active && (
      <span className="absolute inset-0 rounded-full border border-white/10 bg-white/5" />
    )}
    <span className="relative inline-flex items-center">{children}</span>
  </button>
);

export default Home;
