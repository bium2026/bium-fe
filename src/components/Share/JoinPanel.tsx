/*
 * 다른 사람에게 받은 초대 코드로 그 냉장고에 참여하는 영역이다.
 */
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import styled from "@emotion/styled";
import { getInviteCodeError, normalizeInviteCode } from "./shareFormat";
import { Feedback, Panel, PanelHeader, PrimaryButton } from "./shareStyles";

type JoinPanelProps = {
  // 성공하면 참여한 냉장고 이름을 돌려준다.
  onJoin: (code: string) => Promise<string>;
};

function JoinPanel({ onJoin }: JoinPanelProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const [value, setValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [joinedName, setJoinedName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const code = normalizeInviteCode(value);
  const inputError = getInviteCodeError(code);
  // 입력하는 중에는 안내를 띄우지 않고, 참여를 눌렀거나 칸을 벗어난 뒤에 보여 준다.
  const visibleInputError = isTouched ? inputError : "";
  const message = visibleInputError || errorMessage;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsTouched(true);
    if (inputError || isJoining) return;

    setIsJoining(true);
    setErrorMessage("");
    setJoinedName("");
    try {
      const name = await onJoin(code);
      setJoinedName(name);
      setValue("");
      setIsTouched(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "냉장고에 참여하지 못했어요.");
      // 코드를 고쳐 다시 넣을 수 있게 입력칸으로 돌아간다.
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Panel aria-labelledby="share-join-title">
      <PanelHeader>
        <h2 id="share-join-title">코드로 참여</h2>
        <p>가족이나 룸메이트에게 받은 초대 코드를 입력하면 그 냉장고를 같이 쓸 수 있어요.</p>
      </PanelHeader>

      <Form onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId}>초대 코드</label>
        <Row>
          <Input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setErrorMessage("");
            }}
            onBlur={() => value && setIsTouched(true)}
            placeholder="예: K7Q2-M9XA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            // 요청 중에도 포커스가 빠지지 않게 disabled 대신 읽기 전용으로 막는다.
            readOnly={isJoining}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            $invalid={Boolean(message)}
          />
          <PrimaryButton type="submit" aria-disabled={isJoining || undefined}>
            {isJoining ? "참여하는 중..." : "참여하기"}
          </PrimaryButton>
        </Row>
        {message && (
          <Feedback id={messageId} $error role="alert">
            {message}
          </Feedback>
        )}
        {joinedName && <Feedback role="status">‘{joinedName}’에 참여했어요.</Feedback>}
      </Form>
    </Panel>
  );
}

export default JoinPanel;

const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 540;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 420px) {
    flex-direction: column;
  }
`;

const Input = styled.input<{ $invalid: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 46px;
  border: 1px solid ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--border)")};
  border-radius: 8px;
  background: ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--surface)")};
  color: var(--text);
  padding: 10px 14px;
  font-size: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  outline-color: var(--text);

  &::placeholder {
    letter-spacing: 0;
    text-transform: none;
  }

  &:read-only {
    background: var(--surface-soft);
    cursor: wait;
  }
`;
