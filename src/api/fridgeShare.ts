/*
 * 냉장고 공유(초대 코드·참여·멤버·활동 기록) API다.
 * 요청·응답 형식은 백엔드 FridgeInviteController, FridgeMemberController, ActivityLogController의 DTO를 따른다.
 * 초대 코드 만들기·내보내기는 주인만, 나가기는 멤버만 할 수 있다. 멤버가 아닌 냉장고는 모두 FRIDGE_NOT_FOUND(404)로 실패한다.
 */
import type { Fridge, MemberRole } from "./fridge";
import { request, requestNoContent } from "./client";

export type InviteCode = {
  // 영문 대문자·숫자 8자
  code: string;
  // 만든 때부터 24시간 뒤
  expiresAt: string;
};

export type FridgeMember = {
  userId: number;
  nickname: string;
  role: MemberRole;
  joinedAt: string;
  // 화면은 내 userId를 몰라서, 요청한 사람의 줄인지 서버가 알려 준다.
  isMe: boolean;
};

// MOVE는 이동 API가 아직 없어 오지 않는다.
export type ActivityAction = "ADD" | "UPDATE" | "MOVE" | "DELETE" | "DEDUCT" | "RESTORE" | "JOIN" | "LEAVE";

export type Activity = {
  id: number;
  nickname: string;
  action: ActivityAction;
  // 참여·나가기처럼 재료가 없는 기록은 null
  itemName: string | null;
  createdAt: string;
};

// 새로 만들면 이전 코드는 바로 쓸 수 없게 된다.
// 실패: FRIDGE_OWNER_ONLY(403), FRIDGE_NOT_FOUND(404)
export function createInvite(fridgeId: number) {
  return request<InviteCode>(`/api/fridges/${fridgeId}/invites`, { method: "POST" });
}

// 지금 쓸 수 있는 코드가 없으면 null을 준다.
// 실패: FRIDGE_OWNER_ONLY(403), FRIDGE_NOT_FOUND(404)
export function getActiveInvite(fridgeId: number) {
  return request<InviteCode | null>(`/api/fridges/${fridgeId}/invites/active`);
}

// 멤버로 들어간 냉장고를 냉장고 목록(GET /api/fridges)과 같은 모양으로 준다. 소문자·앞뒤 공백은 서버도 무시한다.
// 실패: INVALID_INPUT(400), INVITE_NOT_FOUND(404), ALREADY_FRIDGE_MEMBER(409), INVITE_EXPIRED(410, 새 코드로 바뀐 코드 포함)
export function joinFridge(code: string) {
  return request<Fridge>("/api/fridges/join", { method: "POST", body: { code } });
}

// 주인이 맨 앞, 나머지는 참여한 순서로 준다.
// 실패: FRIDGE_NOT_FOUND(404)
export function getFridgeMembers(fridgeId: number) {
  return request<FridgeMember[]>(`/api/fridges/${fridgeId}/members`);
}

// 내보낸 사람이 같은 코드로 다시 들어오지 못하게 서버가 지금 초대 코드도 함께 끈다.
// 실패: FRIDGE_OWNER_ONLY(403), FRIDGE_NOT_FOUND·FRIDGE_MEMBER_NOT_FOUND(404), OWNER_CANNOT_LEAVE(409)
export function removeFridgeMember(fridgeId: number, userId: number) {
  return requestNoContent(`/api/fridges/${fridgeId}/members/${userId}`, { method: "DELETE" });
}

// 실패: FRIDGE_NOT_FOUND(404), OWNER_CANNOT_LEAVE(409)
export function leaveFridge(fridgeId: number) {
  return requestNoContent(`/api/fridges/${fridgeId}/members/me`, { method: "DELETE" });
}

// 최근 기록부터 50개까지 준다.
// 실패: FRIDGE_NOT_FOUND(404)
export function getActivities(fridgeId: number) {
  return request<Activity[]>(`/api/fridges/${fridgeId}/activities`);
}
