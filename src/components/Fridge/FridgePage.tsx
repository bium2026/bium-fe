/*
 * 내 냉장고 화면이다.
 * 좌우 화살표로 냉장실·냉동실·실온을 넘겨 보며, 지금 보는 구역은 주소(?zone=)에 남겨 새로고침해도 유지한다.
 * 지금은 퍼블리싱 단계라 목데이터를 쓰고, 서버 연동 때 냉장고 조회 API로 바꾼다.
 */
import { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router";
import FridgeBoard from "./FridgeBoard";
import { emptyFridgeMock, fridgeMock } from "./fridgeMockData";
import { isZoneId, zoneMeta, zoneOrder } from "./fridgeZones";

type FridgeStatus = "loading" | "success" | "error";
type SlideDirection = "prev" | "next";

// 퍼블리싱 확인용: ?preview=loading|empty|error 로 각 상태 화면을 볼 수 있다. API 연동 시 지운다.
function getPreviewStatus(value: string | null): FridgeStatus {
  if (value === "loading" || value === "error") return value;
  return "success";
}

function FridgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = searchParams.get("preview");
  const [status, setStatus] = useState<FridgeStatus>(() => getPreviewStatus(preview));
  const [direction, setDirection] = useState<SlideDirection>("next");
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const zoneParam = searchParams.get("zone");
  const zoneId = isZoneId(zoneParam) ? zoneParam : zoneOrder[0];
  const zone = zoneMeta[zoneId];
  const zoneIndex = zoneOrder.indexOf(zoneId);
  const prevZone = zoneMeta[zoneOrder[(zoneIndex + zoneOrder.length - 1) % zoneOrder.length]];
  const nextZone = zoneMeta[zoneOrder[(zoneIndex + 1) % zoneOrder.length]];

  const contents = (preview === "empty" ? emptyFridgeMock : fridgeMock)[zoneId];
  const itemCount = contents.shelf.length + contents.leftDoor.length + contents.rightDoor.length;
  const isLoading = status === "loading";

  const moveZone = (nextDirection: SlideDirection) => {
    const target = nextDirection === "prev" ? prevZone : nextZone;
    setDirection(nextDirection);
    // 구역을 넘길 때마다 방문 기록이 쌓이면 뒤로 가기로 냉장고 화면을 벗어나기 어려워서 주소를 바꿔치기한다.
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("zone", target.id);
        return params;
      },
      { replace: true },
    );
  };

  const handleRetry = () => {
    if (isLoading) return;
    setStatus("loading");
    // TODO: 냉장고 조회 API가 정해지면 서버 요청으로 바꾼다. 지금은 로딩 화면을 보여 주기 위한 지연이다.
    timerRef.current = window.setTimeout(() => setStatus("success"), 1200);
  };

  return (
    <Wrapper>
      <Pager>
        <ArrowButton type="button" aria-label={`이전 구역, ${prevZone.title} 보기`} onClick={() => moveZone("prev")}>
          <ChevronLeft size={28} aria-hidden="true" />
        </ArrowButton>
        <ZoneHeading aria-live="polite">
          <ZoneTitle $tone={zone.tone}>{zone.title}</ZoneTitle>
          <ZoneSubtitle>
            {zone.subtitle}
            {status === "success" && ` · 재료 ${itemCount}개`}
          </ZoneSubtitle>
        </ZoneHeading>
        <ArrowButton type="button" aria-label={`다음 구역, ${nextZone.title} 보기`} onClick={() => moveZone("next")}>
          <ChevronRight size={28} aria-hidden="true" />
        </ArrowButton>
      </Pager>

      {status === "error" ? (
        <StatusBox role="alert">
          <strong>냉장고 재료를 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.</p>
          <RetryButton type="button" onClick={handleRetry}>
            다시 시도
          </RetryButton>
        </StatusBox>
      ) : (
        // 구역이 바뀔 때마다 key가 바뀌어 슬라이드 애니메이션이 다시 재생된다.
        <SlidingStage key={zoneId} $direction={direction}>
          <FridgeBoard zone={zone} contents={contents} loading={isLoading} />
        </SlidingStage>
      )}
    </Wrapper>
  );
}

export default FridgePage;

const slideFromPrev = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideFromNext = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
`;

const Wrapper = styled.section`
  display: grid;
  justify-items: center;
  gap: 24px;

  @media (max-width: 760px) {
    gap: 16px;
  }
`;

const Pager = styled.div`
  width: min(940px, 100%);
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 8px;
`;

const ArrowButton = styled.button`
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const ZoneHeading = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
`;

const ZoneTitle = styled.h1<{ $tone: string }>`
  min-width: 120px;
  border: 1px solid color-mix(in srgb, ${(props) => props.$tone} 82%, var(--text));
  border-radius: 50px;
  background: color-mix(in srgb, ${(props) => props.$tone} 65%, var(--surface));
  padding: 2px 20px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 540;
  letter-spacing: -0.26px;
`;

const ZoneSubtitle = styled.p`
  font-size: 15px;
  font-weight: 330;
`;

const SlidingStage = styled.div<{ $direction: SlideDirection }>`
  width: 100%;
  display: grid;
  justify-items: center;
  animation: ${(props) => (props.$direction === "prev" ? slideFromPrev : slideFromNext)} 0.26s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const StatusBox = styled.div`
  width: min(940px, 100%);
  min-height: 220px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;

  strong {
    font-size: 24px;
    font-weight: 700;
  }

  p {
    max-width: 540px;
    font-size: 15px;
    line-height: 1.55;
  }
`;

const RetryButton = styled.button`
  margin-top: 6px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
`;
