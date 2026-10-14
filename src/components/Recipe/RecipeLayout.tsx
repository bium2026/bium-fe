/*
 * 레시피 목록과 상세 화면이 함께 쓰는 페이지 틀이다.
 * 가운데 정렬된 콘텐츠 폭과 위아래 여백을 정한다.
 */
import styled from "@emotion/styled";
import { Outlet } from "react-router";

function RecipeLayout() {
  return (
    <Content>
      <Outlet />
    </Content>
  );
}

export default RecipeLayout;

const Content = styled.main`
  width: min(1280px, calc(100% - 64px));
  margin: 0 auto;
  padding: 48px 0 72px;

  @media (max-width: 900px) {
    width: calc(100% - 24px);
    padding: 28px 0 48px;
  }
`;
