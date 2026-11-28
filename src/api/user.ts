/*
 * 로그인한 사람의 계정 API다.
 * 요청·응답 형식은 백엔드 UserController(/api/users/me)의 DTO를 따른다.
 */
import { request } from "./client";

export type MyProfile = {
  // 아이디로 로그인하던 때 만든 계정이면 비어 있을 수 있다.
  email: string | null;
  nickname: string;
};

export function getMyProfile() {
  return request<MyProfile>("/api/users/me");
}

// 서버가 앞뒤 공백을 지운 뒤 가입 때와 같은 규칙(2~10자)으로 검사한다. 냉장고 이름은 바꾸지 않는다.
// 실패: INVALID_INPUT(400)
export function changeNickname(nickname: string) {
  return request<MyProfile>("/api/users/me/nickname", { method: "PATCH", body: { nickname } });
}
