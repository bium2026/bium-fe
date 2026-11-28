/*
 * 로그인·회원가입·로그아웃 API다.
 * 요청·응답 형식은 백엔드 AuthController(/api/auth)의 DTO를 따른다.
 */
import { requestNoContent, request } from "./client";
import type { AuthTokens } from "../store/authStore";

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

// accessToken, expiresIn(액세스 토큰 유효 시간, 초), refreshToken(액세스 토큰이 만료되면 새 토큰을 받는 데 쓴다)
export type LoginResponse = AuthTokens;

// 실패: INVALID_INPUT(400), DUPLICATE_EMAIL(409)
export function signup(body: SignupRequest) {
  return request<SignupResponse>("/api/auth/signup", { method: "POST", body, auth: false });
}

// 실패: INVALID_INPUT(400), LOGIN_FAILED(401)
export function login(body: LoginRequest) {
  return request<LoginResponse>("/api/auth/login", { method: "POST", body, auth: false });
}

// 이 기기의 리프레시 토큰을 서버에서 지운다. 이미 쓸 수 없는 토큰이어도 성공(204)한다.
// 토큰 갱신(/api/auth/refresh)은 공통 요청 함수(client.ts)가 직접 부른다.
export function logout(refreshToken: string) {
  return requestNoContent("/api/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
}
