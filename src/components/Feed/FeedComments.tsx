/*
 * 피드 냉장고를 구경한 사람들이 남긴 코멘트와 음식 추천이다.
 * 공개한 냉장고에는 누구나 코멘트를 남기고 냉장고 재료로 만들 만한 음식을 함께 추천할 수 있다.
 * 멤버가 공개하지 않은 내 냉장고를 미리 볼 때는 남은 코멘트만 보여 주고 새로 쓰지 못하게 한다.
 * 코멘트는 쓴 사람과 냉장고 주인만 지울 수 있다(서버가 deletable로 알려 준다).
 * 내가 쓴 코멘트(mine)는 그 자리에서 내용과 추천 음식을 고칠 수 있다. 저장이 끝나기 전에는 목록을 바꾸지 않는다.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import styled from "@emotion/styled";
import { ApiError } from "../../api/client";
import {
  createFeedComment,
  deleteFeedComment,
  getFeedComments,
  updateFeedComment,
  type FeedComment,
} from "../../api/feed";
import { formatActivityTime } from "../Share/shareFormat";
import { getFeedErrorMessage } from "./feedFormat";
import { OutlineButton, ScreenReaderText, Skeleton } from "./feedStyles";
import { playSound } from "../../sound/soundEffects";

const MAX_CONTENT_LENGTH = 200;
const MAX_DISH_LENGTH = 50;
// 글자 수는 한도에 가까워졌을 때만 보여 준다.
const COUNTER_FROM = 150;

type FeedCommentsProps = {
  fridgeId: number;
  // 제목 옆에 보여 줄 전체 코멘트 수. 목록은 나눠 불러오므로 냉장고 정보의 수를 쓴다.
  count: number;
  // 공개한 냉장고에만 코멘트를 쓸 수 있다.
  canWrite: boolean;
  // 코멘트를 남기거나 지우면 냉장고 정보의 코멘트 수를 함께 고친다.
  onCountChange: (delta: number) => void;
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; comments: FeedComment[]; nextCursor: number | null };

function FeedComments({ fridgeId, count, canWrite, onCountChange }: FeedCommentsProps) {
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
  // 입력을 고치면 사라질 입력 오류와, 다시 보내야 하는 요청 실패를 나눠 둔다.
  const [formError, setFormError] = useState<{ message: string; isInputError: boolean } | null>(null);

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDishName, setEditDishName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const editContentId = useId();
  const editDishId = useId();

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
      setFormError({ message: "코멘트를 입력해 주세요.", isInputError: true });
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
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
      setFormError({
        message: getFeedErrorMessage(error, "코멘트를 남기지 못했어요. 잠시 후 다시 시도해 주세요."),
        // 400은 서버가 알려 준 입력 오류라 칸을 고치면 맞지 않게 된다.
        isInputError: error instanceof ApiError && error.status === 400,
      });
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

  const startEdit = (comment: FeedComment) => {
    setEditingId(comment.commentId);
    setEditContent(comment.content);
    setEditDishName(comment.dishName ?? "");
    setEditError("");
  };

  // 고치기 칸이 닫히면 포커스가 갈 곳을 잃으므로 그 코멘트의 고치기 버튼으로 돌려놓는다.
  const closeEdit = (commentId: number) => {
    setEditingId(null);
    setEditError("");
    requestAnimationFrame(() => document.getElementById(`${editContentId}-button-${commentId}`)?.focus());
  };

  const cancelEdit = () => {
    if (isSaving || editingId === null) return;
    closeEdit(editingId);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>, commentId: number) => {
    event.preventDefault();
    if (isSaving) return;
    const nextContent = editContent.trim();
    if (!nextContent) {
      setEditError("코멘트를 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    setEditError("");
    try {
      const updated = await updateFeedComment(fridgeId, commentId, {
        content: nextContent,
        dishName: editDishName.trim() || null,
      });
      setList((prev) =>
        prev.status === "success"
          ? {
              ...prev,
              comments: prev.comments.map((comment) => (comment.commentId === commentId ? updated : comment)),
            }
          : prev,
      );
      playSound("success");
      closeEdit(commentId);
    } catch (error) {
      // 다른 곳에서 먼저 지웠으면 고칠 코멘트가 없으므로 목록에서도 뺀다.
      if (error instanceof ApiError && error.code === "FEED_COMMENT_NOT_FOUND") {
        setEditingId(null);
        removeComment(commentId);
        return;
      }
      playSound("error");
      setEditError(getFeedErrorMessage(error, "코멘트를 고치지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape") cancelEdit();
  };

  const showCounter = content.length >= COUNTER_FROM;

  const clearInputError = () => {
    if (formError?.isInputError) setFormError(null);
  };

  return (
    <Section id="comments" aria-labelledby={titleId}>
      <Title id={titleId} ref={titleRef} tabIndex={-1}>
        코멘트 <span>{count}</span>
      </Title>

      {canWrite ? (
        <Composer onSubmit={handleSubmit} noValidate>
          <HiddenLabel htmlFor={contentId}>코멘트</HiddenLabel>
          <ContentInput
            id={contentId}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              clearInputError();
            }}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="이 냉장고에 한마디 남기기"
            aria-describedby={showCounter ? `${contentId}-count` : undefined}
            autoComplete="off"
          />
          <HiddenLabel htmlFor={dishId}>추천할 음식 (선택)</HiddenLabel>
          <DishInput
            id={dishId}
            value={dishName}
            onChange={(event) => {
              setDishName(event.target.value);
              clearInputError();
            }}
            maxLength={MAX_DISH_LENGTH}
            placeholder="추천 음식 (선택)"
            autoComplete="off"
          />
          <SubmitButton type="submit" aria-disabled={isSubmitting || !trimmedContent || undefined}>
            {isSubmitting ? "남기는 중..." : "남기기"}
          </SubmitButton>
          {showCounter && (
            <Counter id={`${contentId}-count`}>
              {content.length}/{MAX_CONTENT_LENGTH}
            </Counter>
          )}
          {formError && <ErrorText role="alert">{formError.message}</ErrorText>}
        </Composer>
      ) : (
        <Note>공개하지 않은 냉장고라 새 코멘트는 남길 수 없어요.</Note>
      )}

      {list.status === "loading" && (
        <div aria-busy="true">
          <ScreenReaderText role="status">코멘트를 불러오는 중이에요.</ScreenReaderText>
          <Skeleton aria-hidden="true" $height={72} />
        </div>
      )}

      {list.status === "error" && (
        <Note role="alert">
          {list.message}
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        </Note>
      )}

      {list.status === "success" &&
        (list.comments.length === 0 ? (
          <Note>{canWrite ? "아직 코멘트가 없어요." : "남은 코멘트가 없어요."}</Note>
        ) : (
          <List>
            {list.comments.map((comment) => {
              const isConfirming = confirmingId === comment.commentId;
              const isEditing = editingId === comment.commentId;
              // 지우기 확인이나 고치기를 하는 동안에는 다른 코멘트를 눌러 대상이 바뀌지 않게 막는다.
              const isBusy = confirmingId !== null || editingId !== null;
              return (
                <li key={comment.commentId}>
                  <Meta>
                    <strong>{comment.authorNickname}</strong>
                    {comment.mine && <MineTag>나</MineTag>}
                    <time dateTime={comment.createdAt}>{formatActivityTime(comment.createdAt)}</time>
                    <CommentActions>
                      {comment.mine && (
                        <TextButton
                          id={`${editContentId}-button-${comment.commentId}`}
                          type="button"
                          aria-label="내 코멘트 고치기"
                          onClick={() => startEdit(comment)}
                          disabled={isBusy}
                        >
                          고치기
                        </TextButton>
                      )}
                      {comment.deletable && (
                        <TextButton
                          type="button"
                          aria-label={`${comment.authorNickname} 님 코멘트 지우기`}
                          onClick={() => {
                            setConfirmingId(comment.commentId);
                            setDeleteError("");
                          }}
                          disabled={isBusy}
                        >
                          지우기
                        </TextButton>
                      )}
                    </CommentActions>
                  </Meta>
                  {isEditing ? (
                    <EditForm
                      aria-label="코멘트 고치기"
                      onSubmit={(event) => handleEditSubmit(event, comment.commentId)}
                      onKeyDown={handleEditKeyDown}
                      noValidate
                    >
                      <HiddenLabel htmlFor={editContentId}>코멘트</HiddenLabel>
                      <ContentInput
                        id={editContentId}
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        maxLength={MAX_CONTENT_LENGTH}
                        placeholder="이 냉장고에 한마디 남기기"
                        autoComplete="off"
                        autoFocus
                      />
                      <HiddenLabel htmlFor={editDishId}>추천할 음식 (선택)</HiddenLabel>
                      <DishInput
                        id={editDishId}
                        value={editDishName}
                        onChange={(event) => setEditDishName(event.target.value)}
                        maxLength={MAX_DISH_LENGTH}
                        placeholder="추천 음식 (선택)"
                        autoComplete="off"
                      />
                      <EditButtons>
                        <OutlineButton type="button" onClick={cancelEdit} aria-disabled={isSaving || undefined}>
                          취소
                        </OutlineButton>
                        <SubmitButton type="submit" aria-disabled={isSaving || !editContent.trim() || undefined}>
                          {isSaving ? "저장하는 중..." : "저장"}
                        </SubmitButton>
                      </EditButtons>
                      {editError && <ErrorText role="alert">{editError}</ErrorText>}
                    </EditForm>
                  ) : (
                    <>
                      <Content>{comment.content}</Content>
                      {comment.dishName && (
                        <Dish>
                          <span>추천</span>
                          {comment.dishName}
                        </Dish>
                      )}
                    </>
                  )}
                  {isConfirming && (
                    <Confirm role="group" aria-label="코멘트 지우기 확인" onKeyDown={handleConfirmKeyDown}>
                      <p>이 코멘트를 지울까요? 되돌릴 수 없어요.</p>
                      {/* 실수로 지우지 않도록 취소에 먼저 포커스를 둔다. */}
                      <OutlineButton type="button" onClick={cancelDelete} aria-disabled={isDeleting || undefined} autoFocus>
                        취소
                      </OutlineButton>
                      <DangerButton
                        type="button"
                        onClick={() => handleDelete(comment.commentId)}
                        aria-disabled={isDeleting || undefined}
                      >
                        {isDeleting ? "지우는 중..." : "지우기"}
                      </DangerButton>
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
    </Section>
  );
}

export default FeedComments;

// 색 블록과 테두리 없이 흰 바탕에 글자 굵기와 가는 줄로만 나눈다(DESIGN.md). 위의 냉장고 그림과 같은 폭으로 둔다.
const Section = styled.section`
  width: min(880px, 100%);
  justify-self: center;
  display: grid;
  gap: 20px;
`;

const Title = styled.h2`
  width: fit-content;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 24px;
  font-weight: 540;
  letter-spacing: -0.26px;

  span {
    font-weight: 330;
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const Composer = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 200px) auto;
  align-items: end;
  column-gap: 16px;
  row-gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr) auto;

    > input:first-of-type {
      grid-column: 1 / -1;
    }
  }
`;

// 자리 표시 글로 무엇을 쓰는 칸인지 보이므로 이름표는 화면 읽기 프로그램에만 읽어 준다.
const HiddenLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

// 입력 칸은 상자 대신 밑줄 하나로 둔다.
const inputStyle = `
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-bottom: 1px solid var(--text);
  border-radius: 0;
  background: transparent;
  color: var(--text);
  padding: 8px 0;
  font: inherit;
  font-size: 16px;

  &::placeholder {
    color: var(--text);
    opacity: 0.4;
  }

  &:focus-visible {
    outline: none;
    border-bottom-width: 2px;
    padding-bottom: 7px;
  }
`;

const ContentInput = styled.input`
  ${inputStyle}
`;

const DishInput = styled.input`
  ${inputStyle}
  font-size: 15px;
`;

const SubmitButton = styled.button`
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 8px 22px;
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
    opacity: 0.35;
  }
`;

const Counter = styled.span`
  grid-column: 1 / -1;
  font-size: 12px;
  font-weight: 480;
`;

const ErrorText = styled.p`
  grid-column: 1 / -1;
  flex-basis: 100%;
  font-size: 14px;
  font-weight: 540;
  line-height: 1.45;
`;

const Note = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 15px;
  font-weight: 330;
  line-height: 1.5;
`;

const List = styled.ul`
  display: grid;
  list-style: none;
  border-top: 1px solid var(--border);

  li {
    padding: 18px 0;
    display: grid;
    justify-items: start;
    gap: 6px;
  }

  li + li {
    border-top: 1px solid var(--border);
  }
`;

const Meta = styled.div`
  width: 100%;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  font-weight: 330;

  strong {
    font-size: 15px;
    font-weight: 540;
  }
`;

const MineTag = styled.span`
  align-self: center;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 540;
`;

// 고치기·지우기는 눈에 덜 띄게 줄 끝의 밑줄 글자로 둔다.
const CommentActions = styled.span`
  margin-left: auto;
  display: inline-flex;
  gap: 12px;
`;

const TextButton = styled.button`
  min-height: 32px;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 0 2px;
  font: inherit;
  font-size: 13px;
  font-weight: 480;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
`;

const Content = styled.p`
  font-size: 16px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const Dish = styled.p`
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 540;
  overflow-wrap: anywhere;

  span {
    flex: none;
    border: 1px solid var(--text);
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 12px;
    font-weight: 480;
  }
`;

const Confirm = styled.div`
  width: 100%;
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;

  p {
    margin-right: auto;
    font-weight: 480;
  }
`;

const EditForm = styled.form`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 200px);
  align-items: end;
  column-gap: 16px;
  row-gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const EditButtons = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
`;

const DangerButton = styled(OutlineButton)`
  background: var(--text);
  color: var(--surface);
`;

const MoreArea = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
`;
