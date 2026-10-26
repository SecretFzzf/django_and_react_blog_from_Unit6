import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineExclamationCircle,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/GetContent';
import { extractErrorMessage, extractFieldErrors } from '../services/api';

const SECURITY_TIPS = [
  '密码长度至少 8 位，建议混合大小写字母、数字与符号。',
  '不要在多个网站使用同一个密码，尤其是邮箱与支付账号。',
  '定期更换密码，建议每 6 个月一次。',
  '不要通过聊天工具、邮件明文传输密码。',
];

const Settings = () => {
  const { user, userLogout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next = {};

    if (!form.old_password) {
      next.old_password = '请输入当前密码。';
    }
    if (!form.new_password) {
      next.new_password = '请输入新密码。';
    } else if (form.new_password.length < 8) {
      next.new_password = '新密码长度至少 8 位。';
    } else if (form.new_password === form.old_password) {
      next.new_password = '新密码不能与当前密码相同。';
    }
    if (!form.confirm_password) {
      next.confirm_password = '请再次输入新密码。';
    } else if (form.confirm_password !== form.new_password) {
      next.confirm_password = '两次输入的新密码不一致。';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      const data = await AuthService.changePassword(form);
      toast.success(data.detail || '密码修改成功，请重新登录。');

      // 密码已变更，出于安全考虑让所有令牌失效并强制重新登录
      setTimeout(async () => {
        await userLogout({ silent: true, redirect: false });
        navigate('/login', {
          replace: true,
          state: { message: '密码已修改，请使用新密码重新登录。' },
        });
      }, 1200);
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message);

      const serverErrors = extractFieldErrors(error);
      const mapped = {};
      const fieldMap = {
        原密码: 'old_password',
        新密码: 'new_password',
        确认密码: 'confirm_password',
      };
      Object.entries(serverErrors).forEach(([label, text]) => {
        mapped[fieldMap[label] || label] = text;
      });
      setErrors((prev) => ({ ...prev, ...mapped }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-5xl py-10">
      {/* 页头 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            账号安全
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            定期更换密码可以有效降低账号被盗用的风险。
          </p>
        </div>

        <Link to="/profile" className="btn-ghost-glass !px-4 !py-2 text-sm">
          <HiOutlineArrowLeft />
          返回
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* ==================== 修改密码表单 ==================== */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          onSubmit={handleSubmit}
          className="glass-card space-y-6 p-6 md:p-8"
          noValidate
        >
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <HiOutlineKey className="text-indigo-300" />
            修改登录密码
          </h2>

          {/* 账号提示 */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-sm font-semibold text-white">
              {(user?.display_name || user?.username || 'U').slice(0, 1)}
            </span>
            <div>
              <p className="text-sm font-medium text-white">
                {user?.display_name || user?.username}
              </p>
              <p className="text-xs text-ink-500">
                正在为当前登录账号修改密码
              </p>
            </div>
          </div>

          <PasswordField
            id="old_password"
            name="old_password"
            label="当前密码 *"
            value={form.old_password}
            onChange={handleChange}
            placeholder="请输入正在使用的密码"
            autoComplete="current-password"
            error={errors.old_password}
          />

          <div className="divider-glow" />

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

          {/* 提示 */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
            <HiOutlineExclamationCircle className="mt-0.5 shrink-0 text-lg text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-200/80">
              密码修改成功后，当前登录状态会立即失效，你需要使用新密码重新登录。
              其它已登录的设备也会同步退出。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              type="submit"
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              disabled={submitting}
              className="btn-brand !px-6 !py-3"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                  提交中…
                </>
              ) : (
                <>
                  <HiOutlineLockClosed />
                  确认修改
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="btn-ghost-glass !px-6 !py-3"
            >
              取消
            </button>
          </div>
        </motion.form>

        {/* ==================== 安全建议 ==================== */}
        <aside className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <HiOutlineShieldCheck className="text-emerald-300" />
              密码安全建议
            </h3>

            <ul className="mt-4 space-y-3">
              {SECURITY_TIPS.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-xs leading-relaxed text-ink-400"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white">忘记当前密码？</h3>
            <p className="mt-3 text-xs leading-relaxed text-ink-400">
              如果已经无法登录，可以通过注册邮箱重置密码。
            </p>
            <Link
              to="/forgot-password"
              className="btn-ghost-glass mt-4 w-full justify-center !py-2 text-sm"
            >
              通过邮箱重置
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Settings;
