/*
 * 냉장고 재료의 이름, 아이콘, 유통기한을 고치거나 재료를 삭제하는 모달이다.
 * 여는 쪽에서 재료와 저장·삭제 함수를 넘기고, ingredient가 null이면 닫힌다.
 * 저장·삭제가 끝날 때까지 버튼을 막고, 실패하면 모달을 연 채로 오류를 보여 준다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent, SyntheticEvent } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert, X } from "lucide-react";
import { ApiError } from "../../api/client";

export type EditableIngredient = {
  id: number;
  name: string;
  emoji: string;
  expiresAt: string;
  // 저장·삭제 요청에 함께 보내 다른 멤버가 먼저 고친 재료를 덮어쓰지 않게 한다.
  version: number;
};

export type IngredientEditValues = Pick<EditableIngredient, "name" | "emoji" | "expiresAt">;

type IngredientEditModalProps = {
  ingredient: EditableIngredient | null;
  onClose: () => void;
  onSave: (ingredient: EditableIngredient, values: IngredientEditValues) => Promise<void>;
  onDelete: (ingredient: EditableIngredient) => Promise<void>;
};

type ModalStatus = "idle" | "saving" | "deleting";

const NAME_MAX_LENGTH = 30;

// 국기나 피부색이 들어간 이모지는 여러 글자로 이뤄져 있어서 length로는 개수를 셀 수 없다.
const graphemeSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

function countGraphemes(value: string) {
  return [...graphemeSegmenter.segment(value)].length;
}

// 국기 이모지는 그림 문자가 아니라 지역 표시 문자 두 개로 이뤄져 있어 따로 허용한다.
const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

// 날짜 입력칸은 2026-02-30처럼 없는 날짜를 빈칸으로 보여 준다.
// 화면에 보이는 값과 저장하는 값이 어긋나지 않게, 없는 날짜는 처음부터 빈 값으로 둔다.
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// 서버가 준 안내(다른 멤버가 먼저 수정, 없는 재료, 입력 오류 등)를 그대로 보여 준다.
function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function IngredientEditModal({ ingredient, onClose, onSave, onDelete }: IngredientEditModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<ModalStatus>("idle");

  const isOpen = ingredient !== null;
  const isBusy = status !== "idle";

  // showModal()로 열어야 Esc 닫기, 바깥 화면 조작 막기, 포커스 가두기를 브라우저가 처리해 준다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // showModal()은 첫 번째 버튼(닫기)에 포커스를 주므로, 바로 고칠 수 있게 이름 칸으로 옮긴다.
      dialog.querySelector("input")?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const requestClose = () => {
    if (!isBusy) onClose();
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
      {ingredient && (
        <IngredientEditForm
          // 다른 재료를 열면 입력값을 그 재료 기준으로 처음부터 다시 채운다.
          key={ingredient.id}
          ingredient={ingredient}
          titleId={titleId}
          status={status}
          onStatusChange={setStatus}
          onClose={requestClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Dialog>
  );
}

export default IngredientEditModal;

type IngredientEditFormProps = {
  ingredient: EditableIngredient;
  titleId: string;
  status: ModalStatus;
  onStatusChange: (status: ModalStatus) => void;
  onClose: () => void;
  onSave: (ingredient: EditableIngredient, values: IngredientEditValues) => Promise<void>;
  onDelete: (ingredient: EditableIngredient) => Promise<void>;
};

function IngredientEditForm({
  ingredient,
  titleId,
  status,
  onStatusChange,
  onClose,
  onSave,
  onDelete,
}: IngredientEditFormProps) {
  const id = useId();
  const [name, setName] = useState(ingredient.name);
  const [emoji, setEmoji] = useState(ingredient.emoji);
  const [expiresAt, setExpiresAt] = useState(isValidDate(ingredient.expiresAt) ? ingredient.expiresAt : "");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedName = name.trim();
  const trimmedEmoji = emoji.trim();
  const isBusy = status !== "idle";

  const nameError = trimmedName ? "" : "이름을 입력해 주세요.";
  const emojiError = (() => {
    if (!trimmedEmoji) return "아이콘을 입력해 주세요.";
    if (countGraphemes(trimmedEmoji) > 1) return "아이콘은 이모지 한 개만 넣어 주세요.";
    if (!emojiPattern.test(trimmedEmoji)) return "아이콘은 이모지로 넣어 주세요.";
    return "";
  })();
  const expiresAtError = isValidDate(expiresAt) ? "" : "유통기한을 선택해 주세요.";

  const isChanged =
    trimmedName !== ingredient.name || trimmedEmoji !== ingredient.emoji || expiresAt !== ingredient.expiresAt;
  const canSave = !nameError && !emojiError && !expiresAtError && isChanged && !isBusy;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    onStatusChange("saving");
    setErrorMessage("");
    try {
      await onSave(ingredient, { name: trimmedName, emoji: trimmedEmoji, expiresAt });
      onStatusChange("idle");
      onClose();
    } catch (error) {
      onStatusChange("idle");
      setErrorMessage(getErrorMessage(error, "저장하지 못했어요. 잠시 후 다시 시도해 주세요."));
    }
  };

  const handleDelete = async () => {
    onStatusChange("deleting");
    setErrorMessage("");
    try {
      await onDelete(ingredient);
      onStatusChange("idle");
      onClose();
    } catch (error) {
      onStatusChange("idle");
      setErrorMessage(getErrorMessage(error, "삭제하지 못했어요. 잠시 후 다시 시도해 주세요."));
    }
  };

  return (
    <Card>
      <Header>
        <Heading id={titleId}>
          <HeadingIcon aria-hidden="true">{ingredient.emoji}</HeadingIcon>
          식재료 수정
        </Heading>
        <CloseButton type="button" onClick={onClose} disabled={isBusy} aria-label="닫기">
          <X size={18} />
        </CloseButton>
      </Header>

      <Form onSubmit={handleSubmit} noValidate>
        <Field
          id={`${id}-name`}
          label="이름"
          value={name}
          onChange={setName}
          placeholder="예: 닭가슴살"
          maxLength={NAME_MAX_LENGTH}
          disabled={isBusy}
          error={nameError}
        />

        <Field
          id={`${id}-emoji`}
          label="아이콘"
          value={emoji}
          onChange={setEmoji}
          placeholder="예: 🥕"
          disabled={isBusy}
          error={emojiError}
          hint="이모지 한 개"
        />

        <Field
          id={`${id}-expires`}
          label="유통기한"
          type="date"
          value={expiresAt}
          onChange={setExpiresAt}
          disabled={isBusy}
          error={expiresAtError}
        />

        {errorMessage && (
          <ErrorBox role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {errorMessage}
          </ErrorBox>
        )}

        {isConfirmingDelete ? (
          <ConfirmBox>
            <p>{ingredient.name}을(를) 냉장고에서 삭제할까요?</p>
            <ConfirmButtons>
              <Button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isBusy}>
                취소
              </Button>
              <Button type="button" $variant="primary" onClick={handleDelete} disabled={isBusy}>
                {status === "deleting" ? "삭제하는 중..." : "삭제하기"}
              </Button>
            </ConfirmButtons>
          </ConfirmBox>
        ) : (
          <Actions>
            <Button type="button" $variant="danger" onClick={() => setIsConfirmingDelete(true)} disabled={isBusy}>
              삭제
            </Button>
            <ButtonRow>
              <Button type="button" onClick={onClose} disabled={isBusy}>
                닫기
              </Button>
              <Button type="submit" $variant="primary" disabled={!canSave}>
                {status === "saving" ? "저장하는 중..." : "저장"}
              </Button>
            </ButtonRow>
          </Actions>
        )}
      </Form>
    </Card>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type?: "text" | "date";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled: boolean;
  error: string;
  hint?: string;
};

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  error,
  hint,
}: FieldProps) {
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <FieldWrapper>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
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
    </FieldWrapper>
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 540;
  letter-spacing: -0.26px;

  @media (max-width: 760px) {
    font-size: 20px;
  }
`;

const HeadingIcon = styled.span`
  font-size: 26px;
  line-height: 1;
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

const Form = styled.form`
  margin-top: 16px;
  display: grid;
  gap: 14px;
`;

const FieldWrapper = styled.div`
  display: grid;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 540;
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
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: ${(props) => (props.$error ? 540 : 330)};
  color: var(--text-muted);

  svg {
    flex-shrink: 0;
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

const ConfirmBox = styled.div`
  margin-top: 4px;
  border-radius: 8px;
  background: var(--block-pink);
  padding: 14px;
  display: grid;
  gap: 12px;

  p {
    font-size: 15px;
    font-weight: 480;
  }
`;

const Actions = styled.div`
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ConfirmButtons = styled(ButtonRow)`
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: "primary" | "danger" }>`
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  background: ${(props) => {
    if (props.$variant === "primary") return "var(--text)";
    if (props.$variant === "danger") return "var(--block-pink)";
    return "var(--surface-soft)";
  }};
  color: ${(props) => (props.$variant === "primary" ? "var(--surface)" : "var(--text)")};
  font-size: 15px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;
