/*
 * 로그인 토큰을 보관하는 스토어다.
 * 새로고침해도 로그인이 유지되도록 localStorage에 저장한다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  accessToken: string | null;
  // 토큰이 만료되는 시각(ms). 저장해 둔 토큰을 다시 불러올 때 만료 여부를 판단한다.
  expiresAt: number | null;
  // 토큰이 만료돼 로그아웃됐는지. 로그인 화면에서 만료 안내를 보여 줄 때만 쓰고 localStorage에는 저장하지 않는다.
  isExpired: boolean;
  setAuth: (accessToken: string, expiresIn: number) => void;
  // 사용자가 직접 로그아웃할 때 쓴다.
  clearAuth: () => void;
  // 토큰이 만료돼 로그아웃시킬 때 쓴다. 로그인 화면에 만료 안내가 뜬다.
  expireAuth: () => void;
  dismissExpired: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      isExpired: false,
      // expiresIn은 서버가 알려 준 토큰 유효 시간(초)이다.
      setAuth: (accessToken, expiresIn) =>
        set({ accessToken, expiresAt: Date.now() + expiresIn * 1000, isExpired: false }),
      clearAuth: () => set({ accessToken: null, expiresAt: null, isExpired: false }),
      expireAuth: () => set({ accessToken: null, expiresAt: null, isExpired: true }),
      dismissExpired: () => set({ isExpired: false }),
    }),
    {
      name: "bium-auth",
      partialize: (state) => ({ accessToken: state.accessToken, expiresAt: state.expiresAt }),
      // 이미 만료된 토큰이 남아 있으면 로그인된 것처럼 화면에 들어가므로, 불러올 때 지우고 만료 안내를 띄운다.
      onRehydrateStorage: () => (state) => {
        if (state?.expiresAt && state.expiresAt <= Date.now()) state.expireAuth();
      },
    },
  ),
);
