/*
 * 식재료 도감에 새 재료를 추가하는 모달이다.
 * 이름, 아이콘, 카테고리, 기본 유통기한을 받고, 칸을 벗어나거나 추가를 누르면 형식을 검사해 알려 준다.
 * 추가가 끝날 때까지 버튼을 막고, 실패하면 모달을 연 채로 오류를 보여 준다.
 */
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { CatalogIngredientCreateRequest, IngredientCategory } from "../../api/ingredientCatalog";
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

type IngredientAddModalProps = {
  open: boolean;
  defaultCategory: IngredientCategory;
  existingNames: string[];
  onClose: () => void;
  onAdd: (values: CatalogIngredientCreateRequest) => Promise<void>;
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

function getAddErrorMessage(error: unknown) {
  // INVALID_INPUT은 서버가 검증에 실패한 첫 번째 항목의 안내 문구를 보낸다.
  if (error instanceof ApiError && (error.code === "INVALID_INPUT" || error.code === NETWORK_ERROR)) {
    return error.message;
  }
  return "추가하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function IngredientAddModal({ open, defaultCategory, existingNames, onClose, onAdd }: IngredientAddModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={open} title="새 재료 추가" busy={isBusy} onClose={onClose}>
      <IngredientAddForm
        defaultCategory={defaultCategory}
        existingNames={existingNames}
        isBusy={isBusy}
        onBusyChange={setIsBusy}
        onClose={onClose}
        onAdd={onAdd}
      />
    </LibraryModal>
  );
}

export default IngredientAddModal;

type IngredientAddFormProps = {
  defaultCategory: IngredientCategory;
  existingNames: string[];
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onClose: () => void;
  onAdd: (values: CatalogIngredientCreateRequest) => Promise<void>;
};

function IngredientAddForm({
  defaultCategory,
  existingNames,
  isBusy,
  onBusyChange,
  onClose,
  onAdd,
}: IngredientAddFormProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(defaultIcon[defaultCategory]);
  const [category, setCategory] = useState(defaultCategory);
  const [shelfLifeDays, setShelfLifeDays] = useState("7");
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
      await onAdd({ name: trimmedName, emoji: trimmedIcon, category, shelfLifeDays: days });
      onBusyChange(false);
      onClose();
    } catch (error) {
      onBusyChange(false);
      if (error instanceof ApiError && error.code === "DUPLICATE_CATALOG_NAME") {
        setTakenName(trimmedName);
      } else {
        setErrorMessage(getAddErrorMessage(error));
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
          {isBusy ? "추가하는 중..." : "추가"}
        </ModalButton>
      </ModalActions>
    </ModalForm>
  );
}
