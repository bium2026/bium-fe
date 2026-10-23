/*
 * 식재료 도감 API다.
 * 요청·응답 형식은 백엔드 IngredientCatalogController의 DTO를 따른다.
 * 공용 도감은 주지 않고, 로그인한 사용자가 직접 추가한 재료만 다룬다.
 */
import { request } from "./client";

export type IngredientCategory = "VEGETABLE" | "MEAT" | "DAIRY" | "FRUIT" | "ETC";

// 내 도감 재료는 추가 API로만 만들어지고 추가할 때 모든 값이 필수라서 null이 오지 않는다.
export type CatalogIngredient = {
  id: number;
  name: string;
  emoji: string;
  category: IngredientCategory;
  // 기본 유통기한(일)
  shelfLifeDays: number;
};

export type CatalogIngredientCreateRequest = Omit<CatalogIngredient, "id">;

type CatalogListResponse = {
  ingredients: CatalogIngredient[];
};

// 최근에 추가한 재료가 앞에 온다.
export async function getMyCatalog() {
  const { ingredients } = await request<CatalogListResponse>("/api/ingredient-catalogs");
  return ingredients;
}

// 실패: INVALID_INPUT(400), DUPLICATE_CATALOG_NAME(409)
export function createCatalogIngredient(body: CatalogIngredientCreateRequest) {
  return request<CatalogIngredient>("/api/ingredient-catalogs", { method: "POST", body });
}

// 실패: CATALOG_NOT_FOUND(404)
export function deleteCatalogIngredient(catalogId: number) {
  return request<null>(`/api/ingredient-catalogs/${catalogId}`, { method: "DELETE" });
}
