import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineBadgeCheck,
  HiOutlineExclamationCircle,
  HiOutlineLockClosed,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import AuthLayout from '../components/AuthLayout';
import PasswordField from '../components/PasswordField';
import { AuthService } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';

const HIGHLIGHTS = [
  {
    icon: HiOutlineShieldCheck,
    title: '一次性链接',
    description: '链接在使用成功后立即失效，即使被他人看到也无法再次使用。',
  },
  {
    icon: HiOutlineLockClosed,
    title: '强密码保护',
    description: '新密码需满足长度与复杂度要求，最大程度降低被暴力破解的风险。',
  },
  {
    icon: HiOutlineRefresh,
    title: '重置后需重新登录',
    description: '为保障账号安全，重置密码后所有已登录设备都需要重新登录。',
  },
];

/** 链接校验状态 */
const STATUS = {
  CHECKING: 'checking',
  VALID: 'valid',
  INVALID: 'invalid',
};

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState(STATUS.CHECKING);
  const [statusMessage, setStatusMessage] = useState('');
  const [username, setUsername] = useState('');

  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // ---------------- 进入页面时预检链接有效性 ----------------
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!uid || !token) {
        setStatus(STATUS.INVALID);
        setStatusMessage('重置链接不完整，请重新申请。');
        return;
      }

      try {
        const data = await AuthService.verifyResetToken(uid, token);
        if (cancelled) return;

        if (data.valid) {
          setStatus(STATUS.VALID);
          setUsername(data.username || '');
        } else {
          setStatus(STATUS.INVALID);
          setStatusMessage(data.detail || '重置链接无效或已过期，请重新申请。');
        }
      } catch (error) {
        if (cancelled) return;
        setStatus(STATUS.INVALID);
        setStatusMessage(extractErrorMessage(error));
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [uid, token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.new_password) {
      next.new_password = '请设置新密码。';
    } else if (form.new_password.length < 8) {
      next.new_password = '密码长度至少 8 位。';
    }
    if (!form.confirm_password) {
      next.confirm_password = '请再次输入新密码。';
    } else if (form.confirm_password !== form.new_password) {
      next.confirm_password = '两次输入的密码不一致。';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      const data = await AuthService.confirmPasswordReset({
        uid,
        token,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      toast.success(data.detail || '密码重置成功，请使用新密码登录。');
      setDone(true);
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: '密码已重置，请使用新密码登录。' },
        });
      }, 2200);
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message);
      setErrors((prev) => ({ ...prev, new_password: message }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="设置新密码"
      subtitle={
        username
          ? `正在为账号「${username}」重置密码。`
          : '请设置一个新的登录密码。'
      }
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-center text-sm text-ink-400">
          <Link
            to="/login"
            className="font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            返回登录
          </Link>
        </p>
      }
    >
      <AnimatePresence mode="wait">
        {/* ================= 校验中 ================= */}
        {status === STATUS.CHECKING && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-14"
          >
            <span className="h-10 w-10 animate-spin-slow rounded-full border-2 border-white/10 border-t-indigo-500" />
            <p className="mt-4 text-sm text-ink-400">正在校验重置链接…</p>
          </motion.div>
        )}

        {/* ================= 链接无效 ================= */}
        {status === STATUS.INVALID && (
          <motion.div
            key="invalid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="flex items-start gap-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-5">
              <HiOutlineExclamationCircle className="mt-0.5 shrink-0 text-2xl text-rose-400" />
              <div>
                <p className="font-semibold text-rose-200">链接已失效</p>
                <p className="mt-1.5 text-sm leading-relaxed text-rose-200/70">
                  {statusMessage}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-ink-400">
              重置链接的有效期为 30 分钟，且只能使用一次。
              如果你已经使用过该链接，请直接登录。
            </p>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="btn-brand w-full justify-center"
              >
                <HiOutlineRefresh />
                重新申请重置链接
              </Link>
              <Link
                to="/login"
                className="btn-ghost-glass w-full justify-center"
              >
                <HiOutlineArrowLeft />
                返回登录
              </Link>
            </div>
          </motion.div>
        )}

        {/* ================= 重置成功 ================= */}
        {status === STATUS.VALID && done && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-12 text-center"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15"
            >
              <HiOutlineBadgeCheck className="text-3xl text-emerald-400" />
            </motion.span>

            <h3 className="mt-5 text-lg font-semibold text-white">
              密码重置成功
            </h3>
            <p className="mt-2 text-sm text-ink-400">
              正在跳转到登录页，请使用新密码登录…
            </p>

            <span className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.2, ease: 'linear' }}
                className="block h-full rounded-full bg-brand-gradient"
              />
            </span>
          </motion.div>
        )}

        {/* ================= 表单 ================= */}
        {status === STATUS.VALID && !done && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
          >
            <PasswordField
              id="new_password"
              name="new_password"
              label="新密码 *"
              value={form.new_password}
              onChange={handleChange}
              placeholder="至少 8 位，建议混合大小写与数字"
              autoComplete="new-password"
              error={errors.new_password}
              showStrength
              showHint
            />

            <PasswordField
              id="confirm_password"
              name="confirm_password"
              label="确认新密码 *"
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              error={errors.confirm_password}
              hintText={
                form.confirm_password &&
                form.confirm_password === form.new_password
                  ? '两次输入一致 ✓'
                  : undefined
              }
            />

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
                  提交中…
                </>
              ) : (
                '确认重置密码'
              )}
            </motion.button>

            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-cyan-300"
            >
              <HiOutlineArrowLeft />
              返回登录
            </Link>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default ResetPassword;
