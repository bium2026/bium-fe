/*
 * 냉장고 화면 퍼블리싱용 목데이터다.
 * 유통기한 배지가 여러 상태로 보이도록 오늘 기준 날짜로 만든다.
 * 서버 연동 후에는 API 응답으로 바꾸고 이 파일은 지운다.
 */
import type { FridgeContents, FridgeIngredient } from "./fridgeTypes";

// toISOString()은 UTC 기준이라 한국 시간 새벽에는 하루 전 날짜가 나와서 지역 날짜로 만든다.
function getDateAfter(days: number) {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function food(id: string, name: string, icon: string, daysLeft: number): FridgeIngredient {
  return { id, name, icon, expiresAt: getDateAfter(daysLeft) };
}

export const fridgeMock: FridgeContents = {
  fridge: {
    shelf: [
      food("salmon", "연어", "🐟", -1),
      food("chicken", "닭가슴살", "🍗", 0),
      food("spinach", "시금치", "🥬", 1),
      food("tofu", "두부", "🧊", 3),
      food("tomato", "토마토", "🍅", 4),
      food("milk", "우유", "🥛", 5),
      food("green-onion", "대파", "🥬", 7),
      food("carrot", "당근", "🥕", 14),
      food("kimchi", "김치", "🥬", 30),
    ],
    leftDoor: [food("egg", "계란", "🥚", 9), food("butter", "버터", "🧈", 24)],
    rightDoor: [food("cheese", "치즈", "🧀", 6), food("yogurt", "요거트", "🥣", 2), food("juice", "주스", "🧃", 12)],
  },
  freezer: {
    shelf: [
      food("rice-cake", "떡", "🍡", 10),
      food("mackerel", "고등어", "🐟", 14),
      food("dumpling", "만두", "🥟", 45),
      food("beef", "소고기", "🥩", 60),
      food("shrimp", "새우", "🦐", 2),
    ],
    leftDoor: [food("ice-cream", "아이스크림", "🍨", 90)],
    rightDoor: [],
  },
  pantry: {
    shelf: [
      food("onion", "양파", "🧅", 16),
      food("potato", "감자", "🥔", 35),
      food("sweet-potato", "고구마", "🍠", 22),
      food("garlic", "마늘", "🧄", 28),
      food("canned-tuna", "참치캔", "🥫", 180),
      food("ramen", "라면", "🍜", 90),
      food("banana", "바나나", "🍌", 3),
    ],
    leftDoor: [],
    rightDoor: [food("bread", "식빵", "🍞", 1)],
  },
};

export const emptyFridgeMock: FridgeContents = {
  fridge: { shelf: [], leftDoor: [], rightDoor: [] },
  freezer: { shelf: [], leftDoor: [], rightDoor: [] },
  pantry: { shelf: [], leftDoor: [], rightDoor: [] },
};
