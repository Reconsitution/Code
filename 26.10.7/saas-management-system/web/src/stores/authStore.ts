import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';
import { setToken, TOKEN_KEY, UNAUTHORIZED_EVENT } from '../api/client';
import type { AuthUser } from '../types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** idle=未初始化, loading=校验中, authed=已登录, anon=未登录 */
  status: 'idle' | 'loading' | 'authed' | 'anon';
  login: (account: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
      user: null,
      status: 'idle',

      login: async (account, password) => {
        const result = await authApi.login(account, password);
        setToken(result.token);
        set({ token: result.token, user: result.user, status: 'authed' });
      },

      logout: () => {
        setToken(null);
        set({ token: null, user: null, status: 'anon' });
      },

      /** 用本地 token 换回用户信息，刷新页面后恢复登录态 */
      refresh: async () => {
        const token = get().token;
        if (!token) {
          set({ status: 'anon', user: null });
          return;
        }
        set({ status: 'loading' });
        try {
          const user = await authApi.me();
          set({ user, status: 'authed' });
        } catch {
          setToken(null);
          set({ token: null, user: null, status: 'anon' });
        }
      },

      setUser: (user) => set({ user }),

      hasPermission: (code) => {
        const user = get().user;
        if (!user) return false;
        return user.permissions.includes(code);
      },

      hasAnyPermission: (codes) => {
        const user = get().user;
        if (!user) return false;
        return codes.some((c) => user.permissions.includes(c));
      },
    }),
    {
      name: 'saas-admin-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// 任意请求返回 401 时统一登出
if (typeof window !== 'undefined') {
  window.addEventListener(UNAUTHORIZED_EVENT, () => {
    useAuthStore.getState().logout();
  });
}
