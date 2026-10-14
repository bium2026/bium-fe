/*
 * 아이디, 비밀번호, 닉네임으로 가입하는 폼이다.
 * 입력 칸을 벗어나거나 가입 버튼을 누르면 형식을 검사해 칸 아래에 알려 준다.
 */
import { useState } from "react";
import AuthField from "./AuthField";
import AuthForm from "./AuthForm";

type SignupValues = {
  loginId: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
};

type SignupField = keyof SignupValues;

type SignupErrors = Partial<Record<SignupField, string>>;

const initialValues: SignupValues = {
  loginId: "",
  password: "",
  passwordConfirm: "",
  nickname: "",
};

// 서버의 아이디·비밀번호 규칙이 정해지기 전까지 쓰는 임시 형식이다.
const LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)\S{8,20}$/;
const NICKNAME_MIN_LENGTH = 2;

function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};

  if (!LOGIN_ID_PATTERN.test(values.loginId)) {
    errors.loginId = "아이디는 영문 소문자와 숫자 4~20자로 입력하세요.";
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

function SignupForm() {
  const [values, setValues] = useState<SignupValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validateSignup(values);
  const canSubmit = Object.values(values).every((value) => value.trim() !== "");

  const visibleError = (field: SignupField) =>
    submitted || touched[field] ? errors[field] : undefined;

  const changeField = (field: SignupField) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const touchField = (field: SignupField) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    // TODO: 회원가입 API 명세가 확정되면 서버 요청을 연결한다.
  };

  return (
    <AuthForm submitLabel="회원가입" canSubmit={canSubmit} onSubmit={handleSubmit}>
      <AuthField
        label="아이디"
        value={values.loginId}
        onChange={changeField("loginId")}
        onBlur={touchField("loginId")}
        autoComplete="username"
        placeholder="아이디를 입력하세요"
        maxLength={20}
        hint="영문 소문자, 숫자 4~20자"
        error={visibleError("loginId")}
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
