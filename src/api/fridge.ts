/*
 * 냉장고·냉장고 재료 API다.
 * 요청·응답 형식은 백엔드 FridgeController, FridgeItemController의 DTO를 따른다.
 */
import { pickFridge, useFridgeStore } from "../store/fridgeStore";
import { request, requestNoContent } from "./client";

export type MemberRole = "OWNER" | "MEMBER";

export type Fridge = {
  id: number;
  name: string;
  role: MemberRole;
};

// FRIDGE: 냉장실, FREEZER: 냉동실, ROOM: 실온
export type StorageType = "FRIDGE" | "FREEZER" | "ROOM";

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

// 헤더에서 고른 냉장고를 돌려준다. 고른 적이 없거나 더 이상 속해 있지 않으면 내가 주인인 냉장고를 돌려준다.
export async function getMyFridge() {
  const fridges = await getMyFridges();
  return pickFridge(fridges, useFridgeStore.getState().selectedFridgeId);
}

// 도감 재료를 냉장고에 넣을 때 보낸다. 이름(50자까지)·아이콘은 도감 값을 채워 보내고 사용자가 고칠 수 있다.
export type FridgeItemCreateRequest = {
  catalogId: number;
  name: string;
  // 비워 보내면 아이콘 없이 넣는다.
  emoji: string;
  storage: StorageType;
};

// 고른 보관 위치의 중앙 칸 맨 뒤에 넣고, 유통기한은 서버가 오늘부터 도감의 기본 유통기한을 더해 정한다.
// 응답(id, name, emoji, expiresAt, version)은 도감 화면에서 쓰지 않아 돌려주지 않는다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND·CATALOG_NOT_FOUND(404)
export async function addFridgeItem(fridgeId: number, body: FridgeItemCreateRequest) {
  await request<unknown>(`/api/fridges/${fridgeId}/items`, { method: "POST", body });
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
