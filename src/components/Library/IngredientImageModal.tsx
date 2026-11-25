/*
 * 내가 추가한 도감 재료의 아이콘을 이모지 대신 사진(JPG·PNG)으로 바꾸는 모달이다.
 * 사진을 고르면 줄인 사진을 미리 보여 주고, 저장해야 서버에 올린다. 사진이 있으면 이모지로 되돌릴 수도 있다.
 * 도감 재료의 사진은 그 재료로 넣은 냉장고 재료와 장본 음식에도 함께 보인다.
 * 기본 재료는 모두가 같이 쓰는 재료라서, 올린 사진은 나에게만 보이고 다른 사람에게는 이모지 그대로 보인다.
 * 요청 중에는 모달이 닫히지 않고 버튼을 다시 누를 수 없다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import styled from "@emotion/styled";
import { ImagePlus } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { changeCatalogImage, removeCatalogImage, type CatalogIngredient } from "../../api/ingredientCatalog";
import IngredientIcon from "../Common/IngredientIcon";
import { INGREDIENT_IMAGE_ACCEPT, prepareIngredientImage } from "./ingredientImage";
import LibraryModal, { ModalError } from "./LibraryModal";
import { ModalActions, ModalButton } from "./libraryModalStyles";
import { playSound } from "../../sound/soundEffects";

type IngredientImageModalProps = {
  // null이면 닫힌다.
  ingredient: CatalogIngredient | null;
  onClose: () => void;
  // 서버에 반영된 재료를 받는다. 목록의 같은 재료를 바꿀 때 쓴다.
  onChange: (updated: CatalogIngredient) => void;
};

const serverMessageCodes = [
  "INVALID_INGREDIENT_IMAGE",
  "INGREDIENT_IMAGE_TOO_LARGE",
  "IMAGE_TOO_LARGE",
  "CATALOG_NOT_FOUND",
  NETWORK_ERROR,
];

function getImageErrorMessage(error: unknown, fallback: string) {
  // 서버가 보낸 문구로 무엇이 문제인지(형식·크기, 지워진 재료) 알려 준다.
  if (error instanceof ApiError && serverMessageCodes.includes(error.code)) return error.message;
  return fallback;
}

function IngredientImageModal({ ingredient, onClose, onChange }: IngredientImageModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={ingredient !== null} title="사진으로 바꾸기" busy={isBusy} onClose={onClose}>
      {ingredient && (
        <ImageForm
          // 다른 재료를 열면 고른 사진을 비우고 처음부터 시작한다.
          key={ingredient.id}
          ingredient={ingredient}
          isBusy={isBusy}
          onBusyChange={setIsBusy}
          onClose={onClose}
          onChange={onChange}
        />
      )}
    </LibraryModal>
  );
}

export default IngredientImageModal;

type ImageFormProps = {
  ingredient: CatalogIngredient;
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
  onClose: () => void;
  onChange: (updated: CatalogIngredient) => void;
};

type Selected = { file: File; previewUrl: string };

function ImageForm({ ingredient, isBusy, onBusyChange, onClose, onChange }: ImageFormProps) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 미리보기 주소는 다른 사진을 고르거나 모달을 닫으면 풀어 메모리에 남지 않게 한다.
  useEffect(() => {
    if (!selected) return;
    return () => URL.revokeObjectURL(selected.previewUrl);
  }, [selected]);

  const isWorking = isBusy || isPreparing;

  const handlePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 사진을 다시 골라도 change가 일어나도록 비운다.
    event.target.value = "";
    if (!file || isWorking) return;

    setIsPreparing(true);
    setErrorMessage("");
    const prepared = await prepareIngredientImage(file);
    setIsPreparing(false);
    if (prepared.status === "error") {
      playSound("error");
      setErrorMessage(prepared.message);
      return;
    }
    setSelected({ file: prepared.file, previewUrl: URL.createObjectURL(prepared.file) });
  };

  const run = async (action: () => Promise<CatalogIngredient>, fallback: string) => {
    if (isWorking) return;
    onBusyChange(true);
    setErrorMessage("");
    try {
      const updated = await action();
      playSound("success");
      onChange(updated);
      onBusyChange(false);
      onClose();
    } catch (error) {
      playSound("error");
      onBusyChange(false);
      setErrorMessage(getImageErrorMessage(error, fallback));
    }
  };

  const handleSave = () => {
    if (!selected) return;
    run(() => changeCatalogImage(ingredient.id, selected.file), "사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  const handleRemove = () => {
    run(() => removeCatalogImage(ingredient.id), "이모지로 되돌리지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  return (
    <Body>
      <Preview aria-hidden="true">
        {selected ? (
          <img src={selected.previewUrl} alt="" />
        ) : (
          <span>
            <IngredientIcon emoji={ingredient.emoji} imageUrl={ingredient.imageUrl} />
          </span>
        )}
      </Preview>
      <Caption>
        <strong>{ingredient.name}</strong>
        {selected ? "고른 사진으로 바꿀까요?" : ingredient.imageUrl ? "지금 사진을 쓰고 있어요." : "지금 이모지를 쓰고 있어요."}
      </Caption>

      <HiddenInput
        ref={inputRef}
        id={inputId}
        type="file"
        accept={INGREDIENT_IMAGE_ACCEPT}
        onChange={handlePick}
        disabled={isWorking}
        aria-describedby={hintId}
      />
      <PickButton type="button" onClick={() => inputRef.current?.click()} aria-disabled={isWorking || undefined}>
        <ImagePlus size={18} aria-hidden="true" />
        {isPreparing ? "사진 준비 중..." : selected ? "다른 사진 고르기" : "사진 고르기"}
      </PickButton>
      <Hint id={hintId}>
        JPG·PNG 사진을 정사각형에 가깝게 고르면 잘 보여요. 이 재료로 넣은 냉장고 재료와 장본 음식에도 같은 사진이 보여요.
        {ingredient.basic && " 기본 재료라서 사진은 나에게만 보이고, 다른 사람에게는 이모지 그대로 보여요."}
      </Hint>

      {errorMessage && <ModalError message={errorMessage} />}

      <ModalActions>
        {ingredient.imageUrl && !selected && (
          <ModalButton type="button" onClick={handleRemove} aria-disabled={isWorking || undefined}>
            {isBusy ? "되돌리는 중..." : "이모지로 되돌리기"}
          </ModalButton>
        )}
        <ModalButton type="button" onClick={onClose} disabled={isBusy}>
          취소
        </ModalButton>
        <ModalButton
          type="button"
          $primary
          onClick={handleSave}
          disabled={!selected}
          aria-disabled={isWorking || undefined}
        >
          {isBusy && selected ? "저장 중..." : "저장"}
        </ModalButton>
      </ModalActions>
    </Body>
  );
}

const Body = styled.div`
  margin-top: 16px;
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;

  > div:last-of-type {
    justify-self: stretch;
  }
`;

const Preview = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 24px;
  background: var(--surface-soft);
  display: grid;
  place-items: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
    font-size: 64px;
    line-height: 1;
  }
`;

const Caption = styled.p`
  display: grid;
  gap: 2px;
  font-size: 14px;

  strong {
    font-size: 18px;
    font-weight: 700;
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;

const PickButton = styled.button`
  min-height: 42px;
  border: 1px solid var(--text);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: progress;
    opacity: 0.5;
  }
`;

const Hint = styled.p`
  max-width: 360px;
  font-size: 13px;
  font-weight: 330;
  line-height: 1.5;
  color: var(--text-muted);
  word-break: keep-all;
`;
