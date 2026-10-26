import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineArchive,
  HiOutlineChevronDown,
  HiOutlineCog,
  HiOutlineHeart,
  HiOutlineKey,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlinePencilAlt,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineX,
} from 'react-icons/hi';
import { RiQuillPenLine } from 'react-icons/ri';

import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { SITE_NAME } from '../services/api';

/** 主导航链接 */
const NAV_LINKS = [
  { to: '/', label: '首页', icon: HiOutlineSearch, end: true },
  { to: '/tags', label: '标签', icon: HiOutlineTag },
  { to: '/archive', label: '归档', icon: HiOutlineArchive },
];

/** 用户下拉菜单项 */
const buildMenuItems = () => [
  { to: '/profile', label: '个人中心', icon: HiOutlineUser },
  { to: '/create', label: '撰写文章', icon: HiOutlinePencilAlt },
  { to: '/favorites', label: '我的收藏', icon: HiOutlineHeart },
  { to: '/settings', label: '修改密码', icon: HiOutlineKey },
];

const Navbar = () => {
  const { user, userLogout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const menuItems = buildMenuItems();

  // ---------------- 滚动响应 ----------------
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ---------------- 路由变化时关闭浮层 ----------------
  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // ---------------- 点击空白处关闭下拉菜单 ----------------
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  // ---------------- 移动端抽屉打开时锁定滚动 ----------------
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // ---------------- 快捷键：/ 聚焦搜索 ----------------
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';

      if (event.key === '/' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 60);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = keyword.trim();
    if (!query) {
      setSearchOpen(true);
      searchRef.current?.focus();
      return;
    }
    navigate(`/?search=${encodeURIComponent(query)}`);
    setKeyword('');
    setSearchOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setDrawerOpen(false);
    await userLogout();
  };

  const isActive = (to, end) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ease-smooth ${
          scrolled
            ? 'border-b border-white/10 bg-ink-900/80 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl'
            : 'border-b border-transparent bg-ink-900/40 backdrop-blur-md'
        }`}
      >
        <nav className="container flex h-16 items-center gap-4 md:h-[4.5rem]">
          {/* ---------------- Logo ---------------- */}
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label={`${SITE_NAME} 首页`}
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow transition-transform duration-300 group-hover:scale-105">
              <RiQuillPenLine className="text-lg text-white" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight sm:block">
              <span className="text-gradient-flow">{SITE_NAME}</span>
            </span>
          </Link>

          {/* ---------------- 桌面端导航 ---------------- */}
          <ul className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive: active }) =>
                    `link-underline relative px-3.5 py-2 text-sm font-medium transition-colors ${
                      active ? 'text-white' : 'text-ink-300 hover:text-white'
                    }`
                  }
                  data-active={
                    isActive(link.to, link.end) ? 'true' : 'false'
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* ---------------- 右侧操作区 ---------------- */}
          <div className="ml-auto flex items-center gap-2">
            {/* 桌面搜索框 */}
            <form
              onSubmit={handleSearch}
              className="relative hidden lg:block"
              role="search"
            >
              <HiOutlineSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-400" />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索文章…"
                aria-label="搜索文章"
                className="w-48 rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-12 text-sm text-ink-100 backdrop-blur-md transition-all duration-300 placeholder:text-ink-500 focus:w-64 focus:border-indigo-400/50 focus:bg-ink-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.65rem] text-ink-400 lg:block">
                /
              </kbd>
            </form>

            {/* 移动端搜索按钮 */}
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev);
                setTimeout(() => searchRef.current?.focus(), 60);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-200 transition-colors hover:border-indigo-400/40 hover:text-white lg:hidden"
              aria-label="搜索"
            >
              <HiOutlineSearch className="text-lg" />
            </button>

            {/* 已登录：撰写按钮 + 头像菜单 */}
            {isAuthenticated ? (
              <>
                <Link
                  to="/create"
                  className="hidden items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg md:inline-flex"
                >
                  <HiOutlinePencilAlt className="text-base" />
                  写文章
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1 pr-2.5 transition-all duration-200 hover:border-indigo-400/40 hover:bg-white/10"
                  >
                    <Avatar
                      src={user?.photo_url || user?.photo}
                      name={user?.display_name || user?.username}
                      size="sm"
                    />
                    <span className="hidden max-w-[6rem] truncate text-sm font-medium text-ink-100 sm:block">
                      {user?.display_name || user?.username}
                    </span>
                    <motion.span
                      animate={{ rotate: menuOpen ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-ink-400"
                    >
                      <HiOutlineChevronDown className="text-sm" />
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="glass-panel absolute right-0 mt-2 w-64 overflow-hidden p-2 shadow-glass"
                        role="menu"
                      >
                        {/* 用户信息头部 */}
                        <div className="mb-1 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                          <Avatar
                            src={user?.photo_url || user?.photo}
                            name={user?.display_name || user?.username}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {user?.display_name || user?.username}
                            </p>
                            <p className="truncate text-xs text-ink-400">
                              {user?.email || `@${user?.username}`}
                            </p>
                          </div>
                        </div>

                        <div className="divider-glow my-1" />

                        {menuItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              role="menuitem"
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-200 transition-colors hover:bg-white/[0.07] hover:text-white"
                            >
                              <Icon className="text-base text-ink-400" />
                              {item.label}
                            </Link>
                          );
                        })}

                        {user?.is_staff && (
                          <a
                            href={`${process.env.REACT_APP_BASE_URL}/admin/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            role="menuitem"
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-200 transition-colors hover:bg-white/[0.07] hover:text-white"
                          >
                            <HiOutlineCog className="text-base text-ink-400" />
                            管理后台
                          </a>
                        )}

                        <div className="divider-glow my-1" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                        >
                          <HiOutlineLogout className="text-base" />
                          退出登录
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* 未登录 */
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  登录
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg"
                >
                  注册
                </Link>
              </div>
            )}

            {/* 移动端菜单按钮 */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-200 transition-colors hover:border-indigo-400/40 hover:text-white md:hidden"
              aria-label="打开菜单"
            >
              <HiOutlineMenu className="text-xl" />
            </button>
          </div>
        </nav>

        {/* ---------------- 移动端下拉搜索 ---------------- */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/10 bg-ink-900/90 backdrop-blur-xl lg:hidden"
            >
              <form onSubmit={handleSearch} className="container py-3">
                <div className="relative">
                  <HiOutlineSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-400" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="输入关键词后回车搜索…"
                    aria-label="搜索文章"
                    className="input-glass pl-10"
                  />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ---------------- 移动端侧滑抽屉 ---------------- */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-[70] flex h-full w-[82vw] max-w-sm flex-col border-l border-white/10 bg-ink-900/95 backdrop-blur-2xl md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="导航菜单"
            >
              {/* 抽屉头部 */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="text-base font-bold text-gradient-flow">
                  {SITE_NAME}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:text-white"
                  aria-label="关闭菜单"
                >
                  <HiOutlineX className="text-lg" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* 用户卡片 */}
                {isAuthenticated ? (
                  <Link
                    to="/profile"
                    className="glass-card mb-5 flex items-center gap-3 p-4"
                  >
                    <Avatar
                      src={user?.photo_url || user?.photo}
                      name={user?.display_name || user?.username}
                      size="lg"
                      ring
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {user?.display_name || user?.username}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {user?.bio || `@${user?.username}`}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <Link to="/login" className="btn-ghost-glass">
                      登录
                    </Link>
                    <Link to="/signup" className="btn-brand">
                      注册
                    </Link>
                  </div>
                )}

                {/* 主导航 */}
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-ink-500">
                  浏览
                </p>
                <ul className="mb-5 space-y-1">
                  {NAV_LINKS.map((link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        end={link.end}
                        className={({ isActive: active }) =>
                          `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-indigo-500/15 text-white'
                              : 'text-ink-200 hover:bg-white/[0.06] hover:text-white'
                          }`
                        }
                      >
                        <link.icon className="text-base text-ink-400" />
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>

                {/* 用户功能 */}
                {isAuthenticated && (
                  <>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-ink-500">
                      我的
                    </p>
                    <ul className="space-y-1">
                      {menuItems.map((item) => (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <item.icon className="text-base text-ink-400" />
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn-danger-soft mt-5 w-full"
                    >
                      <HiOutlineLogout />
                      退出登录
                    </button>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
