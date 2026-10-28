/*
 * AI 레시피 화면에서 만들고 싶은 음식 이름을 받아 레시피를 만드는 입력 영역이다.
 * 만들면 레시피 상세 화면으로 보내고, 상세 화면이 냉장고에 없는 재료를 알려 준다.
 * 요청 상태는 스토어에 두어 다른 화면에 다녀와도 같은 요청을 다시 보내지 않는다.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CircleAlert } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../../api/client";
import { recommendTargetRecipe } from "../../api/recipe";
import { useAuthStore } from "../../store/authStore";
import { useRecipeStore } from "../../store/recipeStore";

// 백엔드와 같은 기준이다. 둘 다 UTF-16 글자 수로 센다.
const DISH_NAME_MAX_LENGTH = 50;

type TargetRecipeFormProps = {
  // 냉장고를 아직 불러오지 못했으면 null이고, 이때는 요청하지 않는다.
  fridgeId: number | null;
  onFridgeRetry: () => void;
};

function getErrorInfo(error: unknown) {
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: "UNKNOWN_ERROR", message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." };
}

function TargetRecipeForm({ fridgeId, onFridgeRetry }: TargetRecipeFormProps) {
  const titleId = useId();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const navigate = useNavigate();
  const target = useRecipeStore((state) => state.target);
  const setTarget = useRecipeStore((state) => state.setTarget);
  const setAskShoppingRecipeId = useRecipeStore((state) => state.setAskShoppingRecipeId);
  // 다른 화면에 다녀와도 입력칸이 비지 않게, 진행 중이거나 실패한 요청의 음식 이름으로 채운다.
  const [value, setValue] = useState(() =>
    target.status === "loading" || target.status === "error" ? target.dishName : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const dishName = value.trim();
  const isLoading = target.status === "loading";

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    // 다른 화면에 다녀오는 사이 시작된 요청도 막도록 화면 상태 대신 스토어 값을 바로 확인한다.
    if (fridgeId === null || !dishName || useRecipeStore.getState().target.status === "loading") return;
    if (dishName.length > DISH_NAME_MAX_LENGTH) return;

    setTarget({ status: "loading", dishName });
    const requestToken = useAuthStore.getState().accessToken;
    // 응답을 기다리는 사이 로그아웃·토큰 만료가 있었다면 늦게 온 결과를 보여 주지 않는다.
    const isStale = () => useAuthStore.getState().accessToken !== requestToken;
    try {
      const recipe = await recommendTargetRecipe(fridgeId, dishName);
      if (isStale()) {
        setTarget({ status: "idle" });
        return;
      }
      // 기다리는 사이 다른 화면으로 갔으면 그 화면에서 끌고 오지 않고, 돌아왔을 때 결과를 알려 준다.
      if (!isMountedRef.current) {
        setTarget({ status: "done", recipeId: recipe.id, recipeName: recipe.name });
        return;
      }
      setTarget({ status: "idle" });
      setAskShoppingRecipeId(recipe.id);
      navigate(`/recipes/${recipe.id}`);
    } catch (error) {
      if (isStale()) {
        setTarget({ status: "idle" });
        return;
      }
      const errorInfo = getErrorInfo(error);
      setTarget({ status: "error", dishName, ...errorInfo });
      // 다시 시도해도 같은 결과라 음식 이름을 고칠 수 있게 입력칸으로 돌아간다.
      if (errorInfo.code === "DISH_NOT_RECOGNIZED" && isMountedRef.current) {
        requestAnimationFrame(() => inputRef.current?.select());
      }
    }
  };

  const handleOpenDone = (recipeId: number) => {
    setTarget({ status: "idle" });
    setAskShoppingRecipeId(recipeId);
  };

  const handleFridgeRetry = () => {
    setTarget({ status: "idle" });
    onFridgeRetry();
  };

  return (
    <Section aria-labelledby={titleId}>
      <Intro>
        <h2 id={titleId}>만들고 싶은 음식이 있나요?</h2>
        <p>음식 이름을 넣으면 AI가 레시피를 만들고, 냉장고에 없는 재료를 알려 드려요.</p>
      </Intro>

      <Form onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId}>음식 이름</label>
        <InputRow>
          <Input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              // 이름을 고치기 시작하면 지난 요청의 오류 안내는 맞지 않아 지운다.
              if (target.status === "error") setTarget({ status: "idle" });
            }}
            placeholder="예: 김치찌개"
            autoComplete="off"
            maxLength={DISH_NAME_MAX_LENGTH}
            // 요청 중에도 포커스가 빠지지 않게 disabled 대신 읽기 전용으로 막는다.
            readOnly={isLoading}
            aria-describedby={hintId}
          />
          <SubmitButton
            type="submit"
            disabled={!isLoading && (fridgeId === null || !dishName)}
            aria-disabled={isLoading || undefined}
          >
            {isLoading ? "레시피 만드는 중" : "레시피 만들기"}
          </SubmitButton>
        </InputRow>
        <Hint id={hintId}>
          {value.length}/{DISH_NAME_MAX_LENGTH}자
        </Hint>
      </Form>

      {target.status === "loading" && (
        <Progress role="status">
          <strong>‘{target.dishName}’ 레시피를 만들고 있어요.</strong>
          <p>AI가 레시피를 만들고 냉장고 재료와 비교하는 데 몇 초 걸려요.</p>
          <ProgressBar aria-hidden="true" />
        </Progress>
      )}

      {target.status === "error" && (
        <ErrorBox role="alert">
          <strong>
            <CircleAlert size={16} aria-hidden="true" />
            레시피를 만들지 못했어요.
          </strong>
          <p>{target.message}</p>
          {target.code === "FRIDGE_NOT_FOUND" ? (
            // 화면을 연 뒤 냉장고에서 나가졌으면 같은 fridgeId로는 계속 실패해서 냉장고부터 다시 불러온다.
            <ActionButton type="button" onClick={handleFridgeRetry}>
              냉장고 다시 불러오기
            </ActionButton>
          ) : (
            target.code !== "DISH_NOT_RECOGNIZED" &&
            target.code !== "INVALID_INPUT" && (
              <ActionButton type="button" onClick={() => handleSubmit()} disabled={fridgeId === null || !dishName}>
                다시 시도
              </ActionButton>
            )
          )}
        </ErrorBox>
      )}

      {target.status === "done" && (
        <Done role="status">
          <p>‘{target.recipeName}’ 레시피를 만들었어요.</p>
          <ActionLink to={`/recipes/${target.recipeId}`} onClick={() => handleOpenDone(target.recipeId)}>
            레시피 보기
          </ActionLink>
        </Done>
      )}
    </Section>
  );
}

export default TargetRecipeForm;

const Section = styled.section`
  border-radius: 16px;
  background: var(--block-cream);
  padding: 24px 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  align-items: center;
  gap: 16px 28px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 760px) {
    padding: 22px 20px;
  }
`;

const Intro = styled.div`
  display: grid;
  gap: 6px;

  h2 {
    font-size: 24px;
    font-weight: 540;
    letter-spacing: -0.26px;
  }

  p {
    font-size: 15px;
    font-weight: 330;
    line-height: 1.5;
  }
`;

const Form = styled.form`
  display: grid;
  /* 입력칸의 기본 폭이 좁은 화면에서 영역 밖으로 밀어내지 않게 한다. */
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 540;
  }
`;

const InputRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1 1 220px;
  min-width: 0;
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 12px 14px;
  font-size: 16px;
  outline-color: var(--text);

  &:read-only {
    background: var(--surface-soft);
    cursor: wait;
  }
`;

const SubmitButton = styled.button`
  flex: 0 0 auto;
  min-height: 48px;
  border: 0;
  border-radius: 50px;
  background: var(--text);
  color: var(--surface);
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &:disabled,
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.62;
  }
`;

const Hint = styled.p`
  justify-self: end;
  font-size: 12px;
  font-weight: 330;
`;

const shimmer = keyframes`
  0% { background-position: -220px 0; }
  100% { background-position: 220px 0; }
`;

const statusBox = `
  grid-column: 1 / -1;
  border-radius: 8px;
  padding: 16px 18px;
  display: grid;
  justify-items: start;
  gap: 6px;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 16px;
    font-weight: 700;
  }

  p {
    font-size: 14px;
    line-height: 1.5;
  }

  svg {
    flex-shrink: 0;
  }
`;

const Progress = styled.div`
  ${statusBox}
  background: var(--surface);
`;

// 레시피 카드 스켈레톤과 같은 반짝임으로 AI 응답을 기다리는 중임을 보여 준다.
const ProgressBar = styled.div`
  justify-self: stretch;
  height: 10px;
  margin-top: 4px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--border-soft) 25%, var(--surface-soft) 50%, var(--border-soft) 75%);
  background-size: 220px 100%;
  animation: ${shimmer} 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ErrorBox = styled.div`
  ${statusBox}
  background: var(--block-pink);
`;

const Done = styled.div`
  ${statusBox}
  background: var(--block-mint);
`;

const actionStyle = `
  margin-top: 4px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 480;
  text-decoration: none;
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

const ActionButton = styled.button`
  ${actionStyle}
`;

const ActionLink = styled(Link)`
  ${actionStyle}
`;
