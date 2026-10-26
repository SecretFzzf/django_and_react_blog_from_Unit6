import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlinePhotograph,
  HiOutlineSave,
  HiOutlineTrash,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import MarkdownEditor from '../components/MarkdownEditor';
import TagInput from '../components/TagInput';
import { useAuth } from '../context/AuthContext';
import { GetContent } from '../services/GetContent';
import { extractErrorMessage, extractFieldErrors } from '../services/api';
import { validateImageFile } from '../utils/format';

const CreateBlog = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const coverInputRef = useRef(null);
  const editorRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'tech',
    tags: [],
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 未登录时提示
  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('请先登录后再撰写文章。');
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 分类选项
  useEffect(() => {
    GetContent.fetchCategories()
      .then((list) => {
        const items = Array.isArray(list) ? list : [];
        setCategories(items);
        if (items.length && !items.some((item) => item.value === form.category)) {
          setForm((prev) => ({ ...prev, category: items[0].value }));
        }
      })
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 封面本地预览
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  // 离开前提醒（有内容未发布时）
  useEffect(() => {
    const handler = (event) => {
      if (form.title.trim() || form.content.trim()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form.title, form.content]);

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
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) {
      next.title = '请填写文章标题。';
    } else if (form.title.trim().length < 2) {
      next.title = '标题至少需要 2 个字符。';
    }
    if (!form.content.trim()) {
      next.content = '正文内容不能为空。';
    } else if (form.content.trim().length < 10) {
      next.content = '正文内容太短了，至少需要 10 个字符。';
    }
    if (!form.category) {
      next.category = '请选择文章分类。';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (publishStatus) => {
    if (submitting || !validate()) {
      if (Object.keys(errors).length) {
        toast.error('请先修正表单中标红的问题。');
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await GetContent.createBlog({
        title: form.title.trim(),
        content: form.content,
        category: form.category,
        tags: form.tags,
        publish_status: publishStatus,
        image: coverFile,
      });

      const blogId = result?.blog?.id;
      toast.success(result?.detail || '文章发布成功。');

      if (publishStatus && blogId) {
        navigate(`/blog/${blogId}`, { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
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
      setSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit(true);
  };

  return (
    <div className="container max-w-5xl py-10">
      {/* ==================== 页头 ==================== */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            撰写新文章
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            以 Markdown 书写，支持实时预览与代码高亮。
            作者：{user?.display_name || user?.username}
          </p>
        </div>

        <Link to="/profile" className="btn-ghost-glass !px-4 !py-2 text-sm">
          <HiOutlineArrowLeft />
          返回
        </Link>
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
            placeholder="一个好标题能让文章被更多人看到"
            className={`input-glass !text-lg !font-semibold ${
              errors.title ? 'input-glass-error' : ''
            }`}
          />
          <div className="mt-2 flex items-center justify-between">
            {errors.title ? (
              <p className="text-xs text-rose-400">{errors.title}</p>
            ) : (
              <span className="text-xs text-ink-500">
                建议控制在 30 字以内，简洁有力
              </span>
            )}
            <span className="text-xs text-ink-500">
              {form.title.length} / 150
            </span>
          </div>
        </section>

        {/* ==================== 分类与标签 ==================== */}
        <section className="glass-card p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="category" className="label-glass">
                文章分类 <span className="text-rose-400">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`select-glass ${
                  errors.category ? 'input-glass-error' : ''
                }`}
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-2 text-xs text-rose-400">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="label-glass">文章标签</label>
              <TagInput
                value={form.tags}
                onChange={(tags) => {
                  setForm((prev) => ({ ...prev, tags }));
                  if (errors.tags) setErrors((prev) => ({ ...prev, tags: '' }));
                }}
              />
              {errors.tags && (
                <p className="mt-2 text-xs text-rose-400">{errors.tags}</p>
              )}
            </div>
          </div>
        </section>

        {/* ==================== 封面图 ==================== */}
        <section className="glass-card p-6">
          <label className="label-glass">
            封面图
            <span className="ml-2 text-xs font-normal text-ink-500">
              选填，建议尺寸 1200×675（16:9）
            </span>
          </label>

          {coverPreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              <img
                src={coverPreview}
                alt="封面预览"
                className="h-56 w-full object-cover md:h-72"
              />
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  if (coverInputRef.current) coverInputRef.current.value = '';
                }}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-ink-900/85 px-3 py-1.5 text-xs font-medium text-rose-300 backdrop-blur-md transition-colors hover:border-rose-400/50 hover:bg-rose-500/20"
              >
                <HiOutlineTrash className="text-sm" />
                移除封面
              </button>
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
              <span className="text-sm text-ink-400">
                点击上传封面图
              </span>
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

          {errors.image && (
            <p className="mt-2 text-xs text-rose-400">{errors.image}</p>
          )}
        </section>

        {/* ==================== 正文 ==================== */}
        <section>
          <label className="label-glass">
            正文内容 <span className="text-rose-400">*</span>
          </label>
          <MarkdownEditor
            ref={editorRef}
            value={form.content}
            onChange={(content) => {
              setForm((prev) => ({ ...prev, content }));
              if (errors.content) setErrors((prev) => ({ ...prev, content: '' }));
            }}
            placeholder={
              '# 从这里开始\n\n用 **Markdown** 写下你的想法，支持 `代码`、列表、表格与引用。\n\n```python\nprint("Hello, 墨韵博客")\n```'
            }
          />
          {errors.content && (
            <p className="mt-2 text-xs text-rose-400">{errors.content}</p>
          )}
        </section>

        {/* ==================== 操作区 ==================== */}
        <section className="glass-card sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-xs leading-relaxed text-ink-500">
            发布后文章将出现在首页；存为草稿则只有你本人可见。
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={submitting}
              className="btn-ghost-glass !px-5 !py-2.5 text-sm"
            >
              <HiOutlineSave />
              存为草稿
            </button>

            <motion.button
              type="submit"
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              disabled={submitting}
              className="btn-brand !px-6 !py-2.5 text-sm"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
                  提交中…
                </>
              ) : (
                <>
                  <HiOutlineCheck />
                  立即发布
                </>
              )}
            </motion.button>
          </div>
        </section>
      </form>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-500">
        <HiOutlineEye />
        想先看看效果？在编辑器里点击「实时预览」即可
      </p>
    </div>
  );
};

export default CreateBlog;
