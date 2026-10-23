/*
 * 도감 재료를 냉장고에 바로 넣는 모달이다.
 * 이름·아이콘은 도감 값으로 채워 두고 고칠 수 있게 하며, 보관 위치(냉장실·냉동실·실온)를 고른다.
 * 유통기한은 서버가 오늘부터 도감의 기본 유통기한을 더해 정하므로, 화면에서는 미리 알려 주기만 한다.
 */
import { useId, useState } from "react";
import type { FormEvent } from "react";
import styled from "@emotion/styled";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { StorageType } from "../../api/fridge";
import type { CatalogIngredient } from "../../api/ingredientCatalog";
import { formatDate, getDateAfter } from "./libraryDate";
import LibraryModal, { ModalError, ModalField } from "./LibraryModal";
import {
  ModalActions,
  ModalButton,
  ModalFieldRow,
  ModalFieldWrapper,
  ModalForm,
  ModalLabel,
  ModalSelect,
} from "./libraryModalStyles";
import { storageLabel, storageOrder } from "./libraryStorage";
import { getEmojiError } from "./libraryValidation";

export type FridgeAddValues = {
  name: string;
  emoji: string;
  storage: StorageType;
};

type FridgeAddModalProps = {
  // null이면 닫힌다.
  ingredient: CatalogIngredient | null;
  onClose: () => void;
  onAdd: (ingredient: CatalogIngredient, values: FridgeAddValues) => Promise<void>;
};

// 냉장고 재료 이름은 도감 이름(30자)보다 길게 50자까지 쓸 수 있다.
const NAME_MAX_LENGTH = 50;

const serverMessageCodes = ["INVALID_INPUT", "CATALOG_NOT_FOUND", "FRIDGE_NOT_FOUND", NETWORK_ERROR];

function getAddErrorMessage(error: unknown) {
  // 서버가 보낸 문구로 무엇이 문제인지(입력값, 지워진 도감 재료, 냉장고 접근) 알려 준다.
  if (error instanceof ApiError && serverMessageCodes.includes(error.code)) return error.message;
  return "냉장고에 넣지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function FridgeAddModal({ ingredient, onClose, onAdd }: FridgeAddModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={ingredient !== null} title="냉장고에 넣기" busy={isBusy} onClose={onClose}>
      {ingredient && (
        <FridgeAddForm
          // 다른 재료를 열면 입력값을 그 재료 기준으로 처음부터 다시 채운다.
          key={ingredient.id}
          ingredient={ingredient}
          isBusy={isBusy}
          onBusyChange={setIsBusy}
          onClose={onClose}
          onAdd={onAdd}
        />
      )}
    </LibraryModal>
  );
}

export default FridgeAddModal;

type FridgeAddFormProps = {
  ingredient: CatalogIngredient;
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onClose: () => void;
  onAdd: (ingredient: CatalogIngredient, values: FridgeAddValues) => Promise<void>;
};

function FridgeAddForm({ ingredient, isBusy, onBusyChange, onClose, onAdd }: FridgeAddFormProps) {
  const id = useId();
  const [name, setName] = useState(ingredient.name);
  const [icon, setIcon] = useState(ingredient.emoji);
  const [storage, setStorage] = useState<StorageType>("FRIDGE");
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedName = name.trim();
  const trimmedIcon = icon.trim();

  // 도감 값으로 채워 두고 시작하므로, 사용자가 지우거나 고쳤을 때 바로 알려 준다.
  const nameError = trimmedName ? "" : "이름을 입력해 주세요.";
  const iconError = trimmedIcon ? getEmojiError(trimmedIcon) : "";
  const canSubmit = !nameError && !iconError && !isBusy;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    onBusyChange(true);
    setErrorMessage("");
    try {
      await onAdd(ingredient, { name: trimmedName, emoji: trimmedIcon, storage });
      onBusyChange(false);
      onClose();
    } catch (error) {
      onBusyChange(false);
      setErrorMessage(getAddErrorMessage(error));
    }
  };

  return (
    <ModalForm onSubmit={handleSubmit} noValidate>
      <ModalField
        id={`${id}-name`}
        label="이름"
        value={name}
        onChange={setName}
        maxLength={NAME_MAX_LENGTH}
        disabled={isBusy}
        error={nameError}
        hint={`도감 이름 그대로 넣거나 고칠 수 있어요. ${NAME_MAX_LENGTH}자까지`}
      />

      <ModalFieldRow>
        <ModalField
          id={`${id}-icon`}
          label="아이콘"
          value={icon}
          onChange={setIcon}
          placeholder="예: 🥕"
          disabled={isBusy}
          error={iconError}
          hint="비워 두면 아이콘 없이 넣어요."
        />

        <ModalFieldWrapper>
          <ModalLabel htmlFor={`${id}-storage`}>보관 위치</ModalLabel>
          <ModalSelect
            id={`${id}-storage`}
            value={storage}
            onChange={(event) => {
              const next = storageOrder.find((item) => item === event.target.value);
              if (next) setStorage(next);
            }}
            disabled={isBusy}
          >
            {storageOrder.map((item) => (
              <option key={item} value={item}>
                {storageLabel[item]}
              </option>
            ))}
          </ModalSelect>
        </ModalFieldWrapper>
      </ModalFieldRow>

      <ExpiryNote>
        유통기한은 오늘부터 기본 유통기한 {ingredient.shelfLifeDays}일 뒤인{" "}
        <strong>{formatDate(getDateAfter(ingredient.shelfLifeDays))}</strong>로 정해져요.
      </ExpiryNote>

      {errorMessage && <ModalError message={errorMessage} />}

      <ModalActions>
        <ModalButton type="button" onClick={onClose} disabled={isBusy}>
          닫기
        </ModalButton>
        <ModalButton type="submit" $primary disabled={!canSubmit}>
          {isBusy ? "넣는 중..." : "넣기"}
        </ModalButton>
      </ModalActions>
    </ModalForm>
  );
}

const ExpiryNote = styled.p`
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
