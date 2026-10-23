/*
 * 식재료 도감에 새 재료를 추가하는 모달이다.
 * 이름, 아이콘, 카테고리, 기본 유통기한을 받고, 칸을 벗어나거나 추가를 누르면 형식을 검사해 알려 준다.
 * 추가가 끝날 때까지 버튼을 막고, 실패하면 모달을 연 채로 오류를 보여 준다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent, SyntheticEvent } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert, X } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { CatalogIngredientCreateRequest, IngredientCategory } from "../../api/ingredientCatalog";
import { categoryLabel, categoryOrder } from "./libraryCategories";

type IngredientAddModalProps = {
  open: boolean;
  defaultCategory: IngredientCategory;
  existingNames: string[];
  onClose: () => void;
  onAdd: (values: CatalogIngredientCreateRequest) => Promise<void>;
};

type AddField = "name" | "icon" | "shelfLifeDays";

const NAME_MAX_LENGTH = 30;
const SHELF_LIFE_MAX_DAYS = 365;

// 아이콘을 비워 두면 이모지를 찾아 넣기 번거로우니 카테고리마다 기본 아이콘을 채워 둔다.
const defaultIcon: Record<IngredientCategory, string> = {
  VEGETABLE: "🥬",
  MEAT: "🥩",
  DAIRY: "🥛",
  FRUIT: "🍎",
  ETC: "🍽️",
};

// 아이콘 검사는 냉장고 재료 수정 모달(IngredientEditModal)과 같은 규칙을 쓴다.
const graphemeSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

function getIconError(icon: string) {
  if (!icon) return "아이콘을 입력해 주세요.";
  if ([...graphemeSegmenter.segment(icon)].length > 1) return "아이콘은 이모지 한 개만 넣어 주세요.";
  if (!emojiPattern.test(icon)) return "아이콘은 이모지로 넣어 주세요.";
  return "";
}

function getAddErrorMessage(error: unknown) {
  // INVALID_INPUT은 서버가 검증에 실패한 첫 번째 항목의 안내 문구를 보낸다.
  if (error instanceof ApiError && (error.code === "INVALID_INPUT" || error.code === NETWORK_ERROR)) {
    return error.message;
  }
  return "추가하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function IngredientAddModal({ open, defaultCategory, existingNames, onClose, onAdd }: IngredientAddModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isBusy, setIsBusy] = useState(false);

  // showModal()로 열어야 Esc 닫기, 바깥 화면 조작 막기, 포커스 가두기를 브라우저가 처리해 준다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // showModal()은 첫 번째 버튼(닫기)에 포커스를 주므로, 바로 입력할 수 있게 이름 칸으로 옮긴다.
      dialog.querySelector("input")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

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
      {/* 닫혀 있을 때는 폼을 그리지 않아, 다시 열면 입력값이 처음부터 시작된다. */}
      {open && (
        <IngredientAddForm
          titleId={titleId}
          defaultCategory={defaultCategory}
          existingNames={existingNames}
          isBusy={isBusy}
          onBusyChange={setIsBusy}
          onClose={requestClose}
          onAdd={onAdd}
        />
      )}
    </Dialog>
  );
}

export default IngredientAddModal;

type IngredientAddFormProps = {
  titleId: string;
  defaultCategory: IngredientCategory;
  existingNames: string[];
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onClose: () => void;
  onAdd: (values: CatalogIngredientCreateRequest) => Promise<void>;
};

function IngredientAddForm({
  titleId,
  defaultCategory,
  existingNames,
  isBusy,
  onBusyChange,
  onClose,
  onAdd,
}: IngredientAddFormProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(defaultIcon[defaultCategory]);
  const [category, setCategory] = useState(defaultCategory);
  const [shelfLifeDays, setShelfLifeDays] = useState("7");
  const [touched, setTouched] = useState<Partial<Record<AddField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // 화면 목록에는 없었지만 서버가 이미 있다고 알려 준 이름이다. 이름을 고치면 오류가 사라진다.
  const [takenName, setTakenName] = useState("");

  const trimmedName = name.trim();
  const trimmedIcon = icon.trim();
  const days = Number(shelfLifeDays);

  const errors: Record<AddField, string> = {
    name: !trimmedName
      ? "이름을 입력해 주세요."
      : existingNames.includes(trimmedName) || trimmedName === takenName
        ? "이미 도감에 있는 재료예요."
        : "",
    icon: getIconError(trimmedIcon),
    shelfLifeDays:
      Number.isInteger(days) && days >= 1 && days <= SHELF_LIFE_MAX_DAYS
        ? ""
        : `1~${SHELF_LIFE_MAX_DAYS}일 사이의 숫자로 입력해 주세요.`,
  };
  const canSubmit = trimmedName !== "" && trimmedIcon !== "" && shelfLifeDays !== "" && !isBusy;

  const visibleError = (field: AddField) => (submitted || touched[field] ? errors[field] : "");

  const touchField = (field: AddField) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const changeCategory = (next: IngredientCategory) => {
    // 사용자가 아이콘을 직접 바꾸지 않았다면 새 카테고리의 기본 아이콘으로 같이 바꾼다.
    if (icon === defaultIcon[category]) setIcon(defaultIcon[next]);
    setCategory(next);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canSubmit || Object.values(errors).some(Boolean)) return;

    onBusyChange(true);
    setErrorMessage("");
    try {
      await onAdd({ name: trimmedName, emoji: trimmedIcon, category, shelfLifeDays: days });
      onBusyChange(false);
      onClose();
    } catch (error) {
      onBusyChange(false);
      if (error instanceof ApiError && error.code === "DUPLICATE_CATALOG_NAME") {
        setTakenName(trimmedName);
      } else {
        setErrorMessage(getAddErrorMessage(error));
      }
    }
  };

  return (
    <Card>
      <Header>
        <Heading id={titleId}>새 재료 추가</Heading>
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
          onBlur={touchField("name")}
          placeholder="예: 닭다리살"
          maxLength={NAME_MAX_LENGTH}
          disabled={isBusy}
          error={visibleError("name")}
        />

        <FieldRow>
          <Field
            id={`${id}-icon`}
            label="아이콘"
            value={icon}
            onChange={setIcon}
            onBlur={touchField("icon")}
            placeholder="예: 🥕"
            disabled={isBusy}
            error={visibleError("icon")}
            hint="이모지 한 개"
          />

          <FieldWrapper>
            <Label htmlFor={`${id}-category`}>카테고리</Label>
            <Select
              id={`${id}-category`}
              value={category}
              onChange={(event) => {
                const next = categoryOrder.find((item) => item === event.target.value);
                if (next) changeCategory(next);
              }}
              disabled={isBusy}
            >
              {categoryOrder.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel[item]}
                </option>
              ))}
            </Select>
          </FieldWrapper>
        </FieldRow>

        <Field
          id={`${id}-days`}
          label="기본 유통기한(일)"
          type="number"
          value={shelfLifeDays}
          onChange={setShelfLifeDays}
          onBlur={touchField("shelfLifeDays")}
          min={1}
          max={SHELF_LIFE_MAX_DAYS}
          disabled={isBusy}
          error={visibleError("shelfLifeDays")}
          hint="장본 음식에 담은 날부터 이 기간을 유통기한으로 잡아요."
        />

        {errorMessage && (
          <ErrorBox role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {errorMessage}
          </ErrorBox>
        )}

        <Actions>
          <Button type="button" onClick={onClose} disabled={isBusy}>
            닫기
          </Button>
          <Button type="submit" $primary disabled={!canSubmit}>
            {isBusy ? "추가하는 중..." : "추가"}
          </Button>
        </Actions>
      </Form>
    </Card>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type?: "text" | "number";
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
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
  onBlur,
  placeholder,
  maxLength,
  min,
  max,
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

const Form = styled.form`
  margin-top: 16px;
  display: grid;
  gap: 14px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 12px;
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

const Select = styled.select`
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 16px;
  color: var(--text);
  background: var(--surface);
  cursor: pointer;

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

const Actions = styled.div`
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  background: ${(props) => (props.$primary ? "var(--text)" : "var(--surface-soft)")};
  color: ${(props) => (props.$primary ? "var(--surface)" : "var(--text)")};
  font-size: 15px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;
