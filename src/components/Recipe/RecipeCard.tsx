/*
 * 추천 레시피 한 개를 보여 주는 카드다.
 * 누르면 레시피 상세 화면으로 이동한다.
 * "사용" 재료는 상세 화면처럼 지금 냉장고 기준으로 맞춰, 요리 완료로 빠진 재료는 보이지 않게 한다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ChevronRight, Clock3 } from "lucide-react";
import { Link } from "react-router";
import type { Recipe } from "../../api/recipe";
import { DEFAULT_RECIPE_EMOJI, formatCookTime, formatDifficulty } from "./recipeFormat";
import { getHoldings, type Holdings } from "./recipeHoldings";
import { getRecipeTone } from "./recipeTone";

type RecipeCardProps = {
  recipe: Recipe;
};

function RecipeCard({ recipe }: RecipeCardProps) {
  const [holdings, setHoldings] = useState<Holdings | null>(null);

  useEffect(() => {
    let ignore = false;
    getHoldings(recipe.id).then(
      (next) => {
        if (!ignore) setHoldings(next);
      },
      () => {
        // 후보를 못 받으면 저장된 fridgeMatches를 그대로 보여 준다.
      },
    );
    return () => {
      ignore = true;
    };
  }, [recipe.id]);

  const owned = holdings?.recipeId === recipe.id ? holdings.owned : null;
  // 지금 냉장고에 없다고 확인된 재료만 뺀다. 후보 응답에 없는 재료는 그대로 둔다.
  const fridgeMatches = recipe.fridgeMatches.filter((name) => owned?.get(name) !== false);

  return (
    <Card to={`/recipes/${recipe.id}`}>
      <Cover $tone={getRecipeTone(recipe.id)}>
        <FoodEmoji aria-hidden="true">{recipe.emoji ?? DEFAULT_RECIPE_EMOJI}</FoodEmoji>
      </Cover>
      <Body>
        <NameRow>
          <Name>{recipe.name}</Name>
          <ChevronRight size={18} aria-hidden="true" />
        </NameRow>
        <Meta>
          <MetaText>
            <Clock3 size={14} aria-hidden="true" />
            조리 시간 {formatCookTime(recipe.cookTimeMinutes)}
          </MetaText>
          <Divider aria-hidden="true" />
          <MetaText>난이도 {formatDifficulty(recipe.difficulty)}</MetaText>
        </Meta>
        {fridgeMatches.length > 0 && (
          <IngredientLine>
            사용
            {fridgeMatches.map((ingredient, index) => (
              <strong key={`${index}-${ingredient}`}>{ingredient}</strong>
            ))}
          </IngredientLine>
        )}
      </Body>
    </Card>
  );
}

export default RecipeCard;

const Card = styled(Link)`
  display: block;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  overflow: hidden;
  color: var(--text);
  text-decoration: none;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--text);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const Cover = styled.div<{ $tone: string }>`
  height: 205px;
  background: ${(props) => props.$tone};
  display: grid;
  place-items: center;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    inset: 18px 22px;
    border-radius: 50%;
    background: var(--surface);
    opacity: 0.45;
  }
`;

const FoodEmoji = styled.span`
  position: relative;
  font-size: 88px;
  filter: drop-shadow(var(--shadow-sm));
`;

const Body = styled.div`
  padding: 20px;
  display: grid;
  gap: 12px;
`;

const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
`;

const Name = styled.h3`
  font-size: 24px;
  font-weight: 700;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
`;

const MetaText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 480;
`;

const Divider = styled.span`
  width: 1px;
  height: 14px;
  background: var(--border);
`;

const IngredientLine = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 330;

  strong {
    font-weight: 700;
  }
`;
