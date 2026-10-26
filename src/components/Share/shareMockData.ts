/*
 * 냉장고 공유 화면 퍼블리싱용 목데이터와 가짜 요청이다.
 * 공유 API가 나오면 src/api 함수로 바꾸고 이 파일은 지운다.
 */
import type { Activity, FridgeMember, InviteCode, ShareData } from "./shareTypes";

const MOCK_DELAY_MS = 700;
const INVITE_VALID_HOURS = 24;
const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// 코드로 참여할 때 결과를 미리 볼 수 있게 정해 둔 코드다.
export const MOCK_JOIN_CODES = {
  success: "BIUM2026",
  expired: "OLDCODE1",
};

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function hoursLater(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const members: FridgeMember[] = [
  { userId: 1, nickname: "윤호", role: "OWNER", joinedAt: "2026-10-12T09:00:00", isMe: true },
  { userId: 2, nickname: "강희", role: "MEMBER", joinedAt: "2026-10-20T18:30:00", isMe: false },
  { userId: 3, nickname: "선재", role: "MEMBER", joinedAt: "2026-10-24T12:10:00", isMe: false },
];

const activities: Activity[] = [
  { id: 9, nickname: "강희", action: "ADD", itemName: "우유", createdAt: minutesAgo(2) },
  { id: 8, nickname: "선재", action: "DEDUCT", itemName: "두부", createdAt: minutesAgo(35) },
  { id: 7, nickname: "선재", action: "RESTORE", itemName: "두부", createdAt: minutesAgo(33) },
  { id: 6, nickname: "윤호", action: "UPDATE", itemName: "닭가슴살", createdAt: minutesAgo(60 * 3) },
  { id: 5, nickname: "강희", action: "MOVE", itemName: "아이스크림", createdAt: minutesAgo(60 * 5) },
  { id: 4, nickname: "윤호", action: "DELETE", itemName: "연어", createdAt: minutesAgo(60 * 26) },
  { id: 3, nickname: "선재", action: "JOIN", itemName: null, createdAt: minutesAgo(60 * 50) },
];

export function getShareMock(preview: string | null): ShareData {
  const isMember = preview === "member";
  const isEmpty = preview === "empty";
  return {
    fridge: { id: 7, name: isMember ? "강희네 냉장고" : "우리집 냉장고", myRole: isMember ? "MEMBER" : "OWNER" },
    invite: isEmpty || isMember ? null : { code: "K7Q2M9XA", expiresAt: hoursLater(20) },
    members: isEmpty
      ? members.filter((member) => member.isMe)
      : members.map((member) =>
          // 멤버로 볼 때는 강희가 주인이고 내가 멤버인 냉장고로 바꿔 보여 준다.
          isMember ? { ...member, role: member.userId === 2 ? "OWNER" : "MEMBER" } : member,
        ),
    activities: isEmpty ? [] : [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

// ?preview=fail이면 모든 요청이 실패해 오류 화면을 확인할 수 있다.
export function mockRequest<T>(result: () => T, shouldFail: boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (shouldFail) reject(new Error("요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."));
      else {
        try {
          resolve(result());
        } catch (error) {
          reject(error);
        }
      }
    }, MOCK_DELAY_MS);
  });
}

export function createInviteMock(): InviteCode {
  const code = Array.from(
    { length: 8 },
    () => CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)],
  ).join("");
  return { code, expiresAt: hoursLater(INVITE_VALID_HOURS) };
}

// 성공하면 참여한 냉장고 이름을 돌려준다. 실패 문구는 백엔드 오류 메시지와 같게 둔다.
export function joinFridgeMock(code: string, myInviteCode: string | null) {
  if (code === myInviteCode) throw new Error("이미 이 냉장고의 멤버입니다.");
  if (code === MOCK_JOIN_CODES.expired) throw new Error("만료된 초대 코드입니다. 새 코드를 받아 주세요.");
  if (code !== MOCK_JOIN_CODES.success) throw new Error("초대 코드를 찾을 수 없습니다.");
  return "민지네 냉장고";
}
