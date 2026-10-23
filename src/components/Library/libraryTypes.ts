/*
 * 식재료 도감 화면에서 쓰는 화면 전용 타입이다.
 * 도감 재료 타입은 src/api/ingredientCatalog.ts에 있다.
 */

// 장본 음식에 담긴 재료다. 냉장고 재료와 같은 모양으로 두어 나중에 냉장고로 옮길 수 있게 한다.
// 장본 음식 API가 아직 없어서 화면 안에서만 들고 있다.
export type GroceryItem = {
  id: string;
  name: string;
  emoji: string;
  expiresAt: string;
};
