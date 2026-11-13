/*
 * 피드 냉장고의 좋아요·저장 버튼이다.
 * 누르면 바로 바꿔 보여 주고 서버 응답으로 맞춘다. 실패하면 누르기 전으로 되돌리고 무엇이 문제인지 알려 준다.
 * 같은 버튼은 요청이 끝날 때까지 다시 보내지 않는다. 좋아요와 저장은 따로 누를 수 있다.
 */
import { useState } from "react";
import styled from "@emotion/styled";
import { Bookmark, Heart } from "lucide-react";
import { setFeedLike, setFeedSave, type FeedReaction } from "../../api/feed";
import { getFeedErrorMessage } from "./feedFormat";

type ReactionKind = "like" | "save";

type FeedReactionsProps = {
  fridgeId: number;
  fridgeName: string;
  reaction: FeedReaction;
  // 좋아요와 저장 요청이 겹칠 수 있어, 바꿀 값 대신 지금 값을 받아 고치는 함수를 넘긴다.
  onChange: (update: (prev: FeedReaction) => FeedReaction) => void;
};

function toggleLike(prev: FeedReaction): FeedReaction {
  return { ...prev, liked: !prev.liked, likeCount: Math.max(0, prev.likeCount + (prev.liked ? -1 : 1)) };
}

function FeedReactions({ fridgeId, fridgeName, reaction, onChange }: FeedReactionsProps) {
  const [pending, setPending] = useState<ReactionKind[]>([]);
  const [error, setError] = useState("");

  const handleToggle = async (kind: ReactionKind) => {
    if (pending.includes(kind)) return;
    setPending((prev) => [...prev, kind]);
    setError("");
    try {
      if (kind === "like") {
        onChange(toggleLike);
        const result = await setFeedLike(fridgeId, !reaction.liked);
        // 기다리는 사이 저장이 바뀌었을 수 있어 좋아요 값만 서버 응답으로 맞춘다.
        onChange((prev) => ({ ...prev, liked: result.liked, likeCount: result.likeCount }));
      } else {
        onChange((prev) => ({ ...prev, saved: !prev.saved }));
        const result = await setFeedSave(fridgeId, !reaction.saved);
        onChange((prev) => ({ ...prev, saved: result.saved }));
      }
    } catch (toggleError) {
      onChange(kind === "like" ? toggleLike : (prev) => ({ ...prev, saved: !prev.saved }));
      const action = kind === "like" ? "좋아요를" : "저장을";
      setError(getFeedErrorMessage(toggleError, `${action} 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.`));
    } finally {
      setPending((prev) => prev.filter((item) => item !== kind));
    }
  };

  return (
    <Wrapper>
      <Buttons>
        <LikeButton
          type="button"
          aria-pressed={reaction.liked}
          aria-disabled={pending.includes("like")}
          aria-label={`${fridgeName} 좋아요, 지금 ${reaction.likeCount}개`}
          onClick={() => handleToggle("like")}
          $active={reaction.liked}
        >
          <Heart size={20} aria-hidden="true" fill={reaction.liked ? "currentColor" : "none"} />
          {reaction.likeCount}
        </LikeButton>
        <SaveButton
          type="button"
          aria-pressed={reaction.saved}
          aria-disabled={pending.includes("save")}
          aria-label={`${fridgeName} 저장`}
          title={reaction.saved ? "저장됨" : "저장"}
          onClick={() => handleToggle("save")}
          $active={reaction.saved}
        >
          <Bookmark size={20} aria-hidden="true" fill={reaction.saved ? "currentColor" : "none"} />
        </SaveButton>
      </Buttons>
      {error && <ReactionError role="alert">{error}</ReactionError>}
    </Wrapper>
  );
}

export default FeedReactions;

const Wrapper = styled.div`
  display: grid;
  gap: 8px;
`;

const Buttons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// 색 블록 위에 놓이는 흰 버튼이다. 좋아요는 수를 함께 보여 주는 알약, 저장은 동그란 아이콘 버튼이다.
const buttonBase = `
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: progress;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// 누른 좋아요 하트만 강조색으로 칠한다.
const LikeButton = styled.button<{ $active: boolean }>`
  ${buttonBase}
  min-width: 64px;
  padding: 8px 14px 8px 12px;
  gap: 6px;
  font-size: 16px;
  font-weight: 540;

  svg {
    color: ${(props) => (props.$active ? "var(--accent-magenta)" : "var(--text)")};
  }
`;

const SaveButton = styled.button<{ $active: boolean }>`
  ${buttonBase}
  width: 42px;
  background: ${(props) => (props.$active ? "var(--text)" : "var(--surface)")};
  color: ${(props) => (props.$active ? "var(--surface)" : "var(--text)")};
`;

const ReactionError = styled.p`
  border-radius: 8px;
  background: var(--block-pink);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 480;
  line-height: 1.45;
`;
