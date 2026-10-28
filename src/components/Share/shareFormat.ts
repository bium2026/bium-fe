/*
 * 냉장고 공유 화면의 날짜·코드 표시 형식과 오류 안내 문구를 정한다.
 */
import { ApiError, NETWORK_ERROR } from "../../api/client";

const CODE_LENGTH = 8;

// 사람이 읽기 쉽게 네 글자씩 끊어 보여 준다. 저장·전송은 붙인 값으로 한다.
export function formatInviteCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// 복사해 붙여 넣으면 하이픈·공백·소문자가 섞일 수 있어 정리한 뒤 검사한다.
export function normalizeInviteCode(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function getInviteCodeError(code: string) {
  if (!code) return "초대 코드를 입력해 주세요.";
  if (!new RegExp(`^[A-Z0-9]{${CODE_LENGTH}}$`).test(code)) return `초대 코드는 영문·숫자 ${CODE_LENGTH}자리예요.`;
  return "";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatJoinedDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} 참여`;
}

export function formatExpiresAt(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}까지`;
}

// 하루 안의 기록은 몇 분·몇 시간 전으로, 그 전 기록은 날짜로 보여 준다.
export function formatActivityTime(value: string, now = Date.now()) {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 서버 문구 대신 화면 말투로, 무엇이 문제고 어떻게 하면 되는지 알려 준다.
const shareErrorMessages: Partial<Record<string, string>> = {
  FRIDGE_NOT_FOUND: "이 냉장고에 더 이상 속해 있지 않아요. 주인이 내보냈을 수 있어요.",
  FRIDGE_OWNER_ONLY: "냉장고 주인만 할 수 있어요.",
  OWNER_CANNOT_LEAVE: "주인은 냉장고에서 나가거나 내보내질 수 없어요.",
  INVITE_NOT_FOUND: "초대 코드를 찾을 수 없어요. 받은 코드를 다시 확인해 주세요.",
  INVITE_EXPIRED: "만료됐거나 새 코드로 바뀐 초대 코드예요. 주인에게 새 코드를 받아 주세요.",
  ALREADY_FRIDGE_MEMBER: "이미 참여한 냉장고예요. 헤더의 냉장고 목록에서 바꿔 볼 수 있어요.",
};

// 모르는 오류는 화면마다 정한 문구로 다시 시도를 안내한다.
export function getShareErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === NETWORK_ERROR) return error.message;
  return shareErrorMessages[error.code] ?? fallback;
}
