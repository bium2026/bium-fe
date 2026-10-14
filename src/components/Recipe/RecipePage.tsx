/*
 * 냉장고 재료로 AI 레시피를 추천받는 화면이다.
 * 추천 카드 목록과 유통기한 임박 재료, 추천 생성 버튼을 보여 준다.
 * 지금은 퍼블리싱 단계라 목데이터를 쓰고, 서버 연동 때 추천 API로 바꾼다.
 */
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { useSearchParams } from "react-router";
import RecipeCard from "./RecipeCard";
import RecipeSkeletonCard from "./RecipeSkeletonCard";
import { recipesMock, urgentIngredientsMock } from "./recipeMockData";
import { getRecipeTone } from "./recipeTone";

type RecipeStatus = "loading" | "success" | "empty" | "error";

const skeletonKeys = ["s1", "s2", "s3", "s4"];

// 퍼블리싱 확인용: ?preview=loading|empty|error 로 각 상태 화면을 볼 수 있다. API 연동 시 지운다.
function getPreviewStatus(value: string | null): RecipeStatus {
  if (value === "loading" || value === "empty" || value === "error") return value;
  return "success";
}

function RecipePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<RecipeStatus>(() =>
    getPreviewStatus(searchParams.get("preview")),
  );
  const [prioritizeUrgent, setPrioritizeUrgent] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const isLoading = status === "loading";

  const handleGenerate = () => {
    if (isLoading) return;
    setStatus("loading");
    // TODO: 추천 API가 정해지면 서버 요청으로 바꾼다. 지금은 로딩 화면을 보여 주기 위한 지연이다.
    timerRef.current = window.setTimeout(() => setStatus("success"), 1200);
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

      <ContentGrid>
        <RecipeGrid aria-busy={isLoading}>
          {isLoading && skeletonKeys.map((key) => <RecipeSkeletonCard key={key} />)}

          {status === "error" && (
            <StatusBox role="alert">
              <strong>레시피를 불러오지 못했어요.</strong>
              <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 냉장고 재료를 확인해 주세요.</p>
              <RetryButton type="button" onClick={handleGenerate}>
                다시 시도
              </RetryButton>
            </StatusBox>
          )}

          {status === "empty" && (
            <StatusBox>
              <strong>아직 추천받은 레시피가 없어요.</strong>
              <p>냉장고 재료를 바탕으로 AI가 바로 만들 수 있는 레시피를 추천해 드려요.</p>
            </StatusBox>
          )}

          {status === "success" &&
            recipesMock.map((recipe, index) => (
              <RecipeCard key={recipe.id} recipe={recipe} tone={getRecipeTone(index)} />
            ))}
        </RecipeGrid>

        <UrgentBox>
          <h2>내 냉장고 임박 재료</h2>
          {urgentIngredientsMock.length > 0 ? (
            <UrgentList>
              {urgentIngredientsMock.map((item) => (
                <li key={item.id}>
                  <span aria-hidden="true">{item.emoji}</span>
                  <strong>{item.name}</strong>
                  <em>D-{item.daysLeft}</em>
                </li>
              ))}
            </UrgentList>
          ) : (
            <Empty>임박 재료가 없어요.</Empty>
          )}
          <GenerateButton type="button" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? "추천 생성 중" : "AI 추천 생성"}
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

const RetryButton = styled.button`
  margin-top: 6px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
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

const UrgentList = styled.ul`
  list-style: none;

  li {
    min-height: 44px;
    border-bottom: 1px solid var(--surface);
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  strong {
    font-weight: 800;
  }

  em {
    font-style: normal;
    font-weight: 900;
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
    cursor: wait;
    opacity: 0.62;
  }
`;
