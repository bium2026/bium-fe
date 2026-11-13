/*
 * 피드 옆의 내 냉장고 카드다. 지금 보고 있는 냉장고를 피드에 공개하거나 숨기고,
 * 공개 여부와 상관없이 그 냉장고가 피드에 어떻게 보이는지(재료 수, 좋아요 수, 냉장고 칸) 늘 보여 준다.
 * 공개하면 다른 사용자가 재료와 주인 닉네임을 볼 수 있어서, 냉장고 주인만 공개 여부를 바꿀 수 있다.
 * 목록의 파스텔 카드와 구분되게 진한 남색 블록으로 칠한다.
 */
import { useEffect, useId, useState } from "react";
import styled from "@emotion/styled";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { getFeedFridge, type FeedFridge } from "../../api/feed";
import { changeFridgeVisibility, type Fridge } from "../../api/fridge";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import FridgeShelves from "./FridgeShelves";
import { getFeedErrorMessage } from "./feedFormat";
import { Skeleton } from "./feedStyles";

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
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  // 냉장고 목록은 헤더가 불러온다. 목록을 받기 전·받지 못했을 때·속한 냉장고가 없을 때도 이유를 알려 준다.
  if (list.status !== "success") {
    if (list.status !== "error") return <Skeleton aria-hidden="true" $height={240} />;
    return (
      <Card aria-labelledby={titleId}>
        <Eyebrow>내 냉장고</Eyebrow>
        <TitleRow>
          <h2 id={titleId}>냉장고 목록을 불러오지 못했어요.</h2>
        </TitleRow>
        <Note role="alert">잠시 후 다시 시도해 주세요. 목록을 불러오면 공개 여부를 바꿀 수 있어요.</Note>
        <LightButton type="button" onClick={() => loadFridges()}>
          다시 시도
        </LightButton>
      </Card>
    );
  }

  const fridge = pickFridge(list.fridges, selectedFridgeId);
  if (!fridge) {
    return (
      <Card aria-labelledby={titleId}>
        <Eyebrow>내 냉장고</Eyebrow>
        <TitleRow>
          <h2 id={titleId}>아직 속한 냉장고가 없어요.</h2>
        </TitleRow>
        <Note>헤더 오른쪽 냉장고 버튼에서 받은 초대 코드로 참여할 수 있어요.</Note>
      </Card>
    );
  }

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
      ? "재료와 주인 닉네임이 다른 사람에게 보여요."
      : "공개하면 다른 사람이 재료를 구경하고 좋아요를 누를 수 있어요.";

  return (
    <Card aria-labelledby={titleId}>
      <Eyebrow>내 냉장고</Eyebrow>
      <TitleRow>
        <h2 id={titleId}>{fridge.name}</h2>
        <StatusPill $public={fridge.isPublic}>{fridge.isPublic ? "공개 중" : "나만 보기"}</StatusPill>
      </TitleRow>

      {/* 공개 여부가 바뀌면 미리보기를 다시 불러와 바뀐 모습을 보여 준다. */}
      <MyFridgePreview key={`${fridge.id}-${fridge.isPublic}`} fridge={fridge} />

      <Controls>
        <ControlRow>
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
          <LightLink to={`/feed/${fridge.id}`} aria-label={`${fridge.name} 구경하기`}>
            {fridge.isPublic ? "보이는 모습" : "미리보기"}
            <ArrowRight size={16} aria-hidden="true" />
          </LightLink>
        </ControlRow>
        <p id={descriptionId}>{description}</p>
      </Controls>
      {message && (
        <Feedback role={message.error ? "alert" : "status"} $error={message.error}>
          {message.text}
        </Feedback>
      )}
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

  if (preview.status === "loading") return <Skeleton aria-hidden="true" $height={200} />;

  if (preview.status === "error") {
    return (
      <PreviewError role="alert">
        <p>{preview.message}</p>
        <LightButton
          type="button"
          onClick={() => {
            setPreview({ status: "loading" });
            setAttempt((prev) => prev + 1);
          }}
        >
          다시 시도
        </LightButton>
      </PreviewError>
    );
  }

  const summary = preview.fridge;
  return (
    <>
      <Stats>
        <div>
          <dt>재료</dt>
          <dd>{summary.itemCount}</dd>
        </div>
        <div>
          <dt>좋아요</dt>
          <dd>{summary.likeCount}</dd>
        </div>
        <div>
          <dt>3일 안에</dt>
          <dd>{summary.expiringCount}</dd>
        </div>
      </Stats>
      {/* 좁은 화면에서는 피드를 밀어내지 않게 냉장고 칸 그림을 빼고 숫자만 남긴다. 미리보기 링크로 볼 수 있다. */}
      <ShelvesArea>
        {summary.itemCount === 0 ? (
          <EmptyFridge>아직 비어 있어요. 재료를 넣으면 여기에 보여요.</EmptyFridge>
        ) : (
          <FridgeShelves storages={summary.storages} compact />
        )}
      </ShelvesArea>
    </>
  );
}

const Card = styled.section`
  border-radius: 24px;
  background: var(--block-navy);
  color: var(--surface);
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;

  @media (max-width: 760px) {
    border-radius: 20px;
    padding: 18px;
  }
`;

const Eyebrow = styled.p`
  font-size: 13px;
  font-weight: 540;
  letter-spacing: 0.6px;
  opacity: 0.75;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;

  h2 {
    min-width: 0;
    font-size: 24px;
    line-height: 1.3;
    font-weight: 700;
    letter-spacing: -0.26px;
    overflow-wrap: anywhere;
  }
`;

const Note = styled.p`
  font-size: 14px;
  font-weight: 330;
  line-height: 1.5;
  opacity: 0.85;
`;

const StatusPill = styled.span<{ $public: boolean }>`
  border-radius: 999px;
  border: 1px solid ${(props) => (props.$public ? "var(--block-lime)" : "var(--surface)")};
  background: ${(props) => (props.$public ? "var(--block-lime)" : "transparent")};
  color: ${(props) => (props.$public ? "var(--text)" : "var(--surface)")};
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 540;
  white-space: nowrap;
`;

const Stats = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  div {
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface) 12%, transparent);
    padding: 10px 12px;
    display: grid;
    gap: 2px;
  }

  dt {
    font-size: 12px;
    font-weight: 480;
    opacity: 0.75;
  }

  dd {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }

  @media (max-width: 760px) {
    div {
      padding: 8px 10px;
    }

    dd {
      font-size: 18px;
    }
  }
`;

const ShelvesArea = styled.div`
  display: grid;

  @media (max-width: 760px) {
    display: none;
  }
`;

const EmptyFridge = styled.p`
  min-height: 64px;
  border: 1px dashed var(--surface);
  border-radius: 16px;
  padding: 12px;
  display: grid;
  place-items: center;
  text-align: center;
  font-size: 14px;
  font-weight: 480;
  opacity: 0.8;
`;

const lightControl = `
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  text-decoration: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--surface);
    outline-offset: 2px;
  }
`;

const LightLink = styled(Link)`
  ${lightControl}
  width: fit-content;
`;

const LightButton = styled.button`
  ${lightControl}
  width: fit-content;
`;

const Controls = styled.div`
  border-top: 1px solid color-mix(in srgb, var(--surface) 20%, transparent);
  padding-top: 14px;
  display: grid;
  gap: 8px;

  p {
    font-size: 14px;
    font-weight: 330;
    line-height: 1.5;
    opacity: 0.85;
  }
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`;

// 레시피 화면의 '임박 재료 우선 사용' 토글과 같은 모양을 남색 블록 위에 맞게 뒤집었다.
const Switch = styled.button<{ $on: boolean }>`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--surface) 35%, transparent);
  border-radius: 50px;
  background: transparent;
  color: var(--surface);
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
    background: ${(props) => (props.$on ? "var(--block-lime)" : "color-mix(in srgb, var(--surface) 30%, transparent)")};
    position: relative;
    transition: background 0.24s ease;
  }

  .track::after {
    content: "";
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${(props) => (props.$on ? "var(--block-navy)" : "var(--surface)")};
    position: absolute;
    top: 3px;
    left: ${(props) => (props.$on ? "21px" : "3px")};
    transition: left 0.24s ease;
  }

  &:focus-visible {
    outline: 2px solid var(--surface);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.5;
  }

  @media (prefers-reduced-motion: reduce) {
    .track,
    .track::after {
      transition: none;
    }
  }
`;

const Feedback = styled.p<{ $error: boolean }>`
  border-radius: 12px;
  background: ${(props) => (props.$error ? "var(--block-pink)" : "var(--block-mint)")};
  color: var(--text);
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
`;

const PreviewError = styled.div`
  display: grid;
  justify-items: start;
  gap: 8px;
  font-size: 14px;
`;
