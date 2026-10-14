/*
 * 추천 레시피 한 개를 보여 주는 카드다.
 * 누르면 레시피 상세 화면으로 이동한다.
 */
import styled from "@emotion/styled";
import { ChevronRight, Clock3 } from "lucide-react";
import { Link } from "react-router";
import type { Recipe } from "./recipeTypes";

type RecipeCardProps = {
  recipe: Recipe;
  tone: string;
};

function RecipeCard({ recipe, tone }: RecipeCardProps) {
  return (
    <Card to={`/recipes/${recipe.id}`}>
      <Cover $tone={tone}>
        <FoodEmoji aria-hidden="true">{recipe.emoji}</FoodEmoji>
      </Cover>
      <Body>
        <NameRow>
          <Name>{recipe.name}</Name>
          <ChevronRight size={18} aria-hidden="true" />
        </NameRow>
        <Meta>
          <MetaText>
            <Clock3 size={14} aria-hidden="true" />
            조리 시간 {recipe.cookTime}
          </MetaText>
          <Divider aria-hidden="true" />
          <MetaText>난이도 {recipe.difficulty}</MetaText>
        </Meta>
        <IngredientLine>
          사용
          {recipe.usedIngredients.map((ingredient) => (
            <strong key={ingredient}>{ingredient}</strong>
          ))}
        </IngredientLine>
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
