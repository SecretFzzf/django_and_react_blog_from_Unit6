import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineBadgeCheck,
  HiOutlineCamera,
  HiOutlineGlobe,
  HiOutlineIdentification,
  HiOutlineLink,
  HiOutlineSave,
} from 'react-icons/hi';
import { FaGithub, FaWeibo } from 'react-icons/fa';
import { SiZhihu } from 'react-icons/si';
import { toast } from 'react-toastify';

import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/GetContent';
import { extractErrorMessage, extractFieldErrors } from '../services/api';
import { validateImageFile } from '../utils/format';

const SOCIAL_FIELDS = [
  { name: 'website', label: '个人网站', icon: HiOutlineGlobe, placeholder: 'https://your-site.com' },
  { name: 'github', label: 'GitHub', icon: FaGithub, placeholder: 'https://github.com/username' },
  { name: 'twitter', label: 'X / Twitter', icon: HiOutlineLink, placeholder: 'https://x.com/username' },
  { name: 'weibo', label: '微博', icon: FaWeibo, placeholder: 'https://weibo.com/username' },
  { name: 'zhihu', label: '知乎', icon: SiZhihu, placeholder: 'https://www.zhihu.com/people/username' },
];

const EditProfile = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    nickname: '',
    bio: '',
    website: '',
    github: '',
    twitter: '',
    weibo: '',
    zhihu: '',
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});

  // ---------------- 初始化：拉取最新资料并填充表单 ----------------
  useEffect(() => {
    let cancelled = false;

    AuthService.me()
      .then((result) => {
        if (cancelled) return;
        setProfile(result);
        setForm({
          nickname: result.nickname || '',
          bio: result.bio || '',
          website: result.website || '',
          github: result.github || '',
          twitter: result.twitter || '',
          weibo: result.weibo || '',
          zhihu: result.zhihu || '',
        });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 头像本地预览
  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ---------------- 保存资料 ----------------
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (form.nickname.length > 50) {
      setErrors({ nickname: '昵称不能超过 50 个字符。' });
      return;
    }
    if (form.bio.length > 500) {
      setErrors({ bio: '个人简介不能超过 500 个字符。' });
      return;
    }

    setSaving(true);
    try {
      const result = await AuthService.updateProfile(form);
      setProfile(result.user);
      updateUser(result.user);
      toast.success(result.detail || '资料更新成功。');
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message);
      const serverErrors = extractFieldErrors(error);
      const mapped = {};
      const fieldMap = {
        昵称: 'nickname',
        个人简介: 'bio',
        个人网站: 'website',
        'GitHub 地址': 'github',
        'X / Twitter 地址': 'twitter',
        微博地址: 'weibo',
        知乎地址: 'zhihu',
      };
      Object.entries(serverErrors).forEach(([label, text]) => {
        mapped[fieldMap[label] || label] = text;
      });
      setErrors((prev) => ({ ...prev, ...mapped }));
    } finally {
      setSaving(false);
    }
  };

  // ---------------- 上传头像（立即保存） ----------------
  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const message = validateImageFile(file, 2);
    if (message) {
      toast.error(message);
      event.target.value = '';
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const result = await AuthService.updateProfile(formData, { withPhoto: true });
      setProfile(result.user);
      updateUser(result.user);
      toast.success('头像已更新。');
    } catch (error) {
      toast.error(extractErrorMessage(error));
      setPreview('');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-10">
        <Skeleton type="detail" />
      </div>
    );
  }

  const displayName = form.nickname || profile?.username || '未命名';

  return (
    <div className="container max-w-5xl py-10">
      {/* 页头 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            编辑个人资料
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            完善资料能让读者更快地了解你，也会展示在你的文章署名处。
          </p>
        </div>

        <Link to="/profile" className="btn-ghost-glass !px-4 !py-2 text-sm">
          <HiOutlineArrowLeft />
          返回
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* ==================== 表单 ==================== */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 头像 */}
          <section className="glass-card p-6">
            <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-white">
              <HiOutlineCamera className="text-indigo-300" />
              头像
            </h2>

            <div className="flex flex-wrap items-center gap-6">
              <div className="relative">
                {preview ? (
                  <img
                    src={preview}
                    alt="头像预览"
                    className="h-24 w-24 rounded-full border border-white/15 object-cover shadow-card"
                  />
                ) : (
                  <Avatar
                    src={profile?.photo_url || profile?.photo}
                    name={displayName}
                    size="2xl"
                  />
                )}

                {uploadingAvatar && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                    <span className="h-6 w-6 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="btn-ghost-glass !px-4 !py-2 text-sm"
                >
                  <HiOutlineCamera />
                  {uploadingAvatar ? '上传中…' : '更换头像'}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">
                  支持 JPG / PNG / WEBP，大小不超过 2MB。
                  <br />
                  建议使用正方形图片，展示效果最佳。
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>
          </section>

          {/* 基本信息 */}
          <section className="glass-card p-6">
            <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-white">
              <HiOutlineIdentification className="text-indigo-300" />
              基本信息
            </h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="label-glass">
                  用户名
                  <span className="ml-2 text-xs font-normal text-ink-500">
                    用户名用于登录，暂不支持修改
                  </span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={profile?.username || ''}
                  disabled
                  className="input-glass cursor-not-allowed opacity-60"
                />
              </div>

              <div>
                <label htmlFor="nickname" className="label-glass">
                  昵称
                  <span className="ml-2 text-xs font-normal text-ink-500">
                    展示在文章与评论中
                  </span>
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  maxLength={50}
                  value={form.nickname}
                  onChange={handleChange}
                  placeholder="给自己取一个响亮的名字"
                  className={`input-glass ${errors.nickname ? 'input-glass-error' : ''}`}
                />
                {errors.nickname ? (
                  <p className="mt-2 text-xs text-rose-400">{errors.nickname}</p>
                ) : (
                  <p className="mt-2 text-right text-xs text-ink-500">
                    {form.nickname.length} / 50
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="bio" className="label-glass">
                  个人简介
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  maxLength={500}
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="用几句话介绍你自己，比如擅长领域、正在做的事…"
                  className={`input-glass resize-y ${errors.bio ? 'input-glass-error' : ''}`}
                />
                {errors.bio ? (
                  <p className="mt-2 text-xs text-rose-400">{errors.bio}</p>
                ) : (
                  <p className="mt-2 text-right text-xs text-ink-500">
                    {form.bio.length} / 500
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label-glass">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input-glass cursor-not-allowed opacity-60"
                />
                <p className="mt-2 text-xs text-ink-500">
                  邮箱用于找回密码，如需更换请联系站长。
                </p>
              </div>
            </div>
          </section>

          {/* 社交链接 */}
          <section className="glass-card p-6">
            <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-white">
              <HiOutlineLink className="text-indigo-300" />
              社交链接
              <span className="text-xs font-normal text-ink-500">
                选填，填写后会展示在你的个人主页
              </span>
            </h2>

            <div className="space-y-5">
              {SOCIAL_FIELDS.map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="label-glass">
                    <span className="inline-flex items-center gap-2">
                      <field.icon className="text-base text-ink-500" />
                      {field.label}
                    </span>
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="url"
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className={`input-glass ${
                      errors[field.name] ? 'input-glass-error' : ''
                    }`}
                  />
                  {errors[field.name] && (
                    <p className="mt-2 text-xs text-rose-400">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              type="submit"
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              disabled={saving}
              className="btn-brand !px-6 !py-3"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                  保存中…
                </>
              ) : (
                <>
                  <HiOutlineSave />
                  保存修改
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
        </form>

        {/* ==================== 实时预览 ==================== */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
              实时预览
            </p>

            <div className="glass-card overflow-hidden">
              <div className="h-20 bg-brand-gradient-soft">
                <div className="h-full w-full bg-grid-lines bg-grid opacity-40" />
              </div>

              <div className="px-5 pb-6">
                <div className="-mt-10">
                  {preview ? (
                    <img
                      src={preview}
                      alt="头像预览"
                      className="h-20 w-20 rounded-full border-4 border-ink-900 object-cover"
                    />
                  ) : (
                    <Avatar
                      src={profile?.photo_url || profile?.photo}
                      name={displayName}
                      size="xl"
                      className="border-4 border-ink-900"
                    />
                  )}
                </div>

                <p className="mt-4 text-lg font-bold text-white">
                  {displayName}
                </p>
                <p className="text-xs text-ink-500">@{profile?.username}</p>

                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-400">
                  {form.bio || '还没有填写个人简介。'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {SOCIAL_FIELDS.filter((field) => form[field.name]).map(
                    (field) => (
                      <span
                        key={field.name}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ink-300"
                        title={field.label}
                      >
                        <field.icon className="text-sm" />
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
              <HiOutlineBadgeCheck className="mt-0.5 shrink-0 text-indigo-300" />
              <p className="text-xs leading-relaxed text-indigo-200/80">
                头像上传后会立即生效；其它信息需要点击「保存修改」才会同步。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EditProfile;
