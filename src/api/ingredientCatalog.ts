/*
 * 식재료 도감 API다.
 * 요청·응답 형식은 백엔드 IngredientCatalogController의 DTO를 따른다.
 * 목록에는 로그인한 사용자가 직접 추가한 재료와 공용 도감의 기본 재료(basic)가 함께 온다 (bium-be #51).
 */
import { request } from "./client";

export type IngredientCategory = "VEGETABLE" | "MEAT" | "DAIRY" | "FRUIT" | "ETC";

// 내 재료는 추가할 때 모든 값이 필수이고, 기본 재료도 모든 값을 채워 넣어 두어서 null이 오지 않는다.
export type CatalogIngredient = {
  id: number;
  name: string;
  emoji: string;
  category: IngredientCategory;
  // 기본 유통기한(일)
  shelfLifeDays: number;
  // 공용 도감의 기본 재료. 냉장고에 넣거나 장본 음식에 담을 수 있지만 지울 수 없다.
  basic: boolean;
};

export type CatalogIngredientCreateRequest = Omit<CatalogIngredient, "id" | "basic">;

type CatalogListResponse = {
  ingredients: CatalogIngredient[];
};

// 내가 추가한 재료가 최근 순서로 먼저 오고, 그다음 기본 재료가 온다. 내 재료와 이름이 같은 기본 재료는 오지 않는다.
export async function getMyCatalog() {
  const { ingredients } = await request<CatalogListResponse>("/api/ingredient-catalogs");
  return ingredients;
}

// 기본 재료와 이름이 같아도 DUPLICATE_CATALOG_NAME이다.
// 실패: INVALID_INPUT(400), DUPLICATE_CATALOG_NAME(409)
export function createCatalogIngredient(body: CatalogIngredientCreateRequest) {
  return request<CatalogIngredient>("/api/ingredient-catalogs", { method: "POST", body });
}

// 기본 재료는 지울 수 없어서 CATALOG_NOT_FOUND가 온다.
// 실패: CATALOG_NOT_FOUND(404)
export function deleteCatalogIngredient(catalogId: number) {
  return request<null>(`/api/ingredient-catalogs/${catalogId}`, { method: "DELETE" });
}
