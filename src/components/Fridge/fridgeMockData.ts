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

// 서버 재료처럼 숫자 id와 처음 버전(0)을 붙인다.
let nextId = 1;

function food(name: string, emoji: string, daysLeft: number): FridgeIngredient {
  return { id: nextId++, name, emoji, expiresAt: getDateAfter(daysLeft), version: 0 };
}

export const fridgeMock: FridgeContents = {
  fridge: {
    shelf: [
      food("연어", "🐟", -1),
      food("닭가슴살", "🍗", 0),
      food("시금치", "🥬", 1),
      food("두부", "🧊", 3),
      food("토마토", "🍅", 4),
      food("우유", "🥛", 5),
      food("대파", "🥬", 7),
      food("당근", "🥕", 14),
      food("김치", "🥬", 30),
    ],
    leftDoor: [food("계란", "🥚", 9), food("버터", "🧈", 24)],
    rightDoor: [food("치즈", "🧀", 6), food("요거트", "🥣", 2), food("주스", "🧃", 12)],
  },
  freezer: {
    shelf: [
      food("떡", "🍡", 10),
      food("고등어", "🐟", 14),
      food("만두", "🥟", 45),
      food("소고기", "🥩", 60),
      food("새우", "🦐", 2),
    ],
    leftDoor: [food("아이스크림", "🍨", 90)],
    rightDoor: [],
  },
  pantry: {
    shelf: [
      food("양파", "🧅", 16),
      food("감자", "🥔", 35),
      food("고구마", "🍠", 22),
      food("마늘", "🧄", 28),
      food("참치캔", "🥫", 180),
      food("라면", "🍜", 90),
      food("바나나", "🍌", 3),
    ],
    leftDoor: [],
    rightDoor: [food("식빵", "🍞", 1)],
  },
};

export const emptyFridgeMock: FridgeContents = {
  fridge: { shelf: [], leftDoor: [], rightDoor: [] },
  freezer: { shelf: [], leftDoor: [], rightDoor: [] },
  pantry: { shelf: [], leftDoor: [], rightDoor: [] },
};
