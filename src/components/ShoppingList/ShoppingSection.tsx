/*
 * 장보기 목록의 한 묶음(살 것 또는 산 것)이다.
 * 재료마다 산 것 체크와 빼기 버튼을 두고, 레시피의 부족 재료로 담긴 재료에는 그 레시피를 함께 보여 준다.
 * 요청 중인 재료는 버튼을 잠그고, 요청에 실패한 재료 아래에 오류를 보여 준다.
 */
import { useId } from "react";
import type { ReactNode, RefObject } from "react";
import styled from "@emotion/styled";
import { Check, ChefHat, X } from "lucide-react";
import { Link } from "react-router";
import type { ShoppingListItem } from "../../api/shoppingList";

type ShoppingSectionProps = {
  title: string;
  items: ShoppingListItem[];
  emptyText: string;
  pendingIds: number[];
  itemErrors: Record<number, string>;
  // 체크하면 재료가 다른 묶음으로 옮겨 새로 그려지므로, 화면이 옮긴 재료의 체크 상자를 찾아 포커스를 돌려놓을 때 쓴다.
  checkboxRefs: RefObject<Map<number, HTMLInputElement>>;
  // 산 것 묶음은 바탕을 옅게 해 살 것보다 덜 눈에 띄게 한다.
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
                    <ItemName $checked={item.checked}>{item.name}</ItemName>
                  </CheckLabel>

                  {item.recipeName &&
                    (item.recipeId !== null ? (
                      <RecipeLink to={`/recipes/${item.recipeId}`}>
                        <ChefHat size={13} aria-hidden="true" />
                        <span>{item.recipeName} 레시피</span>
                      </RecipeLink>
                    ) : (
                      <RecipeText>
                        <ChefHat size={13} aria-hidden="true" />
                        <span>{item.recipeName} 레시피</span>
                      </RecipeText>
                    ))}

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

export default ShoppingSection;

const Panel = styled.section<{ $muted: boolean }>`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: ${(props) => (props.$muted ? "var(--surface-soft)" : "var(--surface)")};
  padding: 24px;
  display: grid;
  /* 긴 재료 이름이나 입력칸이 좁은 화면에서 패널 밖으로 밀어내지 않게 한다. */
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 16px;

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    font-size: 22px;
    font-weight: 540;
    letter-spacing: -0.26px;
  }
`;

const Count = styled.span`
  min-width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 0 8px;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 480;
`;

const Empty = styled.p`
  border-radius: 8px;
  background: var(--block-cream);
  padding: 18px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.55;
  word-break: keep-all;
`;

const List = styled.ul`
  list-style: none;
  display: grid;

  li + li {
    border-top: 1px solid var(--border);
  }
`;

const Item = styled.li`
  min-height: 56px;
  padding: 8px 0;
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
  gap: 4px;
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
`;

const ItemName = styled.span<{ $checked: boolean }>`
  min-width: 0;
  font-size: 16px;
  font-weight: ${(props) => (props.$checked ? 330 : 540)};
  line-height: 1.4;
  text-decoration: ${(props) => (props.$checked ? "line-through" : "none")};
  overflow-wrap: anywhere;
`;

// 레시피와 오류는 체크 상자(24px)와 간격(10px)만큼 들여 재료 이름 아래에 맞춘다.
const recipeTagStyle = `
  margin-left: 34px;
  max-width: calc(100% - 34px);
  border-radius: 999px;
  background: var(--block-lilac);
  color: var(--text);
  padding: 2px 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 540;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const RecipeLink = styled(Link)`
  ${recipeTagStyle}
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const RecipeText = styled.span`
  ${recipeTagStyle}
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
