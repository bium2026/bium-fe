/*
 * 피드 카드와 내 냉장고 카드가 함께 쓰는 냉장고 칸 그림이다.
 * 흰 판에 냉장실·냉동실·실온 선반을 한 줄씩 두고, 선반마다 재료를 아이콘 타일로 앞에서부터 몇 개 보여 준다.
 * 아이콘이 없는 재료는 이름 첫 글자로 보여 주고, 화면 읽기 프로그램에는 재료 이름을 읽어 준다.
 */
import styled from "@emotion/styled";
import type { FeedStorages } from "../../api/feed";
import { feedStorages } from "./feedFormat";
import { ScreenReaderText } from "./feedStyles";

type FridgeShelvesProps = {
  storages: FeedStorages;
  // 내 냉장고 카드처럼 좁은 자리에서는 선반마다 타일을 덜 보여 준다.
  compact?: boolean;
};

function FridgeShelves({ storages, compact = false }: FridgeShelvesProps) {
  // 두 줄로 넘치지 않게 카드 폭에 맞춘 수다. 나머지는 '+n' 타일로 센다.
  const maxTiles = compact ? 4 : 5;

  return (
    <Panel $compact={compact}>
      {feedStorages.map(({ key, meta }) => {
        const storage = storages[key];
        const shown = storage.items.slice(0, maxTiles);
        const hiddenCount = storage.count - shown.length;
        return (
          <Shelf key={key}>
            <ShelfLabel>
              <Dot aria-hidden="true" $tone={meta.tone} />
              {meta.title}
              <strong>{storage.count}</strong>
            </ShelfLabel>
            {storage.count === 0 ? (
              <EmptyShelf>비어 있어요</EmptyShelf>
            ) : (
              <Tiles aria-label={`${meta.title} 재료`} $compact={compact}>
                {shown.map((item, index) => (
                  <Tile key={`${index}-${item.name}`} title={item.name} $compact={compact}>
                    <span aria-hidden="true">{item.emoji || item.name.slice(0, 1)}</span>
                    <ScreenReaderText>{item.name}</ScreenReaderText>
                  </Tile>
                ))}
                {hiddenCount > 0 && (
                  <Tile $compact={compact} $more>
                    <span aria-hidden="true">+{hiddenCount}</span>
                    <ScreenReaderText>외 {hiddenCount}개</ScreenReaderText>
                  </Tile>
                )}
              </Tiles>
            )}
          </Shelf>
        );
      })}
    </Panel>
  );
}

export default FridgeShelves;

const Panel = styled.div<{ $compact: boolean }>`
  border-radius: 16px;
  background: var(--surface);
  padding: ${(props) => (props.$compact ? "4px 12px" : "6px 16px")};
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  color: var(--text);
`;

const Shelf = styled.div`
  min-height: 56px;
  padding: 8px 0;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 10px;

  & + & {
    border-top: 1px solid var(--border-soft);
  }
`;

const ShelfLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 480;
  white-space: nowrap;

  strong {
    font-weight: 700;
  }
`;

const Dot = styled.span<{ $tone: string }>`
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: ${(props) => props.$tone};
`;

const EmptyShelf = styled.p`
  font-size: 14px;
  font-weight: 330;
  opacity: 0.55;
`;

const Tiles = styled.ul<{ $compact: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => (props.$compact ? "4px" : "6px")};
  list-style: none;
`;

const Tile = styled.li<{ $compact: boolean; $more?: boolean }>`
  width: ${(props) => (props.$compact ? "30px" : "36px")};
  height: ${(props) => (props.$compact ? "30px" : "36px")};
  border-radius: 10px;
  background: ${(props) => (props.$more ? "var(--text)" : "var(--surface-soft)")};
  color: ${(props) => (props.$more ? "var(--surface)" : "var(--text)")};
  display: grid;
  place-items: center;
  font-size: ${(props) => (props.$more ? "13px" : props.$compact ? "17px" : "20px")};
  font-weight: ${(props) => (props.$more ? 700 : 540)};
  line-height: 1;
`;
