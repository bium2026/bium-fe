/*
 * 다른 사람에게 받은 초대 코드로 그 냉장고에 참여하는 모달이다.
 * 지금 보고 있는 냉장고와 상관없는 일이라 헤더의 냉장고 목록에서 연다.
 * 참여하면 '보러 가기'로 그 냉장고로 바꿔 볼 수 있다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent, RefObject, SyntheticEvent } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { X } from "lucide-react";
import type { Fridge } from "../../api/fridge";
import { getInviteCodeError, normalizeInviteCode } from "./shareFormat";
import { Feedback, OutlineButton, PrimaryButton } from "./shareStyles";

type JoinFridgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<Fridge>;
  onOpenFridge: (fridge: Fridge) => void;
  // 모달을 연 버튼이 닫힐 때 사라져 있으면, 브라우저 대신 포커스를 돌려줄 곳
  returnFocusRef: RefObject<HTMLElement | null>;
};

function JoinFridgeModal({ isOpen, onClose, onJoin, onOpenFridge, returnFocusRef }: JoinFridgeModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isJoining, setIsJoining] = useState(false);

  // showModal()로 열어야 Esc 닫기, 바깥 화면 조작 막기, 포커스 가두기를 브라우저가 처리해 준다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      // showModal()은 첫 번째 버튼(닫기)에 포커스를 주므로, 바로 입력할 수 있게 코드 칸으로 옮긴다.
      dialog.querySelector("input")?.focus();
    }
    if (!isOpen && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus();
    }
  }, [isOpen, returnFocusRef]);

  const requestClose = () => {
    if (!isJoining) onClose();
  };

  // Esc를 누르면 브라우저가 바로 닫으려 하므로, 막고 나서 상태를 통해 닫는다.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    requestClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) requestClose();
  };

  return (
    <Dialog ref={dialogRef} aria-labelledby={titleId} onCancel={handleCancel} onClick={handleBackdropClick}>
      {/* 열 때마다 입력값과 결과를 처음부터 다시 채운다. */}
      {isOpen && (
        <JoinForm
          titleId={titleId}
          isJoining={isJoining}
          onJoiningChange={setIsJoining}
          onClose={requestClose}
          onJoin={onJoin}
          onOpenFridge={onOpenFridge}
        />
      )}
    </Dialog>
  );
}

export default JoinFridgeModal;

type JoinFormProps = {
  titleId: string;
  isJoining: boolean;
  onJoiningChange: (isJoining: boolean) => void;
  onClose: () => void;
  onJoin: (code: string) => Promise<Fridge>;
  onOpenFridge: (fridge: Fridge) => void;
};

function JoinForm({ titleId, isJoining, onJoiningChange, onClose, onJoin, onOpenFridge }: JoinFormProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const [value, setValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [joinedFridge, setJoinedFridge] = useState<Fridge | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const code = normalizeInviteCode(value);
  const inputError = getInviteCodeError(code);
  // 입력하는 중에는 안내를 띄우지 않고, 참여를 눌렀거나 칸을 벗어난 뒤에 보여 준다.
  const message = (isTouched ? inputError : "") || errorMessage;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsTouched(true);
    if (inputError || isJoining) return;

    onJoiningChange(true);
    setErrorMessage("");
    try {
      setJoinedFridge(await onJoin(code));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "냉장고에 참여하지 못했어요.");
      // 코드를 고쳐 다시 넣을 수 있게 입력칸으로 돌아간다.
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      onJoiningChange(false);
    }
  };

  return (
    <Card>
      <Header>
        <h2 id={titleId}>초대 코드로 참여</h2>
        <CloseButton type="button" onClick={onClose} aria-label="닫기" aria-disabled={isJoining || undefined}>
          <X size={18} aria-hidden="true" />
        </CloseButton>
      </Header>

      {joinedFridge ? (
        <Done>
          <Feedback role="status">‘{joinedFridge.name}’에 참여했어요. 이제 헤더에서 이 냉장고로 바꿔 볼 수 있어요.</Feedback>
          <Buttons>
            <OutlineButton type="button" onClick={onClose}>
              닫기
            </OutlineButton>
            <PrimaryButton type="button" onClick={() => onOpenFridge(joinedFridge)} autoFocus>
              보러 가기
            </PrimaryButton>
          </Buttons>
        </Done>
      ) : (
        <Form onSubmit={handleSubmit} noValidate>
          <Description>가족이나 룸메이트에게 받은 초대 코드를 입력하면 그 냉장고를 같이 쓸 수 있어요.</Description>
          <label htmlFor={inputId}>초대 코드</label>
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
          {message && (
            <Feedback id={messageId} $error role="alert">
              {message}
            </Feedback>
          )}
          <Buttons>
            <OutlineButton type="button" onClick={onClose} aria-disabled={isJoining || undefined}>
              취소
            </OutlineButton>
            <PrimaryButton type="submit" aria-disabled={isJoining || undefined}>
              {isJoining ? "참여하는 중..." : "참여하기"}
            </PrimaryButton>
          </Buttons>
        </Form>
      )}
    </Card>
  );
}

const popIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Dialog = styled.dialog`
  width: min(420px, calc(100% - 32px));
  max-width: none;
  max-height: calc(100% - 32px);
  margin: auto;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text);
  overflow: visible;

  &::backdrop {
    background: color-mix(in srgb, var(--text) 55%, transparent);
  }

  &[open] {
    animation: ${popIn} 0.24s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    &[open] {
      animation: none;
    }
  }
`;

const Card = styled.div`
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    font-size: 22px;
    font-weight: 540;
    letter-spacing: -0.26px;
  }
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--surface-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;

  label {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 540;
  }
`;

const Description = styled.p`
  font-size: 14px;
  font-weight: 330;
  line-height: 1.5;
`;

const Input = styled.input<{ $invalid: boolean }>`
  min-height: 48px;
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

const Done = styled.div`
  display: grid;
  gap: 16px;
`;

const Buttons = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
