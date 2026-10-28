/*
 * 헤더가 있는 화면(냉장고, 식재료 도감, AI 레시피, 냉장고 공유)이 함께 쓰는 페이지 틀이다.
 * 상단 헤더 아래에 가운데 정렬된 콘텐츠 폭과 위아래 여백을 정한다.
 */
import styled from "@emotion/styled";
import { Outlet } from "react-router";
import { useFridgeStore } from "../../store/fridgeStore";
import AppHeader from "./AppHeader";

function AppLayout() {
  const selectedFridgeId = useFridgeStore((state) => state.selectedFridgeId);

  return (
    <Shell>
      <AppHeader />
      <Content>
        {/* 헤더에서 냉장고를 바꾸면 화면을 새로 그려, 각 화면이 바뀐 냉장고의 데이터를 다시 불러오게 한다. */}
        <Outlet key={selectedFridgeId ?? "default"} />
      </Content>
    </Shell>
  );
}

export default AppLayout;

const Shell = styled.div`
  min-height: 100vh;
  background: var(--bg);
`;

const Content = styled.main`
  width: min(1280px, calc(100% - 64px));
  margin: 0 auto;
  padding: 48px 0 72px;

  @media (max-width: 900px) {
    width: calc(100% - 24px);
    padding: 28px 0 48px;
  }
`;
