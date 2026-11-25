/*
 * 로그인·회원가입 API다.
 * 요청·응답 형식은 백엔드 AuthController(/api/auth)의 DTO를 따른다.
 */
import { request } from "./client";

export type SignupRequest = {
  loginId: string;
  password: string;
  nickname: string;
  // 유통기한 알림 메일을 받을 주소. 알림 설정 화면에서 바꿀 수 있다.
  email: string;
};

export type SignupResponse = {
  userId: number;
};

export type LoginRequest = {
  loginId: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  // 토큰 유효 시간(초)
  expiresIn: number;
};

// 실패: INVALID_INPUT(400), DUPLICATE_LOGIN_ID(409)
export function signup(body: SignupRequest) {
  return request<SignupResponse>("/api/auth/signup", { method: "POST", body, auth: false });
}

// 실패: INVALID_INPUT(400), LOGIN_FAILED(401)
export function login(body: LoginRequest) {
  return request<LoginResponse>("/api/auth/login", { method: "POST", body, auth: false });
}
