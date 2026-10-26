import React from 'react';

/**
 * 骨架屏组件集合。
 * 用于数据加载期间的占位，避免内容突兀闪烁。
 */

/** 基础块 */
export const SkeletonBlock = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

/** 文章卡片骨架 */
export const BlogCardSkeleton = () => (
  <div className="glass-card overflow-hidden">
    <SkeletonBlock className="h-52 w-full rounded-none" />
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="ml-auto h-4 w-20" />
      </div>
      <SkeletonBlock className="h-7 w-4/5" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-11/12" />
      <SkeletonBlock className="h-4 w-2/3" />
      <div className="flex gap-3 pt-2">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-16 rounded-full" />
      </div>
    </div>
  </div>
);

/** 文章列表骨架 */
export const BlogListSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
    {Array.from({ length: count }).map((_, index) => (
      <BlogCardSkeleton key={index} />
    ))}
  </div>
);

/** 文章详情骨架 */
export const BlogDetailSkeleton = () => (
  <div className="mx-auto max-w-4xl space-y-6">
    <SkeletonBlock className="h-4 w-40" />
    <SkeletonBlock className="h-10 w-3/4" />
    <div className="flex items-center gap-4">
      <SkeletonBlock className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
    </div>
    <SkeletonBlock className="h-72 w-full rounded-2xl" />
    <div className="space-y-3 pt-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={`h-4 ${index % 4 === 3 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  </div>
);

/** 统计卡片骨架 */
export const StatSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="glass-card p-5">
        <SkeletonBlock className="mb-3 h-4 w-16" />
        <SkeletonBlock className="h-8 w-24" />
      </div>
    ))}
  </div>
);

/** 普通加载指示器 */
const Skeleton = ({ type = 'list', count = 4 }) => {
  if (type === 'detail') return <BlogDetailSkeleton />;
  if (type === 'stats') return <StatSkeleton count={count} />;
  if (type === 'card') return <BlogCardSkeleton />;
  return <BlogListSkeleton count={count} />;
};

export default Skeleton;
