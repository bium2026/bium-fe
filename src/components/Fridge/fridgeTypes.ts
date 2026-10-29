/*
 * 냉장고 화면에서 쓰는 데이터 타입이다.
 * 서버 응답(src/api/fridge.ts)은 fridgeLayout.ts에서 이 타입으로 바꿔 쓴다.
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

// 선반, 왼쪽 문칸, 오른쪽 문칸
export type SectionId = keyof ZoneIngredients;

export type FridgeContents = Record<ZoneId, ZoneIngredients>;
