import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUser,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import AuthLayout from '../components/AuthLayout';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';

const HIGHLIGHTS = [
  {
    icon: HiOutlineLightningBolt,
    title: 'Markdown 写作',
    description: '专注内容本身，语法高亮与实时预览让排版不再费心。',
  },
  {
    icon: HiOutlineSparkles,
    title: '标签与归档',
    description: '用标签组织知识，用时间线回望自己的成长轨迹。',
  },
  {
    icon: HiOutlineShieldCheck,
    title: '安全可靠',
    description: 'JWT 双令牌自动续期，密码加盐存储，数据始终掌握在自己手里。',
  },
];

const Login = () => {
  const { userLogin, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState({});

  const redirectTo = location.state?.from || '/';

  // 进入页面时提示上一页带来的消息
  useEffect(() => {
    if (location.state?.message) {
      toast.info(location.state.message);
    }
  }, [location.state]);

  // 已登录用户直接回跳
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldError[name]) {
      setFieldError((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.username.trim()) errors.username = '请输入用户名。';
    if (!form.password) errors.password = '请输入密码。';
    setFieldError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    const result = await userLogin(form.username.trim(), form.password);
    setSubmitting(false);

    if (result.success) {
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <AuthLayout
      title="欢迎回来"
      subtitle="登录后即可发布文章、收藏好文并参与讨论。"
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-center text-sm text-ink-400">
          还没有账号？
          <Link
            to="/signup"
            className="ml-1 font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            立即注册
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* 用户名 */}
        <div>
          <label htmlFor="username" className="label-glass">
            用户名
          </label>
          <div className="relative">
            <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              placeholder="请输入用户名"
              className={`input-glass pl-11 ${
                fieldError.username ? 'input-glass-error' : ''
              }`}
            />
          </div>
          {fieldError.username && (
            <p className="mt-2 text-xs text-rose-400">{fieldError.username}</p>
          )}
        </div>

        {/* 密码 */}
        <PasswordField
          id="password"
          name="password"
          label="密码"
          value={form.password}
          onChange={handleChange}
          placeholder="请输入密码"
          autoComplete="current-password"
          error={fieldError.password}
        />

        {/* 记住我 + 忘记密码 */}
        <div className="flex items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-400">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40"
            />
            保持登录状态
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-indigo-300 transition-colors hover:text-cyan-300"
          >
            忘记密码？
          </Link>
        </div>

        {/* 提交 */}
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
              登录中…
            </>
          ) : (
            '登录'
          )}
        </motion.button>

        {/* 第三方提示 */}
        <p className="text-center text-xs leading-relaxed text-ink-500">
          登录即表示你同意本站的服务条款与隐私政策
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
