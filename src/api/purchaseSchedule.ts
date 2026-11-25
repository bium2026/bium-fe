/*
 * 다음 구매 날짜 API다.
 * 요청·응답 형식은 백엔드 다음 구매 날짜 API(bium-be #66)를 따른다.
 */
import { request } from "./client";

export type PurchaseScheduleItem = {
  name: string;
  // 가장 최근에 넣은 재료의 아이콘이다. 없으면 null이다.
  emoji: string | null;
  // yyyy-MM-dd
  lastPurchasedAt: string;
  // 서로 다른 구매일 수다.
  purchaseCount: number;
  cycleDays: number;
  // yyyy-MM-dd. 이미 지난 날짜도 그대로 온다.
  nextPurchaseDate: string;
};

type PurchaseScheduleResponse = {
  items: PurchaseScheduleItem[];
};

// 다음 구매일, 이름 순으로 온다. 계산할 재료가 없으면 빈 목록이다.
// 실패: FRIDGE_NOT_FOUND(404)
export async function getPurchaseSchedule(fridgeId: number) {
  const { items } = await request<PurchaseScheduleResponse>(`/api/fridges/${fridgeId}/purchase-schedule`);
  return items;
}
