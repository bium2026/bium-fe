/*
 * 냉장고 본체와 양쪽 문칸을 그리는 보드다.
 * 지금 보고 있는 구역의 색으로 칠하고, 선반에는 재료 카드를, 문칸에는 정해진 칸 수만큼 재료와 빈 칸을 놓는다.
 * 선반과 문칸은 각각 재료를 끌어다 놓을 수 있는 칸이고, 칸 안에서는 끌어서 순서를 바꾼다.
 * 끌기는 화면(FridgePage)의 DndContext 안에서만 동작하고, 놓은 결과도 화면이 서버에 저장한다.
 */
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import IngredientItem from "./IngredientItem";
import { fridgeItemDragId, sectionDropId } from "./fridgeLayout";
import type { FridgeIngredient, SectionId, ZoneIngredients } from "./fridgeTypes";
import type { ZoneMeta } from "./fridgeZones";

type FridgeBoardProps = {
  zone: ZoneMeta;
  contents: ZoneIngredients;
  loading: boolean;
  // 옮기기 요청을 기다리는 동안에는 다시 끌지 못하게 막는다.
  dragDisabled: boolean;
  // 끌고 있는 재료가 놓일 칸. 그 칸을 강조해서 어디에 놓일지 보여 준다.
  highlightedSection: SectionId | null;
  onSelectIngredient: (ingredient: FridgeIngredient) => void;
};

type DoorSide = "left" | "right";

// 문칸은 이 칸 수만큼만 그리고, 가득 차면 다른 칸에서 옮겨 넣지 못하게 한다.
export const DOOR_SLOT_COUNT = 5;
const SHELF_SKELETON_COUNT = 6;

function FridgeBoard({
  zone,
  contents,
  loading,
  dragDisabled,
  highlightedSection,
  onSelectIngredient,
}: FridgeBoardProps) {
  const isEmpty =
    !loading &&
    contents.shelf.length === 0 &&
    contents.leftDoor.length === 0 &&
    contents.rightDoor.length === 0;
  const { setNodeRef: setShelfRef } = useDroppable({ id: sectionDropId("shelf"), disabled: loading });

  return (
    <Shell $tone={zone.tone} aria-busy={loading}>
      <Door
        side="left"
        items={contents.leftDoor}
        loading={loading}
        dragDisabled={dragDisabled}
        highlighted={highlightedSection === "leftDoor"}
        onSelectIngredient={onSelectIngredient}
      />

      <Cabinet>
        <ShelfArea $highlighted={highlightedSection === "shelf"}>
          <SortableContext
            items={contents.shelf.map((ingredient) => fridgeItemDragId(ingredient.id))}
            strategy={rectSortingStrategy}
          >
            <ShelfList ref={setShelfRef} aria-label={`${zone.title} 선반`}>
              {loading
                ? Array.from({ length: SHELF_SKELETON_COUNT }, (_, index) => (
                    <li key={index} aria-hidden="true">
                      <Skeleton />
                    </li>
                  ))
                : contents.shelf.map((ingredient) => (
                    <SortableIngredient
                      key={ingredient.id}
                      ingredient={ingredient}
                      variant="shelf"
                      disabled={dragDisabled}
                      onSelect={onSelectIngredient}
                    />
                  ))}
            </ShelfList>
          </SortableContext>
          {isEmpty && <EmptyMessage>{zone.title}에 보관 중인 재료가 없어요.</EmptyMessage>}
        </ShelfArea>

        {zone.id !== "fridge" && (
          <Bins aria-hidden="true">
            <Bin />
            <Bin />
          </Bins>
        )}
      </Cabinet>

      <Door
        side="right"
        items={contents.rightDoor}
        loading={loading}
        dragDisabled={dragDisabled}
        highlighted={highlightedSection === "rightDoor"}
        onSelectIngredient={onSelectIngredient}
      />
    </Shell>
  );
}

export default FridgeBoard;

type SortableIngredientProps = {
  ingredient: FridgeIngredient;
  variant: "shelf" | "door";
  disabled: boolean;
  onSelect: (ingredient: FridgeIngredient) => void;
};

function SortableIngredient({ ingredient, variant, disabled, onSelect }: SortableIngredientProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: fridgeItemDragId(ingredient.id),
    disabled,
  });

  return (
    // 칸 크기가 다른 재료 사이를 지나도 카드 크기가 바뀌지 않게 이동만 적용한다.
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
      <IngredientItem
        ingredient={ingredient}
        variant={variant}
        onSelect={onSelect}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </li>
  );
}

type DoorProps = {
  side: DoorSide;
  items: FridgeIngredient[];
  loading: boolean;
  dragDisabled: boolean;
  highlighted: boolean;
  onSelectIngredient: (ingredient: FridgeIngredient) => void;
};

function Door({ side, items, loading, dragDisabled, highlighted, onSelectIngredient }: DoorProps) {
  const sectionId: SectionId = side === "left" ? "leftDoor" : "rightDoor";
  const { setNodeRef } = useDroppable({ id: sectionDropId(sectionId), disabled: loading });
  const emptySlotCount = Math.max(DOOR_SLOT_COUNT - items.length, 0);

  return (
    <DoorPanel $side={side}>
      <SortableContext
        items={items.map((ingredient) => fridgeItemDragId(ingredient.id))}
        strategy={verticalListSortingStrategy}
      >
        <DoorSlots ref={setNodeRef} aria-label={side === "left" ? "왼쪽 문칸" : "오른쪽 문칸"}>
          {loading
            ? Array.from({ length: DOOR_SLOT_COUNT }, (_, index) => (
                <li key={index} aria-hidden="true">
                  <Skeleton />
                </li>
              ))
            : items.map((ingredient) => (
                <SortableIngredient
                  key={ingredient.id}
                  ingredient={ingredient}
                  variant="door"
                  disabled={dragDisabled}
                  onSelect={onSelectIngredient}
                />
              ))}
          {!loading &&
            Array.from({ length: emptySlotCount }, (_, index) => (
              <li key={`empty-${index}`} aria-hidden="true">
                <EmptySlot $highlighted={highlighted}>빈 칸</EmptySlot>
              </li>
            ))}
        </DoorSlots>
      </SortableContext>
    </DoorPanel>
  );
}

const shimmer = keyframes`
  0% { background-position: -160px 0; }
  100% { background-position: 160px 0; }
`;

// 하위 요소는 --zone-tone(구역 색에 흰색을 섞은 밝은 배경색)과 --zone-frame(구역 색을 조금 어둡게 한 테두리 색)만 보고 칠한다.
// --shelf-height는 선반 높이다. 화면 높이에서 헤더·구역 제목·도구 막대·냉장고 테두리만큼 뺀 만큼 키워 냉장고가 화면을 채우고,
// 낮은 화면(1366×768)에서도 서랍이 있는 냉동실까지 화면 안에 들어오도록 최소 높이를 둔다. 문칸 한 칸의 높이도 이 값에 맞춰 늘어난다.
const Shell = styled.section<{ $tone: string }>`
  --zone-tone: color-mix(in srgb, ${(props) => props.$tone} 65%, var(--surface));
  --zone-frame: color-mix(in srgb, ${(props) => props.$tone} 82%, var(--text));
  --shelf-height: clamp(342px, calc(100dvh - 460px), 760px);

  width: min(1240px, 100%);
  display: grid;
  grid-template-columns: minmax(120px, 0.26fr) minmax(0, 1fr) minmax(120px, 0.26fr);
  align-items: start;

  @media (max-width: 760px) {
    --shelf-height: calc((80px + 18px) * 3);

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

// 문칸 5칸이 선반 높이와 비슷하게 차도록 한 칸 높이를 선반 높이에서 나눈다. 칸 사이 간격과 문 손잡이 자리만큼 뺀다.
const DoorSlots = styled.ul`
  list-style: none;
  display: grid;
  grid-auto-rows: max(52px, calc((var(--shelf-height) - 96px) / 5));
  gap: 8px;

  @media (max-width: 760px) {
    grid-auto-rows: 48px;
    gap: 6px;
  }
`;

// 끌고 있는 재료가 이 문칸에 놓일 때 빈 칸을 라임색으로 칠해 놓일 자리를 보여 준다.
const EmptySlot = styled.div<{ $highlighted: boolean }>`
  height: 100%;
  border: 1px dashed ${(props) => (props.$highlighted ? "var(--text)" : "var(--zone-frame)")};
  border-radius: 8px;
  background: ${(props) =>
    props.$highlighted ? "var(--block-lime)" : "color-mix(in srgb, var(--surface) 50%, transparent)"};
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

const ShelfArea = styled.div<{ $highlighted: boolean }>`
  position: relative;
  border-radius: 10px;
  outline: ${(props) => (props.$highlighted ? "2px dashed var(--text)" : "none")};
  background: ${(props) =>
    props.$highlighted
      ? "color-mix(in srgb, var(--block-lime) 70%, transparent)"
      : "color-mix(in srgb, var(--surface) 35%, transparent)"};
  padding: 14px 14px 0;

  @media (max-width: 760px) {
    padding: 10px 8px 0;
  }
`;

// 선반 한 줄 높이(--row)와 줄 간격(--gap)을 배경 무늬 주기와 맞춰서, 재료 줄마다 아래에 선반 판이 그려진다.
// background-attachment: local로 두어 재료가 많아 스크롤해도 선반 판이 재료와 같이 움직인다.
const ShelfList = styled.ul`
  --row: 112px;
  --gap: 24px;

  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  grid-auto-rows: var(--row);
  row-gap: var(--gap);
  column-gap: 12px;
  height: var(--shelf-height);
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
