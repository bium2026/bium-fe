/*
 * 피드 냉장고를 구경한 사람들이 남긴 코멘트와 음식 추천이다.
 * 공개한 냉장고에는 누구나 코멘트를 남기고 냉장고 재료로 만들 만한 음식을 함께 추천할 수 있다.
 * 멤버가 공개하지 않은 내 냉장고를 미리 볼 때는 남은 코멘트만 보여 주고 새로 쓰지 못하게 한다.
 * 코멘트는 쓴 사람과 냉장고 주인만 지울 수 있다(서버가 deletable로 알려 준다).
 */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import styled from "@emotion/styled";
import { ChefHat, MessageCircle, Trash2 } from "lucide-react";
import { ApiError } from "../../api/client";
import { createFeedComment, deleteFeedComment, getFeedComments, type FeedComment } from "../../api/feed";
import { formatActivityTime } from "../Share/shareFormat";
import { getFeedErrorMessage } from "./feedFormat";
import { OutlineButton, ScreenReaderText, Skeleton } from "./feedStyles";
import { playSound } from "../../sound/soundEffects";

const MAX_CONTENT_LENGTH = 200;
const MAX_DISH_LENGTH = 50;

type FeedCommentsProps = {
  fridgeId: number;
  // 공개한 냉장고에만 코멘트를 쓸 수 있다.
  canWrite: boolean;
  // 코멘트를 남기거나 지우면 냉장고 정보의 코멘트 수를 함께 고친다.
  onCountChange: (delta: number) => void;
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; comments: FeedComment[]; nextCursor: number | null };

function FeedComments({ fridgeId, canWrite, onCountChange }: FeedCommentsProps) {
  const titleId = useId();
  const contentId = useId();
  const dishId = useId();
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  const [content, setContent] = useState("");
  const [dishName, setDishName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let ignore = false;
    getFeedComments(fridgeId, null).then(
      ({ comments, nextCursor }) => {
        if (!ignore) setList({ status: "success", comments, nextCursor });
      },
      (error: unknown) => {
        if (!ignore) {
          setList({
            status: "error",
            message: getFeedErrorMessage(error, "코멘트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
          });
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeId, attempt]);

  const handleRetry = () => {
    setList({ status: "loading" });
    setAttempt((prev) => prev + 1);
  };

  const handleLoadMore = async () => {
    if (list.status !== "success" || list.nextCursor === null || isLoadingMore) return;
    setIsLoadingMore(true);
    setMoreError("");
    try {
      const page = await getFeedComments(fridgeId, list.nextCursor);
      // 기다리는 사이 새로 남긴 코멘트는 목록 앞에 있으므로 뒤에 이어 붙인다. 겹치는 코멘트는 한 번만 둔다.
      setList((prev) => {
        if (prev.status !== "success") return prev;
        const shown = new Set(prev.comments.map((comment) => comment.commentId));
        return {
          status: "success",
          comments: [...prev.comments, ...page.comments.filter((comment) => !shown.has(comment.commentId))],
          nextCursor: page.nextCursor,
        };
      });
    } catch (error) {
      setMoreError(getFeedErrorMessage(error, "코멘트를 더 불러오지 못했어요. 다시 시도해 주세요."));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const trimmedContent = content.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!trimmedContent) {
      setFormError("코멘트를 입력해 주세요.");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      const created = await createFeedComment(fridgeId, {
        content: trimmedContent,
        dishName: dishName.trim() || null,
      });
      setList((prev) => (prev.status === "success" ? { ...prev, comments: [created, ...prev.comments] } : prev));
      playSound("success");
      onCountChange(1);
      setContent("");
      setDishName("");
    } catch (error) {
      playSound("error");
      setFormError(getFeedErrorMessage(error, "코멘트를 남기지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setConfirmingId(null);
    setDeleteError("");
  };

  const handleDelete = async (commentId: number) => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteFeedComment(fridgeId, commentId);
      playSound("delete");
      removeComment(commentId);
    } catch (error) {
      // 다른 곳에서 먼저 지웠으면 이미 없는 코멘트이므로 목록에서도 뺀다.
      if (error instanceof ApiError && error.code === "FEED_COMMENT_NOT_FOUND") {
        removeComment(commentId);
        return;
      }
      playSound("error");
      setDeleteError(getFeedErrorMessage(error, "코멘트를 지우지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsDeleting(false);
    }
  };

  const removeComment = (commentId: number) => {
    setList((prev) =>
      prev.status === "success"
        ? { ...prev, comments: prev.comments.filter((comment) => comment.commentId !== commentId) }
        : prev,
    );
    onCountChange(-1);
    setConfirmingId(null);
    // 지운 코멘트 줄이 사라져 포커스가 갈 곳을 잃으므로 코멘트 제목으로 옮긴다.
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") cancelDelete();
  };

  return (
    <Panel id="comments" aria-labelledby={titleId}>
      <Header>
        <h2 id={titleId} ref={titleRef} tabIndex={-1}>
          <MessageCircle size={20} aria-hidden="true" />
          코멘트와 음식 추천
        </h2>
        <p>
          {canWrite
            ? "냉장고를 구경하고 한마디 남기거나, 이 재료로 만들 만한 음식을 추천해 보세요."
            : "공개하지 않은 냉장고라 새 코멘트를 남길 수 없어요. 전에 남은 코멘트만 보여요."}
        </p>
      </Header>

      {canWrite && (
        <Form onSubmit={handleSubmit} noValidate>
          <Field>
            <label htmlFor={contentId}>코멘트</label>
            <input
              id={contentId}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_CONTENT_LENGTH}
              placeholder="예: 두부가 많네요! 오늘 저녁 메뉴 고민 끝이겠어요"
              aria-describedby={`${contentId}-count`}
              autoComplete="off"
            />
            <Counter id={`${contentId}-count`}>
              {content.length}/{MAX_CONTENT_LENGTH}
            </Counter>
          </Field>
          <Field>
            <label htmlFor={dishId}>
              추천할 음식 <span>(선택)</span>
            </label>
            <input
              id={dishId}
              value={dishName}
              onChange={(event) => setDishName(event.target.value)}
              maxLength={MAX_DISH_LENGTH}
              placeholder="예: 마파두부"
              autoComplete="off"
            />
          </Field>
          <SubmitButton type="submit" aria-disabled={isSubmitting || !trimmedContent || undefined}>
            {isSubmitting ? "남기는 중..." : "남기기"}
          </SubmitButton>
          {formError && <ErrorText role="alert">{formError}</ErrorText>}
        </Form>
      )}

      {list.status === "loading" && (
        <div aria-busy="true">
          <ScreenReaderText role="status">코멘트를 불러오는 중이에요.</ScreenReaderText>
          <Skeleton aria-hidden="true" $height={96} />
        </div>
      )}

      {list.status === "error" && (
        <StatusText role="alert">
          {list.message}
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        </StatusText>
      )}

      {list.status === "success" &&
        (list.comments.length === 0 ? (
          <StatusText>{canWrite ? "아직 코멘트가 없어요. 첫 코멘트를 남겨 보세요." : "남은 코멘트가 없어요."}</StatusText>
        ) : (
          <List>
            {list.comments.map((comment) => {
              const isConfirming = confirmingId === comment.commentId;
              return (
                <li key={comment.commentId}>
                  <Row>
                    <Author aria-hidden="true">{comment.authorNickname.slice(0, 1)}</Author>
                    <Body>
                      <Meta>
                        <strong>{comment.authorNickname}</strong>
                        {comment.mine && <MeTag>나</MeTag>}
                        <time dateTime={comment.createdAt}>{formatActivityTime(comment.createdAt)}</time>
                      </Meta>
                      {comment.dishName && (
                        <Dish>
                          <ChefHat size={15} aria-hidden="true" />
                          {comment.dishName} 추천
                        </Dish>
                      )}
                      <p>{comment.content}</p>
                    </Body>
                    {comment.deletable && (
                      <IconButton
                        type="button"
                        aria-label={`${comment.authorNickname} 님 코멘트 지우기`}
                        title="지우기"
                        onClick={() => {
                          setConfirmingId(comment.commentId);
                          setDeleteError("");
                        }}
                        // 확인을 띄운 동안에는 다른 코멘트를 눌러 지울 대상이 바뀌지 않게 막는다.
                        disabled={confirmingId !== null}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </IconButton>
                    )}
                  </Row>
                  {isConfirming && (
                    <Confirm role="group" aria-label="코멘트 지우기 확인" onKeyDown={handleConfirmKeyDown}>
                      <p>이 코멘트를 지울까요? 지운 코멘트는 되돌릴 수 없어요.</p>
                      <ConfirmButtons>
                        {/* 실수로 지우지 않도록 취소에 먼저 포커스를 둔다. */}
                        <OutlineButton
                          type="button"
                          onClick={cancelDelete}
                          aria-disabled={isDeleting || undefined}
                          autoFocus
                        >
                          취소
                        </OutlineButton>
                        <DangerButton
                          type="button"
                          onClick={() => handleDelete(comment.commentId)}
                          aria-disabled={isDeleting || undefined}
                        >
                          {isDeleting ? "지우는 중..." : "지우기"}
                        </DangerButton>
                      </ConfirmButtons>
                      {deleteError && <ErrorText role="alert">{deleteError}</ErrorText>}
                    </Confirm>
                  )}
                </li>
              );
            })}
          </List>
        ))}

      {list.status === "success" && list.nextCursor !== null && (
        <MoreArea>
          <OutlineButton type="button" onClick={handleLoadMore} aria-disabled={isLoadingMore || undefined}>
            {isLoadingMore ? "불러오는 중..." : "코멘트 더 보기"}
          </OutlineButton>
          {moreError && <ErrorText role="alert">{moreError}</ErrorText>}
        </MoreArea>
      )}
    </Panel>
  );
}

export default FeedComments;

const Panel = styled.section`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 24px;
  display: grid;
  gap: 18px;

  @media (max-width: 760px) {
    padding: 18px;
  }
`;

const Header = styled.div`
  display: grid;
  gap: 6px;

  h2 {
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 20px;
    font-weight: 540;
  }

  h2:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  p {
    font-size: 14px;
    font-weight: 330;
    line-height: 1.5;
  }
`;

const Form = styled.form`
  border-radius: 16px;
  background: var(--block-cream);
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Field = styled.div`
  position: relative;
  display: grid;
  gap: 6px;

  label {
    font-size: 14px;
    font-weight: 540;
  }

  label span {
    font-weight: 330;
  }

  input {
    min-height: 42px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    padding: 8px 12px;
    font: inherit;
    font-size: 15px;
  }

  input:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 1px;
  }
`;

const Counter = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  font-size: 12px;
  font-weight: 330;
`;

const SubmitButton = styled.button`
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 8px 20px;
  font-size: 15px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const ErrorText = styled.p`
  grid-column: 1 / -1;
  border-radius: 8px;
  background: var(--block-pink);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 480;
  line-height: 1.45;
`;

const StatusText = styled.div`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 18px;
  display: grid;
  justify-items: start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.5;
`;

const List = styled.ul`
  display: grid;
  list-style: none;

  li + li {
    border-top: 1px solid var(--border-soft);
  }
`;

const Row = styled.div`
  padding: 14px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const Author = styled.span`
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 999px;
  background: var(--block-lilac);
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
`;

const Body = styled.div`
  min-width: 0;
  flex: 1;
  display: grid;
  justify-items: start;
  gap: 6px;

  > p {
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;

  strong {
    font-size: 14px;
    font-weight: 540;
  }

  time {
    font-weight: 330;
  }
`;

const MeTag = styled.span`
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 540;
`;

const Dish = styled.span`
  max-width: 100%;
  border-radius: 999px;
  background: var(--block-mint);
  padding: 3px 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 540;
  overflow-wrap: anywhere;
`;

const IconButton = styled.button`
  width: 36px;
  height: 36px;
  flex: none;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const Confirm = styled.div`
  margin-bottom: 14px;
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 12px 14px;
  display: grid;
  gap: 10px;
  font-size: 14px;
`;

const ConfirmButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DangerButton = styled(OutlineButton)`
  border-color: var(--text);
  background: var(--text);
  color: var(--surface);
`;

const MoreArea = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
`;
