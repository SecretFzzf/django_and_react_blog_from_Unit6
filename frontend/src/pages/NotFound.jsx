import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineHome,
  HiOutlineSearch,
} from 'react-icons/hi';

/**
 * 404 页面。
 */
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative flex min-h-[calc(100vh-4.5rem)] items-center overflow-hidden">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-grid opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />

      <div className="container relative">
        <div className="mx-auto max-w-xl text-center">
          {/* 404 数字 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <p className="select-none text-[7rem] font-black leading-none tracking-tighter text-gradient-flow md:text-[10rem]">
              404
            </p>

            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-2 top-4 text-4xl md:right-6 md:text-5xl"
            >
              🧭
            </motion.span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-6 text-2xl font-bold text-white md:text-3xl"
          >
            这一页走丢了
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-sm leading-relaxed text-ink-400"
          >
            你访问的地址
            <code className="mx-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-ink-300">
              {location.pathname}
            </code>
            不存在，或者内容已经被作者移除了。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/" className="btn-brand !px-6 !py-3">
              <HiOutlineHome />
              回到首页
            </Link>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-ghost-glass !px-6 !py-3"
            >
              <HiOutlineArrowLeft />
              返回上一页
            </button>

            <Link to="/archive" className="btn-ghost-glass !px-6 !py-3">
              <HiOutlineSearch />
              浏览归档
            </Link>
          </motion.div>

          {/* 推荐入口 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12"
          >
            <p className="mb-4 text-xs uppercase tracking-widest text-ink-500">
              或许你在找
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { to: '/tags', label: '标签云' },
                { to: '/favorites', label: '我的收藏' },
                { to: '/create', label: '撰写文章' },
                { to: '/profile', label: '个人中心' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="badge-glass transition-colors hover:border-indigo-400/40 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
