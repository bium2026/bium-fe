/*
 * 유통기한 지난 재료를 한 번에 지우기 전에 어떤 재료가 지워지는지 보여 주고 확인받는 모달이다.
 * 지우는 동안에는 닫히지 않고, 실패하면 모달을 연 채로 오류를 보여 준다. 서버는 하나라도 못 지우면 아무것도 지우지 않는다.
 */
import { useState } from "react";
import styled from "@emotion/styled";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import LibraryModal, { ModalError } from "../Library/LibraryModal";
import { ModalActions, ModalButton } from "../Library/libraryModalStyles";
import type { ExpiredIngredient } from "./fridgeLayout";
import { zoneMeta } from "./fridgeZones";

type ExpiredDeleteModalProps = {
  open: boolean;
  items: ExpiredIngredient[];
  onClose: () => void;
  onDelete: () => Promise<void>;
};

function getDeleteErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === NETWORK_ERROR) return error.message;
    if (error.code === "CONCURRENT_MODIFICATION" || error.code === "FRIDGE_ITEM_NOT_FOUND") {
      return "다른 멤버가 먼저 바꾼 재료가 있어 목록을 다시 불러왔어요. 확인하고 다시 눌러 주세요.";
    }
  }
  return "재료를 지우지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function ExpiredDeleteModal({ open, items, onClose, onDelete }: ExpiredDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError("");
    try {
      await onDelete();
      handleClose();
    } catch (deleteError) {
      setError(getDeleteErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <LibraryModal open={open} title="유통기한 지난 재료 삭제" busy={isDeleting} onClose={handleClose}>
      <Content>
        {items.length === 0 ? (
          <Description>지울 재료가 없어요.</Description>
        ) : (
          <>
            <Description>아래 재료 {items.length}개를 냉장고에서 지울까요?</Description>
            <List>
              {items.map(({ ingredient, zoneId }) => (
                <Item key={ingredient.id}>
                  <span aria-hidden="true">{ingredient.emoji}</span>
                  <strong>{ingredient.name}</strong>
                  <ZoneName>{zoneMeta[zoneId].title}</ZoneName>
                </Item>
              ))}
            </List>
          </>
        )}
        {error && <ModalError message={error} />}
        <ModalActions>
          <ModalButton type="button" disabled={isDeleting} onClick={handleClose}>
            취소
          </ModalButton>
          <ModalButton type="button" $primary disabled={isDeleting || items.length === 0} onClick={handleDelete}>
            {isDeleting ? "지우는 중" : "삭제"}
          </ModalButton>
        </ModalActions>
      </Content>
    </LibraryModal>
  );
}

export default ExpiredDeleteModal;

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
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
`;

const Item = styled.li`
  min-height: 40px;
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 8px 12px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  font-size: 15px;

  strong {
    font-weight: 540;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ZoneName = styled.span`
  font-size: 13px;
  font-weight: 330;
`;
