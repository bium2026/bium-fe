/*
 * 내가 속한 냉장고 목록과 지금 보고 있는 냉장고를 보관하는 스토어다.
 * 공유받은 냉장고로 바꿔 볼 수 있도록 고른 냉장고 id를 localStorage에 남겨 새로고침해도 유지한다.
 * 목록은 헤더가 불러오고, 화면들은 getMyFridge()로 고른 냉장고를 받는다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMyFridges, type Fridge } from "../api/fridge";
import { useAuthStore } from "./authStore";

export type FridgeListState = { status: "idle" | "loading" | "error" } | { status: "success"; fridges: Fridge[] };

type FridgeState = {
  // null이면 따로 고르지 않은 상태라, 내가 주인인 냉장고를 보여 준다.
  selectedFridgeId: number | null;
  list: FridgeListState;
  selectFridge: (fridgeId: number | null) => void;
  loadFridges: () => Promise<void>;
  // 참여·나가기처럼 서버에 반영된 결과를 목록을 다시 받기 전에 바로 보여 줄 때 쓴다.
  addFridge: (fridge: Fridge) => void;
  removeFridge: (fridgeId: number) => void;
};

// 로그아웃하거나 다른 계정으로 바뀐 뒤 늦게 도착한 이전 계정의 목록을 버리려고, 요청마다 번호를 매긴다.
let listRequestId = 0;

// 고른 냉장고가 목록에 없으면(나갔거나 다른 계정) 내가 주인인 냉장고로 돌아간다.
export function pickFridge(fridges: Fridge[], selectedFridgeId: number | null) {
  return (
    fridges.find((fridge) => fridge.id === selectedFridgeId) ??
    fridges.find((fridge) => fridge.role === "OWNER") ??
    fridges[0] ??
    null
  );
}

export const useFridgeStore = create<FridgeState>()(
  persist(
    (set) => ({
      selectedFridgeId: null,
      list: { status: "idle" },
      selectFridge: (selectedFridgeId) => set({ selectedFridgeId }),
      // 이미 받은 목록이 있으면 다시 불러오는 동안에도 그대로 둔다.
      // 목록이 잠깐 비면 헤더의 냉장고 버튼과 그 안의 참여 모달이 사라졌다가 처음 상태로 다시 그려진다.
      loadFridges: async () => {
        const requestId = ++listRequestId;
        set((state) => (state.list.status === "success" ? state : { list: { status: "loading" } }));
        try {
          const fridges = await getMyFridges();
          if (requestId !== listRequestId) return;
          set({ list: { status: "success", fridges } });
        } catch {
          if (requestId !== listRequestId) return;
          set((state) => (state.list.status === "success" ? state : { list: { status: "error" } }));
        }
      },
      addFridge: (fridge) =>
        set((state) =>
          state.list.status === "success" && !state.list.fridges.some((item) => item.id === fridge.id)
            ? { list: { status: "success", fridges: [...state.list.fridges, fridge] } }
            : state,
        ),
      removeFridge: (fridgeId) =>
        set((state) =>
          state.list.status === "success"
            ? { list: { status: "success", fridges: state.list.fridges.filter((item) => item.id !== fridgeId) } }
            : state,
        ),
    }),
    {
      name: "bium-fridge",
      // 목록은 서버 기준으로 매번 새로 불러오고, 고른 냉장고만 저장한다.
      partialize: (state) => ({ selectedFridgeId: state.selectedFridgeId }),
    },
  ),
);

// 로그아웃하거나 다른 계정으로 로그인하면, 다음 사람이 이전 사람의 냉장고를 보거나 고른 채로 시작하지 않게 지운다.
// 진행 중이던 목록 요청도 번호를 올려 응답이 와도 버린다.
useAuthStore.subscribe((state, prevState) => {
  if (prevState.accessToken === state.accessToken) return;
  listRequestId += 1;
  useFridgeStore.setState({ selectedFridgeId: null, list: { status: "idle" } });
});
