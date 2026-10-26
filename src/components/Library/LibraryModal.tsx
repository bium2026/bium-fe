/*
 * 식재료 도감 화면의 모달 틀과 입력 칸이다. 새 재료 추가 모달과 냉장고에 넣기 모달이 함께 쓴다.
 * showModal()로 열어 Esc 닫기·바깥 화면 조작 막기·포커스 가두기를 브라우저에 맡기고, 요청 중(busy)에는 닫히지 않게 한다.
 * 닫혀 있을 때는 내용을 그리지 않아서, 다시 열면 입력값이 처음부터 시작된다.
 */
import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode, SyntheticEvent } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert, X } from "lucide-react";
import { ModalFieldWrapper, ModalLabel } from "./libraryModalStyles";

type LibraryModalProps = {
  open: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
};

function LibraryModal({ open, title, busy, onClose, children }: LibraryModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // showModal()은 첫 번째 버튼(닫기)에 포커스를 주므로, 바로 입력할 수 있게 첫 입력 칸으로 옮긴다.
      dialog.querySelector("input")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestClose = () => {
    if (!busy) onClose();
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
      {open && (
        <Card>
          <Header>
            <Heading id={titleId}>{title}</Heading>
            <CloseButton type="button" onClick={requestClose} disabled={busy} aria-label="닫기">
              <X size={18} />
            </CloseButton>
          </Header>
          {children}
        </Card>
      )}
    </Dialog>
  );
}

export default LibraryModal;

type ModalFieldProps = {
  id: string;
  label: string;
  type?: "text" | "number";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  disabled: boolean;
  error: string;
  hint?: string;
};

export function ModalField({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  min,
  max,
  disabled,
  error,
  hint,
}: ModalFieldProps) {
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <ModalFieldWrapper>
      <ModalLabel htmlFor={id}>{label}</ModalLabel>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        $invalid={Boolean(error)}
      />
      {message && (
        <Message id={messageId} $error={Boolean(error)}>
          {error && <CircleAlert size={14} aria-hidden="true" />}
          {message}
        </Message>
      )}
    </ModalFieldWrapper>
  );
}

export function ModalError({ message }: { message: string }) {
  return (
    <ErrorBox role="alert">
      <CircleAlert size={16} aria-hidden="true" />
      {message}
    </ErrorBox>
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
  width: min(460px, calc(100% - 32px));
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

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Heading = styled.h2`
  font-size: 24px;
  font-weight: 540;
  letter-spacing: -0.26px;

  @media (max-width: 760px) {
    font-size: 20px;
  }
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--surface-soft);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

const Input = styled.input<{ $invalid: boolean }>`
  width: 100%;
  min-height: 48px;
  border: 1px solid ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--border)")};
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 16px;
  color: var(--text);
  background: ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--surface)")};
  outline-color: var(--text);

  &:disabled {
    background: var(--surface-soft);
    cursor: not-allowed;
  }
`;

const Message = styled.p<{ $error: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 13px;
  font-weight: ${(props) => (props.$error ? 540 : 330)};
  line-height: 1.4;
  color: var(--text-muted);
  word-break: keep-all;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const ErrorBox = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  background: var(--block-pink);
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 480;

  svg {
    flex-shrink: 0;
  }
`;

