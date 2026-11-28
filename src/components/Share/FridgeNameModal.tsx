/*
 * 냉장고 이름을 받는 모달이다. 공유 화면에서 주인이 이름을 바꿀 때와, 속한 냉장고가 없을 때 새 냉장고를 만들 때 쓴다.
 * 이름은 비울 수 없고 서버와 같이 50자까지 쓴다. 요청이 끝날 때까지 버튼을 막고, 실패하면 모달을 연 채 오류를 보여 준다.
 */
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import LibraryModal, { ModalError, ModalField } from "../Library/LibraryModal";
import { ModalActions, ModalButton, ModalForm } from "../Library/libraryModalStyles";
import { playSound } from "../../sound/soundEffects";

const NAME_MAX_LENGTH = 50;

// 입력값 오류, 주인이 아님, 이미 냉장고가 있음, 냉장고 접근 오류는 서버 문구로 무엇이 문제인지 알려 준다.
const serverMessageCodes = [
  "INVALID_INPUT",
  "FRIDGE_OWNER_ONLY",
  "FRIDGE_ALREADY_EXISTS",
  "FRIDGE_NOT_FOUND",
  NETWORK_ERROR,
];

type FridgeNameModalProps = {
  open: boolean;
  title: string;
  // 처음 채워 둘 이름. 이름을 바꿀 때는 지금 이름을 넘긴다.
  initialName: string;
  submitLabel: string;
  busyLabel: string;
  // 서버 문구를 보여 주지 않는 실패일 때의 안내
  fallbackError: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

function FridgeNameModal({ open, ...formProps }: FridgeNameModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <LibraryModal open={open} title={formProps.title} busy={isBusy} onClose={formProps.onClose}>
      <FridgeNameForm {...formProps} isBusy={isBusy} onBusyChange={setIsBusy} />
    </LibraryModal>
  );
}

export default FridgeNameModal;

type FridgeNameFormProps = Omit<FridgeNameModalProps, "open"> & {
  isBusy: boolean;
  onBusyChange: (isBusy: boolean) => void;
};

function FridgeNameForm({
  initialName,
  submitLabel,
  busyLabel,
  fallbackError,
  isBusy,
  onBusyChange,
  onClose,
  onSubmit,
}: FridgeNameFormProps) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedName = name.trim();
  const nameError = trimmedName ? "" : "냉장고 이름을 입력해 주세요.";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (nameError || isBusy) return;

    onBusyChange(true);
    setErrorMessage("");
    try {
      await onSubmit(trimmedName);
      playSound("success");
      onBusyChange(false);
      onClose();
    } catch (error) {
      playSound("error");
      onBusyChange(false);
      setErrorMessage(error instanceof ApiError && serverMessageCodes.includes(error.code) ? error.message : fallbackError);
    }
  };

  return (
    <ModalForm onSubmit={handleSubmit} noValidate>
      <ModalField
        id={`${id}-name`}
        label="냉장고 이름"
        value={name}
        onChange={setName}
        placeholder="예: 우리 집 냉장고"
        maxLength={NAME_MAX_LENGTH}
        disabled={isBusy}
        error={submitted ? nameError : ""}
        hint={`멤버 모두에게 보여요. ${NAME_MAX_LENGTH}자까지`}
      />

      {errorMessage && <ModalError message={errorMessage} />}

      <ModalActions>
        <ModalButton type="button" onClick={onClose} disabled={isBusy}>
          닫기
        </ModalButton>
        <ModalButton type="submit" $primary disabled={isBusy || trimmedName === ""}>
          {isBusy ? busyLabel : submitLabel}
        </ModalButton>
      </ModalActions>
    </ModalForm>
  );
}
