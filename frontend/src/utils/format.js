/**
 * 墨韵博客 · 通用工具函数
 */

import { BASE_URL } from '../services/api';

/** 媒体地址补全 */
export function mediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

/** 从姓名中取首字母 / 首字，用于生成占位头像 */
export function initialsOf(name = '') {
  const trimmed = String(name).trim();
  if (!trimmed) return '墨';
  // 中文取第一个字，英文取首字母
  if (/[\u4e00-\u9fff]/.test(trimmed[0])) return trimmed[0];
  return trimmed.slice(0, 1).toUpperCase();
}

/** 由字符串稳定地派生一个渐变色，用于占位头像 */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #22d3ee, #3b82f6)',
  'linear-gradient(135deg, #f472b6, #a855f7)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #fbbf24, #f97316)',
  'linear-gradient(135deg, #60a5fa, #6366f1)',
];

export function gradientOf(seed = '') {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

/** 格式化日期为「x 分钟前 / x 天前 / 具体日期」 */
export function timeAgo(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} 天前`;
  if (seconds < 86400 * 365) return `${Math.floor(seconds / 86400 / 30)} 个月前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 数字紧凑显示：1234 -> 1.2k */
export function compactNumber(value) {
  const num = Number(value) || 0;
  if (num < 1000) return String(num);
  if (num < 10000) return `${(num / 1000).toFixed(1)}k`;
  if (num < 100000000) return `${(num / 10000).toFixed(1)} 万`;
  return `${(num / 100000000).toFixed(1)} 亿`;
}

/** 截断文本 */
export function truncate(text, max = 100) {
  const value = String(text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

/**
 * 密码强度评估。
 * 返回 { score: 0-4, label, color, hints: [] }
 */
export function evaluatePassword(password = '') {
  const value = String(password);
  const hints = [];

  if (value.length < 8) hints.push('至少 8 位字符');

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;

  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (variety >= 2) score += 1;
  if (variety >= 3) score += 1;

  // 明显的弱密码特征直接降级
  if (/^(\d+|[a-z]+|[A-Z]+)$/.test(value)) score = Math.min(score, 1);
  if (/^(123456|password|qwerty|admin|abc123)/i.test(value)) score = 0;

  score = Math.max(0, Math.min(4, score));

  const levels = [
    { label: '太弱了', color: '#f87171', width: '18%' },
    { label: '偏弱', color: '#fb923c', width: '38%' },
    { label: '一般', color: '#fbbf24', width: '60%' },
    { label: '较强', color: '#34d399', width: '80%' },
    { label: '非常强', color: '#22d3ee', width: '100%' },
  ];

  if (!value) {
    return { score: 0, label: '', color: '#334155', width: '0%', hints };
  }

  if (hints.length === 0 && variety < 3) hints.push('混合大小写字母、数字或符号会更安全');

  return { score, ...levels[score], hints };
}

/** 校验邮箱格式 */
export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/** 文件校验：返回 null 表示通过，否则返回错误文案 */
export function validateImageFile(file, maxSizeMB = 2) {
  if (!file) return '请选择一张图片。';
  if (!/^image\/(jpeg|png|jpg|gif|webp)$/.test(file.type)) {
    return '仅支持 JPG / PNG / GIF / WEBP 格式的图片。';
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `图片大小不能超过 ${maxSizeMB}MB。`;
  }
  return null;
}

/** 分类 key -> 中文名（后端已提供 category_label，此处作为兜底） */
export const CATEGORY_FALLBACK = {
  tech: '技术',
  frontend: '前端',
  backend: '后端',
  algorithm: '算法',
  ai: '人工智能',
  database: '数据库',
  devops: '运维部署',
  mobile: '移动开发',
  security: '网络安全',
  product: '产品设计',
  tools: '工具效率',
  career: '职场成长',
  life: '生活随笔',
  reading: '读书笔记',
  travel: '旅行见闻',
  other: '其他',
};

/** 分类对应的强调色，用于卡片上的分类徽标 */
export const CATEGORY_COLORS = {
  tech: 'from-blue-500 to-indigo-500',
  frontend: 'from-cyan-500 to-blue-500',
  backend: 'from-indigo-500 to-purple-500',
  algorithm: 'from-violet-500 to-fuchsia-500',
  ai: 'from-purple-500 to-pink-500',
  database: 'from-emerald-500 to-teal-500',
  devops: 'from-amber-500 to-orange-500',
  mobile: 'from-sky-500 to-cyan-500',
  security: 'from-rose-500 to-red-500',
  product: 'from-fuchsia-500 to-purple-500',
  tools: 'from-lime-500 to-emerald-500',
  career: 'from-orange-500 to-amber-500',
  life: 'from-pink-500 to-rose-500',
  reading: 'from-teal-500 to-cyan-500',
  travel: 'from-green-500 to-emerald-500',
  other: 'from-slate-500 to-slate-600',
};

export function categoryColor(key) {
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
}

export function categoryLabel(key, fallback) {
  return fallback || CATEGORY_FALLBACK[key] || key;
}
