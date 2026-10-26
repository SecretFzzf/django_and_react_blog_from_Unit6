import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
  HiOutlineMail,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import AuthLayout from '../components/AuthLayout';
import { AuthService } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';
import { isValidEmail } from '../utils/format';

const HIGHLIGHTS = [
  {
    icon: HiOutlineShieldCheck,
    title: '安全的重置方式',
    description: '我们只发送一次性安全链接，任何人都无法从邮件中反推出你的密码。',
  },
  {
    icon: HiOutlineMail,
    title: '30 分钟内有效',
    description: '链接有效期 30 分钟，过期后可随时重新申请。',
  },
  {
    icon: HiOutlineCheckCircle,
    title: '密码永不明文',
    description: '所有密码均经过加盐哈希存储，包括我们自己在内都无法读取。',
  },
];

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const value = email.trim();
    if (!value) {
      setError('请输入注册时使用的邮箱地址。');
      return;
    }
    if (!isValidEmail(value)) {
      setError('邮箱格式不正确，请检查后重试。');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const data = await AuthService.requestPasswordReset(value);
      setSent(data);
      toast.success(data.detail || '重置链接已发送，请查收邮箱。');
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sent.reset_link);
      toast.success('重置链接已复制到剪贴板。');
    } catch {
      toast.error('复制失败，请手动选中链接复制。');
    }
  };

  return (
    <AuthLayout
      title="找回密码"
      subtitle="输入注册时使用的邮箱，我们会向你发送一条重置链接。"
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-center text-sm text-ink-400">
          想起来了？
          <Link
            to="/login"
            className="ml-1 font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            返回登录
          </Link>
        </p>
      }
    >
      {sent ? (
        /* ---------------- 发送成功状态 ---------------- */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          <div className="flex items-start gap-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
            <HiOutlineCheckCircle className="mt-0.5 shrink-0 text-2xl text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-200">重置链接已发送</p>
              <p className="mt-1.5 text-sm leading-relaxed text-emerald-200/70">
                {sent.detail}
              </p>
            </div>
          </div>

          {/* 开发环境直接给出链接，方便本地调试 */}
          {sent.reset_link && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                开发模式 · 直接使用链接
              </p>
              <p className="mt-2 break-all font-mono text-xs leading-relaxed text-amber-200/80">
                {sent.reset_link}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  <HiOutlineClipboardCopy className="text-sm" />
                  复制链接
                </button>
                <a
                  href={sent.reset_link}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  <HiOutlineExternalLink className="text-sm" />
                  直接打开
                </a>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-amber-200/50">
                提示：上线前请在后端配置 EMAIL_HOST_USER / EMAIL_HOST_PASSWORD，
                届时链接只会通过邮件发送。
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setSent(null);
              setEmail('');
            }}
            className="btn-ghost-glass w-full justify-center"
          >
            换一个邮箱重新申请
          </button>
        </motion.div>
      ) : (
        /* ---------------- 表单状态 ---------------- */
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="label-glass">
              注册邮箱
            </label>
            <div className="relative">
              <HiOutlineMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="请输入注册时填写的邮箱"
                className={`input-glass pl-11 ${error ? 'input-glass-error' : ''}`}
              />
            </div>
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: submitting ? 1 : 1.02 }}
            whileTap={{ scale: submitting ? 1 : 0.98 }}
            disabled={submitting}
            className="btn-brand w-full !py-3"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                发送中…
              </>
            ) : (
              '发送重置链接'
            )}
          </motion.button>

          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-cyan-300"
          >
            <HiOutlineArrowLeft />
            返回登录
          </Link>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
