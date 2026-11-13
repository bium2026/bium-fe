/*
 * 피드에서 고른 공개 냉장고를 구경하는 화면이다.
 * 냉장실·냉동실·실온을 칸(선반·왼쪽 문칸·오른쪽 문칸)별로 모두 보여 주고, 재료는 읽기만 한다.
 * 주인이 공개를 멈췄으면 찾을 수 없다고 알려 준다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ArrowLeft, Clock3 } from "lucide-react";
import { Link, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { getFeedFridge, type FeedFridge, type FeedReaction } from "../../api/feed";
import type { FridgeContentsResponse, FridgeItemResponse, StorageContents } from "../../api/fridge";
import FeedReactions from "./FeedReactions";
import { feedStorages, getExpiry, getFeedErrorMessage } from "./feedFormat";
import {
  freshnessBackground,
  Hero,
  ItemChip,
  MineBadge,
  OutlineButton,
  ScreenReaderText,
  Skeleton,
  StatusBox,
  Wrapper,
} from "./feedStyles";

type DetailState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "success"; fridge: FeedFridge; contents: FridgeContentsResponse };

const sections: { key: keyof StorageContents; label: string }[] = [
  { key: "center", label: "선반" },
  { key: "leftDoor", label: "왼쪽 문칸" },
  { key: "rightDoor", label: "오른쪽 문칸" },
];

function parseFridgeId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function FeedFridgePage() {
  const fridgeId = parseFridgeId(useParams().fridgeId);
  const [result, setResult] = useState<{ fridgeId: number; state: DetailState } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (fridgeId === null) return;
    let ignore = false;
    getFeedFridge(fridgeId).then(
      ({ fridge, contents }) => {
        if (!ignore) setResult({ fridgeId, state: { status: "success", fridge, contents } });
      },
      (error: unknown) => {
        if (ignore) return;
        const state: DetailState =
          error instanceof ApiError && error.code === "FRIDGE_NOT_FOUND"
            ? { status: "notFound" }
            : {
                status: "error",
                message: getFeedErrorMessage(error, "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요."),
              };
        setResult({ fridgeId, state });
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeId, attempt]);

  // 주소의 냉장고가 바뀌면 이전 냉장고의 결과를 보여 주지 않고 다시 불러오는 중으로 둔다.
  const state: DetailState =
    fridgeId === null ? { status: "notFound" } : result?.fridgeId === fridgeId ? result.state : { status: "loading" };

  const handleRetry = () => {
    setResult(null);
    setAttempt((prev) => prev + 1);
  };

  const handleReactionChange = (update: (prev: FeedReaction) => FeedReaction) => {
    setResult((prev) =>
      prev?.state.status === "success"
        ? { ...prev, state: { ...prev.state, fridge: { ...prev.state.fridge, ...update(prev.state.fridge) } } }
        : prev,
    );
  };

  const backLink = (
    <BackLink to="/feed">
      <ArrowLeft size={18} aria-hidden="true" />
      냉장고 피드
    </BackLink>
  );

  if (state.status === "loading") {
    return (
      <Wrapper aria-busy="true">
        {backLink}
        <ScreenReaderText role="status">냉장고를 불러오는 중이에요.</ScreenReaderText>
        <Skeleton aria-hidden="true" $height={160} />
        <Skeleton aria-hidden="true" $height={320} />
      </Wrapper>
    );
  }

  if (state.status === "notFound") {
    return (
      <Wrapper>
        {backLink}
        <StatusBox role="alert">
          <strong>냉장고를 찾을 수 없어요.</strong>
          <p>주인이 피드 공개를 멈췄거나 없는 냉장고예요. 피드에서 다른 냉장고를 골라 주세요.</p>
        </StatusBox>
      </Wrapper>
    );
  }

  if (state.status === "error") {
    return (
      <Wrapper>
        {backLink}
        <StatusBox role="alert">
          <strong>냉장고를 불러오지 못했어요.</strong>
          <p>{state.message}</p>
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        </StatusBox>
      </Wrapper>
    );
  }

  const { fridge, contents } = state;

  return (
    <Wrapper>
      {backLink}
      <Hero>
        <TitleRow>
          <h1>{fridge.name}</h1>
          {fridge.mine && <MineBadge>내 냉장고</MineBadge>}
        </TitleRow>
        <p>
          {fridge.ownerNickname ? `${fridge.ownerNickname} 님` : "주인 없음"} · 멤버 {fridge.memberCount}명 · 재료{" "}
          {fridge.itemCount}개
        </p>
        {fridge.expiringCount > 0 && (
          <Expiring>
            <Clock3 size={16} aria-hidden="true" />
            3일 안에 먹어야 할 재료 {fridge.expiringCount}개
          </Expiring>
        )}
        <FeedReactions
          fridgeId={fridge.fridgeId}
          fridgeName={fridge.name}
          reaction={fridge}
          onChange={handleReactionChange}
        />
      </Hero>

      <Zones>
        {feedStorages.map(({ key, meta }) => {
          const storage = contents[key];
          const filled = sections.filter((section) => storage[section.key].length > 0);
          const count = sections.reduce((sum, section) => sum + storage[section.key].length, 0);
          return (
            <Zone key={key} aria-labelledby={`feed-zone-${key}`} $tone={meta.tone}>
              <ZoneTitle id={`feed-zone-${key}`}>
                {meta.title}
                <span>{count}개</span>
              </ZoneTitle>
              {filled.length === 0 ? (
                <ZoneEmpty>비어 있어요.</ZoneEmpty>
              ) : (
                filled.map((section) => (
                  <Section key={section.key}>
                    <h3>{section.label}</h3>
                    <Items>
                      {storage[section.key].map((item) => (
                        <ItemView key={item.id} item={item} />
                      ))}
                    </Items>
                  </Section>
                ))
              )}
            </Zone>
          );
        })}
      </Zones>
    </Wrapper>
  );
}

export default FeedFridgePage;

function ItemView({ item }: { item: FridgeItemResponse }) {
  const expiry = item.expiresAt ? getExpiry(item.expiresAt) : null;
  return (
    <ItemChip>
      {item.emoji && <i aria-hidden="true">{item.emoji}</i>}
      <span>{item.name}</span>
      {expiry && (
        <Badge $background={freshnessBackground[expiry.freshness]} $dark={expiry.freshness === "expired"}>
          <b aria-hidden="true">{expiry.label}</b>
          <ScreenReaderText>{expiry.description}</ScreenReaderText>
        </Badge>
      )}
    </ItemChip>
  );
}

const BackLink = styled(Link)`
  width: fit-content;
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  h1 {
    overflow-wrap: anywhere;
  }
`;

const Expiring = styled.p`
  border-radius: 8px;
  background: var(--surface);
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 480;
`;

const Zones = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
  gap: 16px;

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Zone = styled.section<{ $tone: string }>`
  border-radius: 16px;
  background: color-mix(in srgb, ${(props) => props.$tone} 55%, var(--surface));
  padding: 18px;
  display: grid;
  gap: 14px;
`;

const ZoneTitle = styled.h2`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 20px;
  font-weight: 540;

  span {
    font-size: 14px;
    font-weight: 330;
  }
`;

const ZoneEmpty = styled.p`
  font-size: 14px;
`;

const Section = styled.div`
  display: grid;
  gap: 8px;

  h3 {
    font-size: 14px;
    font-weight: 540;
  }
`;

const Items = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;

  i {
    font-style: normal;
  }
`;

const Badge = styled.span<{ $background: string; $dark: boolean }>`
  border-radius: 999px;
  background: ${(props) => props.$background};
  color: ${(props) => (props.$dark ? "var(--surface)" : "var(--text)")};
  padding: 1px 7px;
  font-size: 12px;

  b {
    font-weight: 540;
  }
`;
