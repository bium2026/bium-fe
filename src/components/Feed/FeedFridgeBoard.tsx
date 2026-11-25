/*
 * 피드에서 구경하는 냉장고를 내 냉장고 화면처럼 냉장고 모양으로 그린다. 내 냉장고보다 작고, 재료는 읽기만 한다.
 * 위의 화살표로 냉장실·냉동실·실온을 넘기고, 본체 선반과 양쪽 문칸에 재료 카드를 놓는다.
 * 처음에는 재료가 있는 첫 구역을 보여 준다.
 */
import { useId, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FridgeContentsResponse } from "../../api/fridge";
import IngredientItem from "../Fridge/IngredientItem";
import ZoneAmbience from "../Fridge/ZoneAmbience";
import { toFridgeContents } from "../Fridge/fridgeLayout";
import type { FridgeIngredient, ZoneId, ZoneIngredients } from "../Fridge/fridgeTypes";
import { adjacentZone, zoneMeta, zoneOrder, type ZoneDirection } from "../Fridge/fridgeZones";

type FeedFridgeBoardProps = {
  contents: FridgeContentsResponse;
};

// 내 냉장고 화면(FridgeBoard)과 같이 문칸은 이 칸 수만큼 그리고 남는 자리는 빈 칸으로 둔다.
const DOOR_SLOT_COUNT = 5;

function countItems(zone: ZoneIngredients) {
  return zone.shelf.length + zone.leftDoor.length + zone.rightDoor.length;
}

function FeedFridgeBoard({ contents }: FeedFridgeBoardProps) {
  const titleId = useId();
  const fridge = toFridgeContents(contents);
  const [zoneId, setZoneId] = useState<ZoneId>(
    () => zoneOrder.find((id) => countItems(fridge[id]) > 0) ?? "fridge",
  );
  const [direction, setDirection] = useState<ZoneDirection>("next");

  const zone = zoneMeta[zoneId];
  const zoneContents = fridge[zoneId];
  const count = countItems(zoneContents);

  const moveZone = (next: ZoneDirection) => {
    setDirection(next);
    setZoneId(adjacentZone(zoneId, next));
  };

  return (
    <Wrapper aria-labelledby={titleId}>
      <Pager>
        <ArrowButton
          type="button"
          aria-label={`이전 구역, ${zoneMeta[adjacentZone(zoneId, "prev")].title} 보기`}
          onClick={() => moveZone("prev")}
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </ArrowButton>
        <Heading aria-live="polite">
          <ZoneTitle id={titleId} $tone={zone.tone}>
            {zone.title}
          </ZoneTitle>
          <ZoneSubtitle>
            {zone.subtitle} · 재료 {count}개
          </ZoneSubtitle>
        </Heading>
        <ArrowButton
          type="button"
          aria-label={`다음 구역, ${zoneMeta[adjacentZone(zoneId, "next")].title} 보기`}
          onClick={() => moveZone("next")}
        >
          <ChevronRight size={22} aria-hidden="true" />
        </ArrowButton>
      </Pager>

      {/* 구역이 바뀔 때마다 key가 바뀌어 내 냉장고 화면처럼 옆으로 밀려 들어온다. */}
      <Stage key={zoneId} $direction={direction}>
        <Shell $tone={zone.tone}>
          <Door side="left" items={zoneContents.leftDoor} />
          <Cabinet>
            <ZoneAmbience zoneId={zoneId} />
            <ShelfArea>
              <ShelfList aria-label={`${zone.title} 선반`}>
                {zoneContents.shelf.map((ingredient) => (
                  <li key={ingredient.id}>
                    <IngredientItem ingredient={ingredient} variant="shelf" />
                  </li>
                ))}
              </ShelfList>
              {count === 0 && <EmptyMessage>{zone.title}에 보관 중인 재료가 없어요.</EmptyMessage>}
            </ShelfArea>
            {zoneId !== "fridge" && (
              <Bins aria-hidden="true">
                <Bin />
                <Bin />
              </Bins>
            )}
          </Cabinet>
          <Door side="right" items={zoneContents.rightDoor} />
        </Shell>
      </Stage>
    </Wrapper>
  );
}

export default FeedFridgeBoard;

type DoorSide = "left" | "right";

function Door({ side, items }: { side: DoorSide; items: FridgeIngredient[] }) {
  const emptySlotCount = Math.max(DOOR_SLOT_COUNT - items.length, 0);
  return (
    <DoorPanel $side={side}>
      <DoorSlots aria-label={side === "left" ? "왼쪽 문칸" : "오른쪽 문칸"}>
        {items.map((ingredient) => (
          <li key={ingredient.id}>
            <IngredientItem ingredient={ingredient} variant="door" />
          </li>
        ))}
        {Array.from({ length: emptySlotCount }, (_, index) => (
          <li key={`empty-${index}`} aria-hidden="true">
            <EmptySlot>빈 칸</EmptySlot>
          </li>
        ))}
      </DoorSlots>
    </DoorPanel>
  );
}

const slideFromPrev = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideFromNext = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
`;

// 내 냉장고 화면(최대 1240px)보다 작게 둔다.
const BOARD_WIDTH = "880px";

const Wrapper = styled.section`
  display: grid;
  justify-items: center;
  gap: 16px;
`;

const Pager = styled.div`
  width: min(${BOARD_WIDTH}, 100%);
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
`;

const ArrowButton = styled.button`
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const Heading = styled.div`
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
`;

const ZoneTitle = styled.h2<{ $tone: string }>`
  min-width: 96px;
  border: 1px solid color-mix(in srgb, ${(props) => props.$tone} 82%, var(--text));
  border-radius: 50px;
  background: color-mix(in srgb, ${(props) => props.$tone} 65%, var(--surface));
  padding: 2px 16px;
  font-size: 22px;
  font-weight: 540;
  letter-spacing: -0.26px;
`;

const ZoneSubtitle = styled.p`
  font-size: 14px;
  font-weight: 330;
`;

const Stage = styled.div<{ $direction: ZoneDirection }>`
  width: 100%;
  display: grid;
  justify-items: center;
  animation: ${(props) => (props.$direction === "prev" ? slideFromPrev : slideFromNext)} 0.26s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// 하위 요소는 --zone-tone(밝은 배경색)과 --zone-frame(테두리 색)만 보고 칠한다. 내 냉장고 화면과 같은 방식이다.
// 화면 높이를 따라 커지는 내 냉장고와 달리 선반 높이를 정해 두고, 재료가 많으면 선반 안에서 스크롤한다.
const Shell = styled.div<{ $tone: string }>`
  --zone-tone: color-mix(in srgb, ${(props) => props.$tone} 65%, var(--surface));
  --zone-frame: color-mix(in srgb, ${(props) => props.$tone} 82%, var(--text));
  --shelf-height: 300px;

  width: min(${BOARD_WIDTH}, 100%);
  display: grid;
  grid-template-columns: minmax(96px, 0.24fr) minmax(0, 1fr) minmax(96px, 0.24fr);
  align-items: start;

  @media (max-width: 760px) {
    --shelf-height: calc((80px + 18px) * 3);

    grid-template-columns: 60px minmax(0, 1fr) 60px;
  }
`;

const DoorPanel = styled.div<{ $side: DoorSide }>`
  position: relative;
  margin-top: 32px;
  border: 4px solid var(--zone-frame);
  border-radius: ${(props) => (props.$side === "left" ? "16px 6px 6px 16px" : "6px 16px 16px 6px")};
  background: color-mix(in srgb, var(--zone-tone) 55%, var(--surface));
  padding: 40px 8px 14px;

  /* 문 손잡이 */
  &::before {
    content: "";
    position: absolute;
    top: 16px;
    left: 10px;
    right: 10px;
    height: 7px;
    border: 1px solid var(--zone-frame);
    border-radius: 999px;
    background: var(--surface);
  }

  @media (max-width: 760px) {
    margin-top: 28px;
    padding: 34px 4px 10px;

    &::before {
      top: 13px;
      left: 6px;
      right: 6px;
      height: 6px;
    }
  }
`;

// 문칸 5칸이 선반 높이와 비슷하게 차도록 한 칸 높이를 선반 높이에서 나눈다.
const DoorSlots = styled.ul`
  list-style: none;
  display: grid;
  grid-auto-rows: calc((var(--shelf-height) - 64px) / 5);
  gap: 6px;

  @media (max-width: 760px) {
    grid-auto-rows: 44px;
  }
`;

const EmptySlot = styled.div`
  height: 100%;
  border: 1px dashed var(--zone-frame);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 50%, transparent);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 480;

  @media (max-width: 760px) {
    font-size: 10px;
  }
`;

const Cabinet = styled.div`
  position: relative;
  z-index: 1;
  border: 6px solid var(--zone-frame);
  border-radius: 16px;
  background: var(--zone-tone);
  padding: 18px 14px;
  display: grid;
  gap: 12px;

  @media (max-width: 760px) {
    border-width: 5px;
    padding: 14px 8px;
    gap: 10px;
  }
`;

// 구역 배경 장식(ZoneAmbience) 위에 선반과 서랍이 오도록 쌓는 순서를 올린다.
const ShelfArea = styled.div`
  position: relative;
  z-index: 1;
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 35%, transparent);
  padding: 12px 12px 0;

  @media (max-width: 760px) {
    padding: 10px 8px 0;
  }
`;

// 선반 한 줄 높이(--row)와 줄 간격(--gap)을 배경 무늬 주기와 맞춰서, 재료 줄마다 아래에 선반 판이 그려진다.
const ShelfList = styled.ul`
  --row: 96px;
  --gap: 20px;

  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  grid-auto-rows: var(--row);
  row-gap: var(--gap);
  column-gap: 10px;
  height: var(--shelf-height);
  overflow-y: auto;
  scrollbar-width: thin;
  background-image: linear-gradient(
    to bottom,
    transparent calc(var(--row) + 6px),
    var(--surface) calc(var(--row) + 6px),
    var(--surface) calc(var(--row) + 13px),
    transparent calc(var(--row) + 13px)
  );
  background-size: 100% calc(var(--row) + var(--gap));
  background-attachment: local;

  @media (max-width: 760px) {
    --row: 80px;
    --gap: 18px;

    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    column-gap: 8px;
  }
`;

const EmptyMessage = styled.p`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 0 16px;
  font-size: 15px;
  font-weight: 480;
  text-align: center;
`;

const Bins = styled.div`
  position: relative;
  z-index: 1;
  height: 44px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 760px) {
    height: 36px;
    gap: 6px;
  }
`;

const Bin = styled.div`
  border: 1px solid var(--zone-frame);
  border-radius: 10px 10px 14px 14px;
  background: color-mix(in srgb, var(--surface) 40%, transparent);
`;
