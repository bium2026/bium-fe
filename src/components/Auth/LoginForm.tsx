/*
 * 아이디와 비밀번호로 로그인하는 폼이다.
 * 두 칸이 모두 채워져야 로그인 버튼이 활성화된다.
 */
import { useState } from "react";
import AuthField from "./AuthField";
import AuthForm from "./AuthForm";

function LoginForm() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = loginId.trim() !== "" && password !== "";

  const handleSubmit = () => {
    // TODO: 로그인 API 명세가 확정되면 서버 요청과 토큰 저장을 연결한다.
  };

  return (
    <AuthForm submitLabel="로그인" canSubmit={canSubmit} onSubmit={handleSubmit}>
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
