/*
 * 아직 만들지 않은 화면 자리에 보여 주는 안내다.
 * 헤더 메뉴가 빈 주소로 가지 않게 두고, 해당 화면을 만들면 routes.tsx에서 실제 화면으로 바꾼다.
 */
import styled from "@emotion/styled";

type PreparingPageProps = {
  title: string;
};

function PreparingPage({ title }: PreparingPageProps) {
  return (
    <Wrapper>
      <h1>{title}</h1>
      <p>준비 중인 화면이에요.</p>
    </Wrapper>
  );
}

export default PreparingPage;

const Wrapper = styled.section`
  border-radius: 24px;
  background: var(--block-cream);
  padding: 48px 32px;
  display: grid;
  gap: 8px;
  text-align: center;

  h1 {
    font-size: 28px;
    font-weight: 480;
    letter-spacing: -0.26px;
  }

  p {
    font-size: 16px;
    font-weight: 330;
  }
`;
