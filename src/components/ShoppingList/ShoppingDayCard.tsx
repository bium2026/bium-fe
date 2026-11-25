/*
 * 장보기 목록 머리에 붙는 장보는 날 설정이다. 냉장고마다 장보는 요일을 정해 두면 다음 장보는 날까지 며칠 남았는지 보여 준다.
 * 장보기는 멤버가 함께 하므로 멤버 누구나 바꿀 수 있다.
 */
import { useId, useState } from "react";
import styled from "@emotion/styled";
import { CalendarDays } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { changeShoppingDay, type DayOfWeek } from "../../api/fridge";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import { playSound } from "../../sound/soundEffects";

// jsDay는 Date.getDay() 값(일요일 0)
const days: { id: DayOfWeek; label: string; jsDay: number }[] = [
  { id: "MONDAY", label: "월요일", jsDay: 1 },
  { id: "TUESDAY", label: "화요일", jsDay: 2 },
  { id: "WEDNESDAY", label: "수요일", jsDay: 3 },
  { id: "THURSDAY", label: "목요일", jsDay: 4 },
  { id: "FRIDAY", label: "금요일", jsDay: 5 },
  { id: "SATURDAY", label: "토요일", jsDay: 6 },
  { id: "SUNDAY", label: "일요일", jsDay: 0 },
];

const NOT_SET = "";

function getNextShoppingText(shoppingDay: DayOfWeek) {
  const day = days.find((item) => item.id === shoppingDay);
  if (!day) return "";
  const daysLeft = (day.jsDay - new Date().getDay() + 7) % 7;
  return daysLeft === 0 ? "오늘이 장보는 날이에요" : `다음 장보는 날까지 ${daysLeft}일 남았어요`;
}

function ShoppingDayCard() {
  const selectId = useId();
  const list = useFridgeStore((state) => state.list);
  const selectedFridgeId = useFridgeStore((state) => state.selectedFridgeId);
  const updateFridge = useFridgeStore((state) => state.updateFridge);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fridge = list.status === "success" ? pickFridge(list.fridges, selectedFridgeId) : null;
  if (!fridge) return null;

  const handleChange = async (value: string) => {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      updateFridge(await changeShoppingDay(fridge.id, days.find((day) => day.id === value)?.id ?? null));
      playSound("success");
    } catch (changeError) {
      playSound("error");
      setError(
        changeError instanceof ApiError && changeError.code === NETWORK_ERROR
          ? changeError.message
          : "요일을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <Control>
        <label htmlFor={selectId}>
          <CalendarDays size={16} aria-hidden="true" />
          장보는 날
        </label>
        <select
          id={selectId}
          value={fridge.shoppingDay ?? NOT_SET}
          disabled={isSaving}
          onChange={(event) => handleChange(event.target.value)}
        >
          <option value={NOT_SET}>정하지 않음</option>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              매주 {day.label}
            </option>
          ))}
        </select>
      </Control>
      <p role="status">{fridge.shoppingDay ? getNextShoppingText(fridge.shoppingDay) : "요일을 정하면 남은 날을 알려 드려요"}</p>
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Card>
  );
}

export default ShoppingDayCard;

// 페이지 머리(라임) 안에 놓이므로 따로 바탕색을 두지 않는다.
const Card = styled.section`
  min-width: 0;
  display: grid;
  justify-items: end;
  gap: 6px;
  text-align: right;

  p {
    font-size: 14px;
    font-weight: 330;
    line-height: 1.5;
    word-break: keep-all;
  }

  @media (max-width: 760px) {
    width: 100%;
    justify-items: start;
    text-align: left;
  }
`;

const Control = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 540;
  }

  select {
    min-height: 44px;
    border: 1px solid var(--text);
    border-radius: 999px;
    background: var(--surface);
    padding: 8px 14px;
    font-size: 15px;
    font-weight: 480;
    cursor: pointer;
  }

  select:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const ErrorText = styled.span`
  font-size: 13px;
  font-weight: 540;
`;
