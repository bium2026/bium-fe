/*
 * 없는 주소로 들어오면, 헤더는 그대로 두고 본문 자리에 보여 준다.
 * 로그인하지 않았다면 RequireAuth가 먼저 로그인 화면으로 보내므로 이 화면은 로그인한 사용자만 본다.
 */
import styled from "@emotion/styled";
import { Link } from "react-router";

function NotFound() {
  return (
    <StatusBox>
      <h1>주소를 찾을 수 없어요.</h1>
      <p>주소가 잘못됐거나 없어진 화면이에요. 내 냉장고에서 다시 시작해 보세요.</p>
      <HomeLink to="/fridge">내 냉장고로 가기</HomeLink>
    </StatusBox>
  );
}

export default NotFound;

// RouteError와 같은 모양이다.
const StatusBox = styled.div`
  width: min(1240px, 100%);
  min-height: 220px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;

  h1 {
    font-size: 24px;
    font-weight: 700;
  }

  p {
    max-width: 540px;
    font-size: 15px;
    line-height: 1.55;
  }
`;

const HomeLink = styled(Link)`
  margin-top: 6px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  color: var(--text);
  font-size: 15px;
  font-weight: 480;
  text-decoration: none;
`;
