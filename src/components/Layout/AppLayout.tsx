/*
 * 헤더가 있는 화면(냉장고, 식재료 도감, AI 레시피)이 함께 쓰는 페이지 틀이다.
 * 상단 헤더 아래에 가운데 정렬된 콘텐츠 폭과 위아래 여백을 정한다.
 */
import styled from "@emotion/styled";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";

function AppLayout() {
  return (
    <Shell>
      <AppHeader />
      <Content>
        <Outlet />
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
