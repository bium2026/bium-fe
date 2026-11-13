/*
 * 피드에 보이는 공개 냉장고 카드다.
 * 구역마다 재료를 앞에서부터 몇 개 보여 주고, 3일 안에 유통기한이 끝나는 재료 수와 좋아요·저장 버튼을 둔다.
 * 구경하기를 누르면 칸별 재료를 모두 볼 수 있다.
 */
import { useId } from "react";
import styled from "@emotion/styled";
import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router";
import type { FeedFridge, FeedReaction } from "../../api/feed";
import FeedReactions from "./FeedReactions";
import { feedStorages } from "./feedFormat";
import { ItemChip, MineBadge, ScreenReaderText } from "./feedStyles";

type FeedCardProps = {
  fridge: FeedFridge;
  onReactionChange: (fridgeId: number, update: (prev: FeedReaction) => FeedReaction) => void;
};

function FeedCard({ fridge, onReactionChange }: FeedCardProps) {
  const titleId = useId();
  const storages = feedStorages.filter(({ key }) => fridge.storages[key].count > 0);

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader>
        <TitleRow>
          <h2 id={titleId}>{fridge.name}</h2>
          {fridge.mine && <MineBadge>내 냉장고</MineBadge>}
        </TitleRow>
        <Meta>
          {fridge.ownerNickname ? `${fridge.ownerNickname} 님` : "주인 없음"} · 멤버 {fridge.memberCount}명 · 재료{" "}
          {fridge.itemCount}개
        </Meta>
      </CardHeader>

      {storages.length === 0 ? (
        <Empty>지금은 비어 있는 냉장고예요.</Empty>
      ) : (
        <Storages>
          {storages.map(({ key, meta }) => {
            const storage = fridge.storages[key];
            const hiddenCount = storage.count - storage.items.length;
            return (
              <StorageRow key={key}>
                <ZoneLabel $tone={meta.tone}>
                  {meta.title} <strong>{storage.count}</strong>
                </ZoneLabel>
                <Chips aria-label={`${meta.title} 재료`}>
                  {storage.items.map((item, index) => (
                    <PreviewChip key={`${index}-${item.name}`}>
                      {item.emoji && <i aria-hidden="true">{item.emoji}</i>}
                      <span>{item.name}</span>
                    </PreviewChip>
                  ))}
                  {hiddenCount > 0 && (
                    <MoreChip>
                      <span aria-hidden="true">+{hiddenCount}</span>
                      <ScreenReaderText>외 {hiddenCount}개</ScreenReaderText>
                    </MoreChip>
                  )}
                </Chips>
              </StorageRow>
            );
          })}
        </Storages>
      )}

      {fridge.expiringCount > 0 && (
        <Expiring>
          <Clock3 size={16} aria-hidden="true" />
          3일 안에 먹어야 할 재료 {fridge.expiringCount}개
        </Expiring>
      )}

      <Footer>
        <FeedReactions
          fridgeId={fridge.fridgeId}
          fridgeName={fridge.name}
          reaction={fridge}
          onChange={(update) => onReactionChange(fridge.fridgeId, update)}
        />
        <ViewLink to={`/feed/${fridge.fridgeId}`} aria-label={`${fridge.name} 구경하기`}>
          구경하기
          <ArrowRight size={16} aria-hidden="true" />
        </ViewLink>
      </Footer>
    </Card>
  );
}

export default FeedCard;

const Card = styled.article`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 14px;
  box-shadow: var(--shadow-sm);

  @media (max-width: 760px) {
    padding: 18px;
  }
`;

const CardHeader = styled.div`
  display: grid;
  gap: 4px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  h2 {
    min-width: 0;
    font-size: 21px;
    font-weight: 540;
    letter-spacing: -0.2px;
    overflow-wrap: anywhere;
  }
`;

const Meta = styled.p`
  font-size: 14px;
  font-weight: 330;
`;

const Empty = styled.p`
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 14px;
  font-size: 14px;
`;

const Storages = styled.div`
  display: grid;
  gap: 10px;
`;

const StorageRow = styled.div`
  display: grid;
  gap: 6px;
`;

const ZoneLabel = styled.p<{ $tone: string }>`
  width: fit-content;
  border-radius: 999px;
  background: ${(props) => props.$tone};
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 480;

  strong {
    font-weight: 700;
  }
`;

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;

  i {
    font-style: normal;
  }
`;

// 흰 카드 위에 놓이므로 구경하기 화면의 칩과 달리 옅은 회색으로 칠한다.
const PreviewChip = styled(ItemChip)`
  background: var(--surface-soft);
`;

const MoreChip = styled(PreviewChip)`
  font-weight: 540;
`;

const Expiring = styled.p`
  width: fit-content;
  border-radius: 8px;
  background: var(--block-coral);
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 480;
`;

const Footer = styled.div`
  border-top: 1px solid var(--border-soft);
  padding-top: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const ViewLink = styled(Link)`
  min-height: 40px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;
