/*
 * 냉장고 화면 옆에 여는 장본 음식 패널이다.
 * 장본 음식을 냉장고 선반이나 문칸으로 끌어다 놓으면 그 자리에 넣고, 끌기가 어려우면 넣기 버튼으로 지금 구역 선반 맨 뒤에 넣는다.
 * 넣는 요청을 기다리는 동안에는 그 음식을 흐리게 보여 주고 다시 끌거나 누르지 못하게 막는다.
 */
import { useId } from "react";
import { useDraggable } from "@dnd-kit/core";
import styled from "@emotion/styled";
import { ShoppingBag, X } from "lucide-react";
import type { PurchasedItem } from "../../api/purchasedItem";
import { formatDate } from "../Library/libraryDate";
import { purchasedDragId } from "./fridgeLayout";

export type PurchasedListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; items: PurchasedItem[] };

type PurchasedItemPanelProps = {
  state: PurchasedListState;
  // 지금 보고 있는 구역 이름. 넣기 버튼이 어디에 넣는지 알려 준다.
  zoneTitle: string;
  // 옮기기 요청을 기다리는 동안에는 모든 음식을 끌거나 넣지 못하게 막는다.
  disabled: boolean;
  movingId: number | null;
  onPut: (item: PurchasedItem) => void;
  onRetry: () => void;
  onClose: () => void;
};

function PurchasedItemPanel({ state, zoneTitle, disabled, movingId, onPut, onRetry, onClose }: PurchasedItemPanelProps) {
  const titleId = useId();

  const renderContent = () => {
    if (state.status === "loading") return <Message role="status">장본 음식을 불러오는 중이에요.</Message>;
    if (state.status === "error") {
      return (
        <ErrorBox role="alert">
          <p>장본 음식을 불러오지 못했어요.</p>
          <RetryButton type="button" onClick={onRetry}>
            다시 시도
          </RetryButton>
        </ErrorBox>
      );
    }
    if (state.items.length === 0) {
      return (
        <Message>
          넣을 장본 음식이 없어요.
          <br />
          도감에서 <strong>장본 음식에 담기</strong>를 눌러 보세요.
        </Message>
      );
    }
    return (
      <List>
        {state.items.map((item) => (
          <DraggablePurchasedItem
            key={item.id}
            item={item}
            zoneTitle={zoneTitle}
            disabled={disabled}
            moving={movingId === item.id}
            onPut={onPut}
          />
        ))}
      </List>
    );
  };

  return (
    <Panel aria-labelledby={titleId}>
      <Header>
        <Title id={titleId}>
          <ShoppingBag size={20} aria-hidden="true" />
          방금 장본 음식
        </Title>
        <CloseButton type="button" aria-label="장본 음식 패널 닫기" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </CloseButton>
      </Header>
      <Description>냉장고 선반이나 문칸으로 끌어다 놓아 넣어요.</Description>
      {renderContent()}
    </Panel>
  );
}

export default PurchasedItemPanel;

type DraggablePurchasedItemProps = {
  item: PurchasedItem;
  zoneTitle: string;
  disabled: boolean;
  moving: boolean;
  onPut: (item: PurchasedItem) => void;
};

function DraggablePurchasedItem({ item, zoneTitle, disabled, moving, onPut }: DraggablePurchasedItemProps) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: purchasedDragId(item.id), disabled });

  return (
    <Item ref={setNodeRef} $faded={isDragging || moving} {...listeners}>
      <ItemIcon aria-hidden="true">{item.emoji}</ItemIcon>
      <ItemText>
        <strong>{item.name}</strong>
        <span>{moving ? "넣는 중이에요" : `${formatDate(item.expiresAt)}까지`}</span>
      </ItemText>
      <PutButton
        type="button"
        aria-label={`${item.name} ${zoneTitle} 선반에 넣기`}
        disabled={disabled}
        onClick={() => onPut(item)}
      >
        넣기
      </PutButton>
    </Item>
  );
}

const Panel = styled.aside`
  position: sticky;
  top: 80px;
  width: 100%;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: var(--block-cream);
  padding: 20px;
  display: grid;
  gap: 12px;

  @media (max-width: 1100px) {
    position: static;
    width: min(420px, 100%);
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
  font-size: 20px;
  font-weight: 540;
  letter-spacing: -0.14px;
  white-space: nowrap;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const Description = styled.p`
  font-size: 14px;
  font-weight: 330;
  line-height: 1.45;
  word-break: keep-all;
`;

const Message = styled.p`
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

const ErrorBox = styled.div`
  border-radius: 8px;
  background: var(--surface);
  padding: 18px;
  display: grid;
  justify-items: start;
  gap: 10px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.55;
`;

const RetryButton = styled.button`
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 480;
  cursor: pointer;
`;

const List = styled.ul`
  list-style: none;
  display: grid;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
`;

const Item = styled.li<{ $faded: boolean }>`
  min-height: 56px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 8px 8px 8px 12px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  opacity: ${(props) => (props.$faded ? 0.35 : 1)};
  cursor: grab;
  /* 터치는 길게 눌러야 끌기가 시작되므로 그 전에는 목록을 스크롤할 수 있게 둔다. */
  touch-action: manipulation;
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

const PutButton = styled.button`
  min-height: 36px;
  border: 0;
  border-radius: 50px;
  background: var(--text);
  color: var(--surface);
  padding: 0 14px;
  font-size: 13px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }
`;
