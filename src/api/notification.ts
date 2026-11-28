/*
 * 유통기한 알림(이메일) 설정 API다.
 * 요청·응답 형식은 백엔드 NotificationSettingController의 DTO를 따른다.
 */
import { request } from "./client";

export type NotificationSetting = {
  // 알림을 받을 주소. 없으면 알림을 켜 두어도 보내지 않는다.
  email: string | null;
  enabled: boolean;
  // "HH:mm"
  notifyTime: string;
  // 유통기한이 3일 남은 재료를 알릴지
  notifyD3: boolean;
  // 유통기한이 오늘인 재료를 알릴지
  notifyDday: boolean;
  // 마지막으로 알림 메일을 보낸 날 "YYYY-MM-DD", 보낸 적이 없으면 null
  lastSentDate: string | null;
  // 마지막으로 보낸 뒤 알림 메일을 보내지 못한 때 "YYYY-MM-DDTHH:mm:ss", 그 뒤에 보냈거나 실패한 적이 없으면 null.
  // 보내지 못하면 서버가 그날 안에서 몇 번 더 보내 본다. 테스트 메일 실패는 담지 않는다.
  lastFailedAt: string | null;
};

export type NotificationSettingRequest = Omit<NotificationSetting, "lastSentDate" | "lastFailedAt">;

type NotificationTestResult = {
  sentTo: string;
  // 메일에 담은 D-3·D-day 재료 수
  itemCount: number;
};

// 저장한 적이 없으면 기본값(켜짐, 09:00, D-3·D-day)을 준다.
export function getNotificationSetting() {
  return request<NotificationSetting>("/api/notification-settings");
}

// email을 비우면(null) 받을 주소를 지운다. 알림을 켜면 notifyD3·notifyDday 중 하나는 true여야 한다.
// 실패: NOTIFICATION_EMAIL_REQUIRED·NOTIFICATION_TIMING_REQUIRED·INVALID_INPUT(400)
export function saveNotificationSetting(body: NotificationSettingRequest) {
  return request<NotificationSetting>("/api/notification-settings", { method: "PUT", body });
}

// 저장한 주소로 지금 기준 재료를 담은 테스트 메일을 보낸다.
// 실패: NOTIFICATION_EMAIL_REQUIRED(400), NOTIFICATION_MAIL_FAILED(502)
export function sendTestMail() {
  return request<NotificationTestResult>("/api/notification-settings/test-mail", { method: "POST" });
}
