/*
 * 장보기 목록의 다음 구매 날짜 달력이다.
 * 재료마다 산 날과 구매 주기로 서버가 계산한 다음 구매 날짜를 월 달력에 보여 주고, 날짜를 누르면 그날 살 재료를 보여 준다.
 * 다음 구매일이 이미 지난 재료는 달력에 놓을 수 없어 달력 위에 따로 모은다.
 * 같은 날 산 재료들의 구매 주기가 다시 겹치는 날은 피버타임으로 표시한다.
 * 날짜는 모두 지역 날짜 "yyyy-MM-dd" 문자열로 다뤄 시간대 때문에 하루씩 어긋나지 않게 한다.
 * 부르는 쪽이 냉장고마다 key를 바꿔 새로 그리므로, 냉장고를 바꿔도 이전 냉장고 응답이 남지 않는다.
 */
import { useEffect, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { ChevronLeft, ChevronRight, Flame, ShoppingBasket } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import type { DayOfWeek } from "../../api/fridge";
import { getPurchaseSchedule } from "../../api/purchaseSchedule";
import type { PurchaseScheduleItem } from "../../api/purchaseSchedule";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import { getDaysLeft } from "../Fridge/fridgeLayout";
import { formatDate, getDateAfter } from "../Library/libraryDate";

type PurchaseCalendarProps = {
  fridgeId: number;
};

type ScheduleState =
  | { status: "loading" }
  | { status: "success"; items: PurchaseScheduleItem[] }
  | { status: "error"; message: string };

type Month = { year: number; month: number };

// Date.getDay() 값(일요일 0)
const shoppingDayIndex: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
// 칸이 좁아 재료는 이만큼만 보이고 나머지는 +N으로 줄인다.
const MAX_SHOWN_ICONS = 2;
// 주기의 최소공배수가 이보다 길면 1년 넘게 뒤라 장보기 계획에 쓸모가 없어 피버타임으로 치지 않는다.
const MAX_FEVER_PERIOD_DAYS = 365;

type FeverGroup = {
  purchasedAt: string;
  items: PurchaseScheduleItem[];
};

function toDateKey({ year, month }: Month, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthOf(dateKey: string): Month {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month: month - 1 };
}

function getErrorMessage(error: unknown) {
  // 요청 함수가 냉장고 목록을 낡은 것으로 표시해 두므로, 화면을 새로고침하면 지금 볼 수 있는 냉장고로 바뀐다.
  if (error instanceof ApiError && error.code === "FRIDGE_NOT_FOUND") {
    return "냉장고에서 나갔거나 내보내졌을 수 있어요. 페이지를 새로고침하면 지금 볼 수 있는 냉장고로 바꿔 보여 드려요.";
  }
  return error instanceof ApiError && error.code === NETWORK_ERROR
    ? error.message
    : "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.";
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getGcd(a: number, b: number): number {
  return b === 0 ? a : getGcd(b, a % b);
}

// 같은 날 산 재료가 둘 이상이면 산 날 + 그 재료들 구매 주기의 최소공배수가 다시 같이 사는 날(피버타임)이다.
// 그날이 이미 지났으면 같은 간격으로 오늘 이후 처음 겹치는 날을 쓴다. 한 날에 여러 묶음이 겹칠 수 있어 날짜마다 묶음 목록으로 모은다.
function getFeverGroupsByDate(items: PurchaseScheduleItem[]) {
  const itemsByPurchase = new Map<string, PurchaseScheduleItem[]>();
  for (const item of items) {
    if (item.cycleDays <= 0) continue;
    itemsByPurchase.set(item.lastPurchasedAt, [...(itemsByPurchase.get(item.lastPurchasedAt) ?? []), item]);
  }

  const groupsByDate = new Map<string, FeverGroup[]>();
  for (const [purchasedAt, group] of itemsByPurchase) {
    if (group.length < 2) continue;
    let period = 1;
    for (const item of group) {
      period = (period / getGcd(period, item.cycleDays)) * item.cycleDays;
      if (period > MAX_FEVER_PERIOD_DAYS) break;
    }
    if (period > MAX_FEVER_PERIOD_DAYS) continue;
    const daysSincePurchase = -getDaysLeft(purchasedAt);
    const repeat = Math.max(1, Math.ceil(daysSincePurchase / period));
    const feverDate = addDays(purchasedAt, repeat * period);
    groupsByDate.set(feverDate, [...(groupsByDate.get(feverDate) ?? []), { purchasedAt, items: group }]);
  }
  return groupsByDate;
}

function getNamesText(items: PurchaseScheduleItem[]) {
  return items.length > 1 ? `${items[0].name} 외 ${items.length - 1}개` : items[0].name;
}

function ItemIcon({ item }: { item: PurchaseScheduleItem }) {
  return item.emoji ? <span aria-hidden="true">{item.emoji}</span> : <ShoppingBasket size={14} aria-hidden="true" />;
}

function PurchaseCalendar({ fridgeId }: PurchaseCalendarProps) {
  // 장보는 요일은 장보는 날 카드가 바꾸므로 그 카드와 같이 스토어에서 읽어야 바로 따라 바뀐다.
  const shoppingDay = useFridgeStore((state) =>
    state.list.status === "success" ? (pickFridge(state.list.fridges, state.selectedFridgeId)?.shoppingDay ?? null) : null,
  );
  const [schedule, setSchedule] = useState<ScheduleState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [viewMonth, setViewMonth] = useState<Month>(() => getMonthOf(getDateAfter(0)));
  // null이거나 보고 있는 달 밖이면 그 달의 가장 가까운 예정일을 보여 준다.
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getPurchaseSchedule(fridgeId).then(
      (items) => {
        if (!ignore) setSchedule({ status: "success", items });
      },
      (error: unknown) => {
        if (!ignore) setSchedule({ status: "error", message: getErrorMessage(error) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeId, loadAttempt]);

  const handleRetry = () => {
    setSchedule({ status: "loading" });
    setLoadAttempt((prev) => prev + 1);
  };

  if (schedule.status === "loading") {
    return (
      <Card aria-busy="true">
        <ScreenReaderOnly role="status">다음 구매 날짜를 불러오는 중이에요.</ScreenReaderOnly>
        <Skeleton aria-hidden="true" />
      </Card>
    );
  }

  if (schedule.status === "error") {
    return (
      <Card>
        <StatusBox role="alert">
          <strong>다음 구매 날짜를 불러오지 못했어요.</strong>
          <p>{schedule.message}</p>
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        </StatusBox>
      </Card>
    );
  }

  const { items } = schedule;
  if (items.length === 0) {
    return (
      <Card>
        <Title>다음 구매 날짜</Title>
        <EmptyText>두 번 이상 산 재료가 생기면 다음 구매 날짜를 알려 드려요.</EmptyText>
      </Card>
    );
  }

  const todayKey = getDateAfter(0);
  const overdueItems = items.filter((item) => item.nextPurchaseDate < todayKey);
  const itemsByDate = new Map<string, PurchaseScheduleItem[]>();
  for (const item of items) {
    if (item.nextPurchaseDate < todayKey) continue;
    itemsByDate.set(item.nextPurchaseDate, [...(itemsByDate.get(item.nextPurchaseDate) ?? []), item]);
  }
  const feverGroupsByDate = getFeverGroupsByDate(items);
  const nextFeverDate = [...feverGroupsByDate.keys()].sort()[0];

  // 고른 날짜는 보고 있는 달 안에서만 쓴다. 다른 달로 넘기면 그 달 목록을 보여 줘야 해서다.
  // 고른 날이 없으면 빈 목록보다 곧 사야 할 재료가 보이는 게 쓸모 있어, 그 달의 가장 가까운 예정일을 먼저 고른다.
  // 예정일이 없으면 이번 달은 오늘, 다른 달은 1일을 보여 준다.
  const viewPrefix = toDateKey(viewMonth, 1).slice(0, 7);
  const nearestDate = [...itemsByDate.keys()].filter((date) => date.startsWith(viewPrefix)).sort()[0];
  const fallbackDate = todayKey.startsWith(viewPrefix) ? todayKey : toDateKey(viewMonth, 1);
  const selectedDate = pickedDate?.startsWith(viewPrefix) ? pickedDate : (nearestDate ?? fallbackDate);
  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const selectedFeverGroups = feverGroupsByDate.get(selectedDate) ?? [];

  const firstWeekday = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const dayCount = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const shoppingWeekday = shoppingDay ? shoppingDayIndex[shoppingDay] : null;

  const moveMonth = (offset: number) => {
    const moved = new Date(viewMonth.year, viewMonth.month + offset, 1);
    setViewMonth({ year: moved.getFullYear(), month: moved.getMonth() });
  };

  const showFeverDate = (dateKey: string) => {
    setViewMonth(getMonthOf(dateKey));
    setPickedDate(dateKey);
  };

  const cells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `blank-${index}`, day: null })),
    ...Array.from({ length: dayCount }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 })),
  ];

  return (
    <Card>
      <Title>다음 구매 날짜</Title>

      {overdueItems.length > 0 && (
        <Overdue aria-label="지난 구매 예정">
          <strong>지난 구매 예정</strong>
          <ul>
            {overdueItems.map((item) => (
              <li key={item.name}>
                <ItemIcon item={item} />
                {item.name} · {-getDaysLeft(item.nextPurchaseDate)}일 지났어요
              </li>
            ))}
          </ul>
        </Overdue>
      )}

      {nextFeverDate && (
        <FeverNote type="button" onClick={() => showFeverDate(nextFeverDate)}>
          <Flame size={18} aria-hidden="true" />
          <span>
            다음 피버타임은 <b>{formatDate(nextFeverDate)}</b>이에요. 같은 날 산 재료를 다시 같이 사는 날이에요.
          </span>
        </FeverNote>
      )}

      <MonthBar>
        <NavButton type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>
          <ChevronLeft size={20} aria-hidden="true" />
        </NavButton>
        <h3 aria-live="polite">
          {viewMonth.year}년 {viewMonth.month + 1}월
        </h3>
        <NavButton type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>
          <ChevronRight size={20} aria-hidden="true" />
        </NavButton>
      </MonthBar>

      <Weekdays aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </Weekdays>
      <Days>
        {cells.map(({ key, day }) => {
          if (day === null) return <span key={key} />;
          const dateKey = toDateKey(viewMonth, day);
          const dayItems = itemsByDate.get(dateKey) ?? [];
          const isFever = feverGroupsByDate.has(dateKey);
          const weekday = (firstWeekday + day - 1) % 7;
          const label = `${viewMonth.month + 1}월 ${day}일${dateKey === todayKey ? ", 오늘" : ""}${
            isFever ? ", 피버타임" : ""
          }${dayItems.length > 0 ? `, ${getNamesText(dayItems)} 구매 예정` : ""}`;
          return (
            <DayButton
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={dateKey === selectedDate}
              $isToday={dateKey === todayKey}
              $isShoppingDay={weekday === shoppingWeekday}
              $isFever={isFever}
              onClick={() => setPickedDate(dateKey)}
            >
              <span className="date">
                {day}
                {isFever && <Flame size={12} aria-hidden="true" />}
              </span>
              <span className="items" aria-hidden="true">
                {dayItems.slice(0, MAX_SHOWN_ICONS).map((item) => (
                  <span key={item.name} className="item">
                    <ItemIcon item={item} />
                    <span className="name">{item.name}</span>
                  </span>
                ))}
                {dayItems.length > MAX_SHOWN_ICONS && <em>+{dayItems.length - MAX_SHOWN_ICONS}</em>}
              </span>
            </DayButton>
          );
        })}
      </Days>

      <Selected aria-live="polite">
        <strong>{formatDate(selectedDate)}에 살 재료</strong>
        {selectedFeverGroups.map((group) => (
          <FeverBox key={group.purchasedAt}>
            <Flame size={16} aria-hidden="true" />
            <span>
              <b>피버타임</b> · {formatDate(group.purchasedAt)}에 같이 산 재료(
              {group.items.map((item) => item.name).join(", ")})를 이날 다시 같이 사요
            </span>
          </FeverBox>
        ))}
        {selectedItems.length === 0 ? (
          selectedFeverGroups.length === 0 && <p>이 날 살 재료는 없어요.</p>
        ) : (
          <ul>
            {selectedItems.map((item) => (
              <li key={item.name}>
                <ItemIcon item={item} />
                <b>{item.name}</b>
                <span>
                  {item.cycleDays}일마다 · 마지막 구매 {formatDate(item.lastPurchasedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Selected>
    </Card>
  );
}

export default PurchaseCalendar;

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

const Card = styled.section`
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  display: grid;
  gap: 14px;

  @media (max-width: 760px) {
    padding: 16px 12px;
  }
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 540;
`;

const EmptyText = styled.p`
  font-size: 15px;
  line-height: 1.5;
  word-break: keep-all;
`;

const Overdue = styled.section`
  border-radius: 8px;
  background: var(--block-cream);
  padding: 12px 16px;
  display: grid;
  gap: 6px;

  strong {
    font-size: 14px;
    font-weight: 540;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 480;
  }
`;

const FeverNote = styled.button`
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: var(--block-coral);
  color: var(--text);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.4;
  text-align: left;
  word-break: keep-all;
  cursor: pointer;

  svg {
    flex: none;
  }

  b {
    font-weight: 700;
  }
`;

const FeverBox = styled.p`
  border-radius: 8px;
  background: var(--block-coral);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  word-break: keep-all;

  svg {
    flex: none;
  }

  b {
    font-weight: 700;
  }
`;

const MonthBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    font-size: 17px;
    font-weight: 540;
  }
`;

const NavButton = styled.button`
  width: 44px;
  height: 44px;
  border: 1px solid var(--text);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  text-align: center;
  font-size: 13px;
  font-weight: 540;
`;

const Days = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
`;

const DayButton = styled.button<{ $isToday: boolean; $isShoppingDay: boolean; $isFever: boolean }>`
  min-width: 0;
  min-height: 64px;
  border: 1px solid ${({ $isToday }) => ($isToday ? "var(--text)" : "var(--border-soft)")};
  border-radius: 8px;
  /* 피버타임은 냉장고 화면 피버타임 배너와 같은 코랄로, 장보는 요일 색보다 먼저 보이게 한다. */
  background: ${({ $isShoppingDay, $isFever }) =>
    $isFever ? "var(--block-coral)" : $isShoppingDay ? "var(--block-lime)" : "var(--surface)"};
  color: var(--text);
  padding: 6px 4px;
  display: grid;
  align-content: space-between;
  justify-items: center;
  gap: 2px;
  cursor: pointer;

  &[aria-pressed="true"] {
    border: 2px solid var(--text);
    padding: 5px 3px;
  }

  .date {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 13px;
    font-weight: ${({ $isToday }) => ($isToday ? 700 : 480)};
  }

  .items {
    min-height: 18px;
    width: 100%;
    display: grid;
    justify-items: start;
    gap: 3px;
  }

  .item {
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 16px;
    line-height: 1;
  }

  .name {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 540;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  em {
    font-size: 11px;
    font-style: normal;
    font-weight: 540;
  }

  @media (max-width: 760px) {
    min-height: 52px;

    /* 모바일 칸은 너무 좁아 이름이 한두 글자만 보이므로 아이콘만 남기고, 이름은 아래 목록에서 본다. */
    .items {
      justify-items: center;
    }

    .item {
      font-size: 14px;
    }

    .name {
      display: none;
    }
  }
`;

const Selected = styled.div`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 14px 16px;
  display: grid;
  gap: 8px;

  strong {
    font-size: 15px;
    font-weight: 540;
  }

  p {
    font-size: 14px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
    font-size: 14px;
  }

  b {
    font-weight: 540;
  }

  li span:last-child {
    font-weight: 330;
  }
`;

const StatusBox = styled.div`
  min-height: 160px;
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 24px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;

  strong {
    font-size: 20px;
    font-weight: 700;
    word-break: keep-all;
  }

  p {
    font-size: 15px;
    line-height: 1.55;
    word-break: keep-all;
  }
`;

const OutlineButton = styled.button`
  min-height: 42px;
  border: 1px solid var(--text);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
`;

const Skeleton = styled.div`
  height: 320px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--surface-soft) 25%, var(--border-soft) 50%, var(--surface-soft) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ScreenReaderOnly = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;
