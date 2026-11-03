/*
 * 냉장실·냉동실·실온 구역의 순서와 이름, 색을 정한다.
 * 페이저는 이 순서대로 넘어가고, 냉장고 보드는 구역 색으로 칠한다.
 */
import type { ZoneId } from "./fridgeTypes";

export type ZoneMeta = {
  id: ZoneId;
  title: string;
  subtitle: string;
  tone: string;
};

export const zoneOrder: ZoneId[] = ["fridge", "freezer", "pantry"];

export const zoneMeta: Record<ZoneId, ZoneMeta> = {
  fridge: { id: "fridge", title: "냉장실", subtitle: "신선 식품을 차갑게 보관", tone: "var(--block-mint)" },
  freezer: { id: "freezer", title: "냉동실", subtitle: "오래 두고 먹을 재료 보관", tone: "var(--block-lilac)" },
  pantry: { id: "pantry", title: "실온", subtitle: "건조 식재료와 상온 재료 보관", tone: "var(--block-cream)" },
};

export function isZoneId(value: string | null): value is ZoneId {
  return value === "fridge" || value === "freezer" || value === "pantry";
}

export type ZoneDirection = "prev" | "next";

// 페이저처럼 양 끝에서 반대쪽 끝으로 이어진다.
export function adjacentZone(zoneId: ZoneId, direction: ZoneDirection): ZoneId {
  const index = zoneOrder.indexOf(zoneId);
  const step = direction === "prev" ? zoneOrder.length - 1 : 1;
  return zoneOrder[(index + step) % zoneOrder.length];
}
