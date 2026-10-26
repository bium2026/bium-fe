/*
 * 냉장고·냉장고 재료 API다.
 * 요청·응답 형식은 백엔드 FridgeController, FridgeItemController의 DTO를 따른다.
 */
import { request, requestNoContent } from "./client";

export type MemberRole = "OWNER" | "MEMBER";

export type Fridge = {
  id: number;
  name: string;
  role: MemberRole;
};

export type FridgeItemResponse = {
  id: number;
  name: string;
  emoji: string | null;
  // "YYYY-MM-DD", 유통기한이 없는 재료는 null
  expiresAt: string | null;
  // 재료를 수정·삭제할 때 함께 보내 다른 멤버의 수정과 겹치지 않게 한다.
  version: number;
};

// 한 보관 구역의 칸별 재료. 칸 안에서는 놓인 순서대로 오고, 재료가 없는 칸도 빈 배열로 온다.
export type StorageContents = {
  center: FridgeItemResponse[];
  leftDoor: FridgeItemResponse[];
  rightDoor: FridgeItemResponse[];
};

// fridge: 냉장실, freezer: 냉동실, room: 실온
export type FridgeContentsResponse = {
  fridge: StorageContents;
  freezer: StorageContents;
  room: StorageContents;
};

// 내가 소유자·멤버인 냉장고 목록
export function getMyFridges() {
  return request<Fridge[]>("/api/fridges");
}

// 실패: FRIDGE_NOT_FOUND(404, 멤버가 아닌 냉장고 포함)
export function getFridgeItems(fridgeId: number) {
  return request<FridgeContentsResponse>(`/api/fridges/${fridgeId}/items`);
}

// 공유 냉장고에 함께 속해 있어도 화면은 내가 만든 냉장고를 먼저 보여 준다.
export async function getMyFridge() {
  const fridges = await getMyFridges();
  return fridges.find((fridge) => fridge.role === "OWNER") ?? fridges[0] ?? null;
}

export type FridgeItemUpdateRequest = {
  name: string;
  // 비우면 아이콘·유통기한을 지운다.
  emoji: string | null;
  expiresAt: string | null;
  // 화면이 재료를 불러올 때 받은 값. 그사이 다른 멤버가 고쳤으면 409 CONCURRENT_MODIFICATION으로 실패한다.
  version: number;
};

// 실패: INVALID_INPUT(400), FRIDGE_ITEM_NOT_FOUND(404), CONCURRENT_MODIFICATION(409)
export function updateFridgeItem(itemId: number, body: FridgeItemUpdateRequest) {
  return request<FridgeItemResponse>(`/api/fridge-items/${itemId}`, { method: "PUT", body });
}

// 실패: FRIDGE_ITEM_NOT_FOUND(404), CONCURRENT_MODIFICATION(409)
export function deleteFridgeItem(itemId: number, version: number) {
  return requestNoContent(`/api/fridge-items/${itemId}?version=${version}`, { method: "DELETE" });
}
