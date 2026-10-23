/*
 * 식재료 도감 카테고리의 순서와 이름을 정한다.
 * 탭과 카테고리별 묶음, 새 재료 추가 모달의 선택지가 이 순서를 따른다.
 */
import type { IngredientCategory } from "../../api/ingredientCatalog";

export type CategoryFilter = IngredientCategory | "all";

export const categoryOrder: IngredientCategory[] = ["VEGETABLE", "MEAT", "DAIRY", "FRUIT", "ETC"];

export const categoryLabel: Record<IngredientCategory, string> = {
  VEGETABLE: "채소",
  MEAT: "육류",
  DAIRY: "유제품",
  FRUIT: "과일",
  ETC: "기타",
};

export function isCategoryFilter(value: string | null): value is CategoryFilter {
  return value === "all" || categoryOrder.some((id) => id === value);
}
