/*
 * 냉장고 선반과 문칸에 놓이는 재료 카드다.
 * 남은 유통기한에 따라 배지 문구와 색을 바꾸고, 지난 재료는 흐리게 보여 준다. 유통기한이 없으면 배지를 보여 주지 않는다.
 * 누르면 재료 수정 모달을 연다. 드래그 앤 드롭으로 옮길 수 있게 끌기 이벤트를 카드에 붙인다.
 */
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { getDaysLeft } from "./fridgeLayout";
import type { FridgeIngredient } from "./fridgeTypes";

type Freshness = "expired" | "urgent" | "soon" | "safe";

type IngredientItemProps = {
  ingredient: FridgeIngredient;
  variant: "shelf" | "door";
  onSelect: (ingredient: FridgeIngredient) => void;
  dragListeners?: DraggableSyntheticListeners;
  // 끌고 있는 동안 원래 자리는 흐리게 남기고, 손가락·마우스를 따라다니는 카드는 DragOverlay가 그린다.
  isDragging?: boolean;
  // 손을 따라다니는 DragOverlay 복제 카드처럼 움직임이 어색한 곳에서는 끈다.
  animated?: boolean;
};

function getFreshness(daysLeft: number): Freshness {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "urgent";
  if (daysLeft <= 6) return "soon";
  return "safe";
}

function getBadgeText(daysLeft: number) {
  if (daysLeft < 0) return `만료 ${Math.abs(daysLeft)}일`;
  if (daysLeft === 0) return "오늘";
  return `D-${daysLeft}`;
}

function getBadgeDescription(daysLeft: number) {
  if (daysLeft < 0) return `유통기한 ${Math.abs(daysLeft)}일 지남`;
  if (daysLeft === 0) return "오늘까지";
  return `유통기한 ${daysLeft}일 남음`;
}

// 유통기한 막대: 넣은 날부터 유통기한까지 중 남은 비율. 넣은 날이나 유통기한을 모르거나 이미 지났으면 그리지 않는다.
function getRemainingRatio(purchasedAt: string | null | undefined, expiresAt: string, daysLeft: number | null) {
  if (!purchasedAt || !expiresAt || daysLeft === null || daysLeft < 0) return null;
  const total = getDaysLeft(expiresAt) - getDaysLeft(purchasedAt);
  // 넣은 날이 유통기한인 재료(오늘 넣고 오늘까지)는 남은 기간이 없어 거의 빈 막대로 그린다.
  if (total <= 0) return 0;
  return Math.min(1, daysLeft / total);
}

// 카드마다 시작 시점을 달리해 한꺼번에 움직이지 않게 한다. 렌더마다 같은 값이어야 해서 id로만 정한다.
function getAnimationOffset(id: number) {
  return ((id * 7) % 10) / 10;
}

function IngredientItem({
  ingredient,
  variant,
  onSelect,
  dragListeners,
  isDragging = false,
  animated = true,
}: IngredientItemProps) {
  const daysLeft = ingredient.expiresAt ? getDaysLeft(ingredient.expiresAt) : null;
  const freshness = daysLeft === null ? "safe" : getFreshness(daysLeft);
  const remaining = getRemainingRatio(ingredient.purchasedAt, ingredient.expiresAt, daysLeft);
  const motion = animated && !isDragging;
  const offset = getAnimationOffset(ingredient.id);

  return (
    <Card
      type="button"
      aria-haspopup="dialog"
      onClick={() => onSelect(ingredient)}
      {...dragListeners}
      $variant={variant}
      $freshness={freshness}
      $dragging={isDragging}
    >
      <Icon aria-hidden="true" $variant={variant} $freshness={freshness} $motion={motion} $offset={offset}>
        {ingredient.emoji}
      </Icon>
      <Name $variant={variant}>{ingredient.name}</Name>
      {daysLeft !== null && (
        <Badge $variant={variant} $freshness={freshness} $motion={motion} $offset={offset}>
          <span aria-hidden="true">{getBadgeText(daysLeft)}</span>
          <ScreenReaderText>{getBadgeDescription(daysLeft)}</ScreenReaderText>
        </Badge>
      )}
      {remaining !== null && (
        <ExpiryBar aria-hidden="true">
          <ExpiryFill $freshness={freshness} style={{ width: `${Math.max(remaining * 100, 4)}%` }} />
        </ExpiryBar>
      )}
    </Card>
  );
}

export default IngredientItem;

const badgeBackground: Record<Freshness, string> = {
  expired: "var(--text)",
  urgent: "var(--block-coral)",
  soon: "var(--block-cream)",
  safe: "var(--block-mint)",
};

type StyleProps = {
  $variant: IngredientItemProps["variant"];
  $freshness: Freshness;
};

type MotionProps = StyleProps & { $motion: boolean; $offset: number };

// 단계마다 주기가 다르다. 음수 delay로 주기 안의 다른 지점에서 시작하게 한다.
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

// 주기의 앞부분만 흔들고 나머지는 쉰다.
const shake = keyframes`
  0%, 40%, 100% { transform: rotate(0); }
  5%, 15%, 25% { transform: rotate(-9deg); }
  10%, 20%, 30% { transform: rotate(9deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.75; }
`;

const iconAnimation = {
  safe: { keyframes: float, duration: 4.5 },
  soon: { keyframes: bounce, duration: 2.2 },
  urgent: { keyframes: shake, duration: 1.8 },
};

// reduced-motion이면 움직임을 모두 끈다. expired는 움직이지 않는다.
function getIconAnimation(props: MotionProps) {
  if (!props.$motion || props.$freshness === "expired") return "";
  const { keyframes: name, duration } = iconAnimation[props.$freshness];
  return css`
    animation: ${name} ${duration}s ease-in-out ${-props.$offset * duration}s infinite;
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;
}

function getBadgeAnimation(props: MotionProps) {
  if (!props.$motion || props.$freshness !== "urgent") return "";
  return css`
    animation: ${pulse} 1.8s ease-in-out ${-props.$offset * 1.8}s infinite;
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;
}

const screenReaderOnly = `
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

const Card = styled.button<StyleProps & { $dragging: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: ${(props) => (props.$freshness === "expired" ? "var(--surface-soft)" : "var(--surface)")};
  box-shadow: var(--shadow-sm);
  display: grid;
  min-width: 0;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  opacity: ${(props) => (props.$dragging ? 0.35 : 1)};
  /* 터치는 길게 눌러야 끌기가 시작되므로 그 전에는 화면을 스크롤할 수 있게 둔다. */
  touch-action: manipulation;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  ${(props) =>
    props.$variant === "shelf"
      ? `
        grid-template-rows: 1fr auto;
        justify-items: center;
        align-items: center;
        padding: 24px 8px 10px;

        @media (max-width: 760px) {
          padding: 22px 6px 8px;
        }
      `
      : `
        grid-template-columns: 24px minmax(0, 1fr) auto;
        align-items: center;
        gap: 4px;
        padding: 0 6px;

        @media (max-width: 760px) {
          grid-template-columns: 1fr;
          justify-items: center;
          align-content: center;
          gap: 2px;
          padding: 3px 2px;
        }
      `}
`;

const Icon = styled.span<MotionProps>`
  font-size: ${(props) => (props.$variant === "shelf" ? "34px" : "24px")};
  line-height: 1;
  filter: ${(props) => (props.$freshness === "expired" ? "grayscale(1)" : "none")};
  ${getIconAnimation}

  @media (max-width: 760px) {
    font-size: ${(props) => (props.$variant === "shelf" ? "24px" : "18px")};
  }
`;

// 모바일 문칸은 폭이 좁아 이름 대신 아이콘과 배지만 보여 주고, 이름은 화면 읽기 프로그램용으로 남긴다.
const Name = styled.strong<{ $variant: IngredientItemProps["variant"] }>`
  width: 100%;
  font-size: ${(props) => (props.$variant === "shelf" ? "14px" : "13px")};
  font-weight: 540;
  line-height: 1.2;
  text-align: ${(props) => (props.$variant === "shelf" ? "center" : "left")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 760px) {
    font-size: 13px;
    ${(props) => (props.$variant === "door" ? screenReaderOnly : "")}
  }
`;

const Badge = styled.span<MotionProps>`
  ${(props) =>
    props.$variant === "shelf"
      ? `
        position: absolute;
        top: 5px;
        right: 5px;
      `
      : ""}
  border-radius: 999px;
  background: ${(props) => badgeBackground[props.$freshness]};
  color: ${(props) => (props.$freshness === "expired" ? "var(--surface)" : "var(--text)")};
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  ${getBadgeAnimation}

  @media (max-width: 760px) {
    padding: 1px 5px;
    font-size: 9px;
  }
`;

const ScreenReaderText = styled.span`
  ${screenReaderOnly}
`;

// 막대는 얇아서 배지의 옅은 파스텔 대신 진한 색을 쓴다. 지난 재료는 막대를 그리지 않는다.
const barColor: Record<Freshness, string> = {
  expired: "var(--text)",
  urgent: "var(--accent-magenta)",
  soon: "var(--block-coral)",
  safe: "var(--success)",
};

// 카드 아래쪽에 붙는 유통기한 막대. 남은 기간만큼 채우고, 배지와 같은 색으로 신선도를 보여 준다.
const ExpiryBar = styled.span`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--border-soft);
  overflow: hidden;
  pointer-events: none;
`;

const ExpiryFill = styled.span<{ $freshness: Freshness }>`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: ${(props) => barColor[props.$freshness]};
`;
