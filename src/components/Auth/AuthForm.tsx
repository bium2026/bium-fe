/*
 * 로그인·회원가입 폼의 공통 틀이다.
 * 입력 칸 목록과 제출 버튼을 배치하고, 제출할 수 없는 상태면 버튼을 막는다.
 */
import type { FormEvent, ReactNode } from "react";
import styled from "@emotion/styled";

type AuthFormProps = {
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  children: ReactNode;
};

function AuthForm({ submitLabel, canSubmit, onSubmit, children }: AuthFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    // 브라우저 기본 검증 말풍선 대신 각 입력 칸 아래에 직접 메시지를 보여 준다.
    <Form noValidate onSubmit={handleSubmit}>
      {children}
      <SubmitButton type="submit" disabled={!canSubmit}>
        {submitLabel}
      </SubmitButton>
    </Form>
  );
}

export default AuthForm;

const Form = styled.form`
  display: grid;
  gap: 16px;
`;

const SubmitButton = styled.button`
  margin-top: 8px;
  min-height: 48px;
  border: 0;
  border-radius: 50px;
  background: var(--text);
  color: var(--surface);
  padding: 12px 18px;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }
`;
