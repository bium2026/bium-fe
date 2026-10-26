/*
 * 식재료 도감 모달(LibraryModal)에 넣는 폼 조각의 스타일이다. 새 재료 추가 모달과 냉장고에 넣기 모달이 함께 쓴다.
 * 컴포넌트 파일에서 스타일을 함께 내보내면 Fast Refresh가 동작하지 않아 따로 둔다.
 */
import styled from "@emotion/styled";

export const ModalForm = styled.form`
  margin-top: 16px;
  display: grid;
  gap: 14px;
`;

export const ModalFieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 12px;
`;

export const ModalFieldWrapper = styled.div`
  display: grid;
  gap: 6px;
`;

export const ModalLabel = styled.label`
  font-size: 13px;
  font-weight: 540;
`;

export const ModalSelect = styled.select`
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

export const ModalActions = styled.div`
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const ModalButton = styled.button<{ $primary?: boolean }>`
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
