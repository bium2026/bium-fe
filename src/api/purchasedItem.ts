/*
 * 장본 음식(냉장고에 넣기 전 단계) API다.
 * 요청·응답 형식은 백엔드 PurchasedItemController의 DTO를 따른다.
 * 장본 음식은 냉장고에 묶여 있어, 냉장고 멤버가 담은 재료를 함께 보고 뺄 수 있다.
 */
import { request } from "./client";

// 도감 재료에서만 담을 수 있고 도감 재료는 이모지·기본 유통기한이 필수라서 null이 오지 않는다.
export type PurchasedItem = {
  id: number;
  name: string;
  emoji: string;
  // "YYYY-MM-DD", 담은 날부터 도감의 기본 유통기한을 더한 날
  expiresAt: string;
};

type PurchasedItemListResponse = {
  items: PurchasedItem[];
};

// 아직 냉장고로 옮기지 않은 장본 음식을 최근에 담은 순서로 준다.
// 실패: FRIDGE_NOT_FOUND(404)
export async function getPurchasedItems(fridgeId: number) {
  const { items } = await request<PurchasedItemListResponse>(`/api/fridges/${fridgeId}/purchased-items`);
  return items;
}

// 도감 재료를 오늘 산 것으로 담는다. 같은 재료를 여러 번 담아도 막지 않는다.
// 실패: FRIDGE_NOT_FOUND(404), CATALOG_NOT_FOUND(404)
export function addPurchasedItem(fridgeId: number, catalogId: number) {
  return request<PurchasedItem>(`/api/fridges/${fridgeId}/purchased-items`, {
    method: "POST",
    body: { catalogId },
  });
}

// 이미 빠졌거나 냉장고로 옮긴 장본 음식이면 PURCHASED_ITEM_NOT_FOUND(404)로 실패한다.
export function removePurchasedItem(purchasedItemId: number) {
  return request<null>(`/api/purchased-items/${purchasedItemId}`, { method: "DELETE" });
}
