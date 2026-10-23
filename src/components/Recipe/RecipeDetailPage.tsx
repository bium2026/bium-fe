/*
 * 추천 레시피 한 개의 상세 화면이다.
 * 주소의 id로 레시피를 불러와 조리 순서, 활용 팁, 재료, 냉장고 매칭, 영양 정보를 보여 준다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ArrowLeft, ChefHat, Clock3, Flame, Sparkles, Users } from "lucide-react";
import { Link, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { getRecipe, type Recipe, type RecipeIngredient } from "../../api/recipe";
import {
  DEFAULT_RECIPE_EMOJI,
  formatCalories,
  formatCookTime,
  formatDifficulty,
  formatIngredientSource,
  formatServings,
  getNutritionItems,
} from "./recipeFormat";
import { getRecipeTone } from "./recipeTone";

type DetailView =
  | { status: "loading" }
  | { status: "success"; recipe: Recipe }
  | { status: "notFound" }
  | { status: "error"; message: string };

// 다시 시도를 누르거나 주소의 id가 바뀌면 requestKey가 바뀌어, 이전 결과 대신 로딩을 보여 준다.
type DetailResult = { requestKey: string } & Exclude<DetailView, { status: "loading" }>;

// "12abc"나 "1e3"처럼 Number()가 받아 주는 값까지 서버로 보내지 않게 숫자만 받는다.
function parseRecipeId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function RecipeDetailPage() {
  const recipeId = parseRecipeId(useParams().recipeId);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);
  const requestKey = `${recipeId}-${attempt}`;

  useEffect(() => {
    if (recipeId === null) return;
    let ignore = false;
    getRecipe(recipeId).then(
      (recipe) => {
        if (!ignore) setResult({ requestKey, status: "success", recipe });
      },
      (error: unknown) => {
        if (ignore) return;
        if (error instanceof ApiError && error.status === 404) {
          setResult({ requestKey, status: "notFound" });
          return;
        }
        const message =
          error instanceof ApiError ? error.message : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
        setResult({ requestKey, status: "error", message });
      },
    );
    return () => {
      ignore = true;
    };
  }, [recipeId, requestKey]);

  const backLink = (
    <BackLink to="/recipes">
      <ArrowLeft size={18} aria-hidden="true" />
      레시피 목록
    </BackLink>
  );

  const view: DetailView =
    recipeId === null
      ? { status: "notFound" }
      : result?.requestKey === requestKey
        ? result
        : { status: "loading" };

  if (view.status === "notFound") {
    return (
      <DetailWrap>
        {backLink}
        <StatusBox role="alert">
          <strong>레시피를 찾을 수 없어요.</strong>
          <p>목록에서 다른 레시피를 골라 주세요.</p>
        </StatusBox>
      </DetailWrap>
    );
  }

  if (view.status === "loading") {
    return (
      <DetailWrap>
        {backLink}
        <StatusBox role="status" aria-busy="true">
          <strong>레시피를 불러오는 중이에요.</strong>
        </StatusBox>
      </DetailWrap>
    );
  }

  if (view.status === "error") {
    return (
      <DetailWrap>
        {backLink}
        <StatusBox role="alert">
          <strong>레시피를 불러오지 못했어요.</strong>
          <p>{view.message}</p>
          <RetryButton type="button" onClick={() => setAttempt((prev) => prev + 1)}>
            다시 시도
          </RetryButton>
        </StatusBox>
      </DetailWrap>
    );
  }

  const { recipe } = view;
  const requiredIngredients = recipe.ingredients.filter((item) => item.required);
  const optionalIngredients = recipe.ingredients.filter((item) => !item.required);

  return (
    <DetailWrap>
      {backLink}

      <Hero>
        <HeroCopy>
          <Badge>
            <Sparkles size={16} aria-hidden="true" />
            AI 추천 레시피
          </Badge>
          <h1>{recipe.name}</h1>
          {recipe.summary && <p>{recipe.summary}</p>}
          <MetaGrid>
            <MetaItem>
              <Clock3 size={18} aria-hidden="true" />
              {formatCookTime(recipe.cookTimeMinutes)}
            </MetaItem>
            <MetaItem>
              <ChefHat size={18} aria-hidden="true" />
              난이도 {formatDifficulty(recipe.difficulty)}
            </MetaItem>
            <MetaItem>
              <Users size={18} aria-hidden="true" />
              {formatServings(recipe.servings)}
            </MetaItem>
            <MetaItem>
              <Flame size={18} aria-hidden="true" />
              {formatCalories(recipe.caloriesKcal)}
            </MetaItem>
          </MetaGrid>
        </HeroCopy>
        <HeroVisual $tone={getRecipeTone(recipe.id)}>
          <FoodEmoji aria-hidden="true">{recipe.emoji ?? DEFAULT_RECIPE_EMOJI}</FoodEmoji>
        </HeroVisual>
      </Hero>

      <DetailGrid>
        <MainColumn>
          <Section>
            <SectionTitle>조리 순서</SectionTitle>
            <StepList>
              {/* AI가 같은 문장을 두 번 줄 수 있어 순서를 key에 넣는다. */}
              {recipe.steps.map((step, index) => (
                <li key={`${index}-${step}`}>
                  <StepNumber>{index + 1}</StepNumber>
                  <span>{step}</span>
                </li>
              ))}
            </StepList>
          </Section>

          {recipe.tips.length > 0 && (
            <Section>
              <SectionTitle>활용 팁</SectionTitle>
              <TipList>
                {recipe.tips.map((tip, index) => (
                  <li key={`${index}-${tip}`}>{tip}</li>
                ))}
              </TipList>
            </Section>
          )}
        </MainColumn>

        <SideColumn>
          <IngredientPanel title="필수 재료" ingredients={requiredIngredients} />
          {optionalIngredients.length > 0 && (
            <IngredientPanel title="있으면 좋은 재료" ingredients={optionalIngredients} />
          )}

          {recipe.fridgeMatches.length > 0 && (
            <Panel>
              <SectionTitle>냉장고 매칭</SectionTitle>
              <MatchList>
                {recipe.fridgeMatches.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </MatchList>
            </Panel>
          )}

          <Panel>
            <SectionTitle>영양 정보</SectionTitle>
            <NutritionGrid>
              {getNutritionItems(recipe.nutrition).map((item) => (
                <NutritionItem key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </NutritionItem>
              ))}
            </NutritionGrid>
          </Panel>
        </SideColumn>
      </DetailGrid>
    </DetailWrap>
  );
}

export default RecipeDetailPage;

type IngredientPanelProps = {
  title: string;
  ingredients: RecipeIngredient[];
};

function IngredientPanel({ title, ingredients }: IngredientPanelProps) {
  return (
    <Panel>
      <SectionTitle>{title}</SectionTitle>
      <IngredientList>
        {ingredients.map((item, index) => {
          const sourceLabel = formatIngredientSource(item.source);
          return (
            <li key={`${index}-${item.name}`}>
              <strong>{item.name}</strong>
              {item.amount && <span>{item.amount}</span>}
              {sourceLabel && <em>{sourceLabel}</em>}
            </li>
          );
        })}
      </IngredientList>
    </Panel>
  );
}

const DetailWrap = styled.section`
  display: grid;
  gap: 28px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const StatusBox = styled.div`
  min-height: 220px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  align-content: center;
  gap: 10px;

  strong {
    font-size: 24px;
    font-weight: 700;
  }

  p {
    font-size: 15px;
    line-height: 1.55;
  }
`;

const RetryButton = styled.button`
  width: fit-content;
  margin-top: 6px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
`;

const Hero = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 28px;
  border-radius: 8px;
  background: var(--block-lilac);
  overflow: hidden;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.div`
  padding: 32px 36px;
  display: grid;
  align-content: center;
  gap: 16px;

  h1 {
    font-size: clamp(28px, 4.5vw, 44px);
    line-height: 1.12;
    font-weight: 480;
  }

  p {
    max-width: 680px;
    font-size: 18px;
    line-height: 1.55;
    font-weight: 330;
  }

  @media (max-width: 760px) {
    padding: 32px 24px;
  }
`;

const Badge = styled.span`
  width: fit-content;
  min-height: 34px;
  border-radius: 50px;
  background: var(--surface);
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, 1fr));
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const MetaItem = styled.div`
  min-height: 54px;
  border-radius: 8px;
  background: var(--surface);
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
`;

const HeroVisual = styled.div<{ $tone: string }>`
  min-height: 280px;
  background: ${(props) => props.$tone};
  display: grid;
  place-items: center;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    width: min(72%, 280px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--surface);
    opacity: 0.45;
  }
`;

const FoodEmoji = styled.span`
  position: relative;
  font-size: clamp(96px, 15vw, 150px);
  filter: drop-shadow(var(--shadow-sm));
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: start;
  gap: 28px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.div`
  display: grid;
  gap: 22px;
`;

const SideColumn = styled.aside`
  display: grid;
  gap: 16px;
`;

const Section = styled.section`
  display: grid;
  gap: 18px;
`;

const Panel = styled.section`
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 22px;
  display: grid;
  gap: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 540;
`;

const StepList = styled.ol`
  list-style: none;
  display: grid;
  gap: 12px;

  li {
    min-height: 72px;
    border-radius: 8px;
    background: var(--surface-soft);
    padding: 18px;
    display: grid;
    grid-template-columns: 36px 1fr;
    align-items: center;
    gap: 14px;
    font-size: 16px;
    line-height: 1.55;
  }
`;

const StepNumber = styled.strong`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  display: grid;
  place-items: center;
  font-size: 15px;
`;

const TipList = styled.ul`
  list-style: none;
  display: grid;
  gap: 10px;

  li {
    border-left: 4px solid var(--text);
    border-radius: 0 8px 8px 0;
    background: var(--block-cream);
    padding: 16px 18px;
    font-size: 15px;
    line-height: 1.5;
  }
`;

const IngredientList = styled.ul`
  list-style: none;

  li {
    min-height: 48px;
    border-bottom: 1px solid var(--border-soft);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 4px 12px;
    padding: 6px 0;
  }

  li:last-of-type {
    border-bottom: 0;
  }

  strong {
    font-size: 15px;
  }

  span {
    font-size: 14px;
    font-weight: 700;
  }

  em {
    grid-column: 1 / -1;
    font-size: 12px;
    font-style: normal;
    font-weight: 330;
  }
`;

const MatchList = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  li {
    border-radius: 50px;
    background: var(--block-lime);
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 700;
  }
`;

const NutritionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const NutritionItem = styled.div`
  min-height: 72px;
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 10px;
  display: grid;
  place-items: center;
  gap: 3px;
  text-align: center;

  span {
    font-size: 12px;
  }

  strong {
    font-size: 16px;
  }
`;
