/*
 * 피드에 보이는 공개 냉장고 카드다.
 * 냉장고마다 다른 파스텔 블록 위에 주인과 냉장고 이름, 냉장고 칸 그림(구역별 재료 타일)을 놓고,
 * 3일 안에 먹어야 할 재료 수와 좋아요·저장 버튼, 구경하기를 둔다.
 */
import { useId } from "react";
import styled from "@emotion/styled";
import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router";
import type { FeedFridge, FeedReaction } from "../../api/feed";
import FeedReactions from "./FeedReactions";
import FridgeShelves from "./FridgeShelves";
import { getAvatarText, getCardTone } from "./feedFormat";
import { Avatar, MineBadge } from "./feedStyles";

type FeedCardProps = {
  fridge: FeedFridge;
  onReactionChange: (fridgeId: number, update: (prev: FeedReaction) => FeedReaction) => void;
};

function FeedCard({ fridge, onReactionChange }: FeedCardProps) {
  const titleId = useId();

  return (
    <Card aria-labelledby={titleId} $tone={getCardTone(fridge.fridgeId)}>
      <Owner>
        <Avatar aria-hidden="true">{getAvatarText(fridge.ownerNickname, fridge.name)}</Avatar>
        <OwnerText>
          <strong>{fridge.ownerNickname ? `${fridge.ownerNickname} 님` : "주인 없음"}</strong>
          <span>
            멤버 {fridge.memberCount}명 · 재료 {fridge.itemCount}개
          </span>
        </OwnerText>
        {fridge.mine && <MineBadge>내 냉장고</MineBadge>}
      </Owner>

      <Title id={titleId}>{fridge.name}</Title>

      {fridge.itemCount === 0 ? (
        <EmptyFridge>지금은 텅 빈 냉장고예요.</EmptyFridge>
      ) : (
        <FridgeShelves storages={fridge.storages} />
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

// 디자인 기준(DESIGN.md)의 색 블록처럼 테두리·그림자 없이 색으로만 카드를 나눈다.
const Card = styled.article<{ $tone: string }>`
  border-radius: 24px;
  background: ${(props) => props.$tone};
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 16px;

  @media (max-width: 760px) {
    border-radius: 20px;
    padding: 18px;
  }
`;

const Owner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OwnerText = styled.div`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 1px;

  strong {
    font-size: 15px;
    font-weight: 540;
  }

  span {
    font-size: 13px;
    font-weight: 330;
  }
`;

const Title = styled.h2`
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.26px;
  overflow-wrap: anywhere;
`;

const EmptyFridge = styled.p`
  min-height: 72px;
  border: 1px dashed var(--text);
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 480;
  opacity: 0.6;
`;

const Expiring = styled.p`
  width: fit-content;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 480;
`;

const Footer = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const ViewLink = styled(Link)`
  min-height: 42px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 8px 18px;
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
