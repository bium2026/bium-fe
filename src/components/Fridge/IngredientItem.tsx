/*
 * 냉장고 선반과 문칸에 놓이는 재료 카드다.
 * 남은 유통기한에 따라 배지 문구와 색을 바꾸고, 지난 재료는 흐리게 보여 준다.
 */
import styled from "@emotion/styled";
import type { FridgeIngredient } from "./fridgeTypes";

type Freshness = "expired" | "urgent" | "soon" | "safe";

type IngredientItemProps = {
  ingredient: FridgeIngredient;
  variant: "shelf" | "door";
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD"를 new Date()에 그대로 넣으면 UTC 자정으로 읽혀서, 지역 날짜로 바꿔 오늘과 비교한다.
function getDaysLeft(expiresAt: string) {
  const [year, month, day] = expiresAt.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(year, month - 1, day);
  // 서머타임이 있는 지역에서는 하루가 23·25시간일 수 있어 반올림한다.
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

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

function IngredientItem({ ingredient, variant }: IngredientItemProps) {
  const daysLeft = getDaysLeft(ingredient.expiresAt);
  const freshness = getFreshness(daysLeft);

  return (
    <Card $variant={variant} $freshness={freshness}>
      <Icon aria-hidden="true" $variant={variant} $freshness={freshness}>
        {ingredient.icon}
      </Icon>
      <Name $variant={variant}>{ingredient.name}</Name>
      <Badge $variant={variant} $freshness={freshness}>
        <span aria-hidden="true">{getBadgeText(daysLeft)}</span>
        <ScreenReaderText>{getBadgeDescription(daysLeft)}</ScreenReaderText>
      </Badge>
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

const screenReaderOnly = `
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

const Card = styled.div<StyleProps>`
  position: relative;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: ${(props) => (props.$freshness === "expired" ? "var(--surface-soft)" : "var(--surface)")};
  box-shadow: var(--shadow-sm);
  display: grid;
  min-width: 0;

  ${(props) =>
    props.$variant === "shelf"
      ? `
        grid-template-rows: 1fr auto;
        justify-items: center;
        align-items: center;
        padding: 22px 6px 8px;
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

const Icon = styled.span<StyleProps>`
  font-size: ${(props) => (props.$variant === "shelf" ? "28px" : "20px")};
  line-height: 1;
  filter: ${(props) => (props.$freshness === "expired" ? "grayscale(1)" : "none")};

  @media (max-width: 760px) {
    font-size: ${(props) => (props.$variant === "shelf" ? "24px" : "18px")};
  }
`;

// 모바일 문칸은 폭이 좁아 이름 대신 아이콘과 배지만 보여 주고, 이름은 화면 읽기 프로그램용으로 남긴다.
const Name = styled.strong<{ $variant: IngredientItemProps["variant"] }>`
  width: 100%;
  font-size: ${(props) => (props.$variant === "shelf" ? "13px" : "12px")};
  font-weight: 540;
  line-height: 1.2;
  text-align: ${(props) => (props.$variant === "shelf" ? "center" : "left")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 760px) {
    ${(props) => (props.$variant === "door" ? screenReaderOnly : "")}
  }
`;

const Badge = styled.span<StyleProps>`
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

  @media (max-width: 760px) {
    padding: 1px 5px;
    font-size: 9px;
  }
`;

const ScreenReaderText = styled.span`
  ${screenReaderOnly}
`;
