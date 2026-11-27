/*
 * 식재료 도감 API다.
 * 요청·응답 형식은 백엔드 IngredientCatalogController의 DTO를 따른다.
 * 목록에는 로그인한 사용자가 직접 추가한 재료와 공용 도감의 기본 재료(basic)가 함께 온다 (bium-be #51).
 */
import { request } from "./client";
import type { StorageType } from "./fridge";

export type IngredientCategory = "VEGETABLE" | "MEAT" | "DAIRY" | "FRUIT" | "ETC";

// 내 재료는 추가할 때 모든 값이 필수이고, 기본 재료도 모든 값을 채워 넣어 두어서 null이 오지 않는다.
export type CatalogIngredient = {
  id: number;
  name: string;
  emoji: string;
  // 이모지 대신 올린 사진 주소("/api/ingredient-images/..."). 없으면 null이고 emoji를 보여 준다.
  imageUrl: string | null;
  category: IngredientCategory;
  // 냉장고에 넣을 때 처음 골라 둘 보관 위치. 기본 재료에 정해져 있고, 내가 추가한 재료는 null이다.
  defaultStorage: StorageType | null;
  // 기본 유통기한(일)
  shelfLifeDays: number;
  // 공용 도감의 기본 재료. 냉장고에 넣거나 장본 음식에 담을 수 있지만 지울 수 없다.
  basic: boolean;
  // 사용자별 즐겨찾기. 기본 재료도 즐겨찾기할 수 있다.
  favorite: boolean;
};

export type CatalogIngredientCreateRequest = Omit<
  CatalogIngredient,
  "id" | "imageUrl" | "defaultStorage" | "basic" | "favorite"
>;

type CatalogListResponse = {
  ingredients: CatalogIngredient[];
};

// 즐겨찾기한 재료가 먼저 온다. 그 안에서는 내가 추가한 재료가 최근 순서로 먼저 오고, 그다음 기본 재료가 온다.
// 내 재료와 이름이 같은 기본 재료는 오지 않는다.
export async function getMyCatalog() {
  const { ingredients } = await request<CatalogListResponse>("/api/ingredient-catalogs");
  return ingredients;
}

// 기본 재료와 이름이 같아도 DUPLICATE_CATALOG_NAME이다.
// 실패: INVALID_INPUT(400), DUPLICATE_CATALOG_NAME(409)
export function createCatalogIngredient(body: CatalogIngredientCreateRequest) {
  return request<CatalogIngredient>("/api/ingredient-catalogs", { method: "POST", body });
}

// 내가 추가한 재료만 고칠 수 있다. 검사 규칙은 추가할 때와 같고, 고친 재료를 돌려준다.
// 이 재료로 넣은 냉장고 재료·장본 음식의 이름과 아이콘은 그대로다.
// 실패: INVALID_INPUT(400), CATALOG_NOT_FOUND(404, 기본 재료 포함), DUPLICATE_CATALOG_NAME(409)
export function updateCatalogIngredient(catalogId: number, body: CatalogIngredientCreateRequest) {
  return request<CatalogIngredient>(`/api/ingredient-catalogs/${catalogId}`, { method: "PUT", body });
}

// 기본 재료는 지울 수 없어서 CATALOG_NOT_FOUND가 온다.
// 실패: CATALOG_NOT_FOUND(404)
export function deleteCatalogIngredient(catalogId: number) {
  return request<null>(`/api/ingredient-catalogs/${catalogId}`, { method: "DELETE" });
}

// 이미 즐겨찾기한 재료여도 성공한다. 바뀐 재료(favorite: true)를 돌려준다.
// 실패: CATALOG_NOT_FOUND(404)
export function addCatalogFavorite(catalogId: number) {
  return request<CatalogIngredient>(`/api/ingredient-catalogs/${catalogId}/favorite`, { method: "POST" });
}

// 즐겨찾기하지 않은 재료여도 성공한다. 바뀐 재료(favorite: false)를 돌려준다.
// 실패: CATALOG_NOT_FOUND(404)
export function removeCatalogFavorite(catalogId: number) {
  return request<CatalogIngredient>(`/api/ingredient-catalogs/${catalogId}/favorite`, { method: "DELETE" });
}

// 내가 추가한 재료에만 올릴 수 있다. 서버가 JPG·PNG인지 내용으로 확인하고 긴 변 256px PNG로 다시 만든다.
// 바꿀 때마다 주소가 바뀐다. 바뀐 재료를 돌려준다.
// 실패: INVALID_INGREDIENT_IMAGE(400), CATALOG_NOT_FOUND(404, 기본 재료 포함), INGREDIENT_IMAGE_TOO_LARGE(413)
export function changeCatalogImage(catalogId: number, image: File) {
  const body = new FormData();
  body.append("image", image);
  return request<CatalogIngredient>(`/api/ingredient-catalogs/${catalogId}/image`, { method: "PUT", body });
}

// 사진을 지우고 이모지로 되돌린다. 사진이 없어도 성공한다. 실패: CATALOG_NOT_FOUND(404)
export function removeCatalogImage(catalogId: number) {
  return request<CatalogIngredient>(`/api/ingredient-catalogs/${catalogId}/image`, { method: "DELETE" });
}
