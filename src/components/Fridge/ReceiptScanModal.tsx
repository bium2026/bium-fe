/*
 * 영수증 사진에서 AI가 읽은 재료를 보여 주고, 고르고 고친 뒤 냉장고에 한꺼번에 넣는 모달이다.
 * 여는 쪽에서 사진 읽기 요청(scan)을 넘기고, scan이 null이면 닫힌다.
 * 읽는 중에 닫으면 결과를 버리고, 냉장고에 넣는 중에는 닫히지 않는다.
 * 영수증에는 재료가 수십 개 있을 수 있어 목록만 스크롤하고, 전체 선택 줄과 넣기 버튼은 늘 보이게 둔다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, Ref } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { FridgeItemBulkCreateItem, StorageType } from "../../api/fridge";
import type { ScannedReceiptItem } from "../../api/receipt";
import LibraryModal, { ModalError } from "../Library/LibraryModal";
import { ModalActions, ModalButton, ModalSelect } from "../Library/libraryModalStyles";
import { storageLabel, storageOrder } from "../Library/libraryStorage";
import { getEmojiError } from "../Library/libraryValidation";
import { RECEIPT_IMAGE_ACCEPT, type ReceiptScan, type ReceiptScanResult } from "./receiptScan";

// 입력칸에 보여 주는 값이라 비어 있는 유통기한도 빈 문자열로 둔다.
type ReceiptItemValues = {
  name: string;
  emoji: string;
  storage: StorageType;
  expiresAt: string;
};

type ReceiptScanModalProps = {
  scan: ReceiptScan | null;
  onPickFile: (file: File) => void;
  onClose: () => void;
  onAdd: (fridgeId: number, items: FridgeItemBulkCreateItem[]) => Promise<void>;
};

// selected가 false인 재료는 넣지 않는다. 지우지 않고 체크만 풀어서 다시 고를 수 있다.
type ReceiptRow = ReceiptItemValues & { key: number; selected: boolean };

type ScanState = { status: "scanning" } | ReceiptScanResult;

// 냉장고 재료 이름은 50자까지 쓸 수 있다.
const NAME_MAX_LENGTH = 50;

// 넓은 화면에서 재료 한 줄의 칸 너비다. 체크, 아이콘, 이름, 보관 위치, 유통기한 순서이고 목록 머리글과 맞춘다.
const ROW_COLUMNS = "20px 56px minmax(0, 1fr) 108px 156px";

const addErrorCodes = ["INVALID_INPUT", "FRIDGE_NOT_FOUND", NETWORK_ERROR];

let nextRowKey = 1;

// 날짜 입력칸은 없는 날짜를 빈칸으로 보여 주므로, 화면과 보내는 값이 어긋나지 않게 없는 날짜는 빈 값으로 둔다.
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// AI가 정하지 못한 아이콘·유통기한은 빈칸으로 둔다. 사용자가 채우지 않으면 아이콘·유통기한 없이 넣는다.
function toRow(item: ScannedReceiptItem): ReceiptRow {
  return {
    key: nextRowKey++,
    selected: true,
    name: item.name,
    emoji: item.emoji ?? "",
    storage: item.storage,
    expiresAt: item.expiresAt && isValidDate(item.expiresAt) ? item.expiresAt : "",
  };
}

// 값이 있으면 냉장고 재료 수정 모달과 같은 규칙으로 검사한다. 아이콘·유통기한은 비워 둘 수 있다.
function getRowErrors(row: ReceiptRow) {
  const name = row.name.trim();
  const emoji = row.emoji.trim();
  return {
    name: name ? "" : "이름을 입력해 주세요.",
    emoji: emoji ? getEmojiError(emoji) : "",
    expiresAt: !row.expiresAt || isValidDate(row.expiresAt) ? "" : "올바른 날짜를 선택해 주세요.",
  };
}

// 넣지 않을 재료는 고칠 필요가 없으므로 검사하지 않는다.
function hasRowError(row: ReceiptRow) {
  return row.selected && Object.values(getRowErrors(row)).some(Boolean);
}

function getAddErrorMessage(error: unknown) {
  // 서버가 보낸 문구로 무엇이 문제인지(입력값, 냉장고 접근, 연결) 알려 준다.
  if (error instanceof ApiError && addErrorCodes.includes(error.code)) return error.message;
  return "냉장고에 넣지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function ReceiptScanModal({ scan, onPickFile, onClose, onAdd }: ReceiptScanModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={scan !== null} title="영수증으로 추가" busy={isBusy} wide onClose={onClose}>
      {scan && (
        <ReceiptScanContent
          // 다른 사진을 고르면 읽는 중 상태부터 다시 시작한다.
          key={scan.id}
          scan={scan}
          isBusy={isBusy}
          onBusyChange={setIsBusy}
          onPickFile={onPickFile}
          onClose={onClose}
          onAdd={onAdd}
        />
      )}
    </LibraryModal>
  );
}

export default ReceiptScanModal;

type ReceiptFileInputProps = {
  ref?: Ref<HTMLInputElement>;
  onSelect: (file: File) => void;
};

// 화면에는 보이지 않고, 버튼에서 click()으로 사진 고르기 창을 연다.
export function ReceiptFileInput({ ref, onSelect }: ReceiptFileInputProps) {
  return (
    <input
      ref={ref}
      type="file"
      accept={RECEIPT_IMAGE_ACCEPT}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        // 같은 사진을 다시 골라도 change가 일어나도록 비운다.
        event.target.value = "";
        if (file) onSelect(file);
      }}
    />
  );
}

type ReceiptScanContentProps = {
  scan: ReceiptScan;
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onPickFile: (file: File) => void;
  onClose: () => void;
  onAdd: (fridgeId: number, items: FridgeItemBulkCreateItem[]) => Promise<void>;
};

function ReceiptScanContent({ scan, isBusy, onBusyChange, onPickFile, onClose, onAdd }: ReceiptScanContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ScanState>({ status: "scanning" });

  // 요청은 사진을 고를 때 이미 보냈고, 여기서는 결과만 기다린다. 그사이 모달을 닫으면 결과를 버린다.
  useEffect(() => {
    let ignore = false;
    scan.result.then((result) => {
      if (!ignore) setState(result);
    });
    return () => {
      ignore = true;
    };
  }, [scan]);

  if (state.status === "scanning") {
    return (
      <Body>
        <Notice role="status">
          <Spinner size={20} aria-hidden="true" />
          <span>
            <strong>영수증을 읽는 중이에요.</strong>
            사진에 따라 10초쯤 걸릴 수 있어요.
          </span>
        </Notice>
        <ModalActions>
          <ModalButton type="button" onClick={onClose}>
            닫기
          </ModalButton>
        </ModalActions>
      </Body>
    );
  }

  if (state.status === "error" || state.items.length === 0) {
    return (
      <Body>
        {state.status === "error" ? (
          <ModalError message={state.message} />
        ) : (
          <Notice role="status">영수증에서 식재료를 찾지 못했어요. 글자가 잘 보이게 다시 찍어 주세요.</Notice>
        )}
        <ModalActions>
          <ModalButton type="button" onClick={onClose}>
            닫기
          </ModalButton>
          <ModalButton type="button" $primary onClick={() => fileInputRef.current?.click()}>
            다른 사진 고르기
          </ModalButton>
        </ModalActions>
        <ReceiptFileInput ref={fileInputRef} onSelect={onPickFile} />
      </Body>
    );
  }

  return (
    <ReceiptItemsForm
      fridgeId={state.fridgeId}
      items={state.items}
      isBusy={isBusy}
      onBusyChange={onBusyChange}
      onClose={onClose}
      onAdd={onAdd}
    />
  );
}

type ReceiptItemsFormProps = {
  fridgeId: number;
  items: ScannedReceiptItem[];
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onClose: () => void;
  onAdd: (fridgeId: number, items: FridgeItemBulkCreateItem[]) => Promise<void>;
};

function ReceiptItemsForm({ fridgeId, items, isBusy, onBusyChange, onClose, onAdd }: ReceiptItemsFormProps) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState(() => items.map(toRow));
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCount = rows.filter((row) => row.selected).length;
  const allSelected = selectedCount === rows.length;
  const invalidCount = rows.filter(hasRowError).length;
  const canSubmit = selectedCount > 0 && !isBusy;

  // 일부만 골랐을 때 전체 선택 칸을 가운데 줄 상태로 보여 준다. 이 상태는 속성이 없어 DOM에서 직접 바꾼다.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);

  const updateRow = (key: number, values: Partial<Omit<ReceiptRow, "key">>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...values } : row)));
  };

  const selectAll = (selected: boolean) => {
    setRows((prev) => prev.map((row) => ({ ...row, selected })));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    // 고칠 칸이 목록 아래쪽에 있으면 보이지 않으므로, 첫 번째 칸으로 옮겨서 보여 준다.
    if (invalidCount > 0) {
      setSubmitted(true);
      listRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    onBusyChange(true);
    setErrorMessage("");
    try {
      await onAdd(
        fridgeId,
        rows
          .filter((row) => row.selected)
          .map(({ name, emoji, storage, expiresAt }) => ({
            name: name.trim(),
            emoji: emoji.trim(),
            storage,
            // 서버는 유통기한 없음을 null로 받는다.
            expiresAt: expiresAt || null,
          })),
      );
      onBusyChange(false);
      onClose();
    } catch (error) {
      onBusyChange(false);
      setErrorMessage(getAddErrorMessage(error));
    }
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Guide>
        읽은 재료 <strong>{rows.length}개</strong>를 확인해 주세요. 넣지 않을 재료는 체크를 풀고, 잘못 읽은 칸은 고쳐
        주세요. 아이콘·유통기한은 비워 둬도 돼요.
      </Guide>

      <ListHead>
        <SelectAll>
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={(event) => selectAll(event.target.checked)}
            disabled={isBusy}
          />
          <SelectAllText>전체 선택</SelectAllText>
        </SelectAll>
        <ColumnLabel aria-hidden="true">아이콘</ColumnLabel>
        <ColumnLabel aria-hidden="true">이름</ColumnLabel>
        <ColumnLabel aria-hidden="true">보관 위치</ColumnLabel>
        <ColumnLabel aria-hidden="true">유통기한</ColumnLabel>
        <SelectedCount aria-live="polite">
          {selectedCount}/{rows.length}개 선택
        </SelectedCount>
      </ListHead>

      <RowList ref={listRef}>
        {rows.map((row, index) => (
          <ReceiptItemRow
            key={row.key}
            id={`${id}-${row.key}`}
            row={row}
            number={index + 1}
            disabled={isBusy}
            onChange={(values) => updateRow(row.key, values)}
          />
        ))}
      </RowList>

      {submitted && invalidCount > 0 && (
        <ModalError message={`고칠 칸이 있는 재료가 ${invalidCount}개 있어요. 빨갛게 표시된 칸을 확인해 주세요.`} />
      )}
      {errorMessage && <ModalError message={errorMessage} />}

      <ModalActions>
        <ModalButton type="button" onClick={onClose} disabled={isBusy}>
          닫기
        </ModalButton>
        <ModalButton type="submit" $primary disabled={!canSubmit}>
          {isBusy ? "넣는 중..." : selectedCount > 0 ? `냉장고에 ${selectedCount}개 넣기` : "넣을 재료를 골라 주세요"}
        </ModalButton>
      </ModalActions>
    </Form>
  );
}

type ReceiptItemRowProps = {
  id: string;
  row: ReceiptRow;
  number: number;
  disabled: boolean;
  onChange: (values: Partial<Omit<ReceiptRow, "key">>) => void;
};

// 재료가 여러 개라 칸마다 이름표를 달지 않고, 스크린 리더에는 몇 번째 재료의 어느 칸인지 읽어 준다.
// 체크를 푼 재료는 넣지 않으니 칸을 막아 둔다.
function ReceiptItemRow({ id, row, number, disabled, onChange }: ReceiptItemRowProps) {
  const errors = row.selected ? getRowErrors(row) : { name: "", emoji: "", expiresAt: "" };
  const errorId = (field: keyof typeof errors) => (errors[field] ? `${id}-${field}-error` : undefined);
  const label = `${number}번째 재료`;
  const fieldDisabled = disabled || !row.selected;

  return (
    <RowCard $selected={row.selected}>
      <RowCheck
        type="checkbox"
        checked={row.selected}
        onChange={(event) => onChange({ selected: event.target.checked })}
        disabled={disabled}
        aria-label={`${row.name.trim() || label} 넣기`}
      />
      <RowInput
        aria-label={`${label} 아이콘`}
        value={row.emoji}
        onChange={(event) => onChange({ emoji: event.target.value })}
        placeholder="🥕"
        disabled={fieldDisabled}
        autoComplete="off"
        aria-invalid={errors.emoji ? true : undefined}
        aria-describedby={errorId("emoji")}
        $invalid={Boolean(errors.emoji)}
        $center
      />
      <RowInput
        aria-label={`${label} 이름`}
        value={row.name}
        onChange={(event) => onChange({ name: event.target.value })}
        placeholder="재료 이름"
        maxLength={NAME_MAX_LENGTH}
        disabled={fieldDisabled}
        autoComplete="off"
        aria-invalid={errors.name ? true : undefined}
        aria-describedby={errorId("name")}
        $invalid={Boolean(errors.name)}
      />
      <RowFields>
        <RowSelect
          aria-label={`${label} 보관 위치`}
          value={row.storage}
          onChange={(event) => {
            const next = storageOrder.find((item) => item === event.target.value);
            if (next) onChange({ storage: next });
          }}
          disabled={fieldDisabled}
        >
          {storageOrder.map((item) => (
            <option key={item} value={item}>
              {storageLabel[item]}
            </option>
          ))}
        </RowSelect>
        <RowInput
          type="date"
          aria-label={`${label} 유통기한`}
          value={row.expiresAt}
          onChange={(event) => onChange({ expiresAt: event.target.value })}
          disabled={fieldDisabled}
          aria-invalid={errors.expiresAt ? true : undefined}
          aria-describedby={errorId("expiresAt")}
          $invalid={Boolean(errors.expiresAt)}
          $date
        />
      </RowFields>

      {(["emoji", "name", "expiresAt"] as const).map(
        (field) =>
          errors[field] && (
            <RowMessage key={field} id={errorId(field)}>
              <CircleAlert size={14} aria-hidden="true" />
              {errors[field]}
            </RowMessage>
          ),
      )}
    </RowCard>
  );
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Body = styled.div`
  margin-top: 16px;
  display: grid;
  gap: 14px;
`;

// 모달 높이에 맞춰 줄어들어 목록만 스크롤되도록 min-height를 0으로 둔다.
const Form = styled.form`
  margin-top: 16px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Notice = styled.p`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 16px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.5;

  strong {
    display: block;
    font-size: 15px;
    font-weight: 540;
  }

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const Spinner = styled(LoaderCircle)`
  animation: ${spin} 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Guide = styled.p`
  border-radius: 8px;
  background: var(--block-mint);
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.5;
  word-break: keep-all;

  strong {
    font-weight: 540;
  }
`;

// 넓은 화면에서는 재료 줄과 같은 칸으로 나눠 칸 이름을 보여 주고, 좁은 화면에서는 전체 선택과 고른 수만 둔다.
// 재료 줄의 테두리(1px)와 안쪽 여백(12px)만큼 띄워 칸을 맞춘다.
const ListHead = styled.div`
  padding: 0 13px;
  display: grid;
  grid-template-columns: ${ROW_COLUMNS};
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 540;

  @media (max-width: 760px) {
    display: flex;
    justify-content: space-between;
  }
`;

const SelectAll = styled.label`
  position: relative;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: var(--text);
    cursor: inherit;
  }

  &:has(input:disabled) {
    cursor: not-allowed;
  }
`;

// 넓은 화면에서는 체크 칸이 좁아 글자를 숨기고 스크린 리더에만 읽힌다.
const SelectAllText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;

  @media (max-width: 760px) {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }
`;

const ColumnLabel = styled.span`
  @media (max-width: 760px) {
    display: none;
  }
`;

// 넓은 화면에서는 고른 수를 넣기 버튼에서 보여 주므로 좁은 화면에서만 보인다.
const SelectedCount = styled.span`
  display: none;

  @media (max-width: 760px) {
    display: inline;
    font-weight: 330;
  }
`;

const RowList = styled.ul`
  min-height: 140px;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  display: grid;
  align-content: start;
  gap: 8px;
`;

// 넓은 화면에서는 한 줄에 모든 칸을 놓고, 좁은 화면에서는 보관 위치·유통기한을 아랫줄로 내린다.
const RowCard = styled.li<{ $selected: boolean }>`
  border: 1px solid var(--border);
  border-radius: 12px;
  background: ${(props) => (props.$selected ? "var(--surface)" : "var(--surface-soft)")};
  padding: 8px 12px;
  display: grid;
  grid-template-columns: ${ROW_COLUMNS};
  align-items: center;
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: 20px 56px minmax(0, 1fr);
  }
`;

const RowCheck = styled.input`
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--text);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
`;

// 넓은 화면에서는 감싸는 상자 없이 줄의 칸에 바로 놓인다.
// 좁은 화면에서는 줄 전체 폭을 쓰고, 날짜가 달력 아이콘에 가려지지 않게 유통기한 칸을 더 넓게 준다.
const RowFields = styled.div`
  display: contents;

  @media (max-width: 760px) {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 8px;
  }
`;

const RowInput = styled.input<{ $invalid?: boolean; $center?: boolean; $date?: boolean }>`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--border)")};
  border-radius: 8px;
  padding: 10px ${(props) => (props.$center || props.$date ? "8px" : "12px")};
  font-size: 16px;
  text-align: ${(props) => (props.$center ? "center" : "left")};
  color: var(--text);
  background: ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--surface)")};
  outline-color: var(--text);

  &:disabled {
    background: var(--surface-soft);
    color: color-mix(in srgb, var(--text) 45%, transparent);
    cursor: not-allowed;
  }
`;

const RowSelect = styled(ModalSelect)`
  min-height: 44px;
  padding: 10px;

  &:disabled {
    color: color-mix(in srgb, var(--text) 45%, transparent);
  }
`;

const RowMessage = styled.p`
  grid-column: 2 / -1;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 13px;
  font-weight: 540;
  line-height: 1.4;
  color: var(--text-muted);

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;
