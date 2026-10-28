/*
 * 영수증 사진에서 AI가 읽은 재료를 보여 주고, 고치거나 뺀 뒤 냉장고에 한꺼번에 넣는 모달이다.
 * 여는 쪽에서 사진 읽기 요청(scan)을 넘기고, scan이 null이면 닫힌다.
 * 읽는 중에 닫으면 결과를 버리고, 냉장고에 넣는 중에는 닫히지 않는다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, Ref } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { FridgeItemBulkCreateItem, StorageType } from "../../api/fridge";
import type { ScannedReceiptItem } from "../../api/receipt";
import LibraryModal, { ModalError } from "../Library/LibraryModal";
import { ModalActions, ModalButton, ModalSelect } from "../Library/libraryModalStyles";
import { storageLabel, storageOrder } from "../Library/libraryStorage";
import { getEmojiError } from "../Library/libraryValidation";
import { RECEIPT_IMAGE_ACCEPT, type ReceiptScan } from "./receiptScan";

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

type ReceiptRow = ReceiptItemValues & { key: number };

// scannedCount는 처음 읽은 재료 수다. 0이면 못 찾은 것이고, 0이 아닌데 줄이 없으면 사용자가 모두 뺀 것이다.
type ScanState =
  | { status: "scanning" }
  | { status: "error"; message: string }
  | { status: "done"; fridgeId: number; scannedCount: number };

// 냉장고 재료 이름은 50자까지 쓸 수 있다.
const NAME_MAX_LENGTH = 50;

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

function hasRowError(row: ReceiptRow) {
  return Object.values(getRowErrors(row)).some(Boolean);
}

function getAddErrorMessage(error: unknown) {
  // 서버가 보낸 문구로 무엇이 문제인지(입력값, 냉장고 접근, 연결) 알려 준다.
  if (error instanceof ApiError && addErrorCodes.includes(error.code)) return error.message;
  return "냉장고에 넣지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function ReceiptScanModal({ scan, onPickFile, onClose, onAdd }: ReceiptScanModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={scan !== null} title="영수증으로 추가" busy={isBusy} onClose={onClose}>
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
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ScanState>({ status: "scanning" });
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // 요청은 사진을 고를 때 이미 보냈고, 여기서는 결과만 기다린다. 그사이 모달을 닫으면 결과를 버린다.
  useEffect(() => {
    let ignore = false;
    scan.result.then((result) => {
      if (ignore) return;
      if (result.status === "error") {
        setState(result);
        return;
      }
      setRows(result.items.map(toRow));
      setState({ status: "done", fridgeId: result.fridgeId, scannedCount: result.items.length });
    });
    return () => {
      ignore = true;
    };
  }, [scan]);

  const pickAgain = () => fileInputRef.current?.click();

  const updateRow = (key: number, values: Partial<ReceiptItemValues>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...values } : row)));
  };

  const removeRow = (key: number) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

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

  if (state.status === "error" || rows.length === 0) {
    return (
      <Body>
        {state.status === "error" ? (
          <ModalError message={state.message} />
        ) : (
          <Notice role="status">
            {state.scannedCount === 0
              ? "영수증에서 식재료를 찾지 못했어요. 글자가 잘 보이게 다시 찍어 주세요."
              : "넣을 재료를 모두 뺐어요."}
          </Notice>
        )}
        <ModalActions>
          <ModalButton type="button" onClick={onClose}>
            닫기
          </ModalButton>
          <ModalButton type="button" $primary onClick={pickAgain}>
            다른 사진 고르기
          </ModalButton>
        </ModalActions>
        <ReceiptFileInput ref={fileInputRef} onSelect={onPickFile} />
      </Body>
    );
  }

  const canSubmit = !isBusy && !rows.some(hasRowError);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    onBusyChange(true);
    setErrorMessage("");
    try {
      await onAdd(
        state.fridgeId,
        rows.map(({ name, emoji, storage, expiresAt }) => ({
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
        읽은 재료 <strong>{rows.length}개</strong>의 아이콘·이름·보관 위치·유통기한을 확인하고, 잘못 읽은 재료는
        고치거나 빼 주세요.
      </Guide>

      <RowList>
        {rows.map((row, index) => (
          <ReceiptItemRow
            key={row.key}
            id={`${id}-${row.key}`}
            row={row}
            number={index + 1}
            disabled={isBusy}
            onChange={(values) => updateRow(row.key, values)}
            onRemove={() => removeRow(row.key)}
          />
        ))}
      </RowList>

      {errorMessage && <ModalError message={errorMessage} />}

      <ModalActions>
        <ModalButton type="button" onClick={onClose} disabled={isBusy}>
          닫기
        </ModalButton>
        <ModalButton type="submit" $primary disabled={!canSubmit}>
          {isBusy ? "넣는 중..." : `냉장고에 ${rows.length}개 넣기`}
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
  onChange: (values: Partial<ReceiptItemValues>) => void;
  onRemove: () => void;
};

// 재료가 여러 개라 칸마다 이름표를 달지 않고, 스크린 리더에는 몇 번째 재료의 어느 칸인지 읽어 준다.
function ReceiptItemRow({ id, row, number, disabled, onChange, onRemove }: ReceiptItemRowProps) {
  const errors = getRowErrors(row);
  const errorId = (field: keyof typeof errors) => (errors[field] ? `${id}-${field}-error` : undefined);
  const label = `${number}번째 재료`;

  return (
    <RowCard>
      <RowLine>
        <RowInput
          aria-label={`${label} 아이콘`}
          value={row.emoji}
          onChange={(event) => onChange({ emoji: event.target.value })}
          placeholder="🥕"
          disabled={disabled}
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
          disabled={disabled}
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errorId("name")}
          $invalid={Boolean(errors.name)}
        />
        <RemoveButton
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`${row.name.trim() || label} 빼기`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </RemoveButton>
      </RowLine>

      <RowFields>
        <ModalSelect
          aria-label={`${label} 보관 위치`}
          value={row.storage}
          onChange={(event) => {
            const next = storageOrder.find((item) => item === event.target.value);
            if (next) onChange({ storage: next });
          }}
          disabled={disabled}
        >
          {storageOrder.map((item) => (
            <option key={item} value={item}>
              {storageLabel[item]}
            </option>
          ))}
        </ModalSelect>
        <RowInput
          type="date"
          aria-label={`${label} 유통기한`}
          value={row.expiresAt}
          onChange={(event) => onChange({ expiresAt: event.target.value })}
          disabled={disabled}
          aria-invalid={errors.expiresAt ? true : undefined}
          aria-describedby={errorId("expiresAt")}
          $invalid={Boolean(errors.expiresAt)}
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

const Form = styled.form`
  margin-top: 16px;
  display: grid;
  gap: 14px;
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

const RowList = styled.ul`
  list-style: none;
  display: grid;
  gap: 10px;
`;

const RowCard = styled.li`
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
`;

const RowLine = styled.div`
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
`;

const RowFields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const RowInput = styled.input<{ $invalid?: boolean; $center?: boolean }>`
  width: 100%;
  min-width: 0;
  min-height: 48px;
  border: 1px solid ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--border)")};
  border-radius: 8px;
  padding: 12px ${(props) => (props.$center ? "8px" : "14px")};
  font-size: 16px;
  text-align: ${(props) => (props.$center ? "center" : "left")};
  color: var(--text);
  background: ${(props) => (props.$invalid ? "var(--block-pink)" : "var(--surface)")};
  outline-color: var(--text);

  &:disabled {
    background: var(--surface-soft);
    cursor: not-allowed;
  }
`;

const RemoveButton = styled.button`
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--block-pink);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

const RowMessage = styled.p`
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
