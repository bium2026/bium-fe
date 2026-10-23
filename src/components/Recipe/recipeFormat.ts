/*
 * 레시피 API 응답 값을 화면에 보여 줄 문구로 바꾼다.
 * AI가 주지 않은 값은 null로 오므로 "-"로 표시한다.
 */
import type { IngredientSource, RecipeDifficulty, RecipeNutrition } from "../../api/recipe";

const EMPTY = "-";

// AI가 이모지를 주지 않았을 때 카드와 상세 화면에 대신 보여 준다.
export const DEFAULT_RECIPE_EMOJI = "🍽️";

const difficultyLabels: Record<RecipeDifficulty, string> = {
  EASY: "하",
  NORMAL: "중",
  HARD: "상",
};

const sourceLabels: Record<IngredientSource, string> = {
  FRIDGE: "냉장고 보유",
  BASIC: "기본 양념",
};

export function formatDifficulty(difficulty: RecipeDifficulty | null) {
  return difficulty ? difficultyLabels[difficulty] : EMPTY;
}

export function formatCookTime(minutes: number | null) {
  return minutes === null ? EMPTY : `${minutes}분`;
}

export function formatServings(servings: number | null) {
  return servings === null ? EMPTY : `${servings}인분`;
}

export function formatCalories(kcal: number | null) {
  return kcal === null ? EMPTY : `${kcal}kcal`;
}

export function formatIngredientSource(source: IngredientSource | null) {
  return source ? sourceLabels[source] : null;
}

function formatGram(value: number | null) {
  return value === null ? EMPTY : `${value}g`;
}

export function getNutritionItems(nutrition: RecipeNutrition) {
  return [
    { label: "단백질", value: formatGram(nutrition.proteinG) },
    { label: "탄수화물", value: formatGram(nutrition.carbohydrateG) },
    { label: "지방", value: formatGram(nutrition.fatG) },
  ];
}
