/*
 * 지금 보고 있는 냉장고를 피드에 공개하거나 숨기는 카드다.
 * 공개하면 다른 사용자가 재료와 주인 닉네임을 볼 수 있어서, 냉장고 주인만 바꿀 수 있다.
 */
import { useId, useState } from "react";
import styled from "@emotion/styled";
import { changeFridgeVisibility } from "../../api/fridge";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import { getFeedErrorMessage } from "./feedFormat";

type FeedVisibilityCardProps = {
  // 공개 여부를 바꾸면 피드 목록에 내 냉장고가 들어가거나 빠지므로 목록을 다시 불러온다.
  onChange: () => void;
};

type Message = { text: string; error: boolean };

function FeedVisibilityCard({ onChange }: FeedVisibilityCardProps) {
  const descriptionId = useId();
  const list = useFridgeStore((state) => state.list);
  const selectedFridgeId = useFridgeStore((state) => state.selectedFridgeId);
  const updateFridge = useFridgeStore((state) => state.updateFridge);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const fridge = list.status === "success" ? pickFridge(list.fridges, selectedFridgeId) : null;
  if (!fridge) return null;

  const isOwner = fridge.role === "OWNER";
  const isDisabled = !isOwner || isSaving;

  const handleToggle = async () => {
    if (isDisabled) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await changeFridgeVisibility(fridge.id, !fridge.isPublic);
      updateFridge(updated);
      setMessage({
        text: updated.isPublic ? "피드에 공개했어요. 이제 다른 사람이 구경할 수 있어요." : "피드에서 숨겼어요.",
        error: false,
      });
      onChange();
    } catch (error) {
      setMessage({
        text: getFeedErrorMessage(error, "공개 여부를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요."),
        error: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const description = !isOwner
    ? "냉장고 주인만 공개 여부를 바꿀 수 있어요."
    : fridge.isPublic
      ? "피드에 공개 중이에요. 재료와 주인 닉네임이 다른 사람에게 보여요."
      : "공개하면 다른 사람이 이 냉장고의 재료를 구경하고 좋아요를 누를 수 있어요.";

  return (
    <Card>
      <Row>
        <Text>
          <strong>{fridge.name}</strong>
          <p id={descriptionId}>{description}</p>
        </Text>
        <Switch
          type="button"
          role="switch"
          aria-checked={fridge.isPublic}
          aria-disabled={isDisabled}
          aria-describedby={descriptionId}
          onClick={handleToggle}
          $on={fridge.isPublic}
        >
          <span aria-hidden="true" className="track" />
          {isSaving ? "바꾸는 중" : "피드에 공개"}
        </Switch>
      </Row>
      {message && (
        <Feedback role={message.error ? "alert" : "status"} $error={message.error}>
          {message.text}
        </Feedback>
      )}
    </Card>
  );
}

export default FeedVisibilityCard;

const Card = styled.section`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 18px 22px;
  display: grid;
  gap: 12px;

  @media (max-width: 760px) {
    padding: 16px;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
`;

const Text = styled.div`
  min-width: 0;
  flex: 1 1 260px;
  display: grid;
  gap: 4px;

  strong {
    font-size: 18px;
    font-weight: 540;
    overflow-wrap: anywhere;
  }

  p {
    font-size: 14px;
    font-weight: 330;
    line-height: 1.5;
  }
`;

// 레시피 화면의 '임박 재료 우선 사용' 토글과 같은 모양이다.
const Switch = styled.button<{ $on: boolean }>`
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 6px 16px 6px 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  .track {
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: ${(props) => (props.$on ? "var(--text)" : "var(--border)")};
    position: relative;
    transition: background 0.24s ease;
  }

  .track::after {
    content: "";
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--surface);
    position: absolute;
    top: 3px;
    left: ${(props) => (props.$on ? "21px" : "3px")};
    transition: left 0.24s ease;
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    .track,
    .track::after {
      transition: none;
    }
  }
`;

const Feedback = styled.p<{ $error: boolean }>`
  border-radius: 8px;
  background: ${(props) => (props.$error ? "var(--block-pink)" : "var(--block-mint)")};
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
`;
