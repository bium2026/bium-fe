/*
 * 식재료 도감 화면이다.
 * 카테고리 탭과 검색으로 재료를 고르고, 재료를 추가·삭제하거나 장본 음식에 담는다.
 * 전체 탭에서는 카테고리별로 묶어 보여 주고, 고른 탭은 주소(?category=)에 남겨 새로고침해도 유지한다.
 * 지금은 퍼블리싱 단계라 목데이터를 쓰고, 서버 연동 때 도감·장본 음식 API로 바꾼다.
 */
import { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Plus, Search } from "lucide-react";
import { useSearchParams } from "react-router";
import GroceryBag from "./GroceryBag";
import IngredientAddModal from "./IngredientAddModal";
import IngredientCard from "./IngredientCard";
import { categoryLabel, categoryOrder, isCategoryFilter } from "./libraryCategories";
import type { CategoryFilter } from "./libraryCategories";
import { getDateAfter } from "./libraryDate";
import { groceryMock, libraryMock } from "./libraryMockData";
import type { GroceryItem, LibraryIngredient, NewLibraryIngredient } from "./libraryTypes";

type LibraryStatus = "loading" | "success" | "error";

const skeletonKeys = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

const filters: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "전체" },
  ...categoryOrder.map((id) => ({ id, label: categoryLabel[id] })),
];

// crypto.randomUUID()는 https나 localhost에서만 있어서, 휴대폰으로 내부 IP에 접속해 확인할 때도 동작하도록 직접 만든다.
let nextId = 0;
function createId(prefix: string) {
  nextId += 1;
  return `${prefix}-${Date.now()}-${nextId}`;
}

// 퍼블리싱 확인용: ?preview=loading|empty|error 로 각 상태 화면을 볼 수 있다. API 연동 시 지운다.
function getPreviewStatus(value: string | null): LibraryStatus {
  if (value === "loading" || value === "error") return value;
  return "success";
}

function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = searchParams.get("preview");
  const [status, setStatus] = useState<LibraryStatus>(() => getPreviewStatus(preview));
  const [ingredients, setIngredients] = useState<LibraryIngredient[]>(() => (preview === "empty" ? [] : libraryMock));
  const [groceries, setGroceries] = useState<GroceryItem[]>(groceryMock);
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  // 담기·추가·삭제 결과를 스크린 리더에 알려 준다. 화면에는 보이지 않는다.
  const [announcement, setAnnouncement] = useState("");
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const categoryParam = searchParams.get("category");
  const category: CategoryFilter = isCategoryFilter(categoryParam) ? categoryParam : "all";
  const keyword = query.trim().toLowerCase();
  const isLoading = status === "loading";

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

  const handleAddToGroceries = (ingredient: LibraryIngredient) => {
    // TODO: 장본 음식 API가 정해지면 서버에 저장하고, 실패하면 담은 재료를 되돌린다.
    const item: GroceryItem = {
      id: createId("grocery"),
      name: ingredient.name,
      icon: ingredient.icon,
      expiresAt: getDateAfter(ingredient.shelfLifeDays),
    };
    setGroceries((prev) => [item, ...prev]);
    setAnnouncement(`${ingredient.name}을(를) 장본 음식에 담았어요.`);
  };

  const handleRemoveGrocery = (item: GroceryItem) => {
    // TODO: 장본 음식 API가 정해지면 서버에서 지우고, 실패하면 목록을 되돌린다.
    setGroceries((prev) => prev.filter((grocery) => grocery.id !== item.id));
    setAnnouncement(`${item.name}을(를) 장본 음식에서 뺐어요.`);
  };

  const handleDelete = (ingredient: LibraryIngredient) => {
    // TODO: 도감 API가 정해지면 서버에서 지우고, 실패하면 목록을 되돌린다.
    setIngredients((prev) => prev.filter((item) => item.id !== ingredient.id));
    setAnnouncement(`${ingredient.name}을(를) 도감에서 삭제했어요.`);
  };

  const handleAdd = async (values: NewLibraryIngredient) => {
    // TODO: 도감 API가 정해지면 서버에 저장하고 응답으로 받은 재료를 넣는다.
    setIngredients((prev) => [{ id: createId("ingredient"), ...values }, ...prev]);
    // 추가한 재료가 바로 보이도록 그 카테고리 탭으로 옮기고 검색어를 지운다.
    changeCategory(values.category);
    setQuery("");
    setAnnouncement(`${values.name}을(를) 도감에 추가했어요.`);
  };

  const handleRetry = () => {
    if (isLoading) return;
    setStatus("loading");
    // TODO: 도감 조회 API가 정해지면 서버 요청으로 바꾼다. 지금은 로딩 화면을 보여 주기 위한 지연이다.
    timerRef.current = window.setTimeout(() => setStatus("success"), 1200);
  };

  const renderContent = () => {
    if (status === "error") {
      return (
        <StatusBox role="alert">
          <strong>식재료 도감을 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.</p>
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

          {renderContent()}
        </MainColumn>

        <GroceryBag items={groceries} onRemove={handleRemoveGrocery} />
      </Layout>

      <ScreenReaderOnly role="status">{announcement}</ScreenReaderOnly>

      <IngredientAddModal
        open={isAddOpen}
        defaultCategory={category === "all" ? "vegetable" : category}
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
