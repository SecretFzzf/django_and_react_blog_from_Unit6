import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineHeart,
  HiOutlineMail,
  HiOutlineTag,
} from 'react-icons/hi';
import { RiQuillPenLine } from 'react-icons/ri';
import { FaGithub, FaWeibo } from 'react-icons/fa';

import { SITE_NAME, SITE_SLOGAN } from '../services/api';

const FOOTER_LINKS = [
  {
    title: '浏览',
    links: [
      { to: '/', label: '首页' },
      { to: '/tags', label: '标签云' },
      { to: '/archive', label: '时间归档' },
    ],
  },
  {
    title: '我的',
    links: [
      { to: '/profile', label: '个人中心' },
      { to: '/favorites', label: '我的收藏' },
      { to: '/create', label: '撰写文章' },
    ],
  },
  {
    title: '账号',
    links: [
      { to: '/login', label: '登录' },
      { to: '/signup', label: '注册' },
      { to: '/forgot-password', label: '找回密码' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-ink-950/60 backdrop-blur-md">
      {/* 顶部渐变光带 */}
      <span className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* ---------------- 品牌区 ---------------- */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
                <RiQuillPenLine className="text-lg text-white" />
              </span>
              <span className="text-lg font-bold">
                <span className="text-gradient-flow">{SITE_NAME}</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
              {SITE_SLOGAN}
            </p>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
              一个专注于技术沉淀与阅读分享的中文博客社区。
              在这里记录思考，也遇见同路人。
            </p>

            <div className="mt-6 flex items-center gap-3">
              <motion.a
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.94 }}
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-indigo-400/40 hover:text-white"
                aria-label="GitHub"
              >
                <FaGithub />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.94 }}
                href="https://weibo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-indigo-400/40 hover:text-white"
                aria-label="微博"
              >
                <FaWeibo />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.94 }}
                href="mailto:hello@example.com"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-indigo-400/40 hover:text-white"
                aria-label="邮件联系"
              >
                <HiOutlineMail />
              </motion.a>
            </div>
          </div>

          {/* ---------------- 链接区 ---------------- */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-ink-400 transition-colors hover:text-cyan-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ---------------- 底部条 ---------------- */}
        <div className="divider-glow my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-ink-500 sm:flex-row">
          <p>
            © {year} {SITE_NAME} · 保留所有权利
          </p>

          <p className="inline-flex items-center gap-1.5">
            由
            <span className="font-medium text-ink-300">Django</span>
            与
            <span className="font-medium text-ink-300">React</span>
            驱动
            <HiOutlineHeart className="text-rose-400" />
          </p>

          <p className="inline-flex items-center gap-1.5">
            <HiOutlineTag className="text-sm" />
            用心记录每一行代码
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
