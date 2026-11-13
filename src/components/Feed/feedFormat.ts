/*
 * 냉장고 피드 화면들이 함께 쓰는 구역 순서·이름과 유통기한 표시, 오류 안내 문구다.
 */
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { FeedStorages } from "../../api/feed";
import { getDaysLeft } from "../Fridge/fridgeLayout";
import { zoneMeta, type ZoneMeta } from "../Fridge/fridgeZones";

// 서버의 room(실온)은 냉장고 화면의 실온(pantry) 이름과 색으로 보여 준다.
export const feedStorages: { key: keyof FeedStorages; meta: ZoneMeta }[] = [
  { key: "fridge", meta: zoneMeta.fridge },
  { key: "freezer", meta: zoneMeta.freezer },
  { key: "room", meta: zoneMeta.pantry },
];

export type Freshness = "expired" | "urgent" | "soon" | "safe";

// 냉장고 화면의 재료 카드와 같은 기준으로 유통기한 배지 문구와 색을 정한다.
export function getExpiry(expiresAt: string) {
  const daysLeft = getDaysLeft(expiresAt);
  const freshness: Freshness = daysLeft < 0 ? "expired" : daysLeft <= 3 ? "urgent" : daysLeft <= 6 ? "soon" : "safe";
  const label = daysLeft < 0 ? `만료 ${Math.abs(daysLeft)}일` : daysLeft === 0 ? "오늘" : `D-${daysLeft}`;
  const description =
    daysLeft < 0 ? `유통기한 ${Math.abs(daysLeft)}일 지남` : daysLeft === 0 ? "오늘까지" : `유통기한 ${daysLeft}일 남음`;
  return { freshness, label, description };
}

// 서버 문구 대신 화면 말투로, 무엇이 문제고 어떻게 하면 되는지 알려 준다.
const feedErrorMessages: Partial<Record<string, string>> = {
  FRIDGE_NOT_FOUND: "주인이 공개를 멈춘 냉장고예요. 피드를 새로 불러와 주세요.",
  FRIDGE_OWNER_ONLY: "냉장고 주인만 공개 여부를 바꿀 수 있어요.",
};

// 모르는 오류는 화면마다 정한 문구로 다시 시도를 안내한다.
export function getFeedErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === NETWORK_ERROR) return error.message;
  return feedErrorMessages[error.code] ?? fallback;
}
