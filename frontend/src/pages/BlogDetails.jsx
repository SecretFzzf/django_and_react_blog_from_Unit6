import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineChatAlt2,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineLink,
  HiOutlinePencilAlt,
  HiOutlineShare,
  HiOutlineTag,
  HiOutlineTrash,
} from 'react-icons/hi';
import { toast } from 'react-toastify';

import Avatar from '../components/Avatar';
import Comment from '../components/Comment';
import ContentRenderer from '../components/ContentRenderer';
import EmptyState from '../components/EmptyState';
import FavoriteBtn from '../components/FavoriteBtn';
import LikeBtn from '../components/LikeBtn';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { GetContent, resolveMediaUrl } from '../services/GetContent';
import { extractErrorMessage } from '../services/api';
import {
  categoryColor,
  categoryLabel,
  compactNumber,
} from '../utils/format';

const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);

  const commentInputRef = useRef(null);

  // ---------------- 阅读进度条 ----------------
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  // ================= 数据加载 =================
  const loadBlog = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await GetContent.fetchBlog(id);
      setBlog(data);
    } catch (error) {
      if (error?.response?.status === 404 || error?.response?.status === 403) {
        setNotFound(true);
      } else {
        toast.error(extractErrorMessage(error));
      }
      setBlog(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBlog();
  }, [loadBlog]);

  useEffect(() => {
    GetContent.fetchComments(id)
      .then((list) => setComments(Array.isArray(list) ? list : []))
      .catch(() => setComments([]));
  }, [id]);

  const isOwner = useMemo(
    () => Boolean(user && blog && blog.author?.id === user.id),
    [user, blog]
  );

  // ================= 点赞 =================
  const requireLogin = (message) => {
    if (isAuthenticated) return false;
    toast.info(message);
    navigate('/login', { state: { from: `/blog/${id}`, message } });
    return true;
  };

  const handleToggleLike = async () => {
    if (requireLogin('请先登录后再点赞。')) return;
    try {
      const result = await GetContent.toggleLike(id);
      setBlog((prev) =>
        prev ? { ...prev, total_likes: result.total_likes, is_liked: result.liked } : prev
      );
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  // ================= 收藏 =================
  const handleToggleFavorite = async () => {
    if (requireLogin('请先登录后再收藏。')) return;
    try {
      const result = await GetContent.toggleFavorite(id);
      setBlog((prev) =>
        prev
          ? {
              ...prev,
              favorite_count: result.favorite_count,
              is_favorited: result.favorited,
            }
          : prev
      );
      toast.success(result.detail);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  // ================= 分享 =================
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: blog?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('文章链接已复制到剪贴板。');
    } catch {
      // 用户取消分享或浏览器不支持，静默处理
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('文章链接已复制。');
    } catch {
      toast.error('复制失败，请手动复制地址栏链接。');
    }
  };

  // ================= 删除文章 =================
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？删除后无法恢复。')) return;
    try {
      await GetContent.deleteBlog(id);
      toast.success('文章已删除。');
      navigate('/profile', { replace: true });
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  // ================= 评论 =================
  const handleSubmitComment = async (event) => {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;

    if (requireLogin('请先登录后再发表评论。')) return;

    setPosting(true);
    try {
      const result = await GetContent.createComment({ blog: id, body });
      setComments((prev) => [result.comment, ...prev]);
      setCommentBody('');
      setBlog((prev) =>
        prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev
      );
      toast.success('评论发表成功。');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await GetContent.deleteComment(commentId);
      setComments((prev) => prev.filter((item) => item.id !== commentId));
      setBlog((prev) =>
        prev
          ? { ...prev, comment_count: Math.max(0, (prev.comment_count || 1) - 1) }
          : prev
      );
      toast.success('评论已删除。');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  // ================= 渲染 =================
  if (loading) {
    return (
      <div className="container py-12">
        <Skeleton type="detail" />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="container py-20">
        <EmptyState
          variant="error"
          title="文章不存在或已被删除"
          description="它可能已经被作者移除，或者链接地址有误。"
          actionLabel="返回首页"
          actionTo="/"
        />
      </div>
    );
  }

  const cover = resolveMediaUrl(blog.image_url || blog.image);
  const label = categoryLabel(blog.category, blog.category_label);

  return (
    <article className="relative">
      {/* ---------------- 阅读进度条 ---------------- */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed left-0 top-0 z-[60] h-[3px] w-full origin-left bg-brand-gradient"
      />

      {/* ---------------- 头图 ---------------- */}
      <header className="relative">
        <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden md:h-[58vh]">
          {cover ? (
            <>
              <img
                src={cover}
                alt={blog.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/70 to-ink-900/30" />
            </>
          ) : (
            <>
              <div className="h-full w-full bg-brand-gradient-soft" />
              <div className="absolute inset-0 bg-grid-lines bg-grid opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/60 to-transparent" />
            </>
          )}
        </div>

        {/* 标题浮层 */}
        <div className="container relative -mt-40 md:-mt-48">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel p-6 md:p-10"
          >
            {/* 面包屑 */}
            <nav className="mb-5 flex items-center gap-2 text-xs text-ink-400">
              <Link to="/" className="transition-colors hover:text-cyan-300">
                首页
              </Link>
              <span>/</span>
              <Link
                to={`/?category=${blog.category}`}
                className="transition-colors hover:text-cyan-300"
              >
                {label}
              </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full bg-gradient-to-r ${categoryColor(
                  blog.category
                )} px-3 py-1 text-xs font-medium text-white shadow-glow`}
              >
                {label}
              </span>
              {blog.is_top && (
                <span className="badge-glass border-amber-400/40 text-amber-200">
                  置顶
                </span>
              )}
              {!blog.publish_status && (
                <span className="badge-glass border-amber-400/40 text-amber-200">
                  草稿（仅你可见）
                </span>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-bold leading-snug text-white md:text-4xl md:leading-tight">
              {blog.title}
            </h1>

            {/* 元信息 */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                to={`/?author=${blog.author?.id}`}
                className="group flex items-center gap-3"
              >
                <Avatar
                  src={blog.author_photo}
                  name={blog.author_name}
                  size="md"
                  ring
                />
                <div>
                  <p className="text-sm font-semibold text-white transition-colors group-hover:text-cyan-300">
                    {blog.author_name}
                  </p>
                  <p className="text-xs text-ink-500">
                    {blog.author_bio || `@${blog.author_username}`}
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineClock className="text-base" />
                  {blog.date_created}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineEye className="text-base" />
                  {compactNumber(blog.views)} 次阅读
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineChatAlt2 className="text-base" />
                  {blog.comment_count} 条评论
                </span>
                <span className="badge-glass">{blog.reading_time}</span>
              </div>
            </div>

            {/* 标签 */}
            {blog.tags?.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <HiOutlineTag className="text-ink-500" />
                {blog.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tags?tag=${encodeURIComponent(tag.name)}`}
                    className="badge-glass transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                  >
                    # {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </header>

      {/* ---------------- 正文区 ---------------- */}
      <div className="container mt-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          {/* 正文 */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="glass-card p-6 md:p-10"
            >
              <ContentRenderer content={blog.content} />

              {/* 文末操作区 */}
              <div className="divider-glow my-9" />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <LikeBtn
                    total_likes={blog.total_likes}
                    isLiked={blog.is_liked}
                    onToggle={handleToggleLike}
                    size="md"
                  />
                  <FavoriteBtn
                    count={blog.favorite_count}
                    isFavorited={blog.is_favorited}
                    onToggle={handleToggleFavorite}
                    size="md"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn-ghost-glass !px-4 !py-2.5 text-sm"
                  >
                    <HiOutlineLink />
                    复制链接
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && (
                    <>
                      <Link
                        to={`/edit/${blog.id}`}
                        state={{ blog }}
                        className="btn-ghost-glass !px-4 !py-2.5 text-sm"
                      >
                        <HiOutlinePencilAlt />
                        编辑
                      </Link>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="btn-danger-soft !px-4 !py-2.5 text-sm"
                      >
                        <HiOutlineTrash />
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ---------------- 评论区 ---------------- */}
            <section className="mt-10">
              <div className="mb-6 flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">
                  评论
                  <span className="ml-2 text-sm font-normal text-ink-500">
                    {comments.length} 条
                  </span>
                </h2>
              </div>

              {/* 发表评论 */}
              <form onSubmit={handleSubmitComment} className="mb-8">
                <div className="flex items-start gap-4">
                  <Avatar
                    src={user?.photo_url || user?.photo}
                    name={user?.display_name || user?.username || '访客'}
                    size="md"
                  />
                  <div className="flex-1">
                    <textarea
                      ref={commentInputRef}
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      onFocus={() => {
                        if (!isAuthenticated) {
                          toast.info('登录后即可参与讨论。');
                        }
                      }}
                      placeholder={
                        isAuthenticated
                          ? '写下你的想法…（支持换行）'
                          : '登录后即可发表评论'
                      }
                      rows={3}
                      maxLength={1000}
                      className="input-glass resize-y"
                    />

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-ink-500">
                        {commentBody.length} / 1000
                      </span>
                      <motion.button
                        type="submit"
                        whileHover={{ scale: posting ? 1 : 1.02 }}
                        whileTap={{ scale: posting ? 1 : 0.98 }}
                        disabled={posting || !commentBody.trim()}
                        className="btn-brand !py-2 text-sm"
                      >
                        {posting ? '发布中…' : '发表评论'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </form>

              {/* 评论列表 */}
              {comments.length === 0 ? (
                <EmptyState
                  variant="empty"
                  title="还没有人评论"
                  description="成为第一个分享想法的人吧，你的观点可能正是别人需要的。"
                  className="!py-10"
                />
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence initial={false}>
                    {comments.map((comment, index) => (
                      <Comment
                        key={comment.id}
                        comment={comment}
                        index={index}
                        canDelete={Boolean(
                          user && (comment.is_owner || user.is_staff)
                        )}
                        onDelete={handleDeleteComment}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>
          </div>

          {/* ---------------- 侧边悬浮操作栏 ---------------- */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <div className="glass-card p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
                  互动
                </p>
                <div className="flex flex-col gap-3">
                  <LikeBtn
                    total_likes={blog.total_likes}
                    isLiked={blog.is_liked}
                    onToggle={handleToggleLike}
                    className="w-full justify-center"
                  />
                  <FavoriteBtn
                    count={blog.favorite_count}
                    isFavorited={blog.is_favorited}
                    onToggle={handleToggleFavorite}
                    className="w-full justify-center"
                  />
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn-ghost-glass w-full !py-2.5 text-sm"
                  >
                    <HiOutlineShare />
                    分享文章
                  </button>
                </div>
              </div>

              <div className="glass-card p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
                  数据
                </p>
                <dl className="space-y-3 text-sm">
                  {[
                    ['阅读量', compactNumber(blog.views)],
                    ['点赞数', compactNumber(blog.total_likes)],
                    ['收藏数', compactNumber(blog.favorite_count)],
                    ['评论数', compactNumber(blog.comment_count)],
                    ['阅读时长', blog.reading_time],
                  ].map(([label2, value]) => (
                    <div key={label2} className="flex items-center justify-between">
                      <dt className="text-ink-400">{label2}</dt>
                      <dd className="font-medium text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Link
                to="/"
                className="btn-ghost-glass w-full justify-center text-sm"
              >
                <HiOutlineArrowLeft />
                返回文章列表
              </Link>
            </div>
          </aside>
        </div>

        {/* 移动端底部返回 */}
        <div className="mt-10 lg:hidden">
          <Link to="/" className="btn-ghost-glass w-full justify-center">
            <HiOutlineArrowLeft />
            返回文章列表
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogDetails;
