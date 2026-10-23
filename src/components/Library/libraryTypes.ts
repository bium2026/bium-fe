/*
 * 식재료 도감 화면에서 쓰는 데이터 타입이다.
 * API 명세가 나오기 전까지 퍼블리싱용으로 쓰고, 연동할 때 src/api의 응답 타입으로 옮긴다.
 */

export type IngredientCategory = "vegetable" | "meat" | "dairy" | "fruit" | "etc";

export type LibraryIngredient = {
  id: string;
  name: string;
  icon: string;
  category: IngredientCategory;
  // 장본 음식에 담을 때 오늘부터 이 일수만큼 더해 유통기한을 정한다.
  shelfLifeDays: number;
};

export type NewLibraryIngredient = Omit<LibraryIngredient, "id">;

// 장본 음식에 담긴 재료다. 냉장고 재료와 같은 모양으로 두어 나중에 냉장고로 옮길 수 있게 한다.
export type GroceryItem = {
  id: string;
  name: string;
  icon: string;
  expiresAt: string;
};
