/*
 * 레시피의 부족 재료를 장보기 목록에 담을지 묻는 모달이다.
 * 장보기 목록은 냉장고 멤버가 함께 보는 목록이라, 둘러보기만 해도 쌓이지 않게 사용자가 고르고 확인한 재료만 담는다.
 * 필수 재료는 미리 골라 두고 선택 재료는 비워 둔다. 실패하면 모달을 연 채로 오류를 보여 준다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent, RefObject, SyntheticEvent } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert, X } from "lucide-react";
import { Link } from "react-router";
import { ApiError } from "../../api/client";
import type { RecipeIngredient } from "../../api/recipe";
import { addRecipeMissingItems } from "../../api/shoppingList";

type MissingIngredientModalProps = {
  recipeId: number;
  // 이름이 겹치지 않는 부족 재료 목록
  ingredients: RecipeIngredient[];
  isOpen: boolean;
  onClose: () => void;
  // 레시피를 만든 직후 자동으로 열리면 연 버튼이 없어서, 닫을 때 포커스를 돌려줄 곳을 따로 받는다.
  returnFocusRef: RefObject<HTMLElement | null>;
};

type AddResult = {
  addedCount: number;
  selectedCount: number;
};

function MissingIngredientModal({ recipeId, ingredients, isOpen, onClose, returnFocusRef }: MissingIngredientModalProps) {
  const titleId = useId();
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isAdding, setIsAdding] = useState(false);

  // showModal()로 열어야 Esc 닫기, 바깥 화면 조작 막기, 포커스 가두기를 브라우저가 처리해 준다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      // showModal()은 첫 번째 버튼(닫기)에 포커스를 주므로, 담을 재료를 바로 고를 수 있게 첫 체크박스로 옮긴다.
      dialog.querySelector("input")?.focus();
    }
    if (!isOpen && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus();
    }
  }, [isOpen, returnFocusRef]);

  const requestClose = () => {
    if (!isAdding) onClose();
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
    <Dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      {/* 열 때마다 고른 재료와 결과를 처음부터 다시 채운다. */}
      {isOpen && (
        <MissingIngredientForm
          recipeId={recipeId}
          ingredients={ingredients}
          titleId={titleId}
          descriptionId={descriptionId}
          isAdding={isAdding}
          onAddingChange={setIsAdding}
          onClose={requestClose}
        />
      )}
    </Dialog>
  );
}

export default MissingIngredientModal;

type MissingIngredientFormProps = {
  recipeId: number;
  ingredients: RecipeIngredient[];
  titleId: string;
  descriptionId: string;
  isAdding: boolean;
  onAddingChange: (isAdding: boolean) => void;
  onClose: () => void;
};

function MissingIngredientForm({
  recipeId,
  ingredients,
  titleId,
  descriptionId,
  isAdding,
  onAddingChange,
  onClose,
}: MissingIngredientFormProps) {
  const [selectedNames, setSelectedNames] = useState(
    () => new Set(ingredients.filter((item) => item.required).map((item) => item.name)),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<AddResult | null>(null);

  const toggle = (name: string, checked: boolean) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
    setErrorMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAdding || selectedNames.size === 0) return;

    // 화면에 보이는 순서대로 보낸다.
    const names = ingredients.filter((item) => selectedNames.has(item.name)).map((item) => item.name);
    onAddingChange(true);
    setErrorMessage("");
    try {
      const items = await addRecipeMissingItems(recipeId, names);
      setResult({ addedCount: items.length, selectedCount: names.length });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "장보기 목록에 담지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      onAddingChange(false);
    }
  };

  return (
    <Card>
      <Header>
        <h2 id={titleId}>부족 재료를 장보기 목록에 담을까요?</h2>
        <CloseButton type="button" onClick={onClose} aria-label="닫기" aria-disabled={isAdding || undefined}>
          <X size={18} aria-hidden="true" />
        </CloseButton>
      </Header>

      {result ? (
        <Done>
          <Feedback role="status">
            {result.addedCount > 0
              ? `${result.addedCount}개를 장보기 목록에 담았어요.`
              : "새로 담은 재료가 없어요."}
            {/* 서버는 새로 담은 것만 돌려주므로, 고른 것보다 적으면 이미 목록에 있던 재료다. */}
            {result.addedCount < result.selectedCount && " 이미 목록에 있는 재료는 건너뛰었어요."}
          </Feedback>
          <Buttons>
            <OutlineLink to="/shopping">장보기 목록 보기</OutlineLink>
            <PrimaryButton type="button" onClick={onClose} autoFocus>
              닫기
            </PrimaryButton>
          </Buttons>
        </Done>
      ) : (
        <Form onSubmit={handleSubmit} noValidate>
          <Description id={descriptionId}>
            냉장고에 없는 재료예요. 고른 재료만 냉장고 멤버가 함께 보는 장보기 목록에 담아요.
          </Description>

          <Fieldset disabled={isAdding}>
            <legend>담을 재료</legend>
            <ChoiceList>
              {ingredients.map((item) => (
                <li key={item.name}>
                  <Choice>
                    <input
                      type="checkbox"
                      checked={selectedNames.has(item.name)}
                      onChange={(event) => toggle(item.name, event.target.checked)}
                    />
                    <ChoiceName>
                      <strong>{item.name}</strong>
                      {item.amount && <span>{item.amount}</span>}
                    </ChoiceName>
                    <RequiredTag $required={item.required}>{item.required ? "필수" : "선택"}</RequiredTag>
                  </Choice>
                </li>
              ))}
            </ChoiceList>
          </Fieldset>

          {selectedNames.size === 0 && <Hint>장보기 목록에 담을 재료를 골라 주세요.</Hint>}

          {errorMessage && (
            <ErrorBox role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              {errorMessage}
            </ErrorBox>
          )}

          <Buttons>
            <OutlineButton type="button" onClick={onClose} aria-disabled={isAdding || undefined}>
              취소
            </OutlineButton>
            <PrimaryButton
              type="submit"
              disabled={!isAdding && selectedNames.size === 0}
              aria-disabled={isAdding || undefined}
            >
              {isAdding ? "담는 중..." : selectedNames.size > 0 ? `${selectedNames.size}개 담기` : "담기"}
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
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    padding-top: 6px;
    font-size: 22px;
    font-weight: 540;
    line-height: 1.35;
    letter-spacing: -0.26px;

    @media (max-width: 760px) {
      font-size: 20px;
    }
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
  gap: 12px;
`;

const Description = styled.p`
  font-size: 14px;
  font-weight: 330;
  line-height: 1.5;
`;

const Fieldset = styled.fieldset`
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
  display: grid;
  gap: 8px;

  legend {
    margin-bottom: 8px;
    padding: 0;
    font-size: 13px;
    font-weight: 540;
  }
`;

const ChoiceList = styled.ul`
  list-style: none;
  display: grid;
  gap: 8px;
`;

const Choice = styled.label`
  min-height: 52px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 10px 14px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  &:has(input:checked) {
    border-color: var(--text);
  }

  &:has(input:focus-visible) {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &:has(input:disabled) {
    background: var(--surface-soft);
    cursor: not-allowed;
  }

  input {
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: var(--text);
    cursor: inherit;
  }

  /* 줄 전체에 포커스 테두리를 그리므로 체크박스 자체의 테두리는 겹치지 않게 뺀다. */
  input:focus-visible {
    outline: none;
  }
`;

const ChoiceName = styled.span`
  display: grid;
  gap: 2px;
  overflow-wrap: anywhere;

  strong {
    font-size: 15px;
    font-weight: 700;
  }

  span {
    font-size: 13px;
    font-weight: 330;
  }
`;

const RequiredTag = styled.span<{ $required: boolean }>`
  border-radius: 50px;
  background: ${(props) => (props.$required ? "var(--block-pink)" : "var(--surface-soft)")};
  padding: 3px 9px;
  font-size: 12px;
  font-weight: ${(props) => (props.$required ? 700 : 480)};
  white-space: nowrap;
`;

const Hint = styled.p`
  font-size: 13px;
  font-weight: 540;
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

const Done = styled.div`
  display: grid;
  gap: 16px;
`;

const Feedback = styled.p`
  border-radius: 8px;
  background: var(--block-mint);
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 480;
  line-height: 1.5;
`;

const Buttons = styled.div`
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
`;

const buttonBase = `
  min-height: 42px;
  border-radius: 999px;
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 480;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  /* 요청 중에는 aria-disabled로 막아 눌렀던 버튼에서 포커스가 빠지지 않게 한다. */
  &:disabled,
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const PrimaryButton = styled.button`
  ${buttonBase}
  border: 0;
  background: var(--text);
  color: var(--surface);
`;

const OutlineButton = styled.button`
  ${buttonBase}
  border: 1px solid var(--text);
  background: var(--surface);
  color: var(--text);
`;

const OutlineLink = styled(Link)`
  ${buttonBase}
  border: 1px solid var(--text);
  background: var(--surface);
  color: var(--text);
`;
