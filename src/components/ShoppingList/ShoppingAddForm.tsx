/*
 * 장보기 목록에 재료 이름을 직접 넣어 담는 입력칸이다.
 * 앞뒤 공백을 지운 이름이 비었거나 50자를 넘으면 담기를 막고, 서버에 담긴 뒤 입력칸을 비운다.
 */
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import styled from "@emotion/styled";
import { Plus } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";

// 백엔드 검사(1~50자)와 같은 기준이다.
const NAME_MAX_LENGTH = 50;

type ShoppingAddFormProps = {
  onAdd: (name: string) => Promise<void>;
};

// 입력 오류와 연결 오류는 서버 문구가 무엇을 고칠지 알려 주므로 그대로 보여 준다.
// 줄바꿈·제어 문자처럼 입력칸에서 미리 막지 않는 규칙도 이 문구로 알린다.
// 입력 오류는 INVALID_INPUT 말고 BAD_REQUEST로도 와서 코드 대신 400으로 판단한다.
function getAddErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.status === 400 || error.code === NETWORK_ERROR)) {
    return error.message;
  }
  return "담지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function ShoppingAddForm({ onAdd }: ShoppingAddFormProps) {
  const messageId = useId();
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const name = value.trim();
  const isTooLong = name.length > NAME_MAX_LENGTH;
  const message = isTooLong ? `재료 이름은 ${NAME_MAX_LENGTH}자까지 쓸 수 있어요.` : errorMessage;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAdding || !name || isTooLong) return;
    setIsAdding(true);
    setErrorMessage("");
    try {
      await onAdd(name);
      setValue("");
      // 담기 버튼으로 담았으면 칸이 비면서 버튼이 잠겨 포커스를 잃으므로, 이어서 담을 수 있게 입력칸으로 옮긴다.
      inputRef.current?.focus();
    } catch (error) {
      setErrorMessage(getAddErrorMessage(error));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <InputRow>
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setErrorMessage("");
          }}
          placeholder="예: 대파, 두부"
          aria-label="담을 재료 이름"
          autoComplete="off"
          // 요청 중에도 포커스가 빠지지 않게 disabled 대신 읽기 전용으로 막는다.
          readOnly={isAdding}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          $invalid={Boolean(message)}
        />
        <AddButton type="submit" disabled={!name || isTooLong} aria-disabled={isAdding || undefined}>
          <Plus size={16} aria-hidden="true" />
          {isAdding ? "담는 중..." : "담기"}
        </AddButton>
      </InputRow>
      {message && (
        <ErrorMessage id={messageId} role="alert">
          {message}
        </ErrorMessage>
      )}
    </Form>
  );
}

export default ShoppingAddForm;

const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
`;

const Input = styled.input<{ $invalid: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 48px;
  border: 1px solid ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--border)")};
  border-radius: 8px;
  background: ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--surface)")};
  color: var(--text);
  padding: 10px 14px;
  font-size: 16px;
  font-weight: 330;

  &:read-only {
    background: var(--surface-soft);
    cursor: wait;
  }
`;

const AddButton = styled.button`
  flex-shrink: 0;
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  /* 요청 중에는 aria-disabled로 막아 눌렀던 버튼에서 포커스가 빠지지 않게 한다. */
  &:disabled,
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const ErrorMessage = styled.p`
  border-radius: 8px;
  background: var(--block-pink);
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
  word-break: keep-all;
`;
