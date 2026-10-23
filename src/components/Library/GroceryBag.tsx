/*
 * 식재료 도감 오른쪽의 장본 음식 패널이다.
 * 도감에서 담은 재료를 최근에 담은 순서로 보여 준다.
 * 장본 음식 목록 조회·빼기 API가 아직 없어서, 이 화면에서 담은 재료만 보여 주고 빼기 버튼은 두지 않는다.
 */
import { useId } from "react";
import styled from "@emotion/styled";
import { ShoppingBag } from "lucide-react";
import type { PurchasedItem } from "../../api/purchasedItem";
import { formatDate } from "./libraryDate";

type GroceryBagProps = {
  items: PurchasedItem[];
};

function GroceryBag({ items }: GroceryBagProps) {
  const titleId = useId();

  return (
    <Panel aria-labelledby={titleId}>
      <Header>
        <Title id={titleId}>
          <ShoppingBag size={20} aria-hidden="true" />
          장본 음식
        </Title>
        <Count aria-label={`${items.length}개`}>{items.length}</Count>
      </Header>
      <Description>냉장고에 넣기 전에 장 본 재료를 모아 두는 곳이에요.</Description>

      {items.length === 0 ? (
        <Empty>
          아직 담은 재료가 없어요.
          <br />
          도감에서 <strong>장본 음식에 담기</strong>를 눌러 보세요.
        </Empty>
      ) : (
        <List>
          {items.map((item) => (
            <Item key={item.id}>
              <ItemIcon aria-hidden="true">{item.emoji}</ItemIcon>
              <ItemText>
                <strong>{item.name}</strong>
                <span>{formatDate(item.expiresAt)}까지</span>
              </ItemText>
            </Item>
          ))}
        </List>
      )}
    </Panel>
  );
}

export default GroceryBag;

const Panel = styled.aside`
  position: sticky;
  top: 80px;
  border-radius: 24px;
  background: var(--block-cream);
  padding: 24px;
  display: grid;
  gap: 12px;

  @media (max-width: 900px) {
    position: static;
  }

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Title = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 540;
  letter-spacing: -0.14px;
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

const Description = styled.p`
  font-size: 14px;
  font-weight: 330;
  line-height: 1.45;
  word-break: keep-all;
`;

const Empty = styled.p`
  border-radius: 8px;
  background: var(--surface);
  padding: 18px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.55;
  word-break: keep-all;

  strong {
    font-weight: 540;
  }
`;

const List = styled.ul`
  list-style: none;
  display: grid;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
`;

const Item = styled.li`
  min-height: 56px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 8px 12px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
`;

const ItemIcon = styled.span`
  font-size: 22px;
  line-height: 1;
`;

const ItemText = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;

  strong {
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    font-size: 12px;
    font-weight: 330;
  }
`;
