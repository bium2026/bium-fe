/*
 * 냉장고·냉장고 재료 API다.
 * 재료 수정·삭제는 백엔드 FridgeItemController의 DTO를 따른다.
 * 냉장고 조회와 재료 목록은 아직 백엔드에 없는 API라서 주소는 정해지지 않았고, 응답 필드는 ERD(fridges, fridge_members, fridge_items) 기준으로 작성했다.
 * 백엔드 API가 나오면 주소와 응답을 확인해 이 파일을 맞춘다.
 */
import { request, requestNoContent } from "./client";

export type MemberRole = "OWNER" | "MEMBER";

export type Fridge = {
  id: number;
  name: string;
  role: MemberRole;
};

// FRIDGE: 냉장실, FREEZER: 냉동실, ROOM: 실온
export type StorageType = "FRIDGE" | "FREEZER" | "ROOM";

// DOOR: 문칸, CENTER: 중앙 칸
export type SectionType = "DOOR" | "CENTER";

export type FridgeItem = {
  id: number;
  name: string;
  emoji: string | null;
  // "YYYY-MM-DD", 유통기한이 없는 재료는 null
  expiresAt: string | null;
  storage: StorageType;
  section: SectionType;
  sortOrder: number;
  // 재료를 수정·삭제할 때 함께 보내 다른 멤버의 수정과 겹치지 않게 한다.
  version: number;
};

// 내가 멤버로 속한 냉장고 목록
export function getMyFridges() {
  return request<Fridge[]>("/api/fridges");
}

export function getFridgeItems(fridgeId: number) {
  return request<FridgeItem[]>(`/api/fridges/${fridgeId}/items`);
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

export type FridgeItemResponse = {
  id: number;
  name: string;
  emoji: string | null;
  expiresAt: string | null;
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
