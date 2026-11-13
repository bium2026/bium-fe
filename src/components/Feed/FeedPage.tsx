/*
 * 냉장고 피드 화면이다. 주인이 공개한 냉장고를 최근에 만든 순서로 10개씩 보여 주고, 저장한 냉장고만 골라 볼 수 있다.
 * 맨 위에서 지금 보고 있는 내 냉장고를 피드에 공개하거나 숨긴다.
 */
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { useSearchParams } from "react-router";
import { getFeed, type FeedFridge, type FeedReaction } from "../../api/feed";
import FeedCard from "./FeedCard";
import FeedVisibilityCard from "./FeedVisibilityCard";
import { getFeedErrorMessage } from "./feedFormat";
import { Hero, OutlineButton, ScreenReaderText, Skeleton, StatusBox, Wrapper } from "./feedStyles";

type FeedTab = "all" | "saved";

const tabs: { id: FeedTab; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "saved", label: "저장한 냉장고" },
];

function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: FeedTab = searchParams.get("tab") === "saved" ? "saved" : "all";
  // 공개 여부를 바꾸면 목록을 처음부터 다시 불러온다.
  const [reloadKey, setReloadKey] = useState(0);

  const changeTab = (next: FeedTab) => {
    // 탭을 바꿀 때마다 방문 기록이 쌓이면 뒤로 가기로 피드를 벗어나기 어려워서 주소를 바꿔치기한다.
    setSearchParams(next === "saved" ? { tab: "saved" } : {}, { replace: true });
  };

  return (
    <Wrapper>
      <Hero>
        <h1>냉장고 피드</h1>
        <p>다른 사람들이 공개한 냉장고를 구경하고, 마음에 드는 냉장고에 좋아요를 누르거나 저장해 보세요.</p>
      </Hero>

      <FeedVisibilityCard onChange={() => setReloadKey((prev) => prev + 1)} />

      <Tabs aria-label="피드 보기">
        {tabs.map((item) => (
          <TabButton
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            $active={tab === item.id}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </TabButton>
        ))}
      </Tabs>

      {/* 탭이나 공개 여부가 바뀌면 목록을 처음 상태로 다시 그린다. */}
      <FeedList key={`${tab}-${reloadKey}`} saved={tab === "saved"} />
    </Wrapper>
  );
}

export default FeedPage;

type FeedState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; fridges: FeedFridge[]; nextCursor: number | null };

type MoreState = { status: "idle" | "loading" } | { status: "error"; message: string };

function FeedList({ saved }: { saved: boolean }) {
  const [feed, setFeed] = useState<FeedState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState<MoreState>({ status: "idle" });
  // 다음 페이지를 기다리는 사이 탭을 바꿔 목록이 사라지면 늦게 온 결과를 버린다.
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    getFeed({ cursor: null, saved }).then(
      (page) => {
        if (!ignore) setFeed({ status: "success", fridges: page.fridges, nextCursor: page.nextCursor });
      },
      (error: unknown) => {
        if (!ignore) {
          setFeed({
            status: "error",
            message: getFeedErrorMessage(error, "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요."),
          });
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [saved, attempt]);

  const handleRetry = () => {
    setFeed({ status: "loading" });
    setMore({ status: "idle" });
    setAttempt((prev) => prev + 1);
  };

  const handleLoadMore = async () => {
    if (feed.status !== "success" || feed.nextCursor === null || more.status === "loading") return;
    setMore({ status: "loading" });
    try {
      const page = await getFeed({ cursor: feed.nextCursor, saved });
      if (!mountedRef.current) return;
      setFeed((prev) => {
        if (prev.status !== "success") return prev;
        // 그사이 새로 공개된 냉장고 때문에 같은 냉장고가 두 번 오지 않게 이미 있는 냉장고는 뺀다.
        const shown = new Set(prev.fridges.map((fridge) => fridge.fridgeId));
        return {
          status: "success",
          fridges: [...prev.fridges, ...page.fridges.filter((fridge) => !shown.has(fridge.fridgeId))],
          nextCursor: page.nextCursor,
        };
      });
      setMore({ status: "idle" });
    } catch (error) {
      if (!mountedRef.current) return;
      setMore({
        status: "error",
        message: getFeedErrorMessage(error, "냉장고를 더 불러오지 못했어요. 다시 시도해 주세요."),
      });
    }
  };

  const handleReactionChange = (fridgeId: number, update: (prev: FeedReaction) => FeedReaction) => {
    setFeed((prev) =>
      prev.status === "success"
        ? {
            ...prev,
            fridges: prev.fridges.map((fridge) => (fridge.fridgeId === fridgeId ? { ...fridge, ...update(fridge) } : fridge)),
          }
        : prev,
    );
  };

  if (feed.status === "loading") {
    return (
      <CardGrid aria-busy="true">
        <ScreenReaderText role="status">냉장고 피드를 불러오는 중이에요.</ScreenReaderText>
        <Skeleton aria-hidden="true" />
        <Skeleton aria-hidden="true" />
      </CardGrid>
    );
  }

  if (feed.status === "error") {
    return (
      <StatusBox role="alert">
        <strong>냉장고 피드를 불러오지 못했어요.</strong>
        <p>{feed.message}</p>
        <OutlineButton type="button" onClick={handleRetry}>
          다시 시도
        </OutlineButton>
      </StatusBox>
    );
  }

  if (feed.fridges.length === 0) {
    return saved ? (
      <StatusBox>
        <strong>저장한 냉장고가 없어요.</strong>
        <p>전체 피드에서 마음에 드는 냉장고를 저장하면 여기에서 다시 볼 수 있어요.</p>
      </StatusBox>
    ) : (
      <StatusBox>
        <strong>아직 공개된 냉장고가 없어요.</strong>
        <p>위에서 내 냉장고를 피드에 공개하면 다른 사람이 구경할 수 있어요.</p>
      </StatusBox>
    );
  }

  return (
    <>
      <CardGrid>
        {feed.fridges.map((fridge) => (
          <FeedCard key={fridge.fridgeId} fridge={fridge} onReactionChange={handleReactionChange} />
        ))}
      </CardGrid>
      {more.status === "error" && <MoreError role="alert">{more.message}</MoreError>}
      {feed.nextCursor !== null && (
        <MoreRow>
          <OutlineButton type="button" aria-disabled={more.status === "loading"} onClick={handleLoadMore}>
            {more.status === "loading" ? "불러오는 중" : more.status === "error" ? "다시 시도" : "더 보기"}
          </OutlineButton>
        </MoreRow>
      )}
    </>
  );
}

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// 식재료 도감의 카테고리 탭과 같은 모양이다.
const TabButton = styled.button<{ $active: boolean }>`
  min-height: 40px;
  border: 1px solid ${(props) => (props.$active ? "var(--text)" : "var(--border)")};
  border-radius: 50px;
  background: ${(props) => (props.$active ? "var(--text)" : "var(--surface)")};
  color: ${(props) => (props.$active ? "var(--surface)" : "var(--text)")};
  padding: 8px 18px 10px;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const MoreRow = styled.div`
  display: flex;
  justify-content: center;
`;

const MoreError = styled.p`
  justify-self: center;
  border-radius: 8px;
  background: var(--block-pink);
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
`;
