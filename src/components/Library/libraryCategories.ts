/*
 * 식재료 도감 카테고리의 순서와 이름을 정한다.
 * 탭과 카테고리별 묶음, 새 재료 추가 모달의 선택지가 이 순서를 따른다.
 */
import type { IngredientCategory } from "./libraryTypes";

export type CategoryFilter = IngredientCategory | "all";

export const categoryOrder: IngredientCategory[] = ["vegetable", "meat", "dairy", "fruit", "etc"];

export const categoryLabel: Record<IngredientCategory, string> = {
  vegetable: "채소",
  meat: "육류",
  dairy: "유제품",
  fruit: "과일",
  etc: "기타",
};

export function isCategoryFilter(value: string | null): value is CategoryFilter {
  return value === "all" || categoryOrder.some((id) => id === value);
}
