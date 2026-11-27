/*
 * 장보기 목록 API다.
 * 요청·응답 형식은 백엔드 장보기 목록 API(bium-be #32, #33)를 따른다.
 * 장보기 목록은 냉장고에 묶여 있어, 냉장고 멤버 누구나 같은 목록을 보고 담기·체크·빼기를 할 수 있다.
 */
import { request, requestNoContent } from "./client";

// KAMIS 소매가 중 품종·등급을 통틀어 가장 싼 가격이다. 쇼핑몰 최저가가 아니다.
export type MarketPrice = {
  price: number;
  unit: string;
  kindName: string;
  grade: string;
  // yyyy-MM-dd
  surveyDate: string;
  // 조사하지 않은 날이면 null이다.
  weekAgoPrice: number | null;
};

export type ShoppingListItem = {
  id: number;
  name: string;
  checked: boolean;
  // 만들고 싶은 음식의 부족 재료에서 담은 경우에만 값이 있다.
  recipeId: number | null;
  recipeName: string | null;
  createdAt: string;
  // 시세를 모르는 재료는 null이다.
  marketPrice: MarketPrice | null;
};

type ShoppingListItemsResponse = {
  items: ShoppingListItem[];
};

// 안 산 것(checked=false)이 먼저 오고, 그 안에서는 최근에 담은 순서다.
// 실패: FRIDGE_NOT_FOUND(404)
export async function getShoppingListItems(fridgeId: number) {
  const { items } = await request<ShoppingListItemsResponse>(`/api/fridges/${fridgeId}/shopping-list-items`);
  return items;
}

// 이름은 1~50자이고 서버가 앞뒤 공백을 지운다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND(404)
export function addShoppingListItem(fridgeId: number, name: string) {
  return request<ShoppingListItem>(`/api/fridges/${fridgeId}/shopping-list-items`, {
    method: "POST",
    body: { name },
  });
}

// 다음 구매 날짜 달력에서 고른 날의 재료처럼 여러 재료(1~30개)를 담고, 새로 담은 것만 돌려준다.
// 안 산 상태로 같은 이름(공백 무시)이 이미 있으면 건너뛴다. 이미 산 재료는 다시 담는다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND(404)
export async function addShoppingListItems(fridgeId: number, names: string[]) {
  const { items } = await request<ShoppingListItemsResponse>(`/api/fridges/${fridgeId}/shopping-list-items/bulk`, {
    method: "POST",
    body: { names },
  });
  return items;
}

// 토글이 아니라 보낸 값으로 맞추므로 두 번 보내도 결과가 같다.
// 실패: SHOPPING_LIST_ITEM_NOT_FOUND(404)
export function setShoppingListItemChecked(itemId: number, checked: boolean) {
  return request<ShoppingListItem>(`/api/shopping-list-items/${itemId}`, {
    method: "PATCH",
    body: { checked },
  });
}

// 이름 규칙은 담기와 같고, 같은 이름이 목록에 있어도 고친다. 체크 여부·레시피는 그대로다.
// 실패: INVALID_INPUT(400), SHOPPING_LIST_ITEM_NOT_FOUND(404)
export function renameShoppingListItem(itemId: number, name: string) {
  return request<ShoppingListItem>(`/api/shopping-list-items/${itemId}/name`, {
    method: "PATCH",
    body: { name },
  });
}

// 실패: SHOPPING_LIST_ITEM_NOT_FOUND(404)
export function removeShoppingListItem(itemId: number) {
  return requestNoContent(`/api/shopping-list-items/${itemId}`, { method: "DELETE" });
}

// 지우는 순간 체크돼 있는(산 것) 항목을 모두 지운다. 안 산 항목은 남는다.
// 실패: FRIDGE_NOT_FOUND(404)
export function clearCheckedShoppingListItems(fridgeId: number) {
  return requestNoContent(`/api/fridges/${fridgeId}/shopping-list-items/checked`, { method: "DELETE" });
}

// 레시피 재료 중 지금 냉장고에 없는 재료(만들 때 MISSING이었거나 요리로 다 쓴 재료)를 골라 담고, 새로 담은 것만 돌려준다.
// 서버는 기본 양념이 아닌 레시피 재료인지만 확인한다.
// 안 산 상태로 같은 재료가 이미 있으면 건너뛴다. 이름이 하나라도 틀리면 아무것도 담지 않는다.
// 실패: INVALID_INPUT(400), RECIPE_NOT_FOUND(404)
export async function addRecipeMissingItems(recipeId: number, names: string[]) {
  const { items } = await request<ShoppingListItemsResponse>(`/api/recipes/${recipeId}/shopping-list-items`, {
    method: "POST",
    body: { names },
  });
  return items;
}
