/*
 * 냉장고 화면에서 쓰는 데이터 타입이다.
 * API 명세가 나오기 전까지 퍼블리싱용으로 쓰고, 연동할 때 src/api의 응답 타입으로 옮긴다.
 */
import type { EditableIngredient } from "./IngredientEditModal";

export type ZoneId = "fridge" | "freezer" | "pantry";

// 재료를 눌러 수정 모달을 열 때 그대로 넘길 수 있게 모달의 재료 타입과 맞춘다.
export type FridgeIngredient = EditableIngredient;

export type ZoneIngredients = {
  shelf: FridgeIngredient[];
  leftDoor: FridgeIngredient[];
  rightDoor: FridgeIngredient[];
};

export type FridgeContents = Record<ZoneId, ZoneIngredients>;
