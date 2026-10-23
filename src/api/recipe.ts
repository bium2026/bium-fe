/*
 * 레시피 추천·상세 API다.
 * 요청·응답 형식은 백엔드 RecipeController의 DTO(RecipeResponse 등)를 따른다.
 */
import { request } from "./client";

export type RecipeDifficulty = "EASY" | "NORMAL" | "HARD";

// FRIDGE: 냉장고에 있는 재료, BASIC: 소금·간장 같은 기본 양념
export type IngredientSource = "FRIDGE" | "BASIC";

export type RecipeIngredient = {
  name: string;
  amount: string | null;
  source: IngredientSource | null;
  required: boolean;
};

// 1인분 기준 g 값이며 AI가 주지 않으면 null이다.
export type RecipeNutrition = {
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
};

export type Recipe = {
  id: number;
  name: string;
  emoji: string | null;
  summary: string | null;
  cookTimeMinutes: number | null;
  difficulty: RecipeDifficulty | null;
  servings: number | null;
  caloriesKcal: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  tips: string[];
  nutrition: RecipeNutrition;
  // 재료 중 냉장고에 있는 재료의 이름 (최대 6개)
  fridgeMatches: string[];
  createdAt: string;
};

type RecipeRecommendationResponse = {
  recipes: Recipe[];
};

// 실패: FRIDGE_NOT_FOUND(404), NO_USABLE_INGREDIENT(422), TOO_MANY_REQUESTS(429),
// AI_REQUEST_FAILED·RECIPE_NO_RESULT(502), AI_QUOTA_EXCEEDED(503)
export async function recommendRecipes(fridgeId: number, prioritizeUrgent: boolean) {
  const { recipes } = await request<RecipeRecommendationResponse>(
    `/api/fridges/${fridgeId}/recipes/recommendations`,
    { method: "POST", body: { prioritizeUrgent } },
  );
  return recipes;
}

// 실패: RECIPE_NOT_FOUND(404)
export function getRecipe(recipeId: number) {
  return request<Recipe>(`/api/recipes/${recipeId}`);
}
