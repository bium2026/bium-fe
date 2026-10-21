/*
 * 아이디와 비밀번호로 로그인하는 폼이다.
 * 두 칸이 모두 채워져야 로그인 버튼이 활성화되고, 로그인하면 토큰을 저장한 뒤 냉장고 화면으로 이동한다.
 * 회원가입 직후에는 가입한 아이디를 채워 두고 가입 완료 안내를 보여 준다.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../../api/auth";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import AuthField from "./AuthField";
import AuthForm from "./AuthForm";

type LoginFormProps = {
  signedUpLoginId: string | null;
};

function getLoginErrorMessage(error: unknown) {
  // LOGIN_FAILED는 아이디가 없는 경우와 비밀번호가 틀린 경우를 구분하지 않는다.
  if (error instanceof ApiError && (error.code === "LOGIN_FAILED" || error.code === NETWORK_ERROR)) {
    return error.message;
  }
  return "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function LoginForm({ signedUpLoginId }: LoginFormProps) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loginId, setLoginId] = useState(signedUpLoginId ?? "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const canSubmit = loginId.trim() !== "" && password !== "" && !isSubmitting;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const { accessToken, expiresIn } = await login({ loginId: loginId.trim(), password });
      setAuth(accessToken, expiresIn);
      // 성공하면 화면을 떠나므로 버튼은 다시 켜지 않는다.
      navigate("/fridge", { replace: true });
    } catch (err) {
      setError(getLoginErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthForm
      submitLabel={isSubmitting ? "로그인하는 중..." : "로그인"}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      notice={signedUpLoginId ? "회원가입이 완료되었어요. 로그인해 주세요." : undefined}
      error={error}
    >
      <AuthField
        label="아이디"
        value={loginId}
        onChange={setLoginId}
        autoComplete="username"
        placeholder="아이디를 입력하세요"
        maxLength={20}
      />
      <AuthField
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        placeholder="비밀번호를 입력하세요"
        maxLength={20}
      />
    </AuthForm>
  );
}

export default LoginForm;
