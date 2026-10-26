import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineClock,
  HiOutlineBookOpen,
  HiOutlineFire,
  HiOutlineSparkles,
} from 'react-icons/hi';

import Blog from '../components/Blog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import { GetContent } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';
import { categoryColor, categoryLabel } from '../utils/format';

const SORT_OPTIONS = [
  { value: 'newest', label: '最新', icon: HiOutlineClock },
  { value: 'popular', label: '最热', icon: HiOutlineFire },
  { value: 'oldest', label: '最早', icon: HiOutlineSparkles },
];

const PAGE_SIZE = 8;

/**
 * 通用分类页。
 *
 * 通过路由参数接收分类 key，替代原先为每个分类单独写一个页面
 * （Technology / Education / Music 三个文件）的重复实现。
 * 新增分类时无需再改动任何代码。
 */
const Category = () => {
  const { category } = useParams();

  const [categories, setCategories] = useState([]);
  const [ordering, setOrdering] = useState('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    results: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---------------- 分类元信息（中文名 / 数量） ----------------
  useEffect(() => {
    GetContent.fetchCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  const meta = useMemo(
    () => categories.find((item) => item.value === category),
    [categories, category]
  );

  const label = categoryLabel(category, meta?.label);

  useEffect(() => {
    setPage(1);
  }, [category, ordering]);

  // ---------------- 拉取该分类下的文章 ----------------
  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await GetContent.fetchAllBlogsByCategory(category, {
        page,
        page_size: PAGE_SIZE,
        ordering,
      });
      setData(result);
    } catch (err) {
      setError(extractErrorMessage(err));
      setData({ results: [], count: 0, total_pages: 1, current_page: 1 });
    } finally {
      setLoading(false);
    }
  }, [category, page, ordering]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const isUnknownCategory = categories.length > 0 && !meta;

  return (
    <div className="container py-10">
      {/* ==================== 页头 ==================== */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-cyan-300"
        >
          <HiOutlineArrowLeft />
          返回首页
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${categoryColor(
                category
              )} px-3 py-1 text-xs font-medium text-white shadow-glow`}
            >
              <HiOutlineBookOpen className="text-sm" />
              分类
            </span>

            <h1 className="mt-5 text-3xl font-bold text-white md:text-5xl">
              <span className="text-gradient-flow">{label}</span>
            </h1>

            <p className="mt-4 text-sm text-ink-400">
              {loading ? '正在加载…' : `该分类下共有 ${data.count} 篇文章`}
            </p>
          </div>

          {/* 排序切换 */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = ordering === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOrdering(option.value)}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                    active ? 'text-white' : 'text-ink-400 hover:text-ink-100'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="category-sort-pill"
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
      </motion.header>

      {/* ==================== 分类快捷导航 ==================== */}
      {categories.length > 0 && (
        <div className="no-scrollbar mb-8 flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <Link
              key={item.value}
              to={`/category/${item.value}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                item.value === category
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                  : 'border-white/10 bg-white/5 text-ink-300 hover:border-indigo-400/40 hover:text-white'
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-xs opacity-60">{item.count}</span>
            </Link>
          ))}
        </div>
      )}

      {/* ==================== 列表 ==================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${category}-${page}-${ordering}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
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
              variant="empty"
              title={
                isUnknownCategory
                  ? '这个分类不存在'
                  : `「${label}」下还没有文章`
              }
              description={
                isUnknownCategory
                  ? '请检查地址是否正确，或从首页选择其它分类。'
                  : '这个主题还在等待第一篇文章，也许就是你的那一篇。'
              }
              actionLabel={isUnknownCategory ? '返回首页' : '撰写文章'}
              actionTo={isUnknownCategory ? '/' : '/create'}
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Category;
