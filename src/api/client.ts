/*
 * 서버 요청을 보내는 공통 함수다.
 * 백엔드 공통 응답({ success, data, error })에서 data만 꺼내 돌려주고, 실패하면 ApiError를 던진다.
 * 로그인 토큰을 Authorization 헤더에 담고, 토큰이 만료돼 401을 받으면 저장된 토큰을 지운다.
 * 토큰이 지워지면 RequireAuth가 로그인 화면으로 보낸다.
 */
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

// 서버에 닿지 못해 응답 자체가 없을 때 쓰는 코드다. 서버의 ErrorCode와 겹치지 않는다.
export const NETWORK_ERROR = "NETWORK_ERROR";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: { code: string; message: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  // 로그인·회원가입처럼 토큰 없이 부르는 API는 false로 둔다. 이때 401은 만료가 아니라 요청 실패다.
  auth?: boolean;
};

async function send(path: string, { method = "GET", body, auth = true }: RequestOptions) {
  const token = auth ? useAuthStore.getState().accessToken : null;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, token };
  } catch {
    throw new ApiError(
      0,
      NETWORK_ERROR,
      "서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
    );
  }
}

async function readData<T>(response: Response, token: string | null): Promise<T> {
  // 프록시 오류 페이지처럼 JSON이 아닌 응답이 올 수 있어 읽지 못하면 null로 둔다.
  const result: ApiResponse<T> | null = await response.json().catch(() => null);

  if (response.status === 401 && token) {
    useAuthStore.getState().clearAuth();
  }

  // 본문이 성공처럼 보여도 HTTP 상태가 실패면 실패로 본다.
  if (!response.ok || !result?.success) {
    throw new ApiError(
      response.status,
      result?.error?.code ?? "UNKNOWN_ERROR",
      result?.error?.message ?? "요청을 처리하지 못했어요.",
    );
  }

  return result.data;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { response, token } = await send(path, options);
  return readData<T>(response, token);
}

// 삭제처럼 성공하면 본문 없이 204를 주는 API에 쓴다. 실패 응답은 request와 같이 ApiError로 던진다.
export async function requestNoContent(path: string, options: RequestOptions = {}): Promise<void> {
  const { response, token } = await send(path, options);
  if (response.status === 204) return;
  await readData<unknown>(response, token);
}
