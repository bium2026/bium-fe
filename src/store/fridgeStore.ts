/*
 * 내가 속한 냉장고 목록과 지금 보고 있는 냉장고를 보관하는 스토어다.
 * 공유받은 냉장고로 바꿔 볼 수 있도록 고른 냉장고 id를 localStorage에 남겨 새로고침해도 유지한다.
 * 목록은 헤더가 불러오고, 화면들은 getMyFridge()로 고른 냉장고를 받는다.
 * 헤더가 목록을 아직 받지 못했거나 받은 목록이 낡았으면 getMyFridge()가 이 스토어로 다시 받아, 화면이 받은 목록이 헤더에도 그대로 보인다.
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
  // 받은 목록이 있고 낡지 않았으면 그대로 돌려주고, 아니면 서버에서 받아 목록에 넣은 뒤 돌려준다. 받지 못하면 그 오류를 던진다.
  getFridges: () => Promise<Fridge[]>;
  // 참여·나가기처럼 서버에 반영된 결과를 목록을 다시 받기 전에 바로 보여 줄 때 쓴다.
  addFridge: (fridge: Fridge) => void;
  // 피드 공개처럼 냉장고 하나의 값이 바뀌면 목록을 다시 받지 않고 그 냉장고만 바꾼다.
  updateFridge: (fridge: Fridge) => void;
  removeFridge: (fridgeId: number) => void;
};

// 로그아웃하거나 다른 계정으로 바뀐 뒤 늦게 도착한 이전 계정의 목록을 버리려고, 요청마다 번호를 매긴다.
let listRequestId = 0;
// 기다리고 있는 마지막 목록 요청. 헤더와 화면이 함께 목록을 찾으면 같은 요청을 기다려 목록 요청이 한 번만 나간다.
let pendingList: Promise<Fridge[]> | null = null;
// 냉장고 요청이 FRIDGE_NOT_FOUND로 실패하면 true다. 그사이 내보내졌거나 다른 기기에서 나가 받아 둔 목록이 서버와 다를 수 있어서,
// 다음 getFridges()가 목록을 다시 받는다. 그래야 화면의 다시 시도가 더 이상 속하지 않은 냉장고를 또 고르지 않는다.
let isListStale = false;

// 고른 냉장고가 목록에 없으면(나갔거나 다른 계정) 내가 주인인 냉장고로 돌아간다.
export function pickFridge(fridges: Fridge[], selectedFridgeId: number | null) {
  return (
    fridges.find((fridge) => fridge.id === selectedFridgeId) ??
    fridges.find((fridge) => fridge.role === "OWNER") ??
    fridges[0] ??
    null
  );
}

// 멤버가 아닌 냉장고는 서버가 FRIDGE_NOT_FOUND로 거절한다. 공통 요청 함수가 이 오류를 받으면 부른다.
export function markFridgeListStale() {
  isListStale = true;
}

// 목록을 서버에서 새로 받아 넣고, 받은 목록을 돌려준다. 받지 못하면 그 오류를 던진다.
// 이미 받은 목록이 있으면 다시 불러오는 동안에도 그대로 둔다.
// 목록이 잠깐 비면 헤더의 냉장고 버튼과 그 안의 참여 모달이 사라졌다가 처음 상태로 다시 그려진다.
function requestFridges() {
  const requestId = ++listRequestId;
  useFridgeStore.setState((state) => (state.list.status === "success" ? state : { list: { status: "loading" } }));
  const request: Promise<Fridge[]> = getMyFridges().then(
    (fridges) => {
      if (pendingList === request) pendingList = null;
      if (requestId === listRequestId) {
        isListStale = false;
        useFridgeStore.setState((state) => ({
          list: { status: "success", fridges },
          // 고른 냉장고가 받은 목록에 없으면(내보내졌거나 다른 기기에서 나감) 고른 것을 지운다.
          // 남겨 두면 화면은 그 냉장고 내용을 둔 채 헤더와 getMyFridge()만 내 냉장고로 바뀌고, 나중에 다시 참여하면 저절로 다시 골라진다.
          // 고른 것이 바뀌면 AppLayout이 화면을 새로 그려 바뀐 냉장고의 데이터를 다시 불러온다.
          selectedFridgeId: fridges.some((fridge) => fridge.id === state.selectedFridgeId) ? state.selectedFridgeId : null,
        }));
      }
      return fridges;
    },
    (error: unknown) => {
      if (pendingList === request) pendingList = null;
      if (requestId === listRequestId) {
        useFridgeStore.setState((state) => (state.list.status === "success" ? state : { list: { status: "error" } }));
      }
      throw error;
    },
  );
  pendingList = request;
  return request;
}

export const useFridgeStore = create<FridgeState>()(
  persist(
    (set, get) => ({
      selectedFridgeId: null,
      list: { status: "idle" },
      selectFridge: (selectedFridgeId) => set({ selectedFridgeId }),
      // 기다리던 요청이 있어도 새로 받는다. 참여·나가기 뒤에도 부르는데, 그 전에 보낸 요청은 바뀌기 전 목록일 수 있다.
      loadFridges: async () => {
        try {
          await requestFridges();
        } catch {
          // 받지 못하면 헤더는 버튼을 숨기고 각 화면이 오류를 보여 준다.
        }
      },
      getFridges: () => {
        const { list } = get();
        if (list.status === "success" && !isListStale) return Promise.resolve(list.fridges);
        return pendingList ?? requestFridges();
      },
      addFridge: (fridge) => {
        const { list } = get();
        if (list.status !== "success" || list.fridges.some((item) => item.id === fridge.id)) return;
        // 참여 전에 시작한 목록 요청은 참여한 냉장고가 없는 목록일 수 있어, 늦게 와도 버리도록 요청 번호를 올린다.
        // 버리지 않으면 방금 참여한 냉장고가 목록에서 사라지고, 그 냉장고를 골랐다면 고른 것도 지워진다.
        listRequestId += 1;
        set({ list: { status: "success", fridges: [...list.fridges, fridge] } });
      },
      updateFridge: (fridge) => {
        const { list } = get();
        if (list.status !== "success") return;
        // 그 전에 시작한 목록 요청은 바뀌기 전 값을 담고 있을 수 있어, 늦게 와도 버리도록 요청 번호를 올린다.
        // 다른 냉장고의 변경은 다음 목록 요청에서 반영된다.
        listRequestId += 1;
        set({
          list: { status: "success", fridges: list.fridges.map((item) => (item.id === fridge.id ? fridge : item)) },
        });
      },
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
  // 다음 계정의 getMyFridge()가 이전 계정의 목록 요청을 함께 기다리지 않게 한다.
  pendingList = null;
  isListStale = false;
  useFridgeStore.setState({ selectedFridgeId: null, list: { status: "idle" } });
});
