/*
 * 레시피 목록의 레시피 한 개를 보여 주는 카드다.
 * 누르면 레시피 상세 화면으로 이동하고, 휴지통 버튼으로 확인한 뒤 지운다.
 * "사용" 재료는 상세 화면처럼 지금 냉장고 기준으로 맞춰, 요리 완료로 빠진 재료는 보이지 않게 한다.
 */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styled from "@emotion/styled";
import { ChevronRight, Clock3, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { Recipe } from "../../api/recipe";
import { DEFAULT_RECIPE_EMOJI, formatCookTime, formatDifficulty } from "./recipeFormat";
import { getHoldings, type Holdings } from "./recipeHoldings";
import { getRecipeTone } from "./recipeTone";
import { playSound } from "../../sound/soundEffects";

type RecipeCardProps = {
  recipe: Recipe;
  // 지우지 못하면 던진다. 지우면 목록에서 빠져 카드가 사라진다.
  onDelete: (recipe: Recipe) => Promise<void>;
};

type DeleteStatus = "idle" | "deleting" | "error";

function RecipeCard({ recipe, onDelete }: RecipeCardProps) {
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

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
  const isDeleting = deleteStatus === "deleting";

  const handleDelete = async () => {
    if (isDeleting) return;
    setDeleteStatus("deleting");
    try {
      // 성공하면 카드가 목록에서 빠지므로 상태를 되돌리지 않는다.
      await onDelete(recipe);
      playSound("delete");
    } catch {
      playSound("error");
      setDeleteStatus("error");
    }
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setIsConfirmingDelete(false);
    setDeleteStatus("idle");
    // 확인 영역이 사라지면 포커스가 갈 곳을 잃으므로 삭제 버튼으로 돌려놓는다.
    requestAnimationFrame(() => deleteButtonRef.current?.focus());
  };

  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") cancelDelete();
  };

  return (
    <CardWrap>
      <Card to={`/recipes/${recipe.id}`} inert={isConfirmingDelete}>
        <Cover $tone={getRecipeTone(recipe.id)}>
          <TypeBadge>{recipe.type === "TARGET" ? "만들고 싶은 음식" : "AI 추천"}</TypeBadge>
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
      <DeleteButton
        ref={deleteButtonRef}
        type="button"
        aria-label={`${recipe.name} 레시피 지우기`}
        onClick={() => setIsConfirmingDelete(true)}
        // 확인 영역은 화면만 덮으므로, 가려진 버튼에 키보드로 닿지 않게 확인하는 동안 막는다.
        disabled={isConfirmingDelete}
      >
        <Trash2 size={16} aria-hidden="true" />
      </DeleteButton>

      {isConfirmingDelete && (
        <ConfirmLayer role="group" aria-label={`${recipe.name} 삭제 확인`} onKeyDown={handleConfirmKeyDown}>
          {deleteStatus === "error" ? (
            <p role="alert">
              지우지 못했어요.
              <br />
              잠시 후 다시 시도해 주세요.
            </p>
          ) : (
            <p>
              {recipe.name} 레시피를
              <br />
              목록에서 지울까요?
            </p>
          )}
          <ConfirmButtons>
            {/* 실수로 지우지 않도록 취소에 먼저 포커스를 둔다. */}
            {/* disabled 대신 aria-disabled로 막아, 요청 중에도 포커스가 버튼에서 빠져나가지 않게 한다. */}
            <ConfirmButton type="button" onClick={cancelDelete} aria-disabled={isDeleting || undefined} autoFocus>
              취소
            </ConfirmButton>
            <ConfirmButton type="button" $primary onClick={handleDelete} aria-disabled={isDeleting || undefined}>
              {isDeleting ? "지우는 중..." : "지우기"}
            </ConfirmButton>
          </ConfirmButtons>
        </ConfirmLayer>
      )}
    </CardWrap>
  );
}

export default RecipeCard;

// 링크 안에 버튼을 넣을 수 없어, 링크와 삭제 버튼을 감싸는 틀이 함께 움직이게 한다.
const CardWrap = styled.article`
  position: relative;
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-3px);
  }

  &:hover > a {
    border-color: var(--text);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const Card = styled(Link)`
  display: block;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  overflow: hidden;
  color: var(--text);
  text-decoration: none;
  transition: border-color 0.18s ease;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
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

const TypeBadge = styled.span`
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  border-radius: 50px;
  background: var(--surface);
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 540;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--block-pink);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const ConfirmLayer = styled.div`
  position: absolute;
  inset: 0;
  border: 1px solid var(--text);
  border-radius: 8px;
  background: var(--block-pink);
  padding: 20px;
  display: grid;
  align-content: center;
  gap: 14px;
  text-align: center;

  p {
    font-size: 16px;
    font-weight: 540;
    line-height: 1.45;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
`;

const ConfirmButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const ConfirmButton = styled.button<{ $primary?: boolean }>`
  min-height: 40px;
  border: 0;
  border-radius: 50px;
  background: ${(props) => (props.$primary ? "var(--text)" : "var(--surface)")};
  color: ${(props) => (props.$primary ? "var(--surface)" : "var(--text)")};
  font-size: 14px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.4;
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
