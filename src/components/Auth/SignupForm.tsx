/*
 * 이메일, 비밀번호, 닉네임으로 가입하는 폼이다.
 * 입력 칸을 벗어나거나 가입 버튼을 누르면 형식을 검사해 칸 아래에 알려 준다.
 * 가입에 성공하면 onSuccess로 가입한 이메일을 넘겨 로그인 폼으로 보낸다.
 */
import { useState } from "react";
import { signup } from "../../api/auth";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import AuthField from "./AuthField";
import AuthForm from "./AuthForm";

type SignupValues = {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
};

type SignupField = keyof SignupValues;

type SignupErrors = Partial<Record<SignupField, string>>;

type SignupFormProps = {
  onSuccess: (email: string) => void;
};

const initialValues: SignupValues = {
  email: "",
  password: "",
  passwordConfirm: "",
  nickname: "",
};

// 백엔드 SignupRequest의 검증 규칙과 같다. 서버 규칙이 바뀌면 함께 바꾼다.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)\S{8,20}$/;
const NICKNAME_MIN_LENGTH = 2;
// 알림 설정 화면(NotificationSettingsPage)의 이메일 검사와 같다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "이메일 형식에 맞게 입력하세요.";
  }
  if (!PASSWORD_PATTERN.test(values.password)) {
    errors.password = "비밀번호는 영문과 숫자를 포함해 공백 없이 8~20자로 입력하세요.";
  }
  if (values.passwordConfirm !== values.password) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }
  if (values.nickname.trim().length < NICKNAME_MIN_LENGTH) {
    errors.nickname = "닉네임은 2~10자로 입력하세요.";
  }

  return errors;
}

function getSignupErrorMessage(error: unknown) {
  // INVALID_INPUT은 서버가 검증에 실패한 첫 번째 항목의 안내 문구를 보낸다.
  if (error instanceof ApiError && (error.code === "INVALID_INPUT" || error.code === NETWORK_ERROR)) {
    return error.message;
  }
  return "회원가입하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function SignupForm({ onSuccess }: SignupFormProps) {
  const [values, setValues] = useState<SignupValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  // 서버가 이미 가입했다고 알려 준 이메일이다. 이메일을 고치면 오류가 사라진다.
  const [takenEmail, setTakenEmail] = useState<string>();

  // 서버는 앞뒤 공백을 빼고 소문자로 바꿔 저장하므로 같은 값으로 보내고 비교한다.
  const email = values.email.trim().toLowerCase();
  const errors = validateSignup(values);
  if (!errors.email && email === takenEmail) {
    errors.email = "이미 가입한 이메일입니다.";
  }
  const canSubmit = Object.values(values).every((value) => value.trim() !== "") && !isSubmitting;

  const visibleError = (field: SignupField) =>
    submitted || touched[field] ? errors[field] : undefined;

  const changeField = (field: SignupField) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const touchField = (field: SignupField) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setError(undefined);
    try {
      await signup({
        email,
        password: values.password,
        // 닉네임 길이는 앞뒤 공백을 뺀 값으로 검사했으므로 같은 값을 보낸다.
        nickname: values.nickname.trim(),
      });
      onSuccess(email);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_EMAIL") {
        setTakenEmail(email);
      } else {
        setError(getSignupErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      submitLabel={isSubmitting ? "가입하는 중..." : "회원가입"}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      error={error}
    >
      <AuthField
        label="이메일"
        type="email"
        value={values.email}
        onChange={changeField("email")}
        onBlur={touchField("email")}
        autoComplete="email"
        placeholder="이메일을 입력하세요"
        maxLength={255}
        hint="로그인할 때 쓰고, 유통기한 알림도 이 주소로 받아요"
        error={visibleError("email")}
      />
      <AuthField
        label="비밀번호"
        type="password"
        value={values.password}
        onChange={changeField("password")}
        onBlur={touchField("password")}
        autoComplete="new-password"
        placeholder="비밀번호를 입력하세요"
        maxLength={20}
        hint="영문, 숫자 포함 8~20자"
        error={visibleError("password")}
      />
      <AuthField
        label="비밀번호 확인"
        type="password"
        value={values.passwordConfirm}
        onChange={changeField("passwordConfirm")}
        onBlur={touchField("passwordConfirm")}
        autoComplete="new-password"
        placeholder="비밀번호를 한 번 더 입력하세요"
        maxLength={20}
        error={visibleError("passwordConfirm")}
      />
      <AuthField
        label="닉네임"
        value={values.nickname}
        onChange={changeField("nickname")}
        onBlur={touchField("nickname")}
        autoComplete="nickname"
        placeholder="닉네임을 입력하세요"
        maxLength={10}
        hint="2~10자"
        error={visibleError("nickname")}
      />
    </AuthForm>
  );
}

export default SignupForm;
