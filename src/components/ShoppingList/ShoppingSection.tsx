/*
 * 장보기 목록의 한 묶음(살 것 또는 산 것)이다.
 * 재료마다 산 것 체크와 빼기 버튼을 두고, 레시피의 부족 재료로 담긴 재료에는 그 레시피를 함께 보여 준다.
 * 시세가 있는 재료에는 KAMIS 소매가 시세와 1주 전과의 차이를 보여 준다.
 * 요청 중인 재료는 버튼을 잠그고, 요청에 실패한 재료 아래에 오류를 보여 준다.
 */
import { useId } from "react";
import type { ReactNode, RefObject } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Check, ChefHat, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { Link } from "react-router";
import type { MarketPrice, ShoppingListItem } from "../../api/shoppingList";

// "2026-11-10" -> "11.10"
function formatSurveyDate(surveyDate: string) {
  const [, month, day] = surveyDate.split("-");
  return `${Number(month)}.${Number(day)}`;
}

function getTrend({ price, weekAgoPrice }: MarketPrice) {
  if (weekAgoPrice === null) return null;
  const diff = price - weekAgoPrice;
  if (diff > 0) return { Icon: TrendingUp, text: `1주 전보다 ${diff.toLocaleString("ko-KR")}원 올랐어요` };
  if (diff < 0) return { Icon: TrendingDown, text: `1주 전보다 ${Math.abs(diff).toLocaleString("ko-KR")}원 내렸어요` };
  return { Icon: Minus, text: "1주 전과 같아요" };
}

type ShoppingSectionProps = {
  title: string;
  items: ShoppingListItem[];
  emptyText: string;
  pendingIds: number[];
  itemErrors: Record<number, string>;
  // 체크하면 재료가 다른 묶음으로 옮겨 새로 그려지므로, 화면이 옮긴 재료의 체크 상자를 찾아 포커스를 돌려놓을 때 쓴다.
  checkboxRefs: RefObject<Map<number, HTMLInputElement>>;
  // 산 것 묶음은 위에 점선을 긋고 제목을 작게 해 살 것보다 덜 눈에 띄게 한다.
  muted?: boolean;
  onToggle: (item: ShoppingListItem, checked: boolean) => void;
  onRemove: (item: ShoppingListItem) => void;
  // 살 것 묶음 위쪽에 담기 입력칸을 넣는다.
  children?: ReactNode;
};

function ShoppingSection({
  title,
  items,
  emptyText,
  pendingIds,
  itemErrors,
  checkboxRefs,
  muted = false,
  onToggle,
  onRemove,
  children,
}: ShoppingSectionProps) {
  const titleId = useId();

  return (
    <Panel aria-labelledby={titleId} $muted={muted}>
      <Header>
        <h2 id={titleId}>{title}</h2>
        <Count aria-label={`${items.length}개`}>{items.length}</Count>
      </Header>

      {children}

      {items.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <List>
          {items.map((item) => {
            const isPending = pendingIds.includes(item.id);
            const error = itemErrors[item.id];
            const errorId = `${titleId}-${item.id}-error`;
            return (
              <Item key={item.id}>
                <ItemMain>
                  <CheckLabel>
                    <CheckInput
                      ref={(node) => {
                        if (node) checkboxRefs.current.set(item.id, node);
                        else checkboxRefs.current.delete(item.id);
                      }}
                      type="checkbox"
                      checked={item.checked}
                      onChange={(event) => onToggle(item, event.target.checked)}
                      // 요청 중에도 포커스가 빠지지 않게 disabled 대신 aria-disabled로 알리고, 누르면 화면이 무시한다.
                      aria-disabled={isPending || undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                    <CheckBox aria-hidden="true" $checked={item.checked}>
                      {item.checked && <Check size={14} strokeWidth={3} />}
                    </CheckBox>
                    {/* 막 체크한 재료(요청 중)는 산 것으로 내려오면서 줄이 그어지는 모습을 보여 준다. */}
                    <ItemName $checked={item.checked} $animate={item.checked && isPending}>
                      <span>{item.name}</span>
                    </ItemName>
                  </CheckLabel>

                  {item.marketPrice && <MarketPriceLine marketPrice={item.marketPrice} checked={item.checked} />}

                  {item.recipeId !== null && item.recipeName && (
                    <RecipeLink to={`/recipes/${item.recipeId}`}>
                      <ChefHat size={13} aria-hidden="true" />
                      <span>{item.recipeName} 레시피</span>
                    </RecipeLink>
                  )}

                  {error && (
                    <ItemError id={errorId} role="alert">
                      {error}
                    </ItemError>
                  )}
                </ItemMain>

                <RemoveButton
                  type="button"
                  aria-label={`${item.name} 장보기 목록에서 빼기`}
                  aria-disabled={isPending || undefined}
                  onClick={() => onRemove(item)}
                >
                  <X size={16} aria-hidden="true" />
                </RemoveButton>
              </Item>
            );
          })}
        </List>
      )}
    </Panel>
  );
}

function MarketPriceLine({ marketPrice, checked }: { marketPrice: MarketPrice; checked: boolean }) {
  const trend = getTrend(marketPrice);
  const unit = marketPrice.unit ? ` / ${marketPrice.unit}` : "";

  return (
    <PriceLine $checked={checked}>
      <strong>
        시세 {marketPrice.price.toLocaleString("ko-KR")}원{unit}
      </strong>
      <span>{formatSurveyDate(marketPrice.surveyDate)} 기준</span>
      {trend && (
        <Trend>
          <trend.Icon size={13} aria-hidden="true" />
          <span>{trend.text}</span>
        </Trend>
      )}
    </PriceLine>
  );
}

export default ShoppingSection;

const strike = keyframes`
  from { background-size: 0% 1.5px; }
  to { background-size: 100% 1.5px; }
`;

// 테두리 카드는 두 묶음을 감싼 페이지 쪽 메모가 맡고, 여기서는 묶음 사이를 점선으로만 나눈다.
const Panel = styled.section<{ $muted: boolean }>`
  /* 긴 재료 이름이나 입력칸이 좁은 화면에서 패널 밖으로 밀어내지 않게 한다. */
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: ${(props) => (props.$muted ? "8px" : "16px")};
  ${(props) => props.$muted && "border-top: 1px dashed var(--border); padding-top: 20px;"}

  h2 {
    font-size: ${(props) => (props.$muted ? "17px" : "22px")};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;

  h2 {
    font-weight: 540;
    letter-spacing: -0.26px;
  }
`;

const Count = styled.span`
  font-size: 15px;
  font-weight: 330;
`;

const Empty = styled.p`
  padding: 12px 0 4px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.55;
  word-break: keep-all;
`;

const List = styled.ul`
  list-style: none;
  display: grid;

  li + li {
    border-top: 1px solid var(--border-soft);
  }
`;

const Item = styled.li`
  min-height: 52px;
  padding: 6px 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  align-items: center;
  gap: 12px;
`;

const ItemMain = styled.div`
  min-width: 0;
  display: grid;
  /* 한 줄로 줄이는 긴 레시피 이름이 칸을 넓혀 화면 밖으로 밀어내지 않게 한다. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: start;
  gap: 2px;
`;

const CheckLabel = styled.label`
  position: relative;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

// 브라우저 기본 체크 상자 대신 옆의 원을 보여 주고, 실제 입력은 키보드·스크린 리더용으로 남긴다.
const CheckInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;

  &:focus-visible + span {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  &[aria-disabled="true"] + span {
    cursor: wait;
    opacity: 0.45;
  }
`;

const CheckBox = styled.span<{ $checked: boolean }>`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 1.5px solid var(--text);
  border-radius: 999px;
  background: ${(props) => (props.$checked ? "var(--text)" : "var(--surface)")};
  color: var(--surface);
  display: grid;
  place-items: center;
  transition: background-color 0.15s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// 줄긋기는 text-decoration 대신 배경 선으로 그려 그어지는 움직임을 줄 수 있게 한다.
// 이름이 두 줄로 넘어가도 줄마다 선이 그어지게 안쪽 글자를 inline으로 둔다.
const ItemName = styled.span<{ $checked: boolean; $animate: boolean }>`
  min-width: 0;
  font-size: 16px;
  font-weight: ${(props) => (props.$checked ? 330 : 540)};
  line-height: 1.4;
  overflow-wrap: anywhere;

  span {
    background: ${(props) => (props.$checked ? "linear-gradient(var(--text), var(--text)) no-repeat 0 52% / 100% 1.5px" : "none")};
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    animation: ${(props) => (props.$animate ? strike : "none")} 0.35s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
    }
  }
`;

// 레시피와 오류는 체크 상자(24px)와 간격(10px)만큼 들여 재료 이름 아래에 맞춘다.
const RecipeLink = styled(Link)`
  margin-left: 34px;
  max-width: calc(100% - 34px);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 480;
  line-height: 1.5;
  text-decoration: none;

  svg {
    flex-shrink: 0;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

// 시세도 체크 상자 너비만큼 들이고, 산 것은 재료 이름처럼 흐리게 한다. 좁은 화면에서는 줄바꿈한다.
const PriceLine = styled.p<{ $checked: boolean }>`
  margin-left: 34px;
  max-width: calc(100% - 34px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
  font-size: 13px;
  font-weight: 330;
  line-height: 1.5;
  opacity: ${(props) => (props.$checked ? 0.55 : 1)};

  strong {
    font-weight: 540;
  }
`;

const Trend = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 540;

  svg {
    flex-shrink: 0;
  }
`;

const ItemError = styled.p`
  margin-left: 34px;
  font-size: 12px;
  font-weight: 540;
  line-height: 1.4;
  word-break: keep-all;
`;

const RemoveButton = styled.button`
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--block-pink);
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.3;
  }
`;
