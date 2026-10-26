import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { RiQuillPenLine } from 'react-icons/ri';

import { SITE_NAME, SITE_SLOGAN } from '../services/api';

/**
 * 登录 / 注册 等账号类页面的统一外壳。
 *
 * 布局：左侧品牌展示区（仅大屏可见）+ 右侧表单区，
 * 形成「分栏科技感卡片」的视觉效果。
 */
const AuthLayout = ({ title, subtitle, children, footer, highlights = [] }) => (
  <div className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden">
    {/* 背景装饰 */}
    <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-grid opacity-30" />
    <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
    <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-purple-600/20 blur-[110px]" />

    <div className="container relative flex min-h-[calc(100vh-4.5rem)] items-center py-12">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-2">
        {/* ================= 左侧品牌区 ================= */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
              <RiQuillPenLine className="text-xl text-white" />
            </span>
            <span className="text-2xl font-bold text-gradient-flow">
              {SITE_NAME}
            </span>
          </Link>

          <h2 className="mt-10 text-4xl font-bold leading-snug text-white">
            以文字为舟，
            <br />
            渡向更辽阔的自己。
          </h2>

          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-400">
            {SITE_SLOGAN}
          </p>

          {highlights.length > 0 && (
            <ul className="mt-10 space-y-4">
              {highlights.map((item, index) => (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
                    <item.icon className="text-base" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">
                      {item.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* ================= 右侧表单区 ================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <div className="glass-panel relative overflow-hidden p-8 shadow-glass md:p-10">
            {/* 顶部渐变光带 */}
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />

            {/* 移动端 Logo */}
            <Link to="/" className="mb-7 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
                <RiQuillPenLine className="text-lg text-white" />
              </span>
              <span className="text-lg font-bold text-gradient-flow">
                {SITE_NAME}
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-ink-400">
                {subtitle}
              </p>
            )}

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

export default AuthLayout;
