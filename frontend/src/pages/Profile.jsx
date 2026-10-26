import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineDocumentText,
  HiOutlineGlobe,
  HiOutlineHeart,
  HiOutlineLink,
  HiOutlinePencilAlt,
  HiOutlinePlus,
  HiOutlineThumbUp,
} from 'react-icons/hi';
import { FaGithub, FaWeibo } from 'react-icons/fa';
import { SiZhihu } from 'react-icons/si';
import { toast } from 'react-toastify';

import Avatar from '../components/Avatar';
import Blog from '../components/Blog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { AuthService, GetContent } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';
import { compactNumber } from '../utils/format';

const TABS = [
  { key: 'published', label: '已发布', icon: HiOutlineDocumentText },
  { key: 'draft', label: '草稿箱', icon: HiOutlinePencilAlt },
  { key: 'favorites', label: '我的收藏', icon: HiOutlineHeart },
];

const STATUS_TO_KEY = {
  published: 'published',
  draft: 'draft',
};

const Profile = () => {
  const { user, updateUser } = useAuth();

  const [tab, setTab] = useState('published');
  const [page, setPage] = useState(1);

  const [profile, setProfile] = useState(user);
  const [data, setData] = useState({
    results: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ---------------- 拉取最新的个人资料 ----------------
  useEffect(() => {
    let cancelled = false;

    AuthService.me()
      .then((result) => {
        if (cancelled) return;
        setProfile(result);
        updateUser(result);
      })
      .catch(() => {
        /* 网络异常时保留本地缓存的资料，不打扰用户 */
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- 拉取列表数据 ----------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (tab === 'favorites') {
          const result = await GetContent.fetchFavorites({ page, page_size: 6 });
          if (cancelled) return;
          setData({
            ...result,
            results: result.results.map((item) => ({
              ...item.blog,
              _favoriteId: item.id,
            })),
          });
        } else {
          const result = await GetContent.fetchMyBlogs({
            page,
            page_size: 6,
            status: STATUS_TO_KEY[tab],
          });
          if (cancelled) return;
          setData(result);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(extractErrorMessage(error));
          setData({ results: [], count: 0, total_pages: 1, current_page: 1 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  // 切换标签时回到第一页
  const handleTabChange = (key) => {
    setTab(key);
    setPage(1);
  };

  const stats = useMemo(
    () => [
      {
        label: '发布文章',
        value: profile?.blog_count ?? 0,
        icon: HiOutlineDocumentText,
        accent: 'text-cyan-300',
      },
      {
        label: '收到收藏',
        value: profile?.favorite_count ?? 0,
        icon: HiOutlineHeart,
        accent: 'text-rose-300',
      },
      {
        label: '送出点赞',
        value: profile?.liked_count ?? 0,
        icon: HiOutlineThumbUp,
        accent: 'text-amber-300',
      },
      {
        label: '加入时间',
        value: profile?.date_joined_format || '—',
        icon: HiOutlineCalendar,
        accent: 'text-indigo-300',
        isText: true,
      },
    ],
    [profile]
  );

  const socialLinks = useMemo(
    () =>
      [
        { href: profile?.website, icon: HiOutlineGlobe, label: '个人网站' },
        { href: profile?.github, icon: FaGithub, label: 'GitHub' },
        { href: profile?.twitter, icon: HiOutlineLink, label: 'X / Twitter' },
        { href: profile?.weibo, icon: FaWeibo, label: '微博' },
        { href: profile?.zhihu, icon: SiZhihu, label: '知乎' },
      ].filter((item) => item.href),
    [profile]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await AuthService.me();
      setProfile(result);
      updateUser(result);
      toast.success('资料已刷新。');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="container py-10">
      {/* ==================== 个人信息卡 ==================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel relative overflow-hidden"
      >
        {/* 顶部渐变背景 */}
        <div className="h-32 bg-brand-gradient-soft md:h-40">
          <div className="h-full w-full bg-grid-lines bg-grid opacity-40" />
        </div>

        <div className="px-6 pb-7 md:px-10">
          {/* 头像 + 操作按钮 */}
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 md:-mt-16">
            <Avatar
              src={profile?.photo_url || profile?.photo}
              name={profile?.display_name || profile?.username}
              size="2xl"
              ring
              className="border-4 border-ink-900"
            />

            <div className="flex flex-wrap items-center gap-3 pb-1">
              <Link
                to="/edit-profile"
                className="btn-ghost-glass !px-4 !py-2 text-sm"
              >
                <HiOutlineCog />
                编辑资料
              </Link>
              <Link to="/create" className="btn-brand !px-4 !py-2 text-sm">
                <HiOutlinePlus />
                写新文章
              </Link>
            </div>
          </div>

          {/* 昵称 / 用户名 / 简介 */}
          <div className="mt-5">
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              {profile?.display_name || profile?.username}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              @{profile?.username}
              {profile?.email && (
                <span className="ml-3 text-ink-500">{profile.email}</span>
              )}
            </p>

            {profile?.bio ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-300">
                {profile.bio}
              </p>
            ) : (
              <Link
                to="/edit-profile"
                className="mt-4 inline-block text-sm text-ink-500 transition-colors hover:text-cyan-300"
              >
                还没有填写个人简介，去补充一句吧 →
              </Link>
            )}

            {/* 社交链接 */}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {socialLinks.map((item) => (
                  <motion.a
                    key={item.label}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-indigo-400/40 hover:text-white"
                  >
                    <item.icon className="text-base" />
                  </motion.a>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ==================== 统计卡片 ==================== */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.07 }}
            className="glass-card p-5 transition-colors duration-300 hover:border-indigo-400/30"
          >
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <item.icon className={`text-base ${item.accent}`} />
              {item.label}
            </div>
            <p
              className={`mt-3 font-bold text-white ${
                item.isText ? 'text-base' : 'text-2xl'
              }`}
            >
              {item.isText ? item.value : compactNumber(item.value)}
            </p>
          </motion.div>
        ))}
      </section>

      {/* ==================== 内容标签页 ==================== */}
      <section className="mt-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleTabChange(item.key)}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active ? 'text-white' : 'text-ink-400 hover:text-ink-100'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="profile-tab"
                      className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-2">
                    <Icon className="text-base" />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs text-ink-400 transition-colors hover:text-cyan-300 disabled:opacity-50"
            >
              <HiOutlineChartBar className="text-sm" />
              {refreshing ? '刷新中…' : '刷新数据'}
            </button>
            <span className="badge-glass">共 {data.count} 项</span>
          </div>
        </div>

        {/* 列表 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {loading ? (
              <Skeleton type="list" count={2} />
            ) : data.results.length === 0 ? (
              <EmptyState
                variant={tab === 'favorites' ? 'favorite' : 'empty'}
                title={
                  tab === 'published'
                    ? '还没有发布过文章'
                    : tab === 'draft'
                      ? '草稿箱是空的'
                      : '收藏夹还空着'
                }
                description={
                  tab === 'published'
                    ? '把你的第一个想法写下来，它会成为你技术成长的起点。'
                    : tab === 'draft'
                      ? '未完成的草稿会保存在这里，随时可以继续写。'
                      : '在文章详情页点击「收藏」，好文就会出现在这里。'
                }
                actionLabel={
                  tab === 'favorites' ? '去发现好文' : '撰写文章'
                }
                actionTo={tab === 'favorites' ? '/' : '/create'}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                  {data.results.map((blog, index) => (
                    <div key={blog.id} className="relative">
                      <Blog {...blog} index={index} />
                      {tab === 'draft' && (
                        <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200 backdrop-blur-md">
                          草稿
                        </span>
                      )}
                    </div>
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
      </section>
    </div>
  );
};

export default Profile;
