/*
 * 서버 요청을 보내는 공통 함수다.
 * 백엔드 공통 응답({ success, data, error })에서 data만 꺼내 돌려주고, 실패하면 ApiError를 던진다.
 * 로그인 토큰을 Authorization 헤더에 담고, 토큰이 만료돼 401을 받으면 저장된 토큰을 지우고 만료로 표시한다.
 * 토큰이 지워지면 RequireAuth가 로그인 화면으로 보내고, 로그인 화면은 만료 안내를 보여 준다.
 * 냉장고를 찾지 못했다는 오류(FRIDGE_NOT_FOUND)를 받으면 받아 둔 냉장고 목록을 낡은 것으로 표시한다.
 */
import { useAuthStore } from "../store/authStore";
import { markFridgeListStale } from "../store/fridgeStore";

// 끝에 "/"를 붙여 적어도 "//api/..."가 되지 않게 뗀다. 서버(Spring Security)는 "//"가 든 주소를 400으로 막는다.
const API_URL = import.meta.env.VITE_API_URL.replace(/\/+$/, "");

// 백엔드를 ngrok 무료 주소로 열면 ngrok이 브라우저의 GET 요청에 CORS 헤더 없는 경고 페이지를 대신 돌려준다.
// 이 헤더가 있으면 경고 페이지 없이 서버로 넘겨 준다. 서버 CORS는 모든 요청 헤더를 허용한다.
const ngrokHeaders: Record<string, string> = /\.ngrok(-free)?\.(app|dev|io)(:\d+)?$/.test(API_URL)
  ? { "ngrok-skip-browser-warning": "true" }
  : {};

// 재료 사진처럼 서버가 "/api/..." 경로로 준 주소를 <img src>에 쓸 수 있게 서버 주소를 붙인다.
export function toServerUrl(path: string) {
  return `${API_URL}${path}`;
}

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
  // 사진처럼 FormData로 보내는 요청은 브라우저가 경계값(boundary)이 든 Content-Type을 직접 붙이므로 그대로 넘긴다.
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = { ...ngrokHeaders };
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined || isFormData ? body : JSON.stringify(body),
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
    useAuthStore.getState().expireAuth();
  }

  // 멤버가 아닌 냉장고도 서버가 이 오류로 거절한다. 그사이 내보내졌거나 다른 기기에서 나갔을 수 있어
  // 다음 getMyFridge()가 냉장고 목록부터 다시 받게 한다. 어느 화면에서 받았든 같은 곳에서 표시해 화면마다 처리하지 않는다.
  if (result?.error?.code === "FRIDGE_NOT_FOUND") markFridgeListStale();

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
