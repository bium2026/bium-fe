/*
 * 요리 완료 후 냉장고 재료를 빼고 되돌리는 API다.
 * 요청·응답 형식은 백엔드 CookingController의 DTO를 따른다.
 */
import { request } from "./client";
import type { FridgeItemResponse } from "./fridge";

export type CookingIngredient = {
  name: string;
  // AI가 준 "1/2모" 같은 분량, 없으면 null
  amount: string | null;
  // 이름이 맞는 냉장고 재료를 유통기한이 빠른 순으로 준다. 첫 번째가 추천이고, 맞는 재료가 없으면 빈 배열이다.
  candidates: FridgeItemResponse[];
};

type CookingCandidatesResponse = {
  recipeId: number;
  // 기본 양념은 빠져 있다.
  ingredients: CookingIngredient[];
};

// 실패: RECIPE_NOT_FOUND(404)
export async function getCookingCandidates(recipeId: number) {
  const { ingredients } = await request<CookingCandidatesResponse>(`/api/recipes/${recipeId}/cooking-candidates`);
  return ingredients;
}

export type CookingUsedItem = {
  fridgeItemId: number;
  // 후보를 불러올 때 받은 값
  version: number;
};

type CookingLogResponse = {
  id: number;
  recipeId: number;
  deductedItemIds: number[];
  cookedAt: string;
};

// 보낸 재료를 수량과 상관없이 모두 냉장고에서 뺀다. 하나라도 뺄 수 없으면 아무것도 빼지 않는다.
// 실패: INVALID_INPUT(400), RECIPE_NOT_FOUND·FRIDGE_ITEM_NOT_FOUND(404), CONCURRENT_MODIFICATION(409)
export function cook(recipeId: number, items: CookingUsedItem[]) {
  return request<CookingLogResponse>(`/api/recipes/${recipeId}/cooking-logs`, { method: "POST", body: { items } });
}

// 그 요리에서 뺀 재료를 모두 냉장고로 되돌린다.
// 실패: COOKING_LOG_NOT_FOUND(404), ALREADY_UNDONE(409)
export function undoCooking(cookingLogId: number) {
  return request<unknown>(`/api/cooking-logs/${cookingLogId}/undo`, { method: "POST" });
}
