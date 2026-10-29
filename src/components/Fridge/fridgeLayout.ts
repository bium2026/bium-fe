/*
 * 서버의 보관 위치·칸 값과 화면의 구역·칸 이름을 서로 바꾸고, 재료를 칸 사이로 옮긴 결과를 만든다.
 * 드래그 앤 드롭에서 쓰는 id도 여기서 만든다. 냉장고 재료와 장본 음식은 서로 다른 표의 id라 숫자가 겹칠 수 있어 앞에 종류를 붙인다.
 */
import type { UniqueIdentifier } from "@dnd-kit/core";
import type {
  FridgeContentsResponse,
  FridgeItemResponse,
  SectionType,
  StorageContents,
  StorageType,
} from "../../api/fridge";
import type { FridgeContents, FridgeIngredient, SectionId, ZoneId, ZoneIngredients } from "./fridgeTypes";

export const zoneStorage: Record<ZoneId, StorageType> = { fridge: "FRIDGE", freezer: "FREEZER", pantry: "ROOM" };
export const storageZone: Record<StorageType, ZoneId> = { FRIDGE: "fridge", FREEZER: "freezer", ROOM: "pantry" };
export const sectionType: Record<SectionId, SectionType> = {
  shelf: "CENTER",
  leftDoor: "LEFT_DOOR",
  rightDoor: "RIGHT_DOOR",
};
export const sectionIds: SectionId[] = ["shelf", "leftDoor", "rightDoor"];

export const emptyFridgeContents: FridgeContents = {
  fridge: { shelf: [], leftDoor: [], rightDoor: [] },
  freezer: { shelf: [], leftDoor: [], rightDoor: [] },
  pantry: { shelf: [], leftDoor: [], rightDoor: [] },
};

// 아이콘·유통기한이 없는 재료는 빈 문자열로 둔다. 카드는 유통기한이 비어 있으면 배지를 보여 주지 않는다.
export function toIngredient(item: FridgeItemResponse): FridgeIngredient {
  return { ...item, emoji: item.emoji ?? "", expiresAt: item.expiresAt ?? "" };
}

function toZone(storage: StorageContents): ZoneIngredients {
  return {
    shelf: storage.center.map(toIngredient),
    leftDoor: storage.leftDoor.map(toIngredient),
    rightDoor: storage.rightDoor.map(toIngredient),
  };
}

export function toFridgeContents(response: FridgeContentsResponse): FridgeContents {
  return { fridge: toZone(response.fridge), freezer: toZone(response.freezer), pantry: toZone(response.room) };
}

export type ItemLocation = { sectionId: SectionId; index: number };

export function findIngredient(zone: ZoneIngredients, id: number): ItemLocation | null {
  for (const sectionId of sectionIds) {
    const index = zone[sectionId].findIndex((item) => item.id === id);
    if (index >= 0) return { sectionId, index };
  }
  return null;
}

// to.index는 옮긴 뒤 그 칸에서 재료가 놓일 자리다. 칸의 재료 수보다 크면 맨 뒤에 놓는다.
export function insertIntoZone(zone: ZoneIngredients, to: ItemLocation, ingredient: FridgeIngredient): ZoneIngredients {
  const target = [...zone[to.sectionId]];
  target.splice(Math.min(to.index, target.length), 0, ingredient);
  return { ...zone, [to.sectionId]: target };
}

export function moveWithinZone(zone: ZoneIngredients, from: ItemLocation, to: ItemLocation): ZoneIngredients {
  const ingredient = zone[from.sectionId][from.index];
  const withoutItem = { ...zone, [from.sectionId]: zone[from.sectionId].filter((_, index) => index !== from.index) };
  return insertIntoZone(withoutItem, to, ingredient);
}

export type DragTarget =
  | { kind: "fridge-item"; id: number }
  | { kind: "purchased"; id: number }
  | { kind: "section"; sectionId: SectionId };

export const fridgeItemDragId = (id: number) => `fridge-item:${id}`;
export const purchasedDragId = (id: number) => `purchased:${id}`;
export const sectionDropId = (sectionId: SectionId) => `section:${sectionId}`;

function isSectionId(value: string): value is SectionId {
  return value === "shelf" || value === "leftDoor" || value === "rightDoor";
}

export function parseDragId(id: UniqueIdentifier): DragTarget | null {
  const [kind, value = ""] = String(id).split(":");
  if (kind === "fridge-item" || kind === "purchased") return { kind, id: Number(value) };
  if (kind === "section" && isSectionId(value)) return { kind: "section", sectionId: value };
  return null;
}
