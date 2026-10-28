/*
 * 영수증 사진을 AI로 읽어 냉장고에 넣을 재료 후보를 받는 API다.
 * 요청·응답 형식은 백엔드 ReceiptScanController의 DTO를 따른다.
 * 읽기만 하고 저장하지 않으므로, 사용자가 고친 뒤 addFridgeItems로 넣는다.
 */
import { request } from "./client";
import type { StorageType } from "./fridge";

// AI가 추측한 값이라 아이콘·유통기한을 정하지 못하면 null로 온다.
export type ScannedReceiptItem = {
  name: string;
  emoji: string | null;
  storage: StorageType;
  // "YYYY-MM-DD", 오늘부터 AI가 추측한 보관 기간을 더한 날
  expiresAt: string | null;
};

type ReceiptScanResponse = {
  items: ScannedReceiptItem[];
};

// 사진은 JPG·PNG·WEBP·HEIC·HEIF, 10MB까지 받는다. 식재료를 못 찾으면 빈 배열이 온다.
// 실패: INVALID_RECEIPT_IMAGE(400), IMAGE_TOO_LARGE(413), FRIDGE_NOT_FOUND(404), TOO_MANY_REQUESTS(429),
//       RECEIPT_SCAN_FAILED(502), AI_QUOTA_EXCEEDED(503)
export async function scanReceipt(fridgeId: number, image: File) {
  const body = new FormData();
  body.append("image", image);
  const { items } = await request<ReceiptScanResponse>(`/api/fridges/${fridgeId}/receipt-scans`, {
    method: "POST",
    body,
  });
  return items;
}
