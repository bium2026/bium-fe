/*
 * 레시피 추천·만들고 싶은 음식 요청 상태를 보관하는 스토어다.
 * 레시피 목록은 서버(GET /api/fridges/{fridgeId}/recipes)에서 받으므로 여기에 두지 않는다.
 * 예전에는 마지막 추천 목록을 localStorage에 저장했는데, 그 값은 버전을 올려 지운다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./authStore";

// 기다리는 사이 헤더에서 냉장고를 바꿀 수 있어, 요청한 냉장고를 함께 남겨 그 냉장고 화면에서만 기다림·오류를 보여 준다.
export type RecommendState =
  | { status: "idle" }
  | { status: "loading"; fridgeId: number }
  | { status: "error"; fridgeId: number; code: string; message: string };

// 만들고 싶은 음식도 추천과 같은 이유로 요청한 냉장고를 함께 남긴다.
export type TargetState =
  | { status: "idle" }
  | { status: "loading"; fridgeId: number; dishName: string }
  | { status: "error"; fridgeId: number; dishName: string; httpStatus: number; code: string; message: string };

// 기다리는 사이 다른 화면으로 가서 상세 화면으로 바로 보내지 못한 결과다. 레시피 화면에 돌아오면 보여 준다.
// 그사이 헤더에서 냉장고를 바꿨으면 다른 냉장고의 레시피라서, 요청한 냉장고를 함께 남겨 그 냉장고에서만 보여 준다.
export type TargetDone = { fridgeId: number; recipeId: number; recipeName: string };

type RecipeState = {
  // AI 추천은 몇 초 걸려서, 그사이 다른 화면에 다녀와도 같은 요청을 다시 보내지 않도록 화면 밖에 둔다.
  recommend: RecommendState;
  // 만들고 싶은 음식 레시피도 AI를 불러 몇 초 걸려서 추천과 같은 이유로 화면 밖에 둔다.
  target: TargetState;
  targetDone: TargetDone | null;
  // 방금 만든 레시피의 id. 상세 화면이 이 레시피를 열 때 한 번만 부족 재료를 담을지 묻고 지운다.
  askShoppingRecipeId: number | null;
  // 새 레시피가 저장될 때마다 1씩 올린다. 레시피 화면은 이 값이 바뀌면 서버 목록을 다시 받는다.
  // 요청을 보낸 화면이 그사이 사라졌다 다시 열려도 새 레시피를 놓치지 않게 화면 밖에 둔다.
  listVersion: number;
  setRecommend: (recommend: RecommendState) => void;
  setTarget: (target: TargetState) => void;
  setTargetDone: (targetDone: TargetDone | null) => void;
  setAskShoppingRecipeId: (recipeId: number | null) => void;
  refreshList: () => void;
  clearRequests: () => void;
};

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      recommend: { status: "idle" },
      target: { status: "idle" },
      targetDone: null,
      askShoppingRecipeId: null,
      listVersion: 0,
      setRecommend: (recommend) => set({ recommend }),
      setTarget: (target) => set({ target }),
      setTargetDone: (targetDone) => set({ targetDone }),
      setAskShoppingRecipeId: (askShoppingRecipeId) => set({ askShoppingRecipeId }),
      refreshList: () => set((state) => ({ listVersion: state.listVersion + 1 })),
      clearRequests: () =>
        set({
          recommend: { status: "idle" },
          target: { status: "idle" },
          targetDone: null,
          askShoppingRecipeId: null,
        }),
    }),
    {
      name: "bium-recipes",
      // 버전 0은 마지막 추천 목록(fridgeId, recipes)을 저장했다. 목록은 이제 서버에서 받으므로 옛 값은 버린다.
      version: 1,
      migrate: () => ({}),
      // 요청 상태까지 저장하면 새로고침 뒤에도 "추천 생성 중"에 멈춰 있어서 아무것도 저장하지 않는다.
      partialize: () => ({}),
    },
  ),
);

// 로그아웃하거나 토큰이 만료되면 같은 브라우저를 쓰는 다음 사람에게 남지 않도록 요청 상태를 지운다.
// 토큰이 비지 않고 바로 다른 계정의 토큰으로 바뀌는 경우에도 이전 계정의 결과가 남지 않도록, 토큰이 바뀔 때마다 지운다.
// 이 구독이 처음부터 돌도록 main.tsx에서 미리 불러온다.
useAuthStore.subscribe((state, prevState) => {
  if (prevState.accessToken !== state.accessToken) useRecipeStore.getState().clearRequests();
});

// authStore는 이 파일보다 먼저 불러와지면서 만료된 토큰을 이미 지웠을 수 있다. 그 전환은 위 구독이 받지 못하므로 시작할 때 한 번 확인한다.
if (!useAuthStore.getState().accessToken) useRecipeStore.getState().clearRequests();
