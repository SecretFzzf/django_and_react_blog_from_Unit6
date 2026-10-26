/**
 * 墨韵博客 · 网络层
 *
 * 职责：
 *   1. 统一的 axios 实例（baseURL / 超时 / 请求头）
 *   2. 令牌仓库（localStorage 读写 + 变更广播）
 *   3. 全局拦截器：
 *        - 请求前自动附带 Access Token
 *        - 收到 401 时自动用 Refresh Token 换新令牌并重放原请求
 *        - 刷新失败则广播「强制登出」事件
 *        - 把后端的英文错误统一转成中文提示
 */

import axios from 'axios';

// ==================================================================
// 基础地址
// ==================================================================
export const BASE_URL =
  process.env.REACT_APP_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

export const API_ROOT = `${BASE_URL}/api`;

export const SITE_NAME = process.env.REACT_APP_SITE_NAME || '墨韵博客';

export const SITE_SLOGAN =
  process.env.REACT_APP_SITE_SLOGAN || '以代码为骨，以文字为韵';

// ==================================================================
// 令牌仓库
// ==================================================================
const TOKEN_KEY = 'authToken';
const USER_KEY = 'user';

/** 令牌变更 / 强制登出的事件总线 */
const listeners = new Set();

export function subscribeAuthEvent(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

function emit(event, payload) {
  listeners.forEach((handler) => {
    try {
      handler(event, payload);
    } catch (err) {
      // 单个订阅者出错不应影响其它订阅者
      console.error('[auth-event] 订阅者执行异常：', err);
    }
  });
}

function safeParse(raw) {
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const tokenStore = {
  getTokens() {
    return safeParse(localStorage.getItem(TOKEN_KEY));
  },

  getAccess() {
    return this.getTokens()?.access || null;
  },

  getRefresh() {
    return this.getTokens()?.refresh || null;
  },

  getUser() {
    return safeParse(localStorage.getItem(USER_KEY));
  },

  save(tokens, user) {
    if (tokens) {
      // 兼容后端只返回 access 的场景：保留原有 refresh
      const merged = {
        access: tokens.access ?? this.getAccess(),
        refresh: tokens.refresh ?? this.getRefresh(),
      };
      localStorage.setItem(TOKEN_KEY, JSON.stringify(merged));
    }
    if (user !== undefined) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    emit('tokens-updated', tokens);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    emit('tokens-cleared');
  },
};

// ==================================================================
// 错误提示提取（统一中文）
// ==================================================================
const FALLBACK_BY_STATUS = {
  400: '提交的数据有误，请检查后重试。',
  401: '登录状态已失效，请重新登录。',
  403: '您没有权限执行该操作。',
  404: '请求的内容不存在或已被删除。',
  405: '该接口不支持当前请求方式。',
  429: '操作过于频繁，请稍后再试。',
  500: '服务器开小差了，请稍后再试。',
  502: '网关异常，请稍后再试。',
  503: '服务暂时不可用，请稍后再试。',
};

/**
 * 从 axios 错误对象中提取一条可读的中文提示。
 */
export function extractErrorMessage(error) {
  if (error?.code === 'ECONNABORTED') {
    return '请求超时，请检查网络后重试。';
  }

  if (!error?.response) {
    return '无法连接到服务器，请确认后端服务已启动。';
  }

  const { status, data } = error.response;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    // 后端统一异常处理器返回的结构
    if (typeof data.detail === 'string' && data.detail) return data.detail;
    if (typeof data.message === 'string' && data.message) return data.message;

    // 字段级错误：取第一条
    if (data.errors && typeof data.errors === 'object') {
      for (const messages of Object.values(data.errors)) {
        const list = Array.isArray(messages) ? messages : [messages];
        for (const msg of list) {
          if (typeof msg === 'string' && msg) return msg;
        }
      }
    }

    // DRF 原始字段错误结构
    for (const [field, messages] of Object.entries(data)) {
      const list = Array.isArray(messages) ? messages : [messages];
      for (const msg of list) {
        if (typeof msg === 'string' && msg) {
          return field === 'non_field_errors' ? msg : `${msg}`;
        }
      }
    }
  }

  return FALLBACK_BY_STATUS[status] || '操作失败，请稍后重试。';
}

/**
 * 提取字段级错误，供表单做行内提示。
 * 返回 { 字段名: '提示文案' }
 */
export function extractFieldErrors(error) {
  const result = {};
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return result;

  const source = data.errors && typeof data.errors === 'object' ? data.errors : data;

  Object.entries(source).forEach(([field, messages]) => {
    if (field === 'detail' || field === 'message') return;
    const list = Array.isArray(messages) ? messages : [messages];
    const first = list.find((m) => typeof m === 'string' && m);
    if (first) result[field] = first;
  });

  return result;
}

// ==================================================================
// axios 实例
// ==================================================================
const api = axios.create({
  baseURL: API_ROOT,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 这些接口自身返回 401 时不应触发刷新逻辑，避免死循环
const NO_REFRESH_PATHS = [
  '/token/',
  '/token/refresh/',
  '/auth/password/reset/',
  '/auth/password/reset/confirm/',
  '/register/',
];

function shouldSkipRefresh(url = '') {
  return NO_REFRESH_PATHS.some((path) => url.includes(path));
}

// ---------------- 请求拦截器 ----------------
api.interceptors.request.use(
  (config) => {
    const access = tokenStore.getAccess();
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    // 上传文件时交给浏览器自动设置 multipart 边界
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------- 响应拦截器：401 自动续期 ----------------
let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error('NO_REFRESH_TOKEN');

  // 使用裸 axios，避免再次触发拦截器造成递归
  const { data } = await axios.post(
    `${API_ROOT}/token/refresh/`,
    { refresh },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  tokenStore.save(data);
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const canRetry =
      status === 401 &&
      original &&
      !original._retry &&
      !shouldSkipRefresh(original.url) &&
      !!tokenStore.getRefresh();

    if (canRetry) {
      original._retry = true;
      try {
        // 并发请求共用一个刷新动作，避免同时发起多次刷新
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccess = await refreshPromise;

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        // 刷新失败 → 清理登录态并广播，由 AuthContext 统一处理跳转
        tokenStore.clear();
        emit('forced-logout', extractErrorMessage(refreshError));
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !shouldSkipRefresh(original?.url)) {
      tokenStore.clear();
      emit('forced-logout', '登录状态已失效，请重新登录。');
    }

    return Promise.reject(error);
  }
);

export default api;
