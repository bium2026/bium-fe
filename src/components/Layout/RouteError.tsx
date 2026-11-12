/*
 * 화면 코드를 받지 못했거나 화면을 그리다 오류가 나면, 헤더는 그대로 두고 본문 자리에 보여 준다.
 * 화면 코드는 처음 들어갈 때 받으므로, 인터넷이 끊겼거나 새로 배포해 예전 코드 파일이 없어졌을 때 이 화면이 뜬다.
 * 헤더 메뉴로 다른 화면에 가면 이 화면은 사라진다.
 */
import styled from "@emotion/styled";

function RouteError() {
  return (
    <StatusBox role="alert">
      <strong>화면을 불러오지 못했어요.</strong>
      <p>인터넷 연결을 확인하고 새로고침해 주세요. 새 버전이 나온 뒤라면 새로고침하면 열려요.</p>
      <RetryButton type="button" onClick={() => window.location.reload()}>
        새로고침
      </RetryButton>
    </StatusBox>
  );
}

export default RouteError;

// 냉장고 화면의 불러오기 오류 상자와 같은 모양이다.
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
