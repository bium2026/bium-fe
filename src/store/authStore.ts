/*
 * 로그인 토큰을 보관하는 스토어다.
 * 새로고침해도 로그인이 유지되도록 localStorage에 저장한다.
 * 액세스 토큰이 만료되면 공통 요청 함수(api/client.ts)가 리프레시 토큰으로 새 토큰을 받아 updateTokens로 바꾼다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthTokens = {
  accessToken: string;
  // 액세스 토큰 유효 시간(초)
  expiresIn: number;
  refreshToken: string;
};

type AuthState = {
  accessToken: string | null;
  // 액세스 토큰이 만료되는 시각(ms). 저장해 둔 토큰을 다시 불러올 때 만료 여부를 판단한다.
  expiresAt: number | null;
  // 액세스 토큰이 만료되면 새 토큰을 받는 데 쓴다. 갱신할 때마다 서버가 새것으로 바꿔 준다.
  refreshToken: string | null;
  // 로그인할 때마다 새로 만드는 값이다. 토큰을 갱신해도 그대로라, 로그아웃이나 다른 계정 로그인만 알아챌 때 쓴다.
  sessionId: string | null;
  // 토큰이 만료돼 로그아웃됐는지. 로그인 화면에서 만료 안내를 보여 줄 때만 쓰고 localStorage에는 저장하지 않는다.
  isExpired: boolean;
  // 로그인했을 때 쓴다.
  setAuth: (tokens: AuthTokens) => void;
  // 같은 로그인에서 토큰만 새로 받았을 때 쓴다.
  updateTokens: (tokens: AuthTokens) => void;
  // 사용자가 직접 로그아웃할 때 쓴다.
  clearAuth: () => void;
  // 토큰이 만료돼 로그아웃시킬 때 쓴다. 로그인 화면에 만료 안내가 뜬다.
  expireAuth: () => void;
  dismissExpired: () => void;
};

type PersistedAuth = Pick<AuthState, "accessToken" | "expiresAt" | "refreshToken" | "sessionId">;

// http로 연 화면에서는 crypto.randomUUID를 쓸 수 없어 시각과 난수로 만든다. 같은 브라우저 안에서만 구분하면 된다.
function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function toTokenState({ accessToken, expiresIn, refreshToken }: AuthTokens) {
  return { accessToken, expiresAt: Date.now() + expiresIn * 1000, refreshToken };
}

const signedOut = { accessToken: null, expiresAt: null, refreshToken: null, sessionId: null };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...signedOut,
      isExpired: false,
      setAuth: (tokens) => set({ ...toTokenState(tokens), sessionId: createSessionId(), isExpired: false }),
      updateTokens: (tokens) => set(toTokenState(tokens)),
      clearAuth: () => set({ ...signedOut, isExpired: false }),
      expireAuth: () => set({ ...signedOut, isExpired: true }),
      dismissExpired: () => set({ isExpired: false }),
    }),
    {
      name: "bium-auth",
      // 1: 리프레시 토큰과 sessionId를 더했다.
      version: 1,
      partialize: (state): PersistedAuth => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
      }),
      // 리프레시 토큰이 없던 때(버전 0) 저장한 로그인은 액세스 토큰이 만료될 때까지만 그대로 쓴다.
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<PersistedAuth>;
        if (version === 0) {
          return {
            accessToken: state.accessToken ?? null,
            expiresAt: state.expiresAt ?? null,
            refreshToken: null,
            sessionId: state.accessToken ? createSessionId() : null,
          };
        }
        return { ...signedOut, ...state };
      },
      // 액세스 토큰이 만료됐어도 리프레시 토큰이 있으면 첫 요청에서 새 토큰을 받으므로 그대로 둔다.
      // 리프레시 토큰도 없으면 로그인된 것처럼 화면에 들어가지 않게 지우고 만료 안내를 띄운다.
      onRehydrateStorage: () => (state) => {
        if (state?.expiresAt && state.expiresAt <= Date.now() && !state.refreshToken) state.expireAuth();
      },
    },
  ),
);
