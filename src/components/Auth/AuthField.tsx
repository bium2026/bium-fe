/*
 * 로그인·회원가입 폼에서 쓰는 입력 칸이다.
 * 라벨, 안내 문구, 오류 메시지를 함께 보여 주고 비밀번호는 보기/숨기기를 지원한다.
 */
import { useId, useState } from "react";
import styled from "@emotion/styled";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

type AuthFieldProps = {
  label: string;
  type?: "text" | "password";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete: string;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  error?: string;
};

function AuthField({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
  maxLength,
  hint,
  error,
}: AuthFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = type === "password";
  const message = error ?? hint;

  return (
    <Wrapper>
      <Label htmlFor={id}>{label}</Label>

      <InputBox>
        <Input
          id={id}
          type={isPassword && !isPasswordVisible ? "password" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          // 모바일 키보드가 첫 글자를 대문자로 바꾸면 아이디 형식 검사에서 걸린다.
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          $hasToggle={isPassword}
          $invalid={Boolean(error)}
        />

        {isPassword && (
          <ToggleButton
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </ToggleButton>
        )}
      </InputBox>

      {message && (
        <Message id={messageId} $error={Boolean(error)}>
          {error && <CircleAlert size={14} aria-hidden="true" />}
          {message}
        </Message>
      )}
    </Wrapper>
  );
}

export default AuthField;

const Wrapper = styled.div`
  display: grid;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 540;
  color: var(--text);
`;

const InputBox = styled.div`
  position: relative;
`;

const Input = styled.input<{ $hasToggle: boolean; $invalid: boolean }>`
  width: 100%;
  min-height: 48px;
  border: 1px solid ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--border)")};
  border-radius: 8px;
  padding: 12px ${(props) => (props.$hasToggle ? "48px" : "14px")} 12px 14px;
  font-size: 16px;
  color: var(--text);
  background: ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--surface)")};
  outline-color: var(--text);
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--surface-soft);
  }
`;

const Message = styled.p<{ $error: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: ${(props) => (props.$error ? 540 : 330)};
  color: var(--text-muted);

  svg {
    flex-shrink: 0;
  }
`;
