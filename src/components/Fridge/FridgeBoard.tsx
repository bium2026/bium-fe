/*
 * 냉장고 본체와 양쪽 문칸을 그리는 보드다.
 * 지금 보고 있는 구역의 색으로 칠하고, 선반에는 재료 카드를, 문칸에는 정해진 칸 수만큼 재료와 빈 칸을 놓는다.
 */
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import IngredientItem from "./IngredientItem";
import type { FridgeIngredient, ZoneIngredients } from "./fridgeTypes";
import type { ZoneMeta } from "./fridgeZones";

type FridgeBoardProps = {
  zone: ZoneMeta;
  contents: ZoneIngredients;
  loading: boolean;
};

type DoorSide = "left" | "right";

const DOOR_SLOT_COUNT = 5;
const SHELF_SKELETON_COUNT = 6;

function FridgeBoard({ zone, contents, loading }: FridgeBoardProps) {
  const isEmpty = !loading && contents.shelf.length === 0;

  return (
    <Shell $tone={zone.tone} aria-busy={loading}>
      <Door side="left" items={contents.leftDoor} loading={loading} />

      <Cabinet>
        <ShelfArea>
          <ShelfList aria-label={`${zone.title} 선반`}>
            {loading
              ? Array.from({ length: SHELF_SKELETON_COUNT }, (_, index) => (
                  <li key={index} aria-hidden="true">
                    <Skeleton />
                  </li>
                ))
              : contents.shelf.map((ingredient) => (
                  <li key={ingredient.id}>
                    <IngredientItem ingredient={ingredient} variant="shelf" />
                  </li>
                ))}
          </ShelfList>
          {isEmpty && <EmptyMessage>{zone.title}에 보관 중인 재료가 없어요.</EmptyMessage>}
        </ShelfArea>

        {zone.id !== "fridge" && (
          <Bins aria-hidden="true">
            <Bin />
            <Bin />
          </Bins>
        )}
      </Cabinet>

      <Door side="right" items={contents.rightDoor} loading={loading} />
    </Shell>
  );
}

export default FridgeBoard;

type DoorProps = {
  side: DoorSide;
  items: FridgeIngredient[];
  loading: boolean;
};

function Door({ side, items, loading }: DoorProps) {
  const emptySlotCount = Math.max(DOOR_SLOT_COUNT - items.length, 0);

  return (
    <DoorPanel $side={side}>
      <DoorSlots aria-label={side === "left" ? "왼쪽 문칸" : "오른쪽 문칸"}>
        {loading
          ? Array.from({ length: DOOR_SLOT_COUNT }, (_, index) => (
              <li key={index} aria-hidden="true">
                <Skeleton />
              </li>
            ))
          : items.map((ingredient) => (
              <li key={ingredient.id}>
                <IngredientItem ingredient={ingredient} variant="door" />
              </li>
            ))}
        {!loading &&
          Array.from({ length: emptySlotCount }, (_, index) => (
            <li key={`empty-${index}`} aria-hidden="true">
              <EmptySlot>빈 칸</EmptySlot>
            </li>
          ))}
      </DoorSlots>
    </DoorPanel>
  );
}

const shimmer = keyframes`
  0% { background-position: -160px 0; }
  100% { background-position: 160px 0; }
`;

// 하위 요소는 --zone-tone(구역 색에 흰색을 섞은 밝은 배경색)과 --zone-frame(구역 색을 조금 어둡게 한 테두리 색)만 보고 칠한다.
const Shell = styled.section<{ $tone: string }>`
  --zone-tone: color-mix(in srgb, ${(props) => props.$tone} 65%, var(--surface));
  --zone-frame: color-mix(in srgb, ${(props) => props.$tone} 82%, var(--text));

  width: min(940px, 100%);
  display: grid;
  grid-template-columns: minmax(120px, 0.26fr) minmax(0, 1fr) minmax(120px, 0.26fr);
  align-items: start;

  @media (max-width: 760px) {
    grid-template-columns: 60px minmax(0, 1fr) 60px;
  }
`;

const DoorPanel = styled.div<{ $side: DoorSide }>`
  position: relative;
  margin-top: 40px;
  border: 5px solid var(--zone-frame);
  border-radius: ${(props) => (props.$side === "left" ? "18px 6px 6px 18px" : "6px 18px 18px 6px")};
  background: color-mix(in srgb, var(--zone-tone) 55%, var(--surface));
  padding: 52px 12px 18px;

  &::before {
    content: "";
    position: absolute;
    top: 22px;
    left: 12px;
    right: 12px;
    height: 8px;
    border: 1px solid var(--zone-frame);
    border-radius: 999px;
    background: var(--surface);
  }

  @media (max-width: 760px) {
    margin-top: 28px;
    border-width: 4px;
    padding: 38px 4px 10px;

    &::before {
      top: 15px;
      left: 6px;
      right: 6px;
      height: 6px;
    }
  }
`;

const DoorSlots = styled.ul`
  list-style: none;
  display: grid;
  grid-auto-rows: 52px;
  gap: 8px;

  @media (max-width: 760px) {
    grid-auto-rows: 48px;
    gap: 6px;
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
  border: 7px solid var(--zone-frame);
  border-radius: 16px;
  background: var(--zone-tone);
  padding: 28px 22px;
  display: grid;
  gap: 14px;

  @media (max-width: 760px) {
    border-width: 5px;
    padding: 16px 8px;
    gap: 10px;
  }
`;

const ShelfArea = styled.div`
  position: relative;
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 35%, transparent);
  padding: 14px 14px 0;

  @media (max-width: 760px) {
    padding: 10px 8px 0;
  }
`;

// 선반 한 줄 높이(--row)와 줄 간격(--gap)을 배경 무늬 주기와 맞춰서, 재료 줄마다 아래에 선반 판이 그려진다.
// background-attachment: local로 두어 재료가 많아 스크롤해도 선반 판이 재료와 같이 움직인다.
const ShelfList = styled.ul`
  --row: 92px;
  --gap: 22px;

  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  grid-auto-rows: var(--row);
  row-gap: var(--gap);
  column-gap: 10px;
  height: calc((var(--row) + var(--gap)) * 3);
  overflow-y: auto;
  scrollbar-width: thin;
  background-image: linear-gradient(
    to bottom,
    transparent calc(var(--row) + 7px),
    var(--surface) calc(var(--row) + 7px),
    var(--surface) calc(var(--row) + 15px),
    transparent calc(var(--row) + 15px)
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

const Skeleton = styled.div`
  height: 100%;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--border-soft) 25%,
    var(--surface-soft) 50%,
    var(--border-soft) 75%
  );
  background-size: 160px 100%;
  animation: ${shimmer} 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
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
  height: 56px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 760px) {
    height: 40px;
    gap: 6px;
  }
`;

const Bin = styled.div`
  border: 1px solid var(--zone-frame);
  border-radius: 10px 10px 14px 14px;
  background: color-mix(in srgb, var(--surface) 40%, transparent);
`;
