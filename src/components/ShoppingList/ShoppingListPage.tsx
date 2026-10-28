/*
 * 장보기 목록 화면이다.
 * 헤더에서 고른 냉장고의 장보기 목록을 불러와 살 것과 산 것으로 나눠 보여 준다.
 * 장보기 목록은 냉장고에 묶여 있어, 냉장고 멤버 누구나 같은 목록을 보고 담기·체크·빼기를 할 수 있다.
 * 체크와 빼기는 화면에 먼저 반영하고 서버 요청이 실패하면 되돌린다. 이미 빠졌거나 그사이 바뀐 재료면 목록을 새로 불러온다.
 * 담기는 서버에 담긴 뒤 응답으로 받은 재료를 넣는다.
 */
import { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Refrigerator, X } from "lucide-react";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { getMyFridge } from "../../api/fridge";
import type { Fridge } from "../../api/fridge";
import {
  addShoppingListItem,
  getShoppingListItems,
  removeShoppingListItem,
  setShoppingListItemChecked,
} from "../../api/shoppingList";
import type { ShoppingListItem } from "../../api/shoppingList";
import { useFridgeStore } from "../../store/fridgeStore";
import ShoppingAddForm from "./ShoppingAddForm";
import ShoppingSection from "./ShoppingSection";

type PageState =
  | { status: "loading" }
  // 속한 냉장고가 하나도 없으면 장보기 목록도 없다.
  | { status: "noFridge" }
  | { status: "success"; fridge: Fridge; items: ShoppingListItem[] }
  // isFridgeGone: 화면을 연 뒤 그 냉장고에서 나갔거나 내보내져 더 볼 수 없는 경우
  | { status: "error"; message: string; isFridgeGone: boolean };

function isFridgeGone(error: unknown) {
  return error instanceof ApiError && error.code === "FRIDGE_NOT_FOUND";
}

// 서버에 없는 재료(다른 멤버가 뺐거나 내가 냉장고에서 내보내진 경우 모두 404)나 거의 동시에 바뀐 재료(409)는
// 같은 요청을 다시 보내도 맞지 않으므로 목록을 새로 불러와 서버와 맞춘다.
function needsRefresh(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "SHOPPING_LIST_ITEM_NOT_FOUND" || error.code === "CONCURRENT_MODIFICATION")
  );
}

function getErrorState(error: unknown): PageState {
  if (isFridgeGone(error)) {
    return {
      status: "error",
      message: "냉장고에서 나갔거나 내보내졌을 수 있어요. 다시 불러오면 지금 볼 수 있는 냉장고로 바꿔 보여 드려요.",
      isFridgeGone: true,
    };
  }
  const message =
    error instanceof ApiError && error.code === NETWORK_ERROR
      ? error.message
      : "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.";
  return { status: "error", message, isFridgeGone: false };
}

// 서버와 같은 순서(최근에 담은 순서)로 둔다. 체크해서 다른 묶음으로 옮겨도 다시 불러왔을 때와 같은 자리에 놓인다.
function byRecent(a: ShoppingListItem, b: ShoppingListItem) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id;
}

// 장보기 목록은 냉장고에 묶여 있어 냉장고를 받은 뒤 불러온다.
async function getFridgeWithItems() {
  const fridge = await getMyFridge();
  const items = fridge ? await getShoppingListItems(fridge.id) : [];
  return { fridge, items };
}

function ShoppingListPage() {
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const [page, setPage] = useState<PageState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  // 여러 재료를 이어서 체크하거나 뺄 수 있게 요청 중인 재료와 실패한 재료의 오류를 재료마다 따로 둔다.
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  // 이미 빠진 재료처럼 내가 하려던 것과 다르게 목록이 바뀐 이유를 알려 준다.
  const [notice, setNotice] = useState("");
  // 담기·체크·빼기 결과를 스크린 리더에 알려 준다. 화면에는 보이지 않는다.
  const [announcement, setAnnouncement] = useState("");
  const checkboxRefs = useRef(new Map<number, HTMLInputElement>());
  // 서로 다른 재료에서 동시에 다시 불러오면 늦게 온 이전 응답이 새 목록을 덮지 않게 요청마다 번호를 매긴다.
  const refreshIdRef = useRef(0);

  useEffect(() => {
    let ignore = false;
    getFridgeWithItems().then(
      ({ fridge, items }) => {
        if (ignore) return;
        setPage(fridge ? { status: "success", fridge, items } : { status: "noFridge" });
      },
      (error: unknown) => {
        if (!ignore) setPage(getErrorState(error));
      },
    );
    return () => {
      ignore = true;
    };
  }, [loadAttempt]);

  const items = page.status === "success" ? page.items : [];
  const toBuy = items.filter((item) => !item.checked).sort(byRecent);
  const bought = items.filter((item) => item.checked).sort(byRecent);

  // 요청 응답은 목록을 불러온 뒤에만 오므로, 성공 상태일 때만 목록을 바꾼다.
  const updateItems = (update: (prev: ShoppingListItem[]) => ShoppingListItem[]) => {
    setPage((prev) => (prev.status === "success" ? { ...prev, items: update(prev.items) } : prev));
  };

  const setPending = (itemId: number, isPending: boolean) => {
    setPendingIds((prev) => (isPending ? [...prev, itemId] : prev.filter((id) => id !== itemId)));
  };

  const setItemError = (itemId: number, message: string) => {
    setItemErrors((prev) => {
      const next = { ...prev };
      if (message) next[itemId] = message;
      else delete next[itemId];
      return next;
    });
  };

  // 목록을 새로 불러와 서버와 맞추고 그 재료가 어떻게 됐는지 알려 준다. 다시 불러오지 못하면 false를 돌려줘,
  // 부른 쪽이 화면을 되돌리고 다시 누르게 한다.
  const refreshAfterConflict = async (item: ShoppingListItem) => {
    if (page.status !== "success") return false;
    const refreshId = ++refreshIdRef.current;
    try {
      const freshItems = await getShoppingListItems(page.fridge.id);
      // 뒤에 보낸 요청이 있으면 그 응답이 목록을 맞추므로 이 응답은 버린다.
      if (refreshId !== refreshIdRef.current) return true;
      updateItems(() => freshItems);
      // 내보내져서 없는 경우도 같은 404라, 누가 뺐는지는 단정하지 않는다.
      setNotice(
        freshItems.some((freshItem) => freshItem.id === item.id)
          ? `‘${item.name}’은(는) 그사이 바뀌어서 목록을 새로 불러왔어요. 확인한 뒤 다시 눌러 주세요.`
          : `‘${item.name}’은(는) 이미 목록에서 빠졌어요. 목록을 새로 불러왔어요.`,
      );
      return true;
    } catch (error) {
      // 냉장고에서 내보내졌으면 '냉장고 다시 불러오기'로 이어 간다.
      if (!isFridgeGone(error)) return false;
      setPage(getErrorState(error));
      return true;
    }
  };

  // 실패하면 입력칸이 오류를 보여 주도록 그대로 던진다.
  const handleAdd = async (name: string) => {
    if (page.status !== "success") return;
    try {
      const item = await addShoppingListItem(page.fridge.id, name);
      updateItems((prev) => [item, ...prev]);
      setAnnouncement(`${item.name}을(를) 장보기 목록에 담았어요.`);
    } catch (error) {
      // 그사이 냉장고에서 내보내졌으면 이 목록에 더 담을 수 없으므로 냉장고부터 다시 불러오게 한다.
      if (isFridgeGone(error)) setPage(getErrorState(error));
      throw error;
    }
  };

  const handleToggle = async (item: ShoppingListItem, checked: boolean) => {
    if (pendingIds.includes(item.id)) return;
    setPending(item.id, true);
    setItemError(item.id, "");
    updateItems((prev) => prev.map((prevItem) => (prevItem.id === item.id ? { ...prevItem, checked } : prevItem)));
    // 체크하면 재료가 다른 묶음으로 옮겨 새로 그려져 포커스를 잃으므로, 옮긴 재료의 체크 상자로 돌려놓는다.
    // 마우스로 여러 재료를 이어서 체크할 때 화면이 산 것 쪽으로 튀지 않게 스크롤은 하지 않는다.
    requestAnimationFrame(() => checkboxRefs.current.get(item.id)?.focus({ preventScroll: true }));
    try {
      const updated = await setShoppingListItemChecked(item.id, checked);
      updateItems((prev) => prev.map((prevItem) => (prevItem.id === item.id ? updated : prevItem)));
      setAnnouncement(checked ? `${item.name}을(를) 산 것으로 옮겼어요.` : `${item.name}을(를) 살 것으로 되돌렸어요.`);
    } catch (error) {
      if (needsRefresh(error) && (await refreshAfterConflict(item))) return;
      updateItems((prev) =>
        prev.map((prevItem) => (prevItem.id === item.id ? { ...prevItem, checked: item.checked } : prevItem)),
      );
      setItemError(item.id, checked ? "산 것으로 옮기지 못했어요. 다시 눌러 주세요." : "살 것으로 되돌리지 못했어요. 다시 눌러 주세요.");
    } finally {
      setPending(item.id, false);
    }
  };

  const handleRemove = async (item: ShoppingListItem) => {
    if (pendingIds.includes(item.id)) return;
    setPending(item.id, true);
    setItemError(item.id, "");
    updateItems((prev) => prev.filter((prevItem) => prevItem.id !== item.id));
    try {
      await removeShoppingListItem(item.id);
      // 기다리는 사이 다른 재료 때문에 목록을 새로 불러왔으면 이 재료가 다시 들어 있을 수 있어 한 번 더 뺀다.
      updateItems((prev) => prev.filter((prevItem) => prevItem.id !== item.id));
      setAnnouncement(`${item.name}을(를) 장보기 목록에서 뺐어요.`);
    } catch (error) {
      if (needsRefresh(error) && (await refreshAfterConflict(item))) return;
      // 순서는 담은 시각으로 정하므로 맨 뒤에 붙여도 원래 자리로 돌아간다. 새로 불러온 목록에 이미 있으면 그대로 둔다.
      updateItems((prev) => (prev.some((prevItem) => prevItem.id === item.id) ? prev : [...prev, item]));
      setItemError(item.id, "빼지 못했어요. 다시 눌러 주세요.");
    } finally {
      setPending(item.id, false);
    }
  };

  const handleRetry = async () => {
    setPage({ status: "loading" });
    setItemErrors({});
    setNotice("");
    // 냉장고에서 나가졌거나 헤더가 냉장고 목록을 받지 못한 경우도 있어, 헤더의 냉장고 목록부터 다시 불러온다.
    // getMyFridge()는 헤더 목록에서 냉장고를 고르므로, 새 목록을 받은 뒤에 장보기 목록을 불러와야 나간 냉장고를 다시 고르지 않는다.
    await loadFridges();
    setLoadAttempt((prev) => prev + 1);
  };

  const renderContent = () => {
    if (page.status === "loading") {
      return (
        <Grid aria-busy="true">
          <ScreenReaderOnly role="status">장보기 목록을 불러오는 중이에요.</ScreenReaderOnly>
          <Skeleton aria-hidden="true" />
          <Skeleton aria-hidden="true" />
        </Grid>
      );
    }

    if (page.status === "error") {
      return (
        <StatusBox role="alert">
          <strong>{page.isFridgeGone ? "이 냉장고의 장보기 목록을 볼 수 없어요." : "장보기 목록을 불러오지 못했어요."}</strong>
          <p>{page.message}</p>
          <OutlineButton type="button" onClick={handleRetry}>
            {page.isFridgeGone ? "냉장고 다시 불러오기" : "다시 시도"}
          </OutlineButton>
        </StatusBox>
      );
    }

    if (page.status === "noFridge") {
      return (
        <StatusBox>
          <strong>아직 속한 냉장고가 없어요.</strong>
          <p>장보기 목록은 냉장고마다 있어요. 헤더 오른쪽 냉장고 버튼에서 받은 초대 코드로 참여할 수 있어요.</p>
        </StatusBox>
      );
    }

    return (
      <Grid>
        <ShoppingSection
          title="살 것"
          items={toBuy}
          emptyText={
            items.length === 0
              ? "아직 담은 재료가 없어요. 사야 할 재료 이름을 넣어 담아 보세요."
              : "살 재료를 모두 샀어요."
          }
          pendingIds={pendingIds}
          itemErrors={itemErrors}
          checkboxRefs={checkboxRefs}
          onToggle={handleToggle}
          onRemove={handleRemove}
        >
          <ShoppingAddForm onAdd={handleAdd} />
        </ShoppingSection>
        <ShoppingSection
          title="산 것"
          items={bought}
          emptyText="아직 산 재료가 없어요. 장을 보며 산 재료를 체크하면 여기로 옮겨져요."
          pendingIds={pendingIds}
          itemErrors={itemErrors}
          checkboxRefs={checkboxRefs}
          muted
          onToggle={handleToggle}
          onRemove={handleRemove}
        />
      </Grid>
    );
  };

  return (
    <Wrapper>
      <Hero>
        <h1>장보기 목록</h1>
        {page.status === "success" && (
          <FridgeLine>
            <Refrigerator size={16} aria-hidden="true" />
            <strong>{page.fridge.name}</strong>
          </FridgeLine>
        )}
        <p>냉장고를 함께 쓰는 사람과 같은 목록을 봐요. 장을 보며 산 재료를 체크해 두세요.</p>
      </Hero>

      {notice && (
        <Notice role="status">
          <span>{notice}</span>
          <NoticeClose type="button" aria-label="안내 닫기" onClick={() => setNotice("")}>
            <X size={16} aria-hidden="true" />
          </NoticeClose>
        </Notice>
      )}

      {renderContent()}

      <ScreenReaderOnly role="status">{announcement}</ScreenReaderOnly>
    </Wrapper>
  );
}

export default ShoppingListPage;

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

const Wrapper = styled.section`
  display: grid;
  gap: 24px;
`;

const Hero = styled.header`
  border-radius: 16px;
  background: var(--block-lime);
  padding: 24px 28px;
  display: grid;
  justify-items: start;
  gap: 10px;

  h1 {
    font-size: clamp(26px, 4vw, 38px);
    line-height: 1.16;
    font-weight: 480;
    letter-spacing: -0.26px;
  }

  p {
    font-size: 15px;
    font-weight: 330;
    line-height: 1.5;
    word-break: keep-all;
  }

  @media (max-width: 760px) {
    border-radius: 0;
    margin-inline: -12px;
    padding: 22px 20px;
  }
`;

const FridgeLine = styled.div`
  max-width: 100%;
  min-height: 40px;
  border-radius: 999px;
  background: var(--surface);
  padding: 6px 16px 6px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  svg {
    flex-shrink: 0;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 540;
  }
`;

const Notice = styled.div`
  border-radius: 8px;
  background: var(--block-cream);
  padding: 8px 8px 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
  word-break: keep-all;
`;

const NoticeClose = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--surface);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`;

const StatusBox = styled.div`
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
    word-break: keep-all;
  }

  p {
    max-width: 540px;
    font-size: 15px;
    line-height: 1.55;
    word-break: keep-all;
  }
`;

const OutlineButton = styled.button`
  margin-top: 6px;
  min-height: 42px;
  border: 1px solid var(--text);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
`;

const Skeleton = styled.div`
  height: 280px;
  border-radius: 16px;
  background: linear-gradient(90deg, var(--surface-soft) 25%, var(--border-soft) 50%, var(--surface-soft) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ScreenReaderOnly = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;
