/*
 * 냉장고 공유 화면에서 쓰는 데이터 타입이다.
 * 공유 API가 나오기 전까지 퍼블리싱용으로 쓰고, 연동할 때 src/api의 응답 타입으로 옮긴다.
 * 필드는 ERD(fridge_invites, fridge_members, activity_logs) 기준이다.
 */
import type { MemberRole } from "../../api/fridge";

export type ShareFridge = {
  id: number;
  name: string;
  myRole: MemberRole;
};

export type InviteCode = {
  code: string;
  expiresAt: string;
};

export type FridgeMember = {
  userId: number;
  nickname: string;
  role: MemberRole;
  joinedAt: string;
  isMe: boolean;
};

export type ActivityAction = "ADD" | "UPDATE" | "MOVE" | "DELETE" | "DEDUCT" | "RESTORE" | "JOIN" | "LEAVE";

export type Activity = {
  id: number;
  nickname: string;
  action: ActivityAction;
  // 참여·나가기처럼 재료가 없는 기록은 null
  itemName: string | null;
  createdAt: string;
};

export type ShareData = {
  fridge: ShareFridge;
  // 아직 만든 초대 코드가 없으면 null
  invite: InviteCode | null;
  members: FridgeMember[];
  activities: Activity[];
};
