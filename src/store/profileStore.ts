/*
 * 로그인한 사람의 이메일과 닉네임을 보관하는 스토어다.
 * 헤더의 계정 메뉴와 계정 화면이 함께 쓴다. 서버 값을 기준으로 그리므로 localStorage에는 저장하지 않는다.
 */
import { create } from "zustand";
import { getMyProfile, type MyProfile } from "../api/user";
import { useAuthStore } from "./authStore";

export type ProfileState = { status: "idle" | "loading" | "error" } | { status: "success"; profile: MyProfile };

type ProfileStore = {
  me: ProfileState;
  // 이미 받은 값이 있으면 다시 받는 동안에도 그대로 둔다.
  loadProfile: () => Promise<void>;
  // 닉네임을 바꾼 응답처럼 서버가 준 값을 바로 넣는다.
  setProfile: (profile: MyProfile) => void;
};

// 로그아웃하거나 다른 계정으로 바뀐 뒤 늦게 도착한 이전 계정의 응답을 버리려고, 요청마다 번호를 매긴다.
let requestId = 0;

export const useProfileStore = create<ProfileStore>()((set) => ({
  me: { status: "idle" },
  loadProfile: async () => {
    const id = ++requestId;
    set((state) => (state.me.status === "success" ? state : { me: { status: "loading" } }));
    try {
      const profile = await getMyProfile();
      if (id === requestId) set({ me: { status: "success", profile } });
    } catch {
      if (id === requestId) set((state) => (state.me.status === "success" ? state : { me: { status: "error" } }));
    }
  },
  setProfile: (profile) => {
    // 그 전에 보낸 조회는 바뀌기 전 값일 수 있어 늦게 와도 버린다.
    requestId += 1;
    set({ me: { status: "success", profile } });
  },
}));

// 로그아웃하거나 다른 계정으로 로그인하면 이전 사람의 닉네임이 남지 않게 지운다.
useAuthStore.subscribe((state, prevState) => {
  if (prevState.accessToken === state.accessToken) return;
  requestId += 1;
  useProfileStore.setState({ me: { status: "idle" } });
});
