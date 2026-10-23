/*
 * 마지막으로 추천받은 레시피 목록과 추천 요청 상태를 보관하는 스토어다.
 * 지난 추천 목록 API가 없어서, 상세 화면에 다녀오거나 새로고침해도 목록이 남도록 localStorage에 저장한다.
 * 다른 계정으로 로그인하면 냉장고가 달라지므로 fridgeId가 같을 때만 목록을 보여 준다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Recipe } from "../api/recipe";
import { useAuthStore } from "./authStore";

export type RecommendState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; code: string; message: string };

type RecipeState = {
  fridgeId: number | null;
  recipes: Recipe[];
  // AI 추천은 몇 초 걸려서, 그사이 다른 화면에 다녀와도 같은 요청을 다시 보내지 않도록 화면 밖에 둔다.
  recommend: RecommendState;
  setRecipes: (fridgeId: number, recipes: Recipe[]) => void;
  setRecommend: (recommend: RecommendState) => void;
  clearRecipes: () => void;
};

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      fridgeId: null,
      recipes: [],
      recommend: { status: "idle" },
      setRecipes: (fridgeId, recipes) => set({ fridgeId, recipes }),
      setRecommend: (recommend) => set({ recommend }),
      clearRecipes: () => set({ fridgeId: null, recipes: [], recommend: { status: "idle" } }),
    }),
    {
      name: "bium-recipes",
      // 요청 상태까지 저장하면 새로고침 뒤에도 "추천 생성 중"에 멈춰 있어서 목록만 저장한다.
      partialize: (state) => ({ fridgeId: state.fridgeId, recipes: state.recipes }),
    },
  ),
);

// 로그아웃하거나 토큰이 만료되면 같은 브라우저를 쓰는 다음 사람에게 남지 않도록 추천 목록을 지운다.
useAuthStore.subscribe((state, prevState) => {
  if (prevState.accessToken && !state.accessToken) useRecipeStore.getState().clearRecipes();
});

// authStore는 이 파일보다 먼저 불러와지면서 만료된 토큰을 이미 지웠을 수 있다. 그 전환은 위 구독이 받지 못하므로 시작할 때 한 번 확인한다.
if (!useAuthStore.getState().accessToken) useRecipeStore.getState().clearRecipes();
