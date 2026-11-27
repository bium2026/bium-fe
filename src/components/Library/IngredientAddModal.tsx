/*
 * 식재료 도감에 새 재료를 추가하거나, 내가 추가한 재료를 고치는 모달이다.
 * 이름, 아이콘, 카테고리, 기본 유통기한을 받고, 칸을 벗어나거나 추가·저장을 누르면 형식을 검사해 알려 준다.
 * 고칠 때는 그 재료의 값으로 채워 두고 시작한다.
 * 요청이 끝날 때까지 버튼을 막고, 실패하면 모달을 연 채로 오류를 보여 준다.
 */
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type {
  CatalogIngredient,
  CatalogIngredientCreateRequest,
  IngredientCategory,
} from "../../api/ingredientCatalog";
import { categoryLabel, categoryOrder } from "./libraryCategories";
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
import { getEmojiError } from "./libraryValidation";
import { playSound } from "../../sound/soundEffects";

type IngredientAddModalProps = {
  open: boolean;
  // 고칠 재료. 없으면 새 재료를 추가한다.
  ingredient?: CatalogIngredient | null;
  defaultCategory: IngredientCategory;
  // 이미 도감에 있는 이름. 고칠 때는 그 재료의 이름을 빼고 넘긴다.
  existingNames: string[];
  onClose: () => void;
  onSubmit: (values: CatalogIngredientCreateRequest) => Promise<void>;
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

// INVALID_INPUT은 서버가 검증에 실패한 첫 번째 항목의 안내 문구를, CATALOG_NOT_FOUND는 다른 기기에서 지운 재료라고 알려 준다.
const serverMessageCodes = ["INVALID_INPUT", "CATALOG_NOT_FOUND", NETWORK_ERROR];

function getSubmitErrorMessage(error: unknown, isEdit: boolean) {
  if (error instanceof ApiError && serverMessageCodes.includes(error.code)) return error.message;
  return isEdit ? "저장하지 못했어요. 잠시 후 다시 시도해 주세요." : "추가하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function IngredientAddModal({
  open,
  ingredient = null,
  defaultCategory,
  existingNames,
  onClose,
  onSubmit,
}: IngredientAddModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={open} title={ingredient ? "재료 수정" : "새 재료 추가"} busy={isBusy} onClose={onClose}>
      <IngredientAddForm
        // 다른 재료를 열면 입력값을 그 재료 기준으로 처음부터 다시 채운다.
        key={ingredient?.id ?? "new"}
        ingredient={ingredient}
        defaultCategory={defaultCategory}
        existingNames={existingNames}
        isBusy={isBusy}
        onBusyChange={setIsBusy}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </LibraryModal>
  );
}

export default IngredientAddModal;

type IngredientAddFormProps = {
  ingredient: CatalogIngredient | null;
  defaultCategory: IngredientCategory;
  existingNames: string[];
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onClose: () => void;
  onSubmit: (values: CatalogIngredientCreateRequest) => Promise<void>;
};

function IngredientAddForm({
  ingredient,
  defaultCategory,
  existingNames,
  isBusy,
  onBusyChange,
  onClose,
  onSubmit,
}: IngredientAddFormProps) {
  const id = useId();
  const isEdit = ingredient !== null;
  const [name, setName] = useState(ingredient?.name ?? "");
  const [icon, setIcon] = useState(ingredient?.emoji ?? defaultIcon[defaultCategory]);
  const [category, setCategory] = useState(ingredient?.category ?? defaultCategory);
  const [shelfLifeDays, setShelfLifeDays] = useState(String(ingredient?.shelfLifeDays ?? 7));
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
    icon: trimmedIcon ? getEmojiError(trimmedIcon) : "아이콘을 입력해 주세요.",
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
      await onSubmit({ name: trimmedName, emoji: trimmedIcon, category, shelfLifeDays: days });
      playSound("success");
      onBusyChange(false);
      onClose();
    } catch (error) {
      playSound("error");
      onBusyChange(false);
      if (error instanceof ApiError && error.code === "DUPLICATE_CATALOG_NAME") {
        setTakenName(trimmedName);
      } else {
        setErrorMessage(getSubmitErrorMessage(error, isEdit));
      }
    }
  };

  return (
    <ModalForm onSubmit={handleSubmit} noValidate>
      <ModalField
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

      <ModalFieldRow>
        <ModalField
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

        <ModalFieldWrapper>
          <ModalLabel htmlFor={`${id}-category`}>카테고리</ModalLabel>
          <ModalSelect
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
          </ModalSelect>
        </ModalFieldWrapper>
      </ModalFieldRow>

      <ModalField
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

      {errorMessage && <ModalError message={errorMessage} />}

      <ModalActions>
        <ModalButton type="button" onClick={onClose} disabled={isBusy}>
          닫기
        </ModalButton>
        <ModalButton type="submit" $primary disabled={!canSubmit}>
          {isEdit ? (isBusy ? "저장하는 중..." : "저장") : isBusy ? "추가하는 중..." : "추가"}
        </ModalButton>
      </ModalActions>
    </ModalForm>
  );
}
