/*
 * 요리를 마쳤을 때 냉장고에서 뺄 재료를 확인하는 모달이다.
 * 서버가 레시피 재료마다 이름이 맞는 냉장고 재료를 유통기한이 빠른 순으로 주고, 첫 번째를 미리 골라 둔다.
 * 사용자가 고른 재료는 수량과 상관없이 모두 냉장고에서 빠진다. 다른 멤버가 그사이 재료를 바꿨으면 후보를 다시 불러온다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { cook, getCookingCandidates, type CookingIngredient } from "../../api/cooking";
import type { FridgeItemResponse } from "../../api/fridge";
import { formatDate } from "../Library/libraryDate";
import LibraryModal, { ModalError } from "../Library/LibraryModal";
import { ModalActions, ModalButton, ModalSelect } from "../Library/libraryModalStyles";

type CookingModalProps = {
  recipeId: number;
  open: boolean;
  onClose: () => void;
  // 뺀 재료 수를 넘긴다.
  onCooked: (count: number) => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; ingredients: CookingIngredient[] };

// 재료마다 고른 냉장고 재료 id. null이면 빼지 않는다.
type Selection = (number | null)[];

const NOT_USED = "";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === NETWORK_ERROR) return error.message;
  return fallback;
}

function isStaleItemError(error: unknown) {
  return (
    error instanceof ApiError && (error.code === "CONCURRENT_MODIFICATION" || error.code === "FRIDGE_ITEM_NOT_FOUND")
  );
}

function getCandidateLabel(item: FridgeItemResponse) {
  return item.expiresAt ? `${item.name} (${formatDate(item.expiresAt)}까지)` : item.name;
}

// 레시피 재료 두 개가 같은 냉장고 재료를 고를 수 있다(예: 대파·파). 서버도 한 번만 빼므로 한 번만 세고 보낸다.
function getSelectedItems(ingredients: CookingIngredient[], selection: Selection) {
  const items = ingredients.flatMap((ingredient, index) =>
    ingredient.candidates.filter((candidate) => candidate.id === selection[index]),
  );
  return items.filter((item, index) => items.findIndex((other) => other.id === item.id) === index);
}

function CookingModal({ recipeId, open, onClose, onCooked }: CookingModalProps) {
  const [isCooking, setIsCooking] = useState(false);

  return (
    <LibraryModal open={open} title="요리 완료" busy={isCooking} onClose={onClose}>
      {/* LibraryModal이 열려 있을 때만 그려서, 열 때마다 후보를 새로 불러온다. */}
      <CookingContent
        recipeId={recipeId}
        isCooking={isCooking}
        onCookingChange={setIsCooking}
        onClose={onClose}
        onCooked={onCooked}
      />
    </LibraryModal>
  );
}

export default CookingModal;

type CookingContentProps = {
  recipeId: number;
  isCooking: boolean;
  onCookingChange: (isCooking: boolean) => void;
  onClose: () => void;
  onCooked: (count: number) => void;
};

function CookingContent({ recipeId, isCooking, onCookingChange, onClose, onCooked }: CookingContentProps) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<Selection>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    getCookingCandidates(recipeId).then(
      (ingredients) => {
        if (ignore) return;
        setLoad({ status: "success", ingredients });
        setSelection(ingredients.map((ingredient) => ingredient.candidates[0]?.id ?? null));
      },
      (loadError: unknown) => {
        if (ignore) return;
        setLoad({
          status: "error",
          message: getErrorMessage(loadError, "재료를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
        });
      },
    );
    return () => {
      ignore = true;
    };
  }, [recipeId, attempt]);

  const reload = () => {
    setLoad({ status: "loading" });
    setAttempt((prev) => prev + 1);
  };

  const handleRetry = () => {
    setError("");
    reload();
  };

  const ingredients = load.status === "success" ? load.ingredients : [];
  const selectedItems = getSelectedItems(ingredients, selection);

  const handleSelect = (index: number, value: string) => {
    setSelection((prev) => prev.map((id, itemIndex) => (itemIndex === index ? (value === NOT_USED ? null : Number(value)) : id)));
    setError("");
  };

  const handleCook = async () => {
    if (isCooking || selectedItems.length === 0) return;
    onCookingChange(true);
    setError("");
    try {
      const { deductedItemIds } = await cook(
        recipeId,
        selectedItems.map((item) => ({ fridgeItemId: item.id, version: item.version })),
      );
      onCooked(deductedItemIds.length);
      onClose();
    } catch (cookError) {
      if (isStaleItemError(cookError)) {
        setError("다른 멤버가 먼저 바꾼 재료가 있어 다시 불러왔어요. 확인하고 다시 눌러 주세요.");
        reload();
      } else {
        setError(getErrorMessage(cookError, "재료를 빼지 못했어요. 잠시 후 다시 시도해 주세요."));
      }
    } finally {
      onCookingChange(false);
    }
  };

  return (
    <Content>
      {load.status === "loading" && <Description role="status">냉장고 재료를 찾는 중이에요.</Description>}
      {load.status === "error" && (
        <>
          <ModalError message={load.message} />
          <ModalActions>
            <ModalButton type="button" onClick={handleRetry}>
              다시 시도
            </ModalButton>
          </ModalActions>
        </>
      )}
      {load.status === "success" && (
        <>
          <Description>요리에 쓴 재료를 골라 주세요. 고른 재료는 냉장고에서 모두 빠져요.</Description>
          {ingredients.length === 0 ? (
            <Description>이 레시피에는 냉장고에서 뺄 재료가 없어요.</Description>
          ) : (
            <List>
              {ingredients.map((ingredient, index) => (
                <Item key={`${index}-${ingredient.name}`}>
                  <ItemName>
                    <strong>{ingredient.name}</strong>
                    {ingredient.amount && <span>{ingredient.amount}</span>}
                  </ItemName>
                  {ingredient.candidates.length === 0 ? (
                    <NoCandidate>냉장고에 없음</NoCandidate>
                  ) : (
                    <ModalSelect
                      aria-label={`${ingredient.name}에 쓴 냉장고 재료`}
                      disabled={isCooking}
                      value={selection[index] ?? NOT_USED}
                      onChange={(event) => handleSelect(index, event.target.value)}
                    >
                      {ingredient.candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {getCandidateLabel(candidate)}
                        </option>
                      ))}
                      <option value={NOT_USED}>빼지 않기</option>
                    </ModalSelect>
                  )}
                </Item>
              ))}
            </List>
          )}
          {error && <ModalError message={error} />}
          <ModalActions>
            <ModalButton type="button" disabled={isCooking} onClick={onClose}>
              취소
            </ModalButton>
            <ModalButton type="button" $primary disabled={isCooking || selectedItems.length === 0} onClick={handleCook}>
              {isCooking ? "빼는 중" : `재료 ${selectedItems.length}개 빼기`}
            </ModalButton>
          </ModalActions>
        </>
      )}
    </Content>
  );
}

const Content = styled.div`
  display: grid;
  gap: 12px;
`;

const Description = styled.p`
  font-size: 15px;
  font-weight: 330;
  line-height: 1.5;
  word-break: keep-all;
`;

const List = styled.ul`
  list-style: none;
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
`;

const Item = styled.li`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 10px 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  align-items: center;
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const ItemName = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;

  strong {
    font-size: 15px;
    font-weight: 540;
    overflow-wrap: anywhere;
  }

  span {
    font-size: 13px;
    font-weight: 330;
  }
`;

const NoCandidate = styled.p`
  font-size: 14px;
  font-weight: 330;
`;
