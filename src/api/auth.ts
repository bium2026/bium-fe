/*
 * 로그인·회원가입 API다.
 * 요청·응답 형식은 백엔드 AuthController(/api/auth)의 DTO를 따른다.
 */
import { request } from "./client";

export type SignupRequest = {
  // 로그인에 쓰고, 유통기한 알림을 받을 주소의 처음 값으로도 쓴다. 서버가 소문자로 바꿔 저장한다.
  email: string;
  password: string;
  nickname: string;
};

export type SignupResponse = {
  userId: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  // 토큰 유효 시간(초)
  expiresIn: number;
};

// 실패: INVALID_INPUT(400), DUPLICATE_EMAIL(409)
export function signup(body: SignupRequest) {
  return request<SignupResponse>("/api/auth/signup", { method: "POST", body, auth: false });
}

// 실패: INVALID_INPUT(400), LOGIN_FAILED(401)
export function login(body: LoginRequest) {
  return request<LoginResponse>("/api/auth/login", { method: "POST", body, auth: false });
}
