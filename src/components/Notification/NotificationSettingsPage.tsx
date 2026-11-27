/*
 * 유통기한 알림 설정 화면이다. 받을 이메일, 알림 켜기, 보낼 시각, D-3·D-day 알림을 정하고 테스트 메일을 보내 본다.
 * 메일은 서버가 정한 시각에 내가 속한 모든 냉장고의 재료를 모아 하루 한 번 보낸다.
 */
import { useEffect, useId, useState, type FormEvent } from "react";
import styled from "@emotion/styled";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import {
  getNotificationSetting,
  saveNotificationSetting,
  sendTestMail,
  type NotificationSetting,
  type NotificationSettingRequest,
} from "../../api/notification";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; saved: NotificationSetting };

type Message = { text: string; error: boolean };

// 06:00부터 22:00까지 30분 간격
const notifyTimes = Array.from({ length: 33 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 서버 문구가 무엇이 문제인지 알려 주는 오류는 그대로 보여 준다.
const serverMessageCodes = ["INVALID_INPUT", "NOTIFICATION_EMAIL_REQUIRED", "NOTIFICATION_TIMING_REQUIRED", "NOTIFICATION_MAIL_FAILED", NETWORK_ERROR];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && serverMessageCodes.includes(error.code)) return error.message;
  return fallback;
}

function toForm(setting: NotificationSetting): NotificationSettingRequest {
  return {
    email: setting.email ?? "",
    enabled: setting.enabled,
    notifyTime: setting.notifyTime,
    notifyD3: setting.notifyD3,
    notifyDday: setting.notifyDday,
  };
}

function formatDate(value: string) {
  const [, month, day] = value.split("-").map(Number);
  return `${month}월 ${day}일`;
}

function NotificationSettingsPage() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    getNotificationSetting().then(
      (saved) => {
        if (!ignore) setLoad({ status: "success", saved });
      },
      (error: unknown) => {
        if (!ignore) {
          setLoad({ status: "error", message: getErrorMessage(error, "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.") });
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [attempt]);

  return (
    <Wrapper>
      <BackLink to="/fridge">
        <ArrowLeft size={18} aria-hidden="true" />내 냉장고
      </BackLink>
      <Hero>
        <h1>유통기한 알림</h1>
        <p>유통기한이 오늘이거나 3일 남은 재료를 정한 시각에 이메일로 알려 드려요. 내가 속한 모든 냉장고의 재료를 모아 하루 한 번 보내요.</p>
      </Hero>

      {load.status === "loading" && <Skeleton aria-busy="true" aria-label="알림 설정을 불러오는 중이에요." />}
      {load.status === "error" && (
        <StatusBox role="alert">
          <strong>알림 설정을 불러오지 못했어요.</strong>
          <p>{load.message}</p>
          <OutlineButton
            type="button"
            onClick={() => {
              setLoad({ status: "loading" });
              setAttempt((prev) => prev + 1);
            }}
          >
            다시 시도
          </OutlineButton>
        </StatusBox>
      )}
      {load.status === "success" && (
        <SettingsForm saved={load.saved} onSaved={(saved) => setLoad({ status: "success", saved })} />
      )}
    </Wrapper>
  );
}

export default NotificationSettingsPage;

type SettingsFormProps = {
  saved: NotificationSetting;
  onSaved: (saved: NotificationSetting) => void;
};

function SettingsForm({ saved, onSaved }: SettingsFormProps) {
  const id = useId();
  const [form, setForm] = useState<NotificationSettingRequest>(() => toForm(saved));
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const email = (form.email ?? "").trim();
  const emailError = !email
    ? form.enabled
      ? "알림을 받을 이메일을 입력해 주세요."
      : ""
    : EMAIL_PATTERN.test(email)
      ? ""
      : "이메일 형식이 올바르지 않아요.";
  // 알림을 켜고 알릴 재료를 하나도 고르지 않으면 보낼 메일이 없다.
  const timingError = form.enabled && !form.notifyD3 && !form.notifyDday ? "알릴 재료를 하나 이상 골라 주세요." : "";
  const isDirty = JSON.stringify({ ...form, email }) !== JSON.stringify({ ...toForm(saved), email: saved.email ?? "" });

  const change = (patch: Partial<NotificationSettingRequest>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    if (emailError) {
      setShowErrors(true);
      document.getElementById(`${id}-email`)?.focus();
      return;
    }
    if (timingError) {
      document.getElementById(`${id}-dday`)?.focus();
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await saveNotificationSetting({ ...form, email: email || null });
      onSaved(result);
      setForm(toForm(result));
      setShowErrors(false);
      setMessage({
        text: result.enabled ? `저장했어요. 매일 ${result.notifyTime}에 알릴 재료가 있으면 메일을 보내요.` : "저장했어요. 알림을 보내지 않아요.",
        error: false,
      });
    } catch (error) {
      setMessage({ text: getErrorMessage(error, "저장하지 못했어요. 잠시 후 다시 시도해 주세요."), error: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (isTesting || isDirty || !saved.email) return;
    setIsTesting(true);
    setMessage(null);
    try {
      const result = await sendTestMail();
      setMessage({
        text: `${result.sentTo}로 테스트 메일을 보냈어요. ${result.itemCount > 0 ? `지금 알릴 재료 ${result.itemCount}개를 담았어요.` : "지금은 알릴 재료가 없어 안내만 담았어요."}`,
        error: false,
      });
    } catch (error) {
      setMessage({ text: getErrorMessage(error, "테스트 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요."), error: true });
    } finally {
      setIsTesting(false);
    }
  };

  const testHint = !saved.email ? "이메일을 저장하면 보낼 수 있어요." : isDirty ? "바꾼 내용을 먼저 저장해 주세요." : "";

  return (
    <Card onSubmit={handleSubmit} noValidate aria-labelledby={`${id}-title`}>
      <CardTitle id={`${id}-title`}>
        <Mail size={20} aria-hidden="true" />
        이메일 알림
      </CardTitle>

      <Field>
        <label htmlFor={`${id}-email`}>받을 이메일</label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          placeholder="예: bium@example.com"
          value={form.email ?? ""}
          aria-invalid={showErrors && !!emailError}
          aria-describedby={`${id}-email-hint`}
          disabled={isSaving}
          onChange={(event) => change({ email: event.target.value })}
        />
        <Hint id={`${id}-email-hint`} $error={showErrors && !!emailError}>
          {showErrors && emailError ? emailError : "알림을 켜려면 받을 이메일이 필요해요."}
        </Hint>
      </Field>

      <ToggleRow>
        <ToggleLabel>
          <ToggleInput
            type="checkbox"
            checked={form.enabled}
            disabled={isSaving}
            onChange={(event) => change({ enabled: event.target.checked })}
          />
          <ToggleTrack aria-hidden="true" $on={form.enabled} />
          알림 받기
        </ToggleLabel>
      </ToggleRow>

      <Fieldset disabled={!form.enabled || isSaving}>
        <legend className="sr-only">보낼 시각과 알릴 재료</legend>
        <Field>
          <label htmlFor={`${id}-time`}>보낼 시각</label>
          <select id={`${id}-time`} value={form.notifyTime} onChange={(event) => change({ notifyTime: event.target.value })}>
            {/* 다른 화면이나 이전 설정에서 고른 시각이 목록에 없어도 그대로 보여 준다. */}
            {!notifyTimes.includes(form.notifyTime) && <option value={form.notifyTime}>{form.notifyTime}</option>}
            {notifyTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </Field>

        <Checks role="group" aria-label="알릴 재료" aria-describedby={timingError ? `${id}-timing-hint` : undefined}>
          <CheckLabel $on={form.notifyDday}>
            <input id={`${id}-dday`} type="checkbox" checked={form.notifyDday} onChange={(event) => change({ notifyDday: event.target.checked })} />
            오늘까지인 재료 (D-day)
          </CheckLabel>
          <CheckLabel $on={form.notifyD3}>
            <input type="checkbox" checked={form.notifyD3} onChange={(event) => change({ notifyD3: event.target.checked })} />
            3일 남은 재료 (D-3)
          </CheckLabel>
        </Checks>
        {timingError && (
          <Hint id={`${id}-timing-hint`} $error>
            {timingError}
          </Hint>
        )}
      </Fieldset>

      {saved.lastSentDate && <LastSent>마지막으로 보낸 날: {formatDate(saved.lastSentDate)}</LastSent>}

      {message && (
        <Feedback role={message.error ? "alert" : "status"} $error={message.error}>
          {message.text}
        </Feedback>
      )}

      <Actions>
        <PrimaryButton type="submit" aria-disabled={isSaving || !isDirty} disabled={!isDirty && !isSaving}>
          {isSaving ? "저장하는 중" : "저장"}
        </PrimaryButton>
        <OutlineButton
          type="button"
          aria-disabled={isTesting || isDirty || !saved.email}
          aria-describedby={testHint ? `${id}-test-hint` : undefined}
          onClick={handleTest}
        >
          {isTesting ? "보내는 중" : "테스트 메일 보내기"}
        </OutlineButton>
        {testHint && <Hint id={`${id}-test-hint`}>{testHint}</Hint>}
      </Actions>
    </Card>
  );
}

const Wrapper = styled.section`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 24px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const Hero = styled.header`
  border-radius: 24px;
  background: var(--block-cream);
  padding: 28px;
  display: grid;
  gap: 10px;

  h1 {
    font-size: clamp(28px, 4.4vw, 40px);
    line-height: 1.15;
    font-weight: 540;
    letter-spacing: -0.4px;
  }

  p {
    font-size: 15px;
    font-weight: 330;
    line-height: 1.55;
  }

  @media (max-width: 760px) {
    border-radius: 0;
    margin-inline: -12px;
    padding: 22px 20px;
  }
`;

const Skeleton = styled.div`
  height: 420px;
  border-radius: 24px;
  background: var(--surface-soft);
`;

const StatusBox = styled.div`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  justify-items: start;
  gap: 10px;

  strong {
    font-size: 22px;
    font-weight: 700;
  }
`;

const Card = styled.form`
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  padding: 28px;
  display: grid;
  gap: 20px;

  @media (max-width: 760px) {
    padding: 20px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

const CardTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 540;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;

  label {
    font-size: 15px;
    font-weight: 540;
  }

  input,
  select {
    /* 입력칸 기본 너비가 카드보다 넓어 좁은 화면에서 카드 밖으로 나가지 않게 칸 너비에 맞춘다. */
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 10px 14px;
    font-size: 16px;
  }

  input[aria-invalid="true"] {
    border-color: var(--text);
    box-shadow: inset 0 0 0 1px var(--text);
  }

  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 1px;
  }
`;

const Hint = styled.p<{ $error?: boolean }>`
  font-size: 13px;
  font-weight: ${(props) => (props.$error ? 540 : 330)};
`;

const ToggleRow = styled.div`
  display: flex;
`;

// 레시피 화면의 '임박 재료 우선 사용' 토글과 같은 모양이다.
const ToggleLabel = styled.label`
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 50px;
  padding: 6px 16px 6px 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;
`;

const ToggleInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;

  &:focus-visible + span {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: ${(props) => (props.$on ? "var(--text)" : "var(--border)")};
  position: relative;

  &::after {
    content: "";
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--surface);
    position: absolute;
    top: 3px;
    left: ${(props) => (props.$on ? "21px" : "3px")};
  }
`;

const Fieldset = styled.fieldset`
  border: 0;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;

  &:disabled {
    opacity: 0.45;
  }
`;

const Checks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CheckLabel = styled.label<{ $on: boolean }>`
  min-height: 42px;
  border: 1px solid ${(props) => (props.$on ? "var(--text)" : "var(--border)")};
  border-radius: 50px;
  background: ${(props) => (props.$on ? "var(--block-lime)" : "var(--surface)")};
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: var(--text);
  }
`;

const LastSent = styled.p`
  font-size: 14px;
  font-weight: 330;
`;

const Feedback = styled.p<{ $error: boolean }>`
  border-radius: 8px;
  background: ${(props) => (props.$error ? "var(--block-pink)" : "var(--block-mint)")};
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
`;

const buttonBase = `
  min-height: 44px;
  border-radius: 50px;
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &:disabled,
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const PrimaryButton = styled.button`
  ${buttonBase}
  border: 0;
  background: var(--text);
  color: var(--surface);
`;

const OutlineButton = styled.button`
  ${buttonBase}
  border: 1px solid var(--text);
  background: var(--surface);
  color: var(--text);
`;
