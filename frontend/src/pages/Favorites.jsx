import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineHeart,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import Blog from '../components/Blog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import { GetContent } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';

const PAGE_SIZE = 6;

const Favorites = () => {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  const [data, setData] = useState({
    results: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // ---------------- 分类选项 ----------------
  useEffect(() => {
    GetContent.fetchCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  // ---------------- 搜索防抖 ----------------
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 320);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, category]);

  // ---------------- 拉取收藏列表 ----------------
  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await GetContent.fetchFavorites({
        page,
        page_size: PAGE_SIZE,
        ...(debouncedKeyword ? { search: debouncedKeyword } : {}),
        ...(category ? { category } : {}),
      });
      setData(result);
    } catch (err) {
      setError(extractErrorMessage(err));
      setData({ results: [], count: 0, total_pages: 1, current_page: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, category]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  /** 取消收藏：本地即时移除，避免整页刷新 */
  const handleRemoveFavorite = async (blogId) => {
    try {
      const result = await GetContent.toggleFavorite(blogId);
      toast.success(result.detail || '已取消收藏。');
      setData((prev) => ({
        ...prev,
        results: prev.results.filter((item) => item.blog?.id !== blogId),
        count: Math.max(0, prev.count - 1),
      }));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const hasFilter = Boolean(debouncedKeyword || category);

  const clearFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setCategory('');
  };

  return (
    <div className="container py-10">
      {/* ==================== 页头 ==================== */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <span className="badge-glass inline-flex">
          <HiOutlineHeart className="text-rose-300" />
          我的收藏夹
        </span>

        <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
          值得反复阅读的<span className="text-gradient-flow">好文</span>
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-400">
          收藏是把「稍后再读」变成「随时可读」。这里保存了你标记过的所有文章。
        </p>
      </motion.header>

      {/* ==================== 筛选区 ==================== */}
      <div className="glass-card mb-8 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="在收藏中搜索…"
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

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select-glass md:w-52"
            aria-label="按分类筛选"
          >
            <option value="">全部分类</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <div className="flex shrink-0 items-center gap-3">
            <span className="badge-glass">共 {data.count} 篇</span>
            {hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-ghost-glass !px-4 !py-3 text-sm"
              >
                <HiOutlineX />
                清除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 列表 ==================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${page}-${debouncedKeyword}-${category}`}
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
              onAction={loadFavorites}
            />
          ) : data.results.length === 0 ? (
            <EmptyState
              variant={hasFilter ? 'search' : 'favorite'}
              title={
                hasFilter ? '收藏夹里没有匹配的文章' : '收藏夹还空着'
              }
              description={
                hasFilter
                  ? '换个关键词或分类试试，也许能找到你想找的那一篇。'
                  : '在文章详情页点击「收藏」按钮，好文就会自动出现在这里。'
              }
              actionLabel={hasFilter ? '清除筛选' : '去发现好文'}
              actionTo={hasFilter ? undefined : '/'}
              onAction={hasFilter ? clearFilters : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                {data.results.map((item, index) => (
                  <div key={item.id} className="relative">
                    <Blog
                      {...item.blog}
                      index={index}
                      is_favorited
                    />

                    {/* 取消收藏 */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(item.blog.id)}
                      className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full border border-white/15 bg-ink-900/80 px-2.5 py-1 text-xs font-medium text-ink-200 backdrop-blur-md transition-colors hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200"
                      title="取消收藏"
                    >
                      <HiOutlineX className="text-sm" />
                      取消收藏
                    </button>
                  </div>
                ))}
              </div>

              <Pagination
                className="mt-12"
                currentPage={data.current_page}
                totalPages={data.total_pages}
                onPageChange={setPage}
              />

              <p className="mt-8 text-center text-xs text-ink-500">
                收藏于{' '}
                <Link to="/profile" className="text-cyan-400 hover:text-cyan-300">
                  个人中心
                </Link>{' '}
                可随时查看完整列表
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Favorites;
