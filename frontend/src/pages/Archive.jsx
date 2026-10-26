import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineCalendar,
  HiOutlineChevronDown,
  HiOutlineEye,
  HiOutlineFilter,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi';

import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import { GetContent } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';
import { compactNumber } from '../utils/format';

const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

const Archive = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [archive, setArchive] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState(searchParams.get('search') || '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const [category, setCategory] = useState(searchParams.get('category') || '');

  const [collapsed, setCollapsed] = useState({});
  const [activeYear, setActiveYear] = useState(null);

  // ---------------- 分类筛选数据 ----------------
  useEffect(() => {
    GetContent.fetchCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  // ---------------- 搜索防抖 ----------------
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedKeyword(keyword.trim()),
      320
    );
    return () => clearTimeout(timer);
  }, [keyword]);

  // ---------------- 同步 URL ----------------
  useEffect(() => {
    const next = {};
    if (debouncedKeyword) next.search = debouncedKeyword;
    if (category) next.category = category;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, category]);

  // ---------------- 拉取归档 ----------------
  const loadArchive = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await GetContent.fetchArchive({
        ...(debouncedKeyword ? { search: debouncedKeyword } : {}),
        ...(category ? { category } : {}),
      });
      setArchive(result);
      setActiveYear(result?.years?.[0]?.year ?? null);
    } catch (err) {
      setError(extractErrorMessage(err));
      setArchive(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, category]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  const hasFilter = Boolean(debouncedKeyword || category);

  const clearFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setCategory('');
  };

  const groups = useMemo(() => archive?.groups || [], [archive]);
  const years = useMemo(() => archive?.years || [], [archive]);

  /** 当前筛选后的年份分组（用于侧边导航高亮） */
  const visibleGroups = useMemo(
    () => (activeYear ? groups.filter((group) => group.year === activeYear) : groups),
    [groups, activeYear]
  );

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
          <HiOutlineCalendar className="text-cyan-300" />
          时间线归档
        </span>

        <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
          文章<span className="text-gradient-flow">归档</span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-400">
          按时间顺序回望每一段思考。
          {archive?.total ? ` 目前共收录 ${archive.total} 篇文章。` : ''}
        </p>
      </motion.header>

      {/* ==================== 筛选区 ==================== */}
      <div className="glass-card mb-8 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* 搜索 */}
          <div className="relative flex-1">
            <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="在归档中搜索标题或内容…"
              className="input-glass pl-11"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-500 transition-colors hover:text-white"
                aria-label="清空搜索"
              >
                <HiOutlineX />
              </button>
            )}
          </div>

          {/* 分类筛选 */}
          <div className="relative md:w-56">
            <HiOutlineFilter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select-glass pl-11"
              aria-label="按分类筛选"
            >
              <option value="">全部分类</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}（{item.count}）
                </option>
              ))}
            </select>
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost-glass shrink-0 !px-4 !py-3 text-sm"
            >
              <HiOutlineX />
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* ==================== 内容区 ==================== */}
      {loading ? (
        <Skeleton type="detail" />
      ) : error ? (
        <EmptyState
          variant="error"
          title="加载失败"
          description={error}
          actionLabel="重新加载"
          onAction={loadArchive}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          variant={hasFilter ? 'search' : 'empty'}
          title={hasFilter ? '没有匹配的文章' : '还没有可归档的文章'}
          description={
            hasFilter
              ? '试着调整关键词或分类，也许能找到你想要的内容。'
              : '等第一篇文章发布后，这里会自动生成时间线。'
          }
          actionLabel={hasFilter ? '清除筛选' : '去写第一篇文章'}
          actionTo={hasFilter ? undefined : '/create'}
          onAction={hasFilter ? clearFilters : undefined}
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
          {/* ---------------- 年份侧边导航 ---------------- */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
                按年份浏览
              </p>

              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveYear(null)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors ${
                      activeYear === null
                        ? 'border border-indigo-400/40 bg-indigo-500/15 text-white'
                        : 'border border-white/10 bg-white/5 text-ink-300 hover:text-white'
                    }`}
                  >
                    <span>全部年份</span>
                    <span className="text-xs text-ink-500">
                      {archive?.total}
                    </span>
                  </button>
                </li>

                {years.map((year) => (
                  <li key={year.year}>
                    <button
                      type="button"
                      onClick={() => setActiveYear(year.year)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors ${
                        activeYear === year.year
                          ? 'border border-indigo-400/40 bg-indigo-500/15 text-white'
                          : 'border border-white/10 bg-white/5 text-ink-300 hover:text-white'
                      }`}
                    >
                      <span>{year.year} 年</span>
                      <span className="text-xs text-ink-500">
                        {year.count}
                      </span>
                    </button>

                    {activeYear === year.year && (
                      <ul className="mt-2 ml-3 space-y-1 border-l border-white/10 pl-3">
                        {year.months.map((month) => (
                          <li
                            key={month.key}
                            className="text-xs text-ink-500"
                          >
                            {MONTH_NAMES[month.month - 1]}
                            <span className="ml-2 text-ink-600">
                              {month.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ---------------- 时间线 ---------------- */}
          <div className="relative min-w-0">
            {/* 竖向时间线 */}
            <span className="absolute bottom-0 left-[7px] top-2 hidden w-px bg-gradient-to-b from-indigo-500/60 via-white/10 to-transparent md:block" />

            <div className="space-y-10">
              <AnimatePresence initial={false}>
                {visibleGroups.map((group, groupIndex) => {
                  const isCollapsed = collapsed[group.key];
                  return (
                    <motion.section
                      key={group.key}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: Math.min(groupIndex * 0.06, 0.3),
                      }}
                    >
                      {/* 分组标题 */}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => ({
                            ...prev,
                            [group.key]: !prev[group.key],
                          }))
                        }
                        className="group flex w-full items-center gap-4 text-left"
                      >
                        <span className="relative z-10 hidden h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-indigo-400 bg-ink-900 md:flex">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        </span>

                        <h2 className="text-lg font-bold text-white transition-colors group-hover:text-cyan-300 md:text-xl">
                          {group.label}
                        </h2>

                        <span className="badge-glass">{group.count} 篇</span>

                        <motion.span
                          animate={{ rotate: isCollapsed ? -90 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-auto text-ink-500"
                        >
                          <HiOutlineChevronDown />
                        </motion.span>
                      </button>

                      {/* 文章列表 */}
                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-3 md:ml-8">
                              {group.blogs.map((blog, index) => (
                                <motion.li
                                  key={blog.id}
                                  initial={{ opacity: 0, x: -12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    duration: 0.35,
                                    delay: Math.min(index * 0.04, 0.25),
                                  }}
                                >
                                  <Link
                                    to={`/blog/${blog.id}`}
                                    className="glass-card group/item flex items-center gap-4 p-4 transition-all duration-300 hover:border-indigo-400/35 hover:shadow-glass-hover"
                                  >
                                    {/* 日期 */}
                                    <span className="hidden w-14 shrink-0 text-center sm:block">
                                      <span className="block text-lg font-bold text-white">
                                        {blog.date_short?.slice(8, 10) || '--'}
                                      </span>
                                      <span className="block text-xs text-ink-500">
                                        日
                                      </span>
                                    </span>

                                    <span className="hidden h-10 w-px bg-white/10 sm:block" />

                                    {/* 标题与元信息 */}
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-1 block font-medium text-white transition-colors group-hover/item:text-cyan-300">
                                        {blog.title}
                                      </span>
                                      <span className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                        <span className="text-indigo-300">
                                          {blog.category_label}
                                        </span>
                                        <span>{blog.author_name}</span>
                                        <span className="inline-flex items-center gap-1">
                                          <HiOutlineEye className="text-sm" />
                                          {compactNumber(blog.views)}
                                        </span>
                                        <span>{blog.reading_time}</span>
                                      </span>
                                    </span>

                                    <span className="shrink-0 text-ink-600 transition-transform duration-300 group-hover/item:translate-x-1 group-hover/item:text-cyan-400">
                                      →
                                    </span>
                                  </Link>
                                </motion.li>
                              ))}
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </motion.section>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive;
