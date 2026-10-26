import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineCheck,
  HiOutlineExternalLink,
  HiOutlinePhotograph,
  HiOutlineTrash,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import MarkdownEditor from '../components/MarkdownEditor';
import Skeleton from '../components/Skeleton';
import TagInput from '../components/TagInput';
import { useAuth } from '../context/AuthContext';
import { GetContent, resolveMediaUrl } from '../services/GetContent';
import { extractErrorMessage, extractFieldErrors } from '../services/api';
import { validateImageFile } from '../utils/format';

const EditBlog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const coverInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'tech',
    tags: [],
    publish_status: true,
  });
  const [blog, setBlog] = useState(null);
  const [categories, setCategories] = useState([]);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [removeCover, setRemoveCover] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ---------------- 加载文章 ----------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await GetContent.fetchBlog(id);
        if (cancelled) return;

        // 仅作者本人可编辑
        if (user && data.author?.id !== user.id) {
          toast.error('您只能编辑自己发布的文章。');
          navigate(`/blog/${id}`, { replace: true });
          return;
        }

        setBlog(data);
        setForm({
          title: data.title || '',
          content: data.content || '',
          category: data.category || 'tech',
          tags: (data.tags || []).map((tag) => tag.name),
          publish_status: data.publish_status !== false,
        });
      } catch (error) {
        if (cancelled) return;
        toast.error(extractErrorMessage(error));
        navigate('/', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // ---------------- 分类选项 ----------------
  useEffect(() => {
    GetContent.fetchCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  // ---------------- 新封面本地预览 ----------------
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const message = validateImageFile(file, 5);
    if (message) {
      toast.error(message);
      event.target.value = '';
      return;
    }
    setCoverFile(file);
    setRemoveCover(false);
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = '请填写文章标题。';
    if (!form.content.trim()) {
      next.content = '正文内容不能为空。';
    } else if (form.content.trim().length < 10) {
      next.content = '正文内容太短了，至少需要 10 个字符。';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!validate()) {
      toast.error('请先修正表单中标红的问题。');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        category: form.category,
        tags: form.tags,
        publish_status: form.publish_status,
      };

      // 有新封面时上传；勾选了移除则清空封面，否则保留原图
      if (coverFile) {
        payload.image = coverFile;
      }

      const result = await GetContent.updateBlog(id, payload);
      toast.success(result?.detail || '文章已保存。');
      navigate(`/blog/${id}`, { replace: true });
    } catch (error) {
      toast.error(extractErrorMessage(error));

      const serverErrors = extractFieldErrors(error);
      const mapped = {};
      const fieldMap = {
        标题: 'title',
        正文: 'content',
        分类: 'category',
        标签: 'tags',
        封面图: 'image',
      };
      Object.entries(serverErrors).forEach(([label, message]) => {
        mapped[fieldMap[label] || label] = message;
      });
      setErrors((prev) => ({ ...prev, ...mapped }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl py-10">
        <Skeleton type="detail" />
      </div>
    );
  }

  const existingCover =
    blog.image_url || blog.image ? resolveMediaUrl(blog.image_url || blog.image) : null;
  const shownCover = coverPreview || (!removeCover ? existingCover : null);

  return (
    <div className="container max-w-5xl py-10">
      {/* ==================== 页头 ==================== */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            编辑文章
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            修改后点击保存即可生效。
            <span className="ml-2 text-ink-500">
              浏览 {blog.views} · 点赞 {blog.total_likes} · 评论{' '}
              {blog.comment_count}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/blog/${id}`}
            className="btn-ghost-glass !px-4 !py-2 text-sm"
          >
            <HiOutlineExternalLink />
            查看文章
          </Link>
          <Link to="/profile" className="btn-ghost-glass !px-4 !py-2 text-sm">
            <HiOutlineArrowLeft />
            返回
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ==================== 标题 ==================== */}
        <section className="glass-card p-6">
          <label htmlFor="title" className="label-glass">
            文章标题 <span className="text-rose-400">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={150}
            value={form.title}
            onChange={handleChange}
            className={`input-glass !text-lg !font-semibold ${
              errors.title ? 'input-glass-error' : ''
            }`}
          />
          <div className="mt-2 flex items-center justify-between">
            {errors.title ? (
              <p className="text-xs text-rose-400">{errors.title}</p>
            ) : (
              <span className="text-xs text-ink-500">
                创建于 {blog.date_created}
              </span>
            )}
            <span className="text-xs text-ink-500">
              {form.title.length} / 150
            </span>
          </div>
        </section>

        {/* ==================== 分类 / 标签 / 状态 ==================== */}
        <section className="glass-card space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="category" className="label-glass">
                文章分类
              </label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="select-glass"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="publish_status" className="label-glass">
                发布状态
              </label>
              <select
                id="publish_status"
                value={form.publish_status ? 'published' : 'draft'}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    publish_status: e.target.value === 'published',
                  }))
                }
                className="select-glass"
              >
                <option value="published">已发布（所有人可见）</option>
                <option value="draft">草稿（仅自己可见）</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-glass">文章标签</label>
            <TagInput
              value={form.tags}
              onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
            />
            {errors.tags && (
              <p className="mt-2 text-xs text-rose-400">{errors.tags}</p>
            )}
          </div>
        </section>

        {/* ==================== 封面图 ==================== */}
        <section className="glass-card p-6">
          <label className="label-glass">
            封面图
            <span className="ml-2 text-xs font-normal text-ink-500">
              不重新上传则保留原封面
            </span>
          </label>

          {shownCover ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              <img
                src={shownCover}
                alt="封面"
                className="h-56 w-full object-cover md:h-72"
              />
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-ink-900/85 px-3 py-1.5 text-xs font-medium text-ink-100 backdrop-blur-md transition-colors hover:border-indigo-400/50"
                >
                  <HiOutlinePhotograph className="text-sm" />
                  更换
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setRemoveCover(true);
                    if (coverInputRef.current) coverInputRef.current.value = '';
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-ink-900/85 px-3 py-1.5 text-xs font-medium text-rose-300 backdrop-blur-md transition-colors hover:border-rose-400/50 hover:bg-rose-500/20"
                >
                  <HiOutlineTrash className="text-sm" />
                  移除
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] transition-colors hover:border-indigo-400/40 hover:bg-white/[0.05] md:h-52"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <HiOutlinePhotograph className="text-xl text-ink-400" />
              </span>
              <span className="text-sm text-ink-400">点击上传封面图</span>
              <span className="text-xs text-ink-600">
                支持 JPG / PNG / WEBP，不超过 5MB
              </span>
            </button>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />

          {removeCover && !coverFile && (
            <p className="mt-2 text-xs text-amber-300">
              保存后封面图将被移除。
            </p>
          )}
        </section>

        {/* ==================== 正文 ==================== */}
        <section>
          <label className="label-glass">正文内容</label>
          <MarkdownEditor
            value={form.content}
            onChange={(content) => {
              setForm((prev) => ({ ...prev, content }));
              if (errors.content) setErrors((prev) => ({ ...prev, content: '' }));
            }}
            placeholder="正文内容…"
          />
          {errors.content && (
            <p className="mt-2 text-xs text-rose-400">{errors.content}</p>
          )}
        </section>

        {/* ==================== 操作区 ==================== */}
        <section className="glass-card sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-xs leading-relaxed text-ink-500">
            最后更新于 {blog.date_updated}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/blog/${id}`)}
              className="btn-ghost-glass !px-5 !py-2.5 text-sm"
            >
              取消
            </button>

            <motion.button
              type="submit"
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              disabled={saving}
              className="btn-brand !px-6 !py-2.5 text-sm"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                  保存中…
                </>
              ) : (
                <>
                  <HiOutlineCheck />
                  保存修改
                </>
              )}
            </motion.button>
          </div>
        </section>
      </form>
    </div>
  );
};

export default EditBlog;
