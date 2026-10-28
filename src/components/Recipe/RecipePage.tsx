/*
 * 냉장고 재료로 AI 레시피를 추천받는 화면이다.
 * 내 냉장고를 불러온 뒤 추천 카드 목록과 유통기한 임박 재료, 추천 생성 버튼을 보여 준다.
 * 마지막 추천 결과는 스토어에 남겨 상세 화면에 다녀와도 다시 보여 준다.
 * 만들고 싶은 음식 이름으로 레시피를 만드는 입력 영역도 함께 둔다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Link } from "react-router";
import { ApiError } from "../../api/client";
import { getMyFridge } from "../../api/fridge";
import { recommendRecipes } from "../../api/recipe";
import { useAuthStore } from "../../store/authStore";
import { useRecipeStore } from "../../store/recipeStore";
import RecipeCard from "./RecipeCard";
import RecipeSkeletonCard from "./RecipeSkeletonCard";
import TargetRecipeForm from "./TargetRecipeForm";
import UrgentIngredientList from "./UrgentIngredientList";

type FridgeState =
  | { status: "loading" }
  | { status: "success"; fridgeId: number }
  | { status: "error"; message: string };

const skeletonKeys = ["s1", "s2", "s3", "s4"];

function getErrorInfo(error: unknown) {
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: "UNKNOWN_ERROR", message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." };
}

function RecipePage() {
  const [fridge, setFridge] = useState<FridgeState>({ status: "loading" });
  const [fridgeAttempt, setFridgeAttempt] = useState(0);
  const [prioritizeUrgent, setPrioritizeUrgent] = useState(true);
  const storedFridgeId = useRecipeStore((state) => state.fridgeId);
  const storedRecipes = useRecipeStore((state) => state.recipes);
  const setRecipes = useRecipeStore((state) => state.setRecipes);
  const recommend = useRecipeStore((state) => state.recommend);
  const setRecommend = useRecipeStore((state) => state.setRecommend);

  useEffect(() => {
    let ignore = false;
    getMyFridge().then(
      (myFridge) => {
        if (ignore) return;
        setFridge(
          myFridge
            ? { status: "success", fridgeId: myFridge.id }
            : { status: "error", message: "연결된 냉장고가 없어요." },
        );
      },
      (error: unknown) => {
        if (!ignore) setFridge({ status: "error", message: getErrorInfo(error).message });
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeAttempt]);

  const fridgeId = fridge.status === "success" ? fridge.fridgeId : null;
  const recipes = fridgeId !== null && storedFridgeId === fridgeId ? storedRecipes : [];
  const isGenerating = recommend.status === "loading";
  const isLoading = fridge.status === "loading" || isGenerating;

  const reloadFridge = () => {
    setFridge({ status: "loading" });
    setFridgeAttempt((prev) => prev + 1);
  };

  const handleFridgeRetry = () => {
    setRecommend({ status: "idle" });
    reloadFridge();
  };

  const handleGenerate = async () => {
    // 다른 화면에 다녀오는 사이 시작된 요청도 막도록 화면 상태 대신 스토어 값을 바로 확인한다.
    if (fridgeId === null || useRecipeStore.getState().recommend.status === "loading") return;
    setRecommend({ status: "loading" });
    const requestToken = useAuthStore.getState().accessToken;
    // 응답을 기다리는 사이 로그아웃·토큰 만료로 목록을 지웠다면, 늦게 온 결과로 이전 사용자의 목록을 다시 채우지 않는다.
    const isStale = () => useAuthStore.getState().accessToken !== requestToken;
    try {
      const nextRecipes = await recommendRecipes(fridgeId, prioritizeUrgent);
      if (!isStale()) setRecipes(fridgeId, nextRecipes);
      // 다른 계정으로 바로 로그인해 토큰만 바뀐 경우에는 목록을 지우는 구독이 돌지 않아, 여기서 버튼 잠금을 풀어야 한다.
      setRecommend({ status: "idle" });
    } catch (error) {
      setRecommend(isStale() ? { status: "idle" } : { status: "error", ...getErrorInfo(error) });
    }
  };

  return (
    <Wrapper>
      <Header>
        <Title>AI 맞춤 레시피 추천: 냉장고 재료 활용</Title>
        <ToggleLabel>
          <ToggleInput
            type="checkbox"
            checked={prioritizeUrgent}
            onChange={(event) => setPrioritizeUrgent(event.target.checked)}
          />
          <ToggleTrack aria-hidden="true" $on={prioritizeUrgent} />
          <ToggleText>임박 재료 우선 사용</ToggleText>
        </ToggleLabel>
      </Header>

      <TargetRecipeForm fridgeId={fridgeId} onFridgeRetry={reloadFridge} />

      <ContentGrid>
        <RecipeGrid aria-busy={isLoading}>
          {isLoading && skeletonKeys.map((key) => <RecipeSkeletonCard key={key} />)}

          {fridge.status === "error" && (
            <StatusBox role="alert">
              <strong>냉장고 정보를 불러오지 못했어요.</strong>
              <p>{fridge.message}</p>
              <RetryButton type="button" onClick={handleFridgeRetry}>
                다시 시도
              </RetryButton>
            </StatusBox>
          )}

          {recommend.status === "error" && (
            <StatusBox role="alert">
              <strong>레시피를 추천하지 못했어요.</strong>
              <p>{recommend.message}</p>
              {recommend.code === "NO_USABLE_INGREDIENT" ? (
                <RetryLink to="/fridge">냉장고 확인하기</RetryLink>
              ) : recommend.code === "FRIDGE_NOT_FOUND" ? (
                // 화면을 연 뒤 냉장고에서 나가졌으면 같은 fridgeId로는 계속 실패해서 냉장고부터 다시 불러온다.
                <RetryButton type="button" onClick={handleFridgeRetry}>
                  냉장고 다시 불러오기
                </RetryButton>
              ) : (
                <RetryButton type="button" onClick={handleGenerate}>
                  다시 시도
                </RetryButton>
              )}
            </StatusBox>
          )}

          {fridge.status === "success" &&
            !isGenerating &&
            recommend.status !== "error" &&
            recipes.length === 0 && (
              <StatusBox>
                <strong>아직 추천받은 레시피가 없어요.</strong>
                <p>냉장고 재료를 바탕으로 AI가 바로 만들 수 있는 레시피를 추천해 드려요.</p>
              </StatusBox>
            )}

          {!isLoading && recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </RecipeGrid>

        <UrgentBox>
          <h2>내 냉장고 임박 재료</h2>
          {fridgeId !== null ? (
            <UrgentIngredientList fridgeId={fridgeId} />
          ) : (
            <Empty>{fridge.status === "loading" ? "임박 재료를 불러오는 중이에요." : "냉장고 정보가 없어요."}</Empty>
          )}
          <GenerateButton type="button" onClick={handleGenerate} disabled={fridgeId === null || isGenerating}>
            {isGenerating ? "추천 생성 중" : "AI 추천 생성"}
          </GenerateButton>
        </UrgentBox>
      </ContentGrid>
    </Wrapper>
  );
}

export default RecipePage;

const Wrapper = styled.section`
  display: grid;
  gap: 24px;
`;

const Header = styled.header`
  display: grid;
  justify-items: start;
  gap: 14px;
  border-radius: 16px;
  background: var(--block-lilac);
  padding: 24px 28px;

  @media (max-width: 760px) {
    border-radius: 0;
    margin-inline: -12px;
    padding: 22px 20px;
  }
`;

const Title = styled.h1`
  max-width: 840px;
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.16;
  font-weight: 480;
  letter-spacing: -0.26px;
`;

const ToggleLabel = styled.label`
  min-height: 44px;
  border-radius: 50px;
  background: var(--surface);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 16px 6px 6px;
  position: relative;
  cursor: pointer;
  user-select: none;
`;

// display: none 대신 화면에서만 숨겨서 키보드로도 토글할 수 있게 한다.
const ToggleInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;

  &:focus-visible + span {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: ${(props) => (props.$on ? "var(--text)" : "var(--border)")};
  position: relative;
  transition: background 0.24s ease;

  &::after {
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

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      transition: none;
    }
  }
`;

const ToggleText = styled.span`
  font-size: 16px;
  font-weight: 480;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  align-items: start;
  gap: 28px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const RecipeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  gap: 22px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StatusBox = styled.div`
  grid-column: 1 / -1;
  min-height: 220px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;

  strong {
    font-size: 24px;
    font-weight: 700;
  }

  p {
    max-width: 540px;
    font-size: 15px;
    line-height: 1.55;
  }
`;

const retryStyle = `
  margin-top: 6px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  text-decoration: none;
  cursor: pointer;
`;

const RetryButton = styled.button`
  ${retryStyle}
`;

const RetryLink = styled(Link)`
  ${retryStyle}
`;

const UrgentBox = styled.aside`
  border-radius: 24px;
  background: var(--block-lime);
  padding: 24px;
  display: grid;
  gap: 18px;

  h2 {
    font-size: 24px;
    font-weight: 540;
    letter-spacing: -0.26px;
  }
`;

const Empty = styled.p`
  font-size: 14px;
`;

const GenerateButton = styled.button`
  border: 0;
  border-radius: 50px;
  background: var(--text);
  color: var(--surface);
  padding: 12px 18px;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.62;
  }
`;
