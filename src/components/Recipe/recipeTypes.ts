/*
 * 레시피 화면에서 쓰는 데이터 타입이다.
 * API 명세가 나오기 전까지 퍼블리싱용으로 쓰고, 연동할 때 src/api의 응답 타입으로 옮긴다.
 */

export type RecipeIngredient = {
  name: string;
  amount: string;
  status: string;
  required: boolean;
};

export type RecipeNutrition = {
  label: string;
  value: string;
};

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  summary: string;
  cookTime: string;
  difficulty: string;
  servings: string;
  calories: string;
  usedIngredients: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  tips: string[];
  nutrition: RecipeNutrition[];
  fridgeMatches: string[];
};

export type UrgentIngredient = {
  id: string;
  emoji: string;
  name: string;
  daysLeft: number;
};
