/*
 * 계정 화면의 내 정보 카드다. 로그인 이메일을 보여 주고 닉네임을 바꾼다.
 * 닉네임은 가입 때와 같이 앞뒤 공백을 빼고 2~10자여야 한다. 가입 때 닉네임으로 지은 냉장고 이름은 그대로 남는다.
 */
import { useId, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { changeNickname, type MyProfile } from "../../api/user";
import { useProfileStore } from "../../store/profileStore";
import { Actions, Card, CardHeader, Feedback, Field, Hint, PrimaryButton } from "./accountStyles";

// 백엔드 SignupRequest의 닉네임 규칙과 같다. 서버 규칙이 바뀌면 함께 바꾼다.
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;

type Message = { text: string; error: boolean };

type ProfileFormProps = {
  profile: MyProfile;
};

function getNicknameError(nickname: string) {
  if (!nickname) return "닉네임을 입력해 주세요.";
  if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) return "닉네임은 2~10자로 입력해 주세요.";
  return "";
}

function getErrorMessage(error: unknown) {
  // INVALID_INPUT은 서버가 검증에 실패한 항목의 안내 문구를 보낸다.
  if (error instanceof ApiError && (error.code === "INVALID_INPUT" || error.code === NETWORK_ERROR)) return error.message;
  return "닉네임을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function ProfileForm({ profile }: ProfileFormProps) {
  const id = useId();
  const setProfile = useProfileStore((state) => state.setProfile);
  const [nickname, setNickname] = useState(profile.nickname);
  const [isSaving, setIsSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const trimmed = nickname.trim();
  const nicknameError = getNicknameError(trimmed);
  const isDirty = trimmed !== profile.nickname;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !isDirty) return;
    if (nicknameError) {
      setShowError(true);
      document.getElementById(`${id}-nickname`)?.focus();
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await changeNickname(trimmed);
      setProfile(result);
      setNickname(result.nickname);
      setShowError(false);
      setMessage({ text: `닉네임을 ${result.nickname}(으)로 바꿨어요.`, error: false });
    } catch (error) {
      setMessage({ text: getErrorMessage(error), error: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card onSubmit={handleSubmit} noValidate aria-labelledby={`${id}-title`}>
      <CardHeader>
        <h2 id={`${id}-title`}>
          <UserRound size={20} aria-hidden="true" />내 정보
        </h2>
        <p>닉네임은 냉장고 멤버 목록과 피드 코멘트에 보여요. 가입할 때 지은 냉장고 이름은 바뀌지 않아요.</p>
      </CardHeader>

      <Field>
        <label htmlFor={`${id}-email`}>이메일</label>
        <input id={`${id}-email`} type="email" value={profile.email ?? "등록한 이메일이 없어요"} readOnly />
        <Hint>로그인할 때 쓰는 이메일은 바꿀 수 없어요.</Hint>
      </Field>

      <Field>
        <label htmlFor={`${id}-nickname`}>닉네임</label>
        <input
          id={`${id}-nickname`}
          type="text"
          autoComplete="nickname"
          maxLength={NICKNAME_MAX_LENGTH}
          value={nickname}
          aria-invalid={showError && !!nicknameError}
          aria-describedby={`${id}-nickname-hint`}
          disabled={isSaving}
          onChange={(event) => {
            setNickname(event.target.value);
            setMessage(null);
          }}
          onBlur={() => setShowError(true)}
        />
        <Hint id={`${id}-nickname-hint`} $error={showError && !!nicknameError}>
          {showError && nicknameError ? nicknameError : "2~10자로 입력해 주세요."}
        </Hint>
      </Field>

      {message && (
        <Feedback role={message.error ? "alert" : "status"} $error={message.error}>
          {message.text}
        </Feedback>
      )}

      <Actions>
        <PrimaryButton type="submit" aria-disabled={isSaving || !isDirty} disabled={!isDirty && !isSaving}>
          {isSaving ? "바꾸는 중" : "닉네임 바꾸기"}
        </PrimaryButton>
      </Actions>
    </Card>
  );
}

export default ProfileForm;
