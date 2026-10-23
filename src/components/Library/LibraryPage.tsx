/*
 * 식재료 도감 화면이다.
 * 카테고리 탭과 검색으로 재료를 고르고, 재료를 추가·삭제하거나 장본 음식에 담는다.
 * 전체 탭에서는 카테고리별로 묶어 보여 주고, 고른 탭은 주소(?category=)에 남겨 새로고침해도 유지한다.
 * 도감과 내 냉장고를 함께 불러오고, 장본 음식에 담은 재료는 담기 응답으로 패널에 쌓는다.
 * 장본 음식 목록 조회 API가 아직 없어서 패널은 이 화면에서 담은 재료만 보여 준다.
 */
import { useEffect, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Plus, Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import { getMyFridge } from "../../api/fridge";
import { createCatalogIngredient, deleteCatalogIngredient, getMyCatalog } from "../../api/ingredientCatalog";
import type { CatalogIngredient, CatalogIngredientCreateRequest } from "../../api/ingredientCatalog";
import { addPurchasedItem } from "../../api/purchasedItem";
import type { PurchasedItem } from "../../api/purchasedItem";
import GroceryBag from "./GroceryBag";
import IngredientAddModal from "./IngredientAddModal";
import IngredientCard from "./IngredientCard";
import { categoryLabel, categoryOrder, isCategoryFilter } from "./libraryCategories";
import type { CategoryFilter } from "./libraryCategories";

type CatalogState =
  | { status: "loading" }
  // 연결된 냉장고가 없으면 fridgeId는 null이고, 장본 음식에 담을 수 없다.
  | { status: "success"; ingredients: CatalogIngredient[]; fridgeId: number | null }
  | { status: "error"; message: string };

const skeletonKeys = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

const filters: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "전체" },
  ...categoryOrder.map((id) => ({ id, label: categoryLabel[id] })),
];

function getLoadErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === NETWORK_ERROR) return error.message;
  return "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.";
}

function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [groceries, setGroceries] = useState<PurchasedItem[]>([]);
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  // 담기·추가·삭제 결과를 스크린 리더에 알려 준다. 화면에는 보이지 않는다.
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([getMyCatalog(), getMyFridge()]).then(
      ([ingredients, fridge]) => {
        if (!ignore) setCatalog({ status: "success", ingredients, fridgeId: fridge?.id ?? null });
      },
      (error: unknown) => {
        if (!ignore) setCatalog({ status: "error", message: getLoadErrorMessage(error) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [loadAttempt]);

  const ingredients = catalog.status === "success" ? catalog.ingredients : [];
  const fridgeId = catalog.status === "success" ? catalog.fridgeId : null;
  const status = catalog.status;
  const categoryParam = searchParams.get("category");
  const category: CategoryFilter = isCategoryFilter(categoryParam) ? categoryParam : "all";
  const keyword = query.trim().toLowerCase();
  const isLoading = status === "loading";

  // 추가·삭제 응답은 목록을 불러온 뒤에만 오므로, 성공 상태일 때만 목록을 바꾼다.
  const updateIngredients = (update: (prev: CatalogIngredient[]) => CatalogIngredient[]) => {
    setCatalog((prev) => (prev.status === "success" ? { ...prev, ingredients: update(prev.ingredients) } : prev));
  };

  const groups = categoryOrder
    .filter((id) => category === "all" || id === category)
    .map((id) => ({
      id,
      items: ingredients.filter((item) => item.category === id && item.name.toLowerCase().includes(keyword)),
    }))
    .filter((group) => group.items.length > 0);

  const changeCategory = (next: CategoryFilter) => {
    // 탭을 바꿀 때마다 방문 기록이 쌓이면 뒤로 가기로 도감을 벗어나기 어려워서 주소를 바꿔치기한다.
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "all") params.delete("category");
        else params.set("category", next);
        return params;
      },
      { replace: true },
    );
  };

  // 서버에 담긴 뒤 응답으로 받은 재료를 패널 맨 위에 넣는다. 실패하면 카드가 오류를 보여 주도록 그대로 던진다.
  const handleAddToGroceries = async (ingredient: CatalogIngredient) => {
    if (fridgeId === null) return;
    const item = await addPurchasedItem(fridgeId, ingredient.id);
    setGroceries((prev) => [item, ...prev]);
    setAnnouncement(`${item.name}을(를) 장본 음식에 담았어요.`);
  };

  // 서버에서 지워진 뒤에 목록에서 뺀다. 실패하면 카드가 오류를 보여 주도록 다시 던진다.
  const handleDelete = async (ingredient: CatalogIngredient) => {
    try {
      await deleteCatalogIngredient(ingredient.id);
    } catch (error) {
      // 다른 기기에서 먼저 지워 서버에 없는 재료면, 지우려던 결과와 같으므로 목록에서 빼고 넘어간다.
      if (!(error instanceof ApiError && error.code === "CATALOG_NOT_FOUND")) throw error;
    }
    updateIngredients((prev) => prev.filter((item) => item.id !== ingredient.id));
    setAnnouncement(`${ingredient.name}을(를) 도감에서 삭제했어요.`);
  };

  // 실패하면 모달이 오류를 보여 주도록 그대로 던진다.
  const handleAdd = async (values: CatalogIngredientCreateRequest) => {
    const created = await createCatalogIngredient(values);
    updateIngredients((prev) => [created, ...prev]);
    // 추가한 재료가 바로 보이도록 그 카테고리 탭으로 옮기고 검색어를 지운다.
    changeCategory(created.category);
    setQuery("");
    setAnnouncement(`${created.name}을(를) 도감에 추가했어요.`);
  };

  const handleRetry = () => {
    setCatalog({ status: "loading" });
    setLoadAttempt((prev) => prev + 1);
  };

  const renderContent = () => {
    if (catalog.status === "error") {
      return (
        <StatusBox role="alert">
          <strong>식재료 도감을 불러오지 못했어요.</strong>
          <p>{catalog.message}</p>
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        </StatusBox>
      );
    }

    if (isLoading) {
      return (
        <Grid aria-busy="true">
          {skeletonKeys.map((key) => (
            <SkeletonCard key={key} aria-hidden="true" />
          ))}
        </Grid>
      );
    }

    if (groups.length === 0) {
      return (
        <StatusBox>
          {ingredients.length === 0 ? (
            <>
              <strong>도감에 재료가 없어요.</strong>
              <p>자주 사는 재료를 추가해 두면 장 본 뒤 바로 담을 수 있어요.</p>
              <OutlineButton type="button" onClick={() => setIsAddOpen(true)}>
                <Plus size={16} aria-hidden="true" />새 재료 추가
              </OutlineButton>
            </>
          ) : keyword ? (
            <>
              <strong>‘{query.trim()}’ 재료를 찾지 못했어요.</strong>
              <p>다른 이름으로 찾아보거나, 새 재료로 추가해 보세요.</p>
            </>
          ) : (
            <>
              <strong>{category !== "all" && categoryLabel[category]} 재료가 없어요.</strong>
              <p>새 재료를 추가하면 이 카테고리에 모여요.</p>
            </>
          )}
        </StatusBox>
      );
    }

    return (
      <Groups>
        {groups.map((group) => (
          <Group key={group.id} aria-labelledby={`library-group-${group.id}`}>
            {/* 한 카테고리만 볼 때는 탭이 제목 역할을 하므로 묶음 제목을 화면에서 숨긴다. */}
            <GroupTitle id={`library-group-${group.id}`} $hidden={category !== "all"}>
              {categoryLabel[group.id]}
              <span>{group.items.length}</span>
            </GroupTitle>
            <Grid>
              {group.items.map((ingredient) => (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  canUseFridge={fridgeId !== null}
                  onAddToGroceries={handleAddToGroceries}
                  onDelete={handleDelete}
                />
              ))}
            </Grid>
          </Group>
        ))}
      </Groups>
    );
  };

  return (
    <Wrapper>
      <Layout>
        <MainColumn>
          <Toolbar>
            <TitleRow>
              <div>
                <Title>식재료 도감</Title>
                <Subtitle>
                  {status === "success" ? `재료 ${ingredients.length}개 · ` : ""}자주 사는 재료를 모아 두고 장 본 재료를
                  담아 보세요.
                </Subtitle>
              </div>
              <AddButton type="button" onClick={() => setIsAddOpen(true)} disabled={status !== "success"}>
                <Plus size={18} aria-hidden="true" />새 재료 추가
              </AddButton>
            </TitleRow>

            <SearchBox>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="재료 이름으로 찾기"
                aria-label="재료 검색"
                disabled={status !== "success"}
              />
            </SearchBox>

            <CategoryTabs aria-label="식재료 카테고리">
              {filters.map((item) => (
                <CategoryButton
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  $active={category === item.id}
                  onClick={() => changeCategory(item.id)}
                >
                  {item.label}
                </CategoryButton>
              ))}
            </CategoryTabs>
          </Toolbar>

          {status === "success" && fridgeId === null && (
            <Notice role="status">
              <strong>연결된 냉장고가 없어요.</strong>
              냉장고가 있어야 장본 음식에 담을 수 있어요. 도감 재료를 추가하고 지우는 것은 지금도 할 수 있어요.
            </Notice>
          )}

          {renderContent()}
        </MainColumn>

        <GroceryBag items={groceries} />
      </Layout>

      <ScreenReaderOnly role="status">{announcement}</ScreenReaderOnly>

      <IngredientAddModal
        open={isAddOpen}
        defaultCategory={category === "all" ? "VEGETABLE" : category}
        existingNames={ingredients.map((item) => item.name)}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAdd}
      />
    </Wrapper>
  );
}

export default LibraryPage;

const shimmer = keyframes`
  0% { background-position: -220px 0; }
  100% { background-position: 220px 0; }
`;

const Wrapper = styled.section`
  display: grid;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  gap: 28px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.div`
  display: grid;
  gap: 28px;
`;

const Toolbar = styled.div`
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface-soft);
  padding: 28px 32px 32px;
  display: grid;
  gap: 16px;

  @media (max-width: 760px) {
    border-width: 1px 0;
    border-radius: 0;
    margin-inline: -12px;
    padding: 22px 20px 24px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.16;
  font-weight: 480;
  letter-spacing: -0.26px;
`;

const Subtitle = styled.p`
  margin-top: 8px;
  font-size: 15px;
  font-weight: 330;
  line-height: 1.45;
  word-break: keep-all;
`;

// 카드마다 검은 담기 버튼이 있어서, 추가 버튼은 흰 바탕으로 두어 주 행동이 겹쳐 보이지 않게 한다.
const AddButton = styled.button`
  flex-shrink: 0;
  min-height: 44px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }
`;

const SearchBox = styled.label`
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:focus-within {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  input {
    width: 100%;
    min-height: 46px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font-size: 16px;
    font-weight: 330;
  }

  input:disabled {
    cursor: not-allowed;
  }
`;

const CategoryTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CategoryButton = styled.button<{ $active: boolean }>`
  min-height: 40px;
  border: 0;
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
`;

const Groups = styled.div`
  display: grid;
  gap: 32px;
`;

const Group = styled.section`
  display: grid;
  gap: 14px;
`;

// 화면에서만 숨기고 스크린 리더에는 묶음 제목으로 남긴다.
const screenReaderOnly = `
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

const GroupTitle = styled.h2<{ $hidden: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 22px;
  font-weight: 540;
  letter-spacing: -0.14px;

  span {
    font-size: 15px;
    font-weight: 330;
  }

  ${(props) => (props.$hidden ? screenReaderOnly : "")}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
`;

const SkeletonCard = styled.div`
  min-height: 176px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: linear-gradient(90deg, var(--border-soft) 25%, var(--surface-soft) 50%, var(--border-soft) 75%);
  background-size: 220px 100%;
  animation: ${shimmer} 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Notice = styled.p`
  border-radius: 8px;
  background: var(--block-cream);
  padding: 14px 16px;
  display: grid;
  gap: 4px;
  font-size: 14px;
  font-weight: 330;
  line-height: 1.5;
  word-break: keep-all;

  strong {
    font-size: 15px;
    font-weight: 540;
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
    overflow-wrap: anywhere;
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
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
`;

const ScreenReaderOnly = styled.p`
  ${screenReaderOnly}
`;
