import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineBadgeCheck,
  HiOutlineCamera,
  HiOutlineMail,
  HiOutlinePencilAlt,
  HiOutlineUser,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import AuthLayout from '../components/AuthLayout';
import Avatar from '../components/Avatar';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../context/AuthContext';
import { extractFieldErrors } from '../services/api';
import { evaluatePassword, isValidEmail, validateImageFile } from '../utils/format';

const HIGHLIGHTS = [
  {
    icon: HiOutlinePencilAlt,
    title: '属于你的创作空间',
    description: 'Markdown 编辑器 + 实时预览，让想法快速变成文章。',
  },
  {
    icon: HiOutlineBadgeCheck,
    title: '完整的个人主页',
    description: '自定义昵称、头像与社交链接，建立自己的技术名片。',
  },
  {
    icon: HiOutlineCamera,
    title: '轻量而专注',
    description: '没有冗余的社交模块，只有文字与思考本身。',
  },
];

const INITIAL_FORM = {
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirm_password: '',
  bio: '',
};

const SignUp = () => {
  const { userRegister, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 已登录直接回首页
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 头像本地预览：组件卸载时释放 ObjectURL，避免内存泄漏
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const passwordStrength = useMemo(
    () => evaluatePassword(form.password),
    [form.password]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const message = validateImageFile(file, 2);
    if (message) {
      toast.error(message);
      event.target.value = '';
      return;
    }

    setPhotoFile(file);
    setErrors((prev) => ({ ...prev, photo: '' }));
  };

  /** 前端预校验，减少无效请求 */
  const validate = () => {
    const next = {};

    if (!form.username.trim()) {
      next.username = '请填写用户名。';
    } else if (form.username.trim().length < 3) {
      next.username = '用户名至少需要 3 个字符。';
    }

    if (!form.email.trim()) {
      next.email = '请填写邮箱，用于找回密码。';
    } else if (!isValidEmail(form.email)) {
      next.email = '邮箱格式不正确，请检查后重试。';
    }

    if (!form.password) {
      next.password = '请设置密码。';
    } else if (form.password.length < 8) {
      next.password = '密码长度至少 8 位。';
    } else if (passwordStrength.score < 1) {
      next.password = '密码过于简单，请混合字母、数字或符号。';
    }

    if (!form.confirm_password) {
      next.confirm_password = '请再次输入密码。';
    } else if (form.confirm_password !== form.password) {
      next.confirm_password = '两次输入的密码不一致。';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    const result = await userRegister({
      username: form.username.trim(),
      email: form.email.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      confirm_password: form.confirm_password,
      bio: form.bio.trim(),
      photo: photoFile,
    });
    setSubmitting(false);

    if (result.success) {
      navigate('/login', {
        state: { message: '注册成功，请使用新账号登录。' },
      });
    } else if (result.error) {
      // 把后端返回的字段级错误落到对应输入框
      const serverErrors = extractFieldErrors(result.error);
      const mapped = {};
      const fieldMap = {
        用户名: 'username',
        邮箱: 'email',
        密码: 'password',
        确认密码: 'confirm_password',
        昵称: 'nickname',
        个人简介: 'bio',
        头像: 'photo',
      };
      Object.entries(serverErrors).forEach(([label, message]) => {
        const key = fieldMap[label] || label;
        mapped[key] = message;
      });
      setErrors((prev) => ({ ...prev, ...mapped }));
    }
  };

  return (
    <AuthLayout
      title="创建你的账号"
      subtitle="只需几步，即可拥有属于自己的写作空间。"
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-center text-sm text-ink-400">
          已经有账号了？
          <Link
            to="/login"
            className="ml-1 font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            去登录
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* ---------------- 头像上传 ---------------- */}
        <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="relative">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="头像预览"
                className="h-16 w-16 rounded-full border border-white/15 object-cover shadow-card"
              />
            ) : (
              <Avatar
                name={form.nickname || form.username || '新用户'}
                size="lg"
              />
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-ink-800 text-ink-200 shadow-card transition-colors hover:border-indigo-400/50 hover:text-white"
              aria-label="上传头像"
            >
              <HiOutlineCamera className="text-sm" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-100">选择头像</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              支持 JPG / PNG / WEBP，大小不超过 2MB。
              <br />
              不选择也可以，系统会为你生成一个渐变头像。
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-indigo-300 transition-colors hover:text-cyan-300"
              >
                浏览文件
              </button>
              {photoFile && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-ink-500 transition-colors hover:text-rose-300"
                >
                  移除
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- 用户名 ---------------- */}
        <div>
          <label htmlFor="username" className="label-glass">
            用户名 <span className="text-rose-400">*</span>
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
              placeholder="3-30 个字符，用于登录"
              className={`input-glass pl-11 ${errors.username ? 'input-glass-error' : ''}`}
            />
          </div>
          {errors.username && (
            <p className="mt-2 text-xs text-rose-400">{errors.username}</p>
          )}
        </div>

        {/* ---------------- 邮箱 ---------------- */}
        <div>
          <label htmlFor="email" className="label-glass">
            邮箱 <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <HiOutlineMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="用于登录与找回密码"
              className={`input-glass pl-11 ${errors.email ? 'input-glass-error' : ''}`}
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-xs text-rose-400">{errors.email}</p>
          )}
        </div>

        {/* ---------------- 昵称 ---------------- */}
        <div>
          <label htmlFor="nickname" className="label-glass">
            昵称
            <span className="ml-2 text-xs font-normal text-ink-500">
              选填，展示在文章署名处
            </span>
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={form.nickname}
            onChange={handleChange}
            placeholder="例如：墨韵"
            className={`input-glass ${errors.nickname ? 'input-glass-error' : ''}`}
          />
          {errors.nickname && (
            <p className="mt-2 text-xs text-rose-400">{errors.nickname}</p>
          )}
        </div>

        {/* ---------------- 密码 ---------------- */}
        <PasswordField
          id="password"
          name="password"
          label="密码 *"
          value={form.password}
          onChange={handleChange}
          placeholder="至少 8 位，建议混合大小写与数字"
          autoComplete="new-password"
          error={errors.password}
          showStrength
          showHint
        />

        {/* ---------------- 确认密码 ---------------- */}
        <PasswordField
          id="confirm_password"
          name="confirm_password"
          label="确认密码 *"
          value={form.confirm_password}
          onChange={handleChange}
          placeholder="请再次输入密码"
          autoComplete="new-password"
          error={errors.confirm_password}
          hintText={
            form.confirm_password && form.confirm_password === form.password
              ? '两次输入一致 ✓'
              : undefined
          }
        />

        {/* ---------------- 个人简介 ---------------- */}
        <div>
          <label htmlFor="bio" className="label-glass">
            个人简介
            <span className="ml-2 text-xs font-normal text-ink-500">
              选填
            </span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            value={form.bio}
            onChange={handleChange}
            placeholder="用一两句话介绍自己…"
            className={`input-glass resize-y ${errors.bio ? 'input-glass-error' : ''}`}
          />
          {errors.bio && (
            <p className="mt-2 text-xs text-rose-400">{errors.bio}</p>
          )}
        </div>

        {/* ---------------- 提交 ---------------- */}
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
              注册中…
            </>
          ) : (
            '创建账号'
          )}
        </motion.button>

        <p className="text-center text-xs leading-relaxed text-ink-500">
          注册即表示你同意本站的服务条款与隐私政策
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignUp;
