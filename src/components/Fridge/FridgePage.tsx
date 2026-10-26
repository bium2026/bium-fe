/*
 * 내 냉장고 화면이다.
 * 좌우 화살표로 냉장실·냉동실·실온을 넘겨 보며, 지금 보는 구역은 주소(?zone=)에 남겨 새로고침해도 유지한다.
 * 지금은 퍼블리싱 단계라 목데이터를 쓰고, 서버 연동 때 냉장고 조회 API로 바꾼다.
 * 재료를 누르면 수정 모달을 열고, 저장·삭제는 서버에 반영된 뒤에 화면에 반영한다.
 */
import { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router";
import { ApiError } from "../../api/client";
import { deleteFridgeItem, updateFridgeItem } from "../../api/fridge";
import FridgeBoard from "./FridgeBoard";
import IngredientEditModal, { type IngredientEditValues } from "./IngredientEditModal";
import { emptyFridgeMock, fridgeMock } from "./fridgeMockData";
import type { FridgeContents, FridgeIngredient, ZoneIngredients } from "./fridgeTypes";
import { isZoneId, zoneMeta, zoneOrder } from "./fridgeZones";

type FridgeStatus = "loading" | "success" | "error";
type SlideDirection = "prev" | "next";

// 퍼블리싱 확인용: ?preview=loading|empty|error 로 각 상태 화면을 볼 수 있다. API 연동 시 지운다.
function getPreviewStatus(value: string | null): FridgeStatus {
  if (value === "loading" || value === "error") return value;
  return "success";
}

// 재료가 어느 구역·칸에 있든 id로 찾아 next로 바꾸고, next가 null이면 뺀다.
function replaceIngredient(contents: FridgeContents, id: number, next: FridgeIngredient | null): FridgeContents {
  const update = (items: FridgeIngredient[]) =>
    items.flatMap((item) => (item.id !== id ? [item] : next ? [next] : []));
  const updateZone = (zone: ZoneIngredients): ZoneIngredients => ({
    shelf: update(zone.shelf),
    leftDoor: update(zone.leftDoor),
    rightDoor: update(zone.rightDoor),
  });
  return {
    fridge: updateZone(contents.fridge),
    freezer: updateZone(contents.freezer),
    pantry: updateZone(contents.pantry),
  };
}

function FridgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = searchParams.get("preview");
  const [status, setStatus] = useState<FridgeStatus>(() => getPreviewStatus(preview));
  const [direction, setDirection] = useState<SlideDirection>("next");
  const [fridgeContents, setFridgeContents] = useState(() => (preview === "empty" ? emptyFridgeMock : fridgeMock));
  const [selectedIngredient, setSelectedIngredient] = useState<FridgeIngredient | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const zoneTitleRef = useRef<HTMLHeadingElement>(null);
  const removedWhileOpenRef = useRef(false);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // 모달을 연 재료 카드가 지워졌으면 모달이 닫힐 때 포커스를 돌려줄 곳이 없어 구역 제목으로 옮긴다.
  useEffect(() => {
    if (selectedIngredient !== null || !removedWhileOpenRef.current) return;
    removedWhileOpenRef.current = false;
    zoneTitleRef.current?.focus();
  }, [selectedIngredient]);

  const zoneParam = searchParams.get("zone");
  const zoneId = isZoneId(zoneParam) ? zoneParam : zoneOrder[0];
  const zone = zoneMeta[zoneId];
  const zoneIndex = zoneOrder.indexOf(zoneId);
  const prevZone = zoneMeta[zoneOrder[(zoneIndex + zoneOrder.length - 1) % zoneOrder.length]];
  const nextZone = zoneMeta[zoneOrder[(zoneIndex + 1) % zoneOrder.length]];

  const contents = fridgeContents[zoneId];
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

  const removeIngredient = (id: number) => {
    removedWhileOpenRef.current = true;
    setFridgeContents((prev) => replaceIngredient(prev, id, null));
  };

  // 다른 멤버가 이미 지운 재료면 다시 눌러도 계속 실패하므로, 오류는 모달에 그대로 보여 주고 화면에서도 뺀다.
  const removeIfGone = (id: number, error: unknown) => {
    if (error instanceof ApiError && error.code === "FRIDGE_ITEM_NOT_FOUND") removeIngredient(id);
  };

  // 실패하면 모달이 오류를 보여 주고, 화면은 서버에 반영된 뒤에만 바꾸므로 되돌릴 것이 없다.
  const handleSave = async (ingredient: FridgeIngredient, values: IngredientEditValues) => {
    try {
      const updated = await updateFridgeItem(ingredient.id, { ...values, version: ingredient.version });
      // 모달이 아이콘·유통기한을 꼭 받아서 보내므로 서버도 비워서 돌려주지 않지만, 응답 타입은 null을 허용해 보낸 값으로 채운다.
      setFridgeContents((prev) =>
        replaceIngredient(prev, ingredient.id, {
          ...ingredient,
          name: updated.name,
          emoji: updated.emoji ?? values.emoji,
          expiresAt: updated.expiresAt ?? values.expiresAt,
          version: updated.version,
        }),
      );
    } catch (error) {
      removeIfGone(ingredient.id, error);
      throw error;
    }
  };

  const handleDelete = async (ingredient: FridgeIngredient) => {
    try {
      await deleteFridgeItem(ingredient.id, ingredient.version);
      removeIngredient(ingredient.id);
    } catch (error) {
      removeIfGone(ingredient.id, error);
      throw error;
    }
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
          <ZoneTitle ref={zoneTitleRef} tabIndex={-1} $tone={zone.tone}>
            {zone.title}
          </ZoneTitle>
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
          <FridgeBoard
            zone={zone}
            contents={contents}
            loading={isLoading}
            onSelectIngredient={setSelectedIngredient}
          />
        </SlidingStage>
      )}

      <IngredientEditModal
        ingredient={selectedIngredient}
        onClose={() => setSelectedIngredient(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
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
