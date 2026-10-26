/**
 * 墨韵博客 · 登录态上下文
 *
 * 能力：
 *   1. 登录 / 注册 / 退出（退出时把 refresh token 加入后端黑名单）
 *   2. Access Token 静默自动续期（每 5 分钟一次，页面重新聚焦时也会校验）
 *   3. 全局中文错误提示
 *   4. 令牌彻底失效时自动登出并提示
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

import api, { extractErrorMessage, tokenStore, subscribeAuthEvent } from '../services/api';
import { AuthService } from '../services/GetContent';

const AuthContext = createContext();

/** Access Token 剩余有效期少于该值（秒）时触发续期 */
const REFRESH_THRESHOLD_SECONDS = 60 * 8;
/** 定时巡检间隔：5 分钟 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** 解析 JWT 载荷，失败返回 null（不会抛异常） */
function decodeToken(token) {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

/** 令牌是否即将过期或已过期 */
function isExpiringSoon(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  const now = Date.now() / 1000;
  return payload.exp - now < REFRESH_THRESHOLD_SECONDS;
}

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(() => tokenStore.getUser());
  const [authToken, setAuthToken] = useState(() => tokenStore.getTokens());
  const [loading, setLoading] = useState(true);
  const [errMessage, setErrMessage] = useState('');
  const navigate = useNavigate();

  const refreshTimer = useRef(null);
  const mountedRef = useRef(true);

  // ---------------- 登出 ----------------
  const userLogout = useCallback(
    async ({ silent = false, redirect = true } = {}) => {
      const refresh = tokenStore.getRefresh();

      tokenStore.clear();
      setUser(null);
      setAuthToken(null);
      setErrMessage('');

      if (refresh) {
        // 尽力而为：把 refresh 加入后端黑名单，失败也不影响前端登出
        try {
          await AuthService.logout(refresh);
        } catch {
          /* 忽略 */
        }
      }

      if (redirect) {
        navigate('/', { replace: true });
      }
      if (!silent) {
        toast.info('已安全退出登录，期待下次相遇。');
      }
    },
    [navigate]
  );

  // ---------------- 刷新令牌 ----------------
  const updateToken = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    if (!refresh) {
      setLoading(false);
      return null;
    }

    try {
      // 使用裸 axios，避免被响应拦截器再次拦截造成递归
      const { data } = await api.post(
        '/token/refresh/',
        { refresh },
        { skipAuthRefresh: true }
      );
      tokenStore.save(data);
      if (mountedRef.current) {
        setAuthToken(data);
      }
      return data.access;
    } catch (error) {
      tokenStore.clear();
      if (mountedRef.current) {
        setUser(null);
        setAuthToken(null);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ---------------- 登录 ----------------
  const userLogin = useCallback(
    async (username, password) => {
      setErrMessage('');
      try {
        const data = await AuthService.login(username, password);

        tokenStore.save({ access: data.access, refresh: data.refresh }, data.user);
        setAuthToken({ access: data.access, refresh: data.refresh });
        setUser(data.user);

        toast.success(`欢迎回来，${data.user?.display_name || username}！`);
        navigate('/', { replace: true });
        return { success: true };
      } catch (error) {
        const message = extractErrorMessage(error);
        setErrMessage(message);
        toast.error(message);
        return { success: false, message };
      }
    },
    [navigate]
  );

  // ---------------- 注册 ----------------
  const userRegister = useCallback(async (payload) => {
    setErrMessage('');
    try {
      const data = await AuthService.register(payload);
      toast.success(data?.detail || '注册成功，请登录。');
      return { success: true, data };
    } catch (error) {
      const message = extractErrorMessage(error);
      setErrMessage(message);
      toast.error(message);
      return { success: false, message, error };
    }
  }, []);

  // ---------------- 更新本地用户信息 ----------------
  const updateUser = useCallback((nextUser) => {
    tokenStore.save(null, nextUser);
    setUser(nextUser);
  }, []);

  // ---------------- 订阅全局认证事件 ----------------
  useEffect(() => {
    const unsubscribe = subscribeAuthEvent((event, payload) => {
      if (event === 'tokens-updated') {
        setAuthToken(tokenStore.getTokens());
      }
      if (event === 'tokens-cleared') {
        setUser(null);
        setAuthToken(null);
      }
      if (event === 'forced-logout') {
        setUser(null);
        setAuthToken(null);
        toast.error(payload || '登录状态已失效，请重新登录。');
      }
    });
    return unsubscribe;
  }, []);

  // ---------------- 启动时校验登录态 ----------------
  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      const tokens = tokenStore.getTokens();

      if (!tokens?.access) {
        setLoading(false);
        return;
      }

      const payload = decodeToken(tokens.access);
      if (!payload) {
        // 本地令牌已损坏
        tokenStore.clear();
        setUser(null);
        setAuthToken(null);
        setLoading(false);
        return;
      }

      if (isExpiringSoon(tokens.access)) {
        await updateToken();
      } else {
        setLoading(false);
      }

      // 令牌有效时顺带拉取最新资料，保证昵称 / 头像实时同步
      if (tokenStore.getAccess()) {
        try {
          const profile = await AuthService.me();
          tokenStore.save(null, profile);
          if (mountedRef.current) setUser(profile);
        } catch {
          /* 网络异常时保留本地缓存，不强制登出 */
        }
      }
    };

    bootstrap();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- 定时续期 ----------------
  useEffect(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }

    refreshTimer.current = setInterval(() => {
      if (!tokenStore.getRefresh()) return;
      if (isExpiringSoon(tokenStore.getAccess())) {
        updateToken();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [updateToken]);

  // ---------------- 页面重新聚焦时校验 ----------------
  useEffect(() => {
    const handleFocus = () => {
      if (!tokenStore.getRefresh()) return;
      if (isExpiringSoon(tokenStore.getAccess())) {
        updateToken();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [updateToken]);

  // ---------------- 全局兜底：未捕获的 Promise 异常 ----------------
  useEffect(() => {
    const handleRejection = (event) => {
      if (event?.reason?.response) {
        // 已由业务层处理过的请求错误，避免重复弹窗
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  const value = {
    user,
    authToken,
    loading,
    errMessage,
    setErrMessage,
    userLogin,
    userRegister,
    userLogout,
    updateToken,
    updateUser,
    /** 是否已登录 */
    isAuthenticated: Boolean(user),
    /** 供组件便捷判断是否本人内容 */
    currentUserId: user?.id ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-ink-900">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin-slow rounded-full border-2 border-white/10 border-t-indigo-500" />
            <p className="text-sm text-ink-400">正在验证登录状态…</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

/** 便捷 Hook */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthContextProvider 内部使用');
  }
  return context;
};

export default AuthContext;
