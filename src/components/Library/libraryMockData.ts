/*
 * 식재료 도감 화면 퍼블리싱용 목데이터다.
 * 카테고리마다 대표 재료를 넣어 묶음과 탭이 모두 채워져 보이게 한다.
 * 서버 연동 후에는 API 응답으로 바꾸고 이 파일은 지운다.
 */
import { getDateAfter } from "./libraryDate";
import type { GroceryItem, IngredientCategory, LibraryIngredient } from "./libraryTypes";

function ingredient(
  id: string,
  name: string,
  icon: string,
  category: IngredientCategory,
  shelfLifeDays: number,
): LibraryIngredient {
  return { id, name, icon, category, shelfLifeDays };
}

export const libraryMock: LibraryIngredient[] = [
  ingredient("spinach", "시금치", "🥬", "vegetable", 4),
  ingredient("cabbage", "양배추", "🥬", "vegetable", 14),
  ingredient("carrot", "당근", "🥕", "vegetable", 21),
  ingredient("zucchini", "애호박", "🥒", "vegetable", 7),
  ingredient("cucumber", "오이", "🥒", "vegetable", 6),
  ingredient("onion", "양파", "🧅", "vegetable", 20),
  ingredient("potato", "감자", "🥔", "vegetable", 30),
  ingredient("green-onion", "대파", "🥬", "vegetable", 10),
  ingredient("garlic", "마늘", "🧄", "vegetable", 30),
  ingredient("tomato", "토마토", "🍅", "vegetable", 7),
  ingredient("mushroom", "버섯", "🍄", "vegetable", 7),
  ingredient("broccoli", "브로콜리", "🥦", "vegetable", 7),

  ingredient("chicken", "닭가슴살", "🍗", "meat", 3),
  ingredient("pork", "돼지고기", "🥩", "meat", 5),
  ingredient("beef", "소고기", "🥩", "meat", 4),
  ingredient("bacon", "베이컨", "🥓", "meat", 7),
  ingredient("shrimp", "새우", "🦐", "meat", 30),
  ingredient("mackerel", "고등어", "🐟", "meat", 30),

  ingredient("egg", "계란", "🥚", "dairy", 21),
  ingredient("milk", "우유", "🥛", "dairy", 7),
  ingredient("yogurt", "요거트", "🥣", "dairy", 10),
  ingredient("cheese", "치즈", "🧀", "dairy", 15),
  ingredient("butter", "버터", "🧈", "dairy", 30),

  ingredient("banana", "바나나", "🍌", "fruit", 5),
  ingredient("apple", "사과", "🍎", "fruit", 14),
  ingredient("strawberry", "딸기", "🍓", "fruit", 3),
  ingredient("grape", "포도", "🍇", "fruit", 7),
  ingredient("avocado", "아보카도", "🥑", "fruit", 5),

  ingredient("tofu", "두부", "🧊", "etc", 5),
  ingredient("kimchi", "김치", "🥬", "etc", 30),
  ingredient("bread", "식빵", "🍞", "etc", 3),
  ingredient("dumpling", "만두", "🥟", "etc", 90),
  ingredient("ramen", "라면", "🍜", "etc", 120),
  ingredient("canned-tuna", "참치캔", "🥫", "etc", 365),
];

export const groceryMock: GroceryItem[] = [
  { id: "grocery-milk", name: "우유", icon: "🥛", expiresAt: getDateAfter(7) },
  { id: "grocery-spinach", name: "시금치", icon: "🥬", expiresAt: getDateAfter(4) },
];
