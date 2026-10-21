/*
 * 식재료 도감의 재료 카드다.
 * 장본 음식에 담기 버튼을 누르면 잠깐 "담았어요"로 바뀌고, 삭제는 카드 위에서 한 번 더 확인한다.
 */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styled from "@emotion/styled";
import { Check, Plus, Trash2 } from "lucide-react";
import type { LibraryIngredient } from "./libraryTypes";

type IngredientCardProps = {
  ingredient: LibraryIngredient;
  onAddToGroceries: (ingredient: LibraryIngredient) => void;
  onDelete: (ingredient: LibraryIngredient) => void;
};

const ADDED_FEEDBACK_MS = 1200;

function IngredientCard({ ingredient, onAddToGroceries, onDelete }: IngredientCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleAdd = () => {
    // 같은 재료를 두 번 사는 경우도 있어 막지는 않지만, 잘못 두 번 눌러 겹쳐 담기지 않게 잠깐 쉬게 한다.
    if (isAdded) return;
    onAddToGroceries(ingredient);
    setIsAdded(true);
    timerRef.current = window.setTimeout(() => setIsAdded(false), ADDED_FEEDBACK_MS);
  };

  const cancelDelete = () => {
    setIsConfirmingDelete(false);
    // 확인 영역이 사라지면 포커스가 갈 곳을 잃으므로 삭제 버튼으로 돌려놓는다.
    requestAnimationFrame(() => deleteButtonRef.current?.focus());
  };

  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") cancelDelete();
  };

  return (
    <Card>
      <CardTop>
        <Icon aria-hidden="true">{ingredient.icon}</Icon>
        <DeleteButton
          ref={deleteButtonRef}
          type="button"
          aria-label={`${ingredient.name} 도감에서 삭제`}
          onClick={() => setIsConfirmingDelete(true)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </DeleteButton>
      </CardTop>

      <Name>{ingredient.name}</Name>
      <Meta>기본 유통기한 {ingredient.shelfLifeDays}일</Meta>

      <AddButton
        type="button"
        onClick={handleAdd}
        aria-disabled={isAdded || undefined}
        aria-label={isAdded ? `${ingredient.name}을(를) 장본 음식에 담았어요` : `${ingredient.name} 장본 음식에 담기`}
        $added={isAdded}
      >
        {isAdded ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
        {isAdded ? "담았어요" : "장본 음식에 담기"}
      </AddButton>

      {isConfirmingDelete && (
        <ConfirmLayer role="group" aria-label={`${ingredient.name} 삭제 확인`} onKeyDown={handleConfirmKeyDown}>
          <p>
            {ingredient.name}을(를)
            <br />
            도감에서 삭제할까요?
          </p>
          <ConfirmButtons>
            {/* 실수로 지우지 않도록 취소에 먼저 포커스를 둔다. */}
            <ConfirmButton type="button" onClick={cancelDelete} autoFocus>
              취소
            </ConfirmButton>
            <ConfirmButton type="button" $primary onClick={() => onDelete(ingredient)}>
              삭제
            </ConfirmButton>
          </ConfirmButtons>
        </ConfirmLayer>
      )}
    </Card>
  );
}

export default IngredientCard;

const Card = styled.article`
  position: relative;
  min-height: 176px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 16px;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 4px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--text);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const Icon = styled.span`
  font-size: 30px;
  line-height: 1;
`;

const DeleteButton = styled.button`
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--block-pink);
  }
`;

const Name = styled.strong`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.14px;
  overflow-wrap: anywhere;
`;

const Meta = styled.span`
  font-size: 13px;
  font-weight: 330;
`;

const AddButton = styled.button<{ $added: boolean }>`
  align-self: end;
  margin-top: 8px;
  min-height: 36px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: ${(props) => (props.$added ? "var(--block-mint)" : "var(--text)")};
  color: ${(props) => (props.$added ? "var(--text)" : "var(--surface)")};
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 480;
  white-space: nowrap;
  cursor: ${(props) => (props.$added ? "default" : "pointer")};
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:active:not([aria-disabled]) {
    transform: scale(0.98);
  }

  svg {
    flex-shrink: 0;
  }
`;

const ConfirmLayer = styled.div`
  position: absolute;
  inset: -1px;
  border: 1px solid var(--text);
  border-radius: 8px;
  background: var(--block-pink);
  padding: 16px;
  display: grid;
  align-content: center;
  gap: 12px;
  text-align: center;

  p {
    font-size: 14px;
    font-weight: 540;
    line-height: 1.4;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
`;

const ConfirmButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
`;

const ConfirmButton = styled.button<{ $primary?: boolean }>`
  min-height: 36px;
  border: 0;
  border-radius: 50px;
  background: ${(props) => (props.$primary ? "var(--text)" : "var(--surface)")};
  color: ${(props) => (props.$primary ? "var(--surface)" : "var(--text)")};
  font-size: 13px;
  font-weight: 480;
  cursor: pointer;
`;
