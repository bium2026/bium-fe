/*
 * 냉장고·냉장고 재료 조회 API다.
 * 아직 백엔드에 없는 API라서 주소는 정해지지 않았고, 응답 필드는 ERD(fridges, fridge_members, fridge_items) 기준으로 작성했다.
 * 백엔드 API가 나오면 주소와 응답을 확인해 이 파일을 맞춘다.
 */
import { request } from "./client";

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
