/*
 * 피드 맨 위의 내 냉장고 카드다. 지금 보고 있는 냉장고를 피드에 공개하거나 숨기고,
 * 공개 여부와 상관없이 그 냉장고가 피드에 어떻게 보이는지 미리 보여 준다.
 * 공개하면 다른 사용자가 재료와 주인 닉네임을 볼 수 있어서, 냉장고 주인만 공개 여부를 바꿀 수 있다.
 */
import { useEffect, useId, useState } from "react";
import styled from "@emotion/styled";
import { getFeedFridge, type FeedFridge, type FeedReaction } from "../../api/feed";
import { changeFridgeVisibility, type Fridge } from "../../api/fridge";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import FeedCard from "./FeedCard";
import { getFeedErrorMessage } from "./feedFormat";
import { OutlineButton, Skeleton } from "./feedStyles";

type MyFridgeCardProps = {
  // 공개 여부를 바꾸면 저장한 냉장고 목록이 달라질 수 있어 피드 목록을 다시 불러온다.
  onChange: () => void;
};

type Message = { text: string; error: boolean };

function MyFridgeCard({ onChange }: MyFridgeCardProps) {
  const titleId = useId();
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
        text: updated.isPublic ? "피드에 공개했어요. 이제 다른 사람이 구경할 수 있어요." : "피드에서 숨겼어요. 이제 멤버만 볼 수 있어요.",
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
    <Card aria-labelledby={titleId}>
      <Row>
        <Text>
          <h2 id={titleId}>내 냉장고</h2>
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
      {/* 공개 여부가 바뀌면 미리보기를 다시 불러와 바뀐 모습(좋아요 버튼 등)을 보여 준다. */}
      <MyFridgePreview key={`${fridge.id}-${fridge.isPublic}`} fridge={fridge} />
    </Card>
  );
}

export default MyFridgeCard;

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; fridge: FeedFridge };

function MyFridgePreview({ fridge }: { fridge: Fridge }) {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    getFeedFridge(fridge.id).then(
      (detail) => {
        if (!ignore) setPreview({ status: "success", fridge: detail.fridge });
      },
      (error: unknown) => {
        if (!ignore) {
          setPreview({
            status: "error",
            message: getFeedErrorMessage(error, "미리보기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
          });
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridge.id, attempt]);

  const handleReactionChange = (_fridgeId: number, update: (prev: FeedReaction) => FeedReaction) => {
    setPreview((prev) => (prev.status === "success" ? { ...prev, fridge: { ...prev.fridge, ...update(prev.fridge) } } : prev));
  };

  return (
    <Preview>
      <PreviewLabel $public={fridge.isPublic}>
        {fridge.isPublic ? "다른 사람에게 이렇게 보여요" : "나만 보는 미리보기"}
      </PreviewLabel>
      {preview.status === "loading" && <Skeleton aria-hidden="true" $height={180} />}
      {preview.status === "error" && (
        <PreviewError role="alert">
          <p>{preview.message}</p>
          <OutlineButton
            type="button"
            onClick={() => {
              setPreview({ status: "loading" });
              setAttempt((prev) => prev + 1);
            }}
          >
            다시 시도
          </OutlineButton>
        </PreviewError>
      )}
      {preview.status === "success" && (
        <FeedCard fridge={preview.fridge} onReactionChange={handleReactionChange} preview />
      )}
    </Preview>
  );
}

const Card = styled.section`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 18px 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;

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

  h2 {
    font-size: 20px;
    font-weight: 540;
    letter-spacing: -0.2px;
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

const Preview = styled.div`
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;

  @media (max-width: 760px) {
    padding: 10px;
  }
`;

const PreviewLabel = styled.p<{ $public: boolean }>`
  width: fit-content;
  border-radius: 999px;
  background: ${(props) => (props.$public ? "var(--block-lime)" : "var(--surface)")};
  border: 1px solid ${(props) => (props.$public ? "var(--block-lime)" : "var(--border)")};
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 540;
`;

const PreviewError = styled.div`
  display: grid;
  justify-items: start;
  gap: 8px;
  font-size: 14px;
`;
