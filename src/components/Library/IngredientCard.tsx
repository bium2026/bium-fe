/*
 * 식재료 도감의 재료 카드다.
 * 장본 음식에 담기는 서버에 담길 때까지 버튼을 막고, 담기면 잠깐 "담았어요"로 바꾼다. 실패하면 버튼 아래에 알린다.
 * 냉장고에 넣기는 화면의 모달을 열고, 넣고 나면 화면이 isFridgeAdded로 잠깐 "넣었어요"를 보여 주게 한다.
 * 삭제는 카드 위에서 한 번 더 확인하고, 실패하면 확인 영역에 오류를 보여 다시 시도하게 한다.
 */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styled from "@emotion/styled";
import { Check, Plus, Refrigerator, Trash2 } from "lucide-react";
import type { CatalogIngredient } from "../../api/ingredientCatalog";

type IngredientCardProps = {
  ingredient: CatalogIngredient;
  // 연결된 냉장고가 없으면 장본 음식에 담거나 냉장고에 넣을 수 없다.
  canUseFridge: boolean;
  isFridgeAdded: boolean;
  onAddToGroceries: (ingredient: CatalogIngredient) => Promise<void>;
  onOpenFridgeAdd: (ingredient: CatalogIngredient) => void;
  onDelete: (ingredient: CatalogIngredient) => Promise<void>;
};

type AddStatus = "idle" | "adding" | "added" | "error";

type DeleteStatus = "idle" | "deleting" | "error";

const ADDED_FEEDBACK_MS = 1200;

function IngredientCard({
  ingredient,
  canUseFridge,
  isFridgeAdded,
  onAddToGroceries,
  onOpenFridgeAdd,
  onDelete,
}: IngredientCardProps) {
  const [addStatus, setAddStatus] = useState<AddStatus>("idle");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const isAddBusy = addStatus === "adding" || addStatus === "added";

  const handleAdd = async () => {
    // 같은 재료를 두 번 사는 경우도 있어 막지는 않지만, 요청 중이거나 방금 담았을 때는 잘못 두 번 눌러 겹쳐 담기지 않게 막는다.
    if (isAddBusy) return;
    setAddStatus("adding");
    try {
      await onAddToGroceries(ingredient);
      setAddStatus("added");
      timerRef.current = window.setTimeout(() => setAddStatus("idle"), ADDED_FEEDBACK_MS);
    } catch {
      setAddStatus("error");
    }
  };

  const isDeleting = deleteStatus === "deleting";

  const handleDelete = async () => {
    if (isDeleting) return;
    setDeleteStatus("deleting");
    try {
      // 성공하면 카드가 목록에서 빠지므로 상태를 되돌리지 않는다.
      await onDelete(ingredient);
    } catch {
      setDeleteStatus("error");
    }
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setIsConfirmingDelete(false);
    setDeleteStatus("idle");
    // 확인 영역이 사라지면 포커스가 갈 곳을 잃으므로 삭제 버튼으로 돌려놓는다.
    requestAnimationFrame(() => deleteButtonRef.current?.focus());
  };

  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") cancelDelete();
  };

  return (
    <Card>
      <CardTop>
        <Icon aria-hidden="true">{ingredient.emoji}</Icon>
        <DeleteButton
          ref={deleteButtonRef}
          type="button"
          aria-label={`${ingredient.name} 도감에서 삭제`}
          onClick={() => setIsConfirmingDelete(true)}
          // 확인 영역은 화면만 덮으므로, 가려진 버튼에 키보드로 닿지 않게 확인하는 동안 막는다.
          disabled={isConfirmingDelete}
        >
          <Trash2 size={16} aria-hidden="true" />
        </DeleteButton>
      </CardTop>

      <Name>{ingredient.name}</Name>
      <Meta>기본 유통기한 {ingredient.shelfLifeDays}일</Meta>

      <Actions>
        <AddButton
          type="button"
          onClick={handleAdd}
          disabled={isConfirmingDelete || !canUseFridge}
          aria-disabled={isAddBusy || undefined}
          aria-label={
            addStatus === "added" ? `${ingredient.name}을(를) 장본 음식에 담았어요` : `${ingredient.name} 장본 음식에 담기`
          }
          $added={addStatus === "added"}
        >
          {addStatus === "added" ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
          {addStatus === "adding" ? "담는 중..." : addStatus === "added" ? "담았어요" : "장본 음식에 담기"}
        </AddButton>
        <FridgeButton
          type="button"
          onClick={() => onOpenFridgeAdd(ingredient)}
          disabled={isConfirmingDelete || !canUseFridge}
          aria-label={isFridgeAdded ? `${ingredient.name}을(를) 냉장고에 넣었어요` : `${ingredient.name} 냉장고에 넣기`}
          $added={isFridgeAdded}
        >
          {isFridgeAdded ? <Check size={15} aria-hidden="true" /> : <Refrigerator size={15} aria-hidden="true" />}
          {isFridgeAdded ? "넣었어요" : "냉장고에 넣기"}
        </FridgeButton>
        {addStatus === "error" && <AddError role="alert">담지 못했어요. 다시 눌러 주세요.</AddError>}
      </Actions>

      {isConfirmingDelete && (
        <ConfirmLayer role="group" aria-label={`${ingredient.name} 삭제 확인`} onKeyDown={handleConfirmKeyDown}>
          {deleteStatus === "error" ? (
            <p role="alert">
              삭제하지 못했어요.
              <br />
              잠시 후 다시 시도해 주세요.
            </p>
          ) : (
            <p>
              {ingredient.name}을(를)
              <br />
              도감에서 삭제할까요?
            </p>
          )}
          <ConfirmButtons>
            {/* 실수로 지우지 않도록 취소에 먼저 포커스를 둔다. */}
            {/* disabled 대신 aria-disabled로 막아, 요청 중에도 포커스가 버튼에서 빠져나가지 않게 한다. */}
            <ConfirmButton type="button" onClick={cancelDelete} aria-disabled={isDeleting || undefined} autoFocus>
              취소
            </ConfirmButton>
            <ConfirmButton type="button" $primary onClick={handleDelete} aria-disabled={isDeleting || undefined}>
              {isDeleting ? "삭제 중..." : "삭제"}
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

const Actions = styled.div`
  align-self: end;
  margin-top: 8px;
  display: grid;
  gap: 6px;
`;

const AddButton = styled.button<{ $added: boolean }>`
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
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:active:not([aria-disabled]) {
    transform: scale(0.98);
  }

  &[aria-disabled="true"] {
    cursor: default;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  svg {
    flex-shrink: 0;
  }
`;

// 장본 음식에 담기와 모양은 같고, 카드마다 검은 버튼이 두 개면 무거워서 흰 바탕으로 둔다.
const FridgeButton = styled(AddButton)`
  background: ${(props) => (props.$added ? "var(--block-mint)" : "var(--surface)")};
  color: var(--text);
`;

const AddError = styled.p`
  font-size: 12px;
  font-weight: 540;
  line-height: 1.4;
  word-break: keep-all;
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
  white-space: nowrap;
  cursor: pointer;

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;
