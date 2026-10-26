/*
 * 도감 재료를 냉장고에 넣을 때 고르는 보관 위치의 순서와 이름이다.
 */
import type { StorageType } from "../../api/fridge";

export const storageOrder: StorageType[] = ["FRIDGE", "FREEZER", "ROOM"];

export const storageLabel: Record<StorageType, string> = {
  FRIDGE: "냉장실",
  FREEZER: "냉동실",
  ROOM: "실온",
};
