/*
 * 레시피 화면 오른쪽에 보여 주는 유통기한 임박 재료 목록이다.
 * 냉장고 재료를 불러와 오늘부터 D-5까지인 재료를 가까운 순서로 5개까지 보여 준다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { getFridgeItems, type FridgeContents, type FridgeItem } from "../../api/fridge";

const URGENT_DAYS = 5;
const MAX_URGENT_ITEMS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

type UrgentIngredientListProps = {
  fridgeId: number;
};

// 다시 불러오기를 누르거나 냉장고가 바뀌면 requestKey가 바뀌어, 이전 결과 대신 로딩을 보여 준다.
type ItemsResult = { requestKey: string } & ({ items: FridgeItem[] } | { failed: true });

// "YYYY-MM-DD"를 new Date()에 그대로 넣으면 UTC 자정으로 읽혀서, 지역 날짜로 바꿔 오늘과 비교한다.
function getDaysLeft(expiresAt: string) {
  const [year, month, day] = expiresAt.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(year, month - 1, day);
  // 서머타임이 있는 지역에서는 하루가 23·25시간일 수 있어 반올림한다.
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

// 임박 재료는 보관 위치·칸과 상관없이 고르므로 모든 칸의 재료를 한 목록으로 모은다.
function flattenContents(contents: FridgeContents) {
  return [contents.fridge, contents.freezer, contents.room].flatMap((storage) => [
    ...storage.center,
    ...storage.leftDoor,
    ...storage.rightDoor,
  ]);
}

function getUrgentItems(items: FridgeItem[]) {
  return items
    .flatMap((item) => (item.expiresAt ? [{ ...item, daysLeft: getDaysLeft(item.expiresAt) }] : []))
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= URGENT_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, MAX_URGENT_ITEMS);
}

function UrgentIngredientList({ fridgeId }: UrgentIngredientListProps) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ItemsResult | null>(null);
  const requestKey = `${fridgeId}-${attempt}`;

  useEffect(() => {
    let ignore = false;
    getFridgeItems(fridgeId).then(
      (contents) => {
        if (!ignore) setResult({ requestKey, items: flattenContents(contents) });
      },
      () => {
        if (!ignore) setResult({ requestKey, failed: true });
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeId, requestKey]);

  if (result?.requestKey !== requestKey) {
    return <Message aria-busy="true">임박 재료를 불러오는 중이에요.</Message>;
  }

  if ("failed" in result) {
    return (
      <Message role="alert">
        임박 재료를 불러오지 못했어요.
        <RetryButton type="button" onClick={() => setAttempt((prev) => prev + 1)}>
          다시 불러오기
        </RetryButton>
      </Message>
    );
  }

  const urgentItems = getUrgentItems(result.items);
  if (urgentItems.length === 0) return <Message>임박 재료가 없어요.</Message>;

  return (
    <List>
      {urgentItems.map((item) => (
        <li key={item.id}>
          <span aria-hidden="true">{item.emoji}</span>
          <strong>{item.name}</strong>
          <em>{item.daysLeft === 0 ? "오늘" : `D-${item.daysLeft}`}</em>
        </li>
      ))}
    </List>
  );
}

export default UrgentIngredientList;

const List = styled.ul`
  list-style: none;

  li {
    min-height: 44px;
    border-bottom: 1px solid var(--surface);
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  strong {
    font-weight: 800;
  }

  em {
    font-style: normal;
    font-weight: 900;
  }
`;

const Message = styled.p`
  display: grid;
  justify-items: start;
  gap: 8px;
  font-size: 14px;
`;

const RetryButton = styled.button`
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 480;
  cursor: pointer;
`;
