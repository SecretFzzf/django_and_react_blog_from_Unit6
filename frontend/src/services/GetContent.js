/**
 * 墨韵博客 · 内容接口层
 *
 * 所有与后端交互的读写操作集中在此，页面组件只调用这里的方法，
 * 不直接拼接 URL，便于统一维护与错误处理。
 */

import api, { BASE_URL } from './api';

// ==================================================================
// 工具
// ==================================================================
/** 把后端返回的相对媒体地址补全为绝对地址（后端已返回绝对地址时原样返回） */
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

/** 把列表型响应的两种形态（分页 / 裸数组）统一成 { results, count, ... } */
function normalizeList(data, fallbackSize = 8) {
  if (Array.isArray(data)) {
    return {
      results: data,
      count: data.length,
      total_pages: 1,
      current_page: 1,
      page_size: fallbackSize,
      next: null,
      previous: null,
    };
  }
  return {
    results: data?.results ?? [],
    count: data?.count ?? 0,
    total_pages: data?.total_pages ?? 1,
    current_page: data?.current_page ?? 1,
    page_size: data?.page_size ?? fallbackSize,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
}

/** 生成 FormData（自动跳过 null / undefined） */
function toFormData(payload) {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(key, item));
    } else {
      form.append(key, value);
    }
  });
  return form;
}

const isFile = (value) =>
  typeof File !== 'undefined' && value instanceof File;

// ==================================================================
// 内容接口
// ==================================================================
export class GetContent {
  // ---------------- 站点基础 ----------------
  static async fetchCategories() {
    const { data } = await api.get('/blogs/categories/');
    return data;
  }

  static async fetchSiteStats() {
    const { data } = await api.get('/stats/');
    return data;
  }

  // ---------------- 文章列表 ----------------

  /**
   * 拉取文章列表（分页）
   * @param {Object} params - { category, tag, author, search, ordering, page, page_size }
   */
  static async fetchAllBlogs(params = {}) {
    const { data } = await api.get('/blogs/', { params });
    return normalizeList(data);
  }

  /** 按分类拉取 */
  static async fetchAllBlogsByCategory(category, params = {}) {
    const { data } = await api.get('/blogs/', {
      params: { ...params, category },
    });
    return normalizeList(data);
  }

  /** 按标签拉取 */
  static async fetchBlogsByTag(tag, params = {}) {
    const { data } = await api.get('/blogs/', { params: { ...params, tag } });
    return normalizeList(data);
  }

  /** 关键词搜索 */
  static async searchBlogs(search, params = {}) {
    const { data } = await api.get('/blogs/', {
      params: { ...params, search },
    });
    return normalizeList(data);
  }

  /** 热门文章 */
  static async fetchHotBlogs(limit = 6) {
    const { data } = await api.get('/blogs/hot/', { params: { limit } });
    return Array.isArray(data) ? data : data?.results ?? [];
  }

  /** 归档数据（按年 / 月分组） */
  static async fetchArchive(params = {}) {
    const { data } = await api.get('/blogs/archive/', { params });
    return data;
  }

  // ---------------- 文章详情 / 增删改 ----------------
  static async fetchBlog(id) {
    const { data } = await api.get(`/blogs/${id}/`);
    return data;
  }

  static async fetchMyBlogs(params = {}) {
    const { data } = await api.get('/blogs/my/', { params });
    return normalizeList(data);
  }

  static async createBlog(payload) {
    const hasFile = isFile(payload?.image);
    if (hasFile) {
      const { data } = await api.post('/blogs/create/', toFormData(payload));
      return data;
    }
    const { data } = await api.post('/blogs/create/', {
      ...payload,
      image: undefined,
    });
    return data;
  }

  static async updateBlog(id, payload) {
    const hasFile = isFile(payload?.image);
    if (hasFile) {
      const form = toFormData(payload);
      const { data } = await api.put(`/blogs/${id}/update/`, form);
      return data;
    }
    const { image, ...rest } = payload || {};
    const { data } = await api.patch(`/blogs/${id}/update/`, rest);
    return data;
  }

  static async deleteBlog(id) {
    const { data } = await api.delete(`/blogs/${id}/delete/`);
    return data;
  }

  // ---------------- 点赞 / 收藏 ----------------
  static async toggleLike(id) {
    const { data } = await api.post(`/blogs/${id}/like/`);
    return data;
  }

  static async toggleFavorite(id) {
    const { data } = await api.post(`/blogs/${id}/favorite/`);
    return data;
  }

  static async fetchFavorites(params = {}) {
    const { data } = await api.get('/favorites/', { params });
    return normalizeList(data);
  }

  // ---------------- 标签 ----------------
  static async fetchTags() {
    const { data } = await api.get('/tags/');
    return {
      results: data?.results ?? [],
      count: data?.count ?? 0,
      max_count: data?.max_count ?? 0,
    };
  }

  // ---------------- 评论 ----------------
  static async fetchComments(id) {
    const { data } = await api.get(`/blogs/${id}/comments/`);
    return Array.isArray(data) ? data : data?.results ?? [];
  }

  static async createComment({ blog, body }) {
    const { data } = await api.post('/comments/create/', { blog, body });
    return data;
  }

  static async deleteComment(id) {
    const { data } = await api.delete(`/comments/${id}/delete/`);
    return data;
  }
}

// ==================================================================
// 账号接口
// ==================================================================
export const AuthService = {
  /** 登录：返回 { access, refresh, user } */
  async login(username, password) {
    const { data } = await api.post('/token/', { username, password });
    return data;
  },

  /** 注册（支持头像上传） */
  async register({ username, email, password, confirm_password, nickname, bio, photo }) {
    const payload = { username, email, password, confirm_password, nickname, bio };
    const form = toFormData({ ...payload, photo: photo || undefined });
    const { data } = await api.post('/register/', form);
    return data;
  },

  /** 退出登录（把 refresh 加入黑名单） */
  async logout(refresh) {
    const { data } = await api.post('/auth/logout/', { refresh });
    return data;
  },

  /** 当前登录用户资料 */
  async me() {
    const { data } = await api.get('/profile/me/');
    return data;
  },

  /** 修改个人资料（withPhoto=true 时以 multipart 提交，支持头像上传） */
  async updateProfile(payload, { withPhoto = false } = {}) {
    let body = payload;
    if (withPhoto) {
      body = payload instanceof FormData ? payload : toFormData(payload);
    }
    const { data } = await api.patch('/profile/update/', body);
    return data;
  },

  /** 修改密码 */
  async changePassword({ old_password, new_password, confirm_password }) {
    const { data } = await api.post('/auth/password/change/', {
      old_password,
      new_password,
      confirm_password,
    });
    return data;
  },

  /** 忘记密码：申请重置邮件 */
  async requestPasswordReset(email) {
    const { data } = await api.post('/auth/password/reset/', { email });
    return data;
  },

  /** 校验重置链接有效性 */
  async verifyResetToken(uid, token) {
    const { data } = await api.post('/auth/password/reset/verify/', { uid, token });
    return data;
  },

  /** 提交新密码 */
  async confirmPasswordReset({ uid, token, new_password, confirm_password }) {
    const { data } = await api.post('/auth/password/reset/confirm/', {
      uid,
      token,
      new_password,
      confirm_password,
    });
    return data;
  },
};

export default GetContent;
