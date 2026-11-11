/*
 * 냉장고·냉장고 재료 API다.
 * 요청·응답 형식은 백엔드 FridgeController, FridgeItemController의 DTO를 따른다.
 */
import { useAuthStore } from "../store/authStore";
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

// CENTER: 선반, LEFT_DOOR: 왼쪽 문칸, RIGHT_DOOR: 오른쪽 문칸
export type SectionType = "CENTER" | "LEFT_DOOR" | "RIGHT_DOOR";

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
// 헤더가 받은 목록이 있으면 그 목록에서 고른다. 서버 목록을 따로 받으면 헤더와 다른 냉장고를 골라
// 헤더에 없는 냉장고에 재료를 넣을 수 있다.
export async function getMyFridge() {
  const requestToken = useAuthStore.getState().accessToken;
  const { list } = useFridgeStore.getState();
  const fridges = list.status === "success" ? list.fridges : await getMyFridges();
  // 기다리는 사이 다른 계정으로 바뀌었으면 이전 계정의 냉장고를 지금 계정의 요청에 쓰지 않게 버린다.
  if (useAuthStore.getState().accessToken !== requestToken) return null;
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

// 영수증에서 읽은 재료처럼 도감에 없는 재료를 여러 개 한 번에 넣을 때 보낸다.
export type FridgeItemBulkCreateItem = {
  // 50자까지
  name: string;
  // 비워 보내면 아이콘 없이 넣는다.
  emoji: string;
  storage: StorageType;
  // "YYYY-MM-DD", null이면 유통기한 없이 넣는다.
  expiresAt: string | null;
};

type FridgeItemBulkCreateResponse = {
  items: FridgeItemResponse[];
};

// 1~50개를 한꺼번에 넣고, 하나라도 잘못되면 아무것도 넣지 않는다.
// 재료마다 고른 보관 위치의 중앙 칸 맨 뒤에 놓이며, 응답은 보낸 순서 그대로 온다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND(404)
export async function addFridgeItems(fridgeId: number, items: FridgeItemBulkCreateItem[]) {
  const { items: added } = await request<FridgeItemBulkCreateResponse>(`/api/fridges/${fridgeId}/items/bulk`, {
    method: "POST",
    body: { items },
  });
  return added;
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

// 재료를 끌어다 놓은 위치. index는 놓을 칸 안에서 0부터 센 위치이고, 칸의 재료 수보다 크면 맨 뒤에 놓는다.
export type FridgeItemPositionRequest = {
  storage: StorageType;
  section: SectionType;
  index: number;
  version: number;
};

// 놓은 칸의 순번을 서버가 다시 매긴다. 칸 안에서 순서만 바꾸면 버전이 그대로이고, 칸이 바뀌면 버전이 오른다.
// 실패: INVALID_INPUT(400), FRIDGE_ITEM_NOT_FOUND(404), CONCURRENT_MODIFICATION(409)
export function changeFridgeItemPosition(itemId: number, body: FridgeItemPositionRequest) {
  return request<FridgeItemResponse>(`/api/fridge-items/${itemId}/position`, { method: "PATCH", body });
}

// 실패: FRIDGE_ITEM_NOT_FOUND(404), CONCURRENT_MODIFICATION(409)
export function deleteFridgeItem(itemId: number, version: number) {
  return requestNoContent(`/api/fridge-items/${itemId}?version=${version}`, { method: "DELETE" });
}

// 일괄 삭제 API가 한 번에 받는 재료 수
export const MAX_BULK_DELETE_ITEMS = 100;

export type FridgeItemBulkDeleteItem = {
  fridgeItemId: number;
  // 화면이 재료를 불러올 때 받은 값
  version: number;
};

type FridgeItemBulkDeleteResponse = {
  deletedItemIds: number[];
};

// 1~100개를 한꺼번에 지우고, 하나라도 지울 수 없으면 아무것도 지우지 않는다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND·FRIDGE_ITEM_NOT_FOUND(404), CONCURRENT_MODIFICATION(409)
export async function deleteFridgeItems(fridgeId: number, items: FridgeItemBulkDeleteItem[]) {
  const { deletedItemIds } = await request<FridgeItemBulkDeleteResponse>(`/api/fridges/${fridgeId}/items/bulk-delete`, {
    method: "POST",
    body: { items },
  });
  return deletedItemIds;
}

// 재료의 기준량(보통 100g)당 영양 정보. 식약처 식품영양성분 DB에서 찾은 값이다 (bium-be #43).
export type FridgeItemNutrition = {
  // 식약처에서 맞춘 식품 이름. 재료 이름과 다를 수 있어 화면에 함께 보여 준다.
  foodName: string;
  // 기준량(g). 보통 100이고, 화면의 "100g당" 문구를 이 값으로 만든다.
  baseAmountG: number;
  caloriesKcal: number | null;
  carbohydrateG: number | null;
  proteinG: number | null;
  fatG: number | null;
};

// 맞는 식품이 없거나 네 값이 모두 비어 있으면 null이다. 서버가 이 결과를 저장해 두므로 다시 불러도 null이다.
// 처음 찾는 재료는 서버가 식약처를 부르느라 몇 초 걸릴 수 있다.
// 실패: FRIDGE_ITEM_NOT_FOUND(404), NUTRITION_FETCH_FAILED(502, 식약처 응답 실패라 다시 시도하면 될 수 있다)
export function getFridgeItemNutrition(itemId: number) {
  return request<FridgeItemNutrition | null>(`/api/fridge-items/${itemId}/nutrition`);
}

// 냉장고 전체 영양 균형. 영양 정보를 찾은 재료마다 기준량(보통 100g)씩 있다고 보고 더한 값이다 (bium-be #44).
export type FridgeNutritionSummary = {
  // 냉장고 재료 수
  itemCount: number;
  // 네 영양 값이 모두 있어 합계에 들어간 재료 수 (items 길이와 같다). 0이면 아래 합계는 모두 null이다.
  matchedCount: number;
  // 식약처에서 아직 찾아보지 않은 재료 수. 이 요청이 오면 서버가 뒤에서 찾기 시작해서, 다시 부르면 줄어 있다.
  // itemCount - matchedCount - pendingCount는 맞는 식품이 없거나 값이 일부 비어 합계에서 뺀 재료 수다.
  pendingCount: number;
  // 재료마다 100g으로 환산해 더한 값이다.
  caloriesKcal: number | null;
  carbohydrateG: number | null;
  proteinG: number | null;
  fatG: number | null;
  // 합계에 들어간 재료 (itemId 오름차순). 값은 그 재료의 baseAmountG 기준이다.
  items: (FridgeItemNutrition & { itemId: number; name: string; emoji: string | null })[];
};

// 저장된 영양 정보만 더해서 바로 응답한다. 식약처를 부르지 않으므로 502는 오지 않는다.
// storage를 주면 그 보관 구역 재료만, 빼면 냉장고 전체를 더한다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND(404)
export function getFridgeNutritionSummary(fridgeId: number, storage?: StorageType) {
  const query = storage ? `?storage=${storage}` : "";
  return request<FridgeNutritionSummary>(`/api/fridges/${fridgeId}/nutrition-summary${query}`);
}
