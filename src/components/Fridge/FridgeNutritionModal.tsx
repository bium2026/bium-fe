/*
 * 냉장실·냉동실·실온 구역별, 또는 냉장고 전체의 탄수화물·단백질·지방 균형을 도넛 그래프로 보여 주는 모달이다.
 * 재료 양은 알 수 없어서, 영양 정보를 찾은 재료마다 100g씩 있다고 보고 더한 비율이다.
 * 냉장고 화면에서 보고 있던 구역으로 열고, 위쪽 버튼으로 다른 구역이나 전체를 고른다.
 */
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { RotateCw } from "lucide-react";
import { ApiError } from "../../api/client";
import { getFridgeNutritionSummary, type FridgeNutritionSummary } from "../../api/fridge";
import LibraryModal from "../Library/LibraryModal";
import NutritionChart from "../Recipe/NutritionChart";
import { zoneStorage } from "./fridgeLayout";
import type { ZoneId } from "./fridgeTypes";
import { zoneMeta, zoneOrder } from "./fridgeZones";

// poll: 이 결과를 받은 요청이 몇 번째 다시 부르기였는지 (처음 요청은 0)
type SummaryResult =
  | { sessionKey: string; poll: number; status: "success"; summary: FridgeNutritionSummary }
  | { sessionKey: string; poll: number; status: "error"; message: string };

type Scope = ZoneId | "all";

type FridgeNutritionModalProps = {
  open: boolean;
  fridgeId: number | null;
  // 모달을 열 때 먼저 보여 줄 구역 (냉장고 화면에서 보고 있던 구역)
  initialZone: ZoneId;
  onClose: () => void;
};

const scopeOptions: { id: Scope; label: string }[] = [
  ...zoneOrder.map((id) => ({ id, label: zoneMeta[id].title })),
  { id: "all", label: "전체" },
];

function scopeLabel(scope: Scope) {
  return scope === "all" ? "냉장고" : zoneMeta[scope].title;
}

function emptyMessage(scope: Scope) {
  return scope === "all" ? "냉장고에 재료가 없어요." : `${zoneMeta[scope].title}에 둔 재료가 없어요.`;
}

// 서버가 아직 찾아보지 않은 재료(pendingCount)를 뒤에서 찾는 동안 다시 불러오는 간격과 횟수.
// 식약처는 처음 찾는 재료 하나에 4~6초가 걸려서, 재료 몇 개를 채울 수 있게 약 18초까지 기다린다.
const POLL_DELAY_MS = 3000;
const MAX_POLLS = 6;

function formatNumber(value: number | null, unit: string) {
  return value === null ? "-" : `${Math.round(value * 10) / 10}${unit}`;
}

function FridgeNutritionModal({ open, fridgeId, initialZone, onClose }: FridgeNutritionModalProps) {
  // 열 때, 구역을 바꿀 때, 다시 불러올 때마다 올린다.
  // 같은 구역으로 돌아와도 이전 결과나 다시 부른 횟수를 이어 쓰지 않고 처음부터 불러온다.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  const [scope, setScope] = useState<Scope>(initialZone);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const sessionKey = `${fridgeId}-${session}`;
  // pendingCount 때문에 다시 부른 횟수. 다시 부르는 동안에는 이전 결과를 그대로 보여 준다.
  const [poll, setPoll] = useState({ sessionKey, count: 0 });
  const pollCount = poll.sessionKey === sessionKey ? poll.count : 0;

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSession((value) => value + 1);
      setScope(initialZone);
    }
  }

  const reload = () => setSession((value) => value + 1);
  const changeScope = (next: Scope) => {
    if (next === scope) return;
    setScope(next);
    reload();
  };

  useEffect(() => {
    if (!open || fridgeId === null) return;
    let ignore = false;
    let timer: number | undefined;
    getFridgeNutritionSummary(fridgeId, scope === "all" ? undefined : zoneStorage[scope]).then(
      (summary) => {
        if (ignore) return;
        setResult({ sessionKey, poll: pollCount, status: "success", summary });
        if (summary.pendingCount > 0 && pollCount < MAX_POLLS) {
          timer = window.setTimeout(() => setPoll({ sessionKey, count: pollCount + 1 }), POLL_DELAY_MS);
        }
      },
      (error: unknown) => {
        if (ignore) return;
        const message =
          error instanceof ApiError ? error.message : "영양 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
        setResult({ sessionKey, poll: pollCount, status: "error", message });
      },
    );
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [open, fridgeId, scope, sessionKey, pollCount]);

  const current = result?.sessionKey === sessionKey ? result : null;
  const summary = current?.status === "success" ? current.summary : null;
  // 마지막 다시 부르기의 응답이 올 때까지는 찾는 중으로 본다.
  const isPolling = current?.status === "success" && current.summary.pendingCount > 0 && current.poll < MAX_POLLS;

  // 재료마다 기준량이 같을 때만 목록 아래에 한 번 적고, 다르면 줄마다 적는다.
  const bases = new Set(summary?.items.map((item) => item.baseAmountG));
  const commonBase = bases.size === 1 ? [...bases][0] : null;

  return (
    <LibraryModal open={open} title="영양 균형" busy={false} placement="top" onClose={onClose}>
      <Content aria-busy={current === null}>
        <ScopeTabs role="group" aria-label="영양 균형을 볼 구역">
          {scopeOptions.map((option) => (
            <ScopeButton
              key={option.id}
              type="button"
              aria-pressed={scope === option.id}
              $active={scope === option.id}
              $tone={option.id === "all" ? "var(--accent-soft)" : zoneMeta[option.id].tone}
              onClick={() => changeScope(option.id)}
            >
              {option.label}
            </ScopeButton>
          ))}
        </ScopeTabs>

        {current === null && <Placeholder>{scopeLabel(scope)} 재료의 영양 정보를 모으는 중이에요...</Placeholder>}

        {current?.status === "error" && (
          <Placeholder role="alert">
            {current.message}
            <RetryButton type="button" onClick={reload}>
              <RotateCw size={14} aria-hidden="true" />
              다시 시도
            </RetryButton>
          </Placeholder>
        )}

        {summary && summary.matchedCount === 0 && (
          <Placeholder role="status">
            {summary.itemCount === 0 && emptyMessage(scope)}
            {summary.itemCount > 0 &&
              summary.pendingCount > 0 &&
              (isPolling
                ? `재료 ${summary.pendingCount}개의 영양 정보를 찾는 중이에요...`
                : `재료 ${summary.pendingCount}개는 아직 영양 정보를 확인하지 못했어요.`)}
            {summary.itemCount > 0 && summary.pendingCount === 0 && "영양 정보를 찾은 재료가 없어요."}
            {summary.pendingCount > 0 && !isPolling && (
              <RetryButton type="button" onClick={reload}>
                <RotateCw size={14} aria-hidden="true" />
                다시 불러오기
              </RetryButton>
            )}
          </Placeholder>
        )}

        {summary && summary.matchedCount > 0 && (
          <>
            <NutritionChart
              carbohydrateG={summary.carbohydrateG}
              proteinG={summary.proteinG}
              fatG={summary.fatG}
              caloriesKcal={summary.caloriesKcal}
              basis={`재료 ${summary.matchedCount}개`}
              layout="row"
            />
            <Basis>
              재료마다 100g씩 있다고 보고 합친 비율이에요. {scopeLabel(scope)} 재료 {summary.itemCount}개 중{" "}
              {summary.matchedCount}개를 합쳤어요.
            </Basis>
          </>
        )}

        {summary && (
          <Coverage
            summary={summary}
            // 합친 재료가 없을 때는 찾는 중·확인 못 함을 위 안내 칸에서 이미 보여 준다.
            showPending={summary.matchedCount > 0}
            isPolling={isPolling}
            onRetry={reload}
          />
        )}

        {summary && summary.matchedCount > 0 && (
          <>
            <ListTitle>합친 재료</ListTitle>
            <ItemList>
              {summary.items.map((item) => (
                <li key={item.itemId}>
                  <ItemName>
                    <span aria-hidden="true">{item.emoji}</span>
                    {item.name}
                  </ItemName>
                  <ItemValues>
                    <strong>
                      {formatNumber(item.caloriesKcal, "kcal")}
                      {commonBase === null && <small> ({item.baseAmountG}g당)</small>}
                    </strong>
                    <span aria-hidden="true">
                      탄 {formatNumber(item.carbohydrateG, "g")} · 단 {formatNumber(item.proteinG, "g")} · 지{" "}
                      {formatNumber(item.fatG, "g")}
                    </span>
                    <HiddenText>
                      탄수화물 {formatNumber(item.carbohydrateG, "g")}, 단백질 {formatNumber(item.proteinG, "g")},
                      지방 {formatNumber(item.fatG, "g")}
                    </HiddenText>
                  </ItemValues>
                </li>
              ))}
            </ItemList>
            <Source>
              {commonBase === null ? "재료마다 적은 기준량당 값" : `${commonBase}g당 값`} · 식약처 식품영양성분 DB
            </Source>
          </>
        )}
      </Content>
    </LibraryModal>
  );
}

export default FridgeNutritionModal;

type CoverageProps = {
  summary: FridgeNutritionSummary;
  showPending: boolean;
  isPolling: boolean;
  onRetry: () => void;
};

// 합계에 들어가지 못한 재료가 왜 빠졌는지 알려 준다.
function Coverage({ summary, showPending, isPolling, onRetry }: CoverageProps) {
  const notFound = summary.itemCount - summary.matchedCount - summary.pendingCount;
  const hasPending = showPending && summary.pendingCount > 0;
  if (!hasPending && notFound <= 0) return null;

  return (
    <CoverageList>
      {hasPending && (
        <li role="status">
          {isPolling
            ? `재료 ${summary.pendingCount}개의 영양 정보를 찾는 중이에요...`
            : `재료 ${summary.pendingCount}개는 아직 영양 정보를 확인하지 못했어요.`}
          {!isPolling && (
            <RetryButton type="button" onClick={onRetry}>
              <RotateCw size={14} aria-hidden="true" />
              다시 불러오기
            </RetryButton>
          )}
        </li>
      )}
      {notFound > 0 && <li>재료 {notFound}개는 영양 정보가 없거나 일부만 있어서 계산에서 빠졌어요.</li>}
    </CoverageList>
  );
}

const Content = styled.div`
  margin-top: 16px;
  display: grid;
  gap: 12px;
`;

const ScopeTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ScopeButton = styled.button<{ $active: boolean; $tone: string }>`
  min-height: 36px;
  border: 1px solid ${(props) => (props.$active ? "var(--text)" : "var(--border)")};
  border-radius: 50px;
  background: ${(props) => (props.$active ? props.$tone : "var(--surface)")};
  padding: 6px 14px;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? 700 : 480)};
  color: var(--text);
  cursor: pointer;
`;

const Placeholder = styled.p`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 18px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  text-align: center;
`;

const CoverageList = styled.ul`
  list-style: none;
  display: grid;
  gap: 6px;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
    color: var(--text-muted);
  }
`;

const RetryButton = styled.button`
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 540;
  color: var(--text);
  cursor: pointer;
`;

const Basis = styled.p`
  border-radius: 8px;
  background: var(--block-cream);
  padding: 10px 12px;
  font-size: 13px;
  word-break: keep-all;
`;

const ListTitle = styled.h3`
  margin-top: 4px;
  font-size: 13px;
  font-weight: 540;
`;

const ItemList = styled.ul`
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;

  li {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  li + li {
    border-top: 1px solid var(--border);
  }
`;

const ItemName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 540;
`;

const ItemValues = styled.span`
  display: grid;
  justify-items: end;
  gap: 2px;
  text-align: right;

  strong {
    font-size: 14px;
    font-weight: 700;
  }

  small {
    font-size: 12px;
    font-weight: 480;
    color: var(--text-muted);
  }

  span {
    font-size: 12px;
    color: var(--text-muted);
  }
`;

// 화면에는 줄인 말(탄·단·지)을 보여 주고, 화면 낭독기에는 이 문장을 읽어 준다.
const HiddenText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

const Source = styled.p`
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
`;
