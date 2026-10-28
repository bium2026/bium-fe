/*
 * 냉장고 화면과 영수증 모달이 함께 쓰는 영수증 사진 검사와 읽기 요청이다.
 * 컴포넌트 파일에서 함수를 함께 내보내면 Fast Refresh가 동작하지 않아 따로 둔다.
 */
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { getMyFridge } from "../../api/fridge";
import { scanReceipt, type ScannedReceiptItem } from "../../api/receipt";

// 서버가 받는 사진 형식·크기와 같다.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const HEIC_EXTENSIONS = ["heic", "heif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// HEIC 형식을 모르는 브라우저에서도 사진 고르기 창에 HEIC 파일이 보이도록 확장자를 함께 적는다.
export const RECEIPT_IMAGE_ACCEPT = [...IMAGE_TYPES, ...HEIC_EXTENSIONS.map((extension) => `.${extension}`)].join(",");

export type ReceiptScanResult =
  | { status: "error"; message: string }
  | { status: "done"; fridgeId: number; items: ScannedReceiptItem[] };

// 모달은 id가 바뀔 때마다 처음(읽는 중) 상태로 다시 그린다.
export type ReceiptScan = {
  id: number;
  result: Promise<ReceiptScanResult>;
};

const serverMessageCodes = [
  "INVALID_RECEIPT_IMAGE",
  "IMAGE_TOO_LARGE",
  "FRIDGE_NOT_FOUND",
  "TOO_MANY_REQUESTS",
  "RECEIPT_SCAN_FAILED",
  NETWORK_ERROR,
];

let nextScanId = 1;

function getScanErrorMessage(error: unknown) {
  // 서버가 보낸 문구로 무엇이 문제인지(사진 형식·크기, 요청 한도, 읽기 실패) 알려 준다.
  if (error instanceof ApiError && serverMessageCodes.includes(error.code)) return error.message;
  return "영수증을 읽지 못했어요. 잠시 후 다시 시도해 주세요.";
}

// 서버의 크기 제한을 크게 넘으면 오류 응답 없이 연결이 끊길 수 있어 보내기 전에 거른다.
function getImageError(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return "JPG, PNG, WEBP, HEIC 사진만 올릴 수 있어요.";
  if (file.size > MAX_IMAGE_BYTES) return "사진은 10MB까지 올릴 수 있어요.";
  return "";
}

// 일부 브라우저는 HEIC·HEIF 사진의 형식(type)을 비워 두므로 확장자로 채운다.
// 서버도 형식으로 사진을 거르기 때문에 채운 파일을 그대로 보낸다.
function withImageType(file: File) {
  if (file.type) return file;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!HEIC_EXTENSIONS.includes(extension)) return file;
  return new File([file], file.name, { type: `image/${extension}`, lastModified: file.lastModified });
}

async function readReceipt(original: File): Promise<ReceiptScanResult> {
  const file = withImageType(original);
  const imageError = getImageError(file);
  if (imageError) return { status: "error", message: imageError };

  try {
    const fridge = await getMyFridge();
    if (!fridge) return { status: "error", message: "연결된 냉장고가 없어요." };
    const items = await scanReceipt(fridge.id, file);
    return { status: "done", fridgeId: fridge.id, items };
  } catch (error) {
    return { status: "error", message: getScanErrorMessage(error) };
  }
}

// 사진을 고른 이벤트에서 바로 요청을 보낸다. 모달의 effect에서 보내면 Strict Mode에서 AI를 두 번 부른다.
// 실패해도 던지지 않고 모달이 보여 줄 결과로 바꿔 돌려준다.
export function startReceiptScan(file: File): ReceiptScan {
  return { id: nextScanId++, result: readReceipt(file) };
}
