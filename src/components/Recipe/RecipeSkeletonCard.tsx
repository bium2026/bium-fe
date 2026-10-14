/*
 * 레시피를 불러오는 동안 카드 자리에 보여 주는 스켈레톤이다.
 * 실제 카드와 같은 크기로 그려서 로딩이 끝나도 레이아웃이 흔들리지 않게 한다.
 */
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";

function RecipeSkeletonCard() {
  return (
    <Wrapper aria-hidden="true">
      <CoverBar />
      <TextBar $width="68%" />
      <TextBar $width="44%" />
      <TextBar $width="78%" />
    </Wrapper>
  );
}

export default RecipeSkeletonCard;

const shimmer = keyframes`
  0% { background-position: -220px 0; }
  100% { background-position: 220px 0; }
`;

const Wrapper = styled.div`
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  overflow: hidden;
  padding-bottom: 20px;
  display: grid;
  gap: 10px;
`;

const shimmerBar = `
  background: linear-gradient(
    90deg,
    var(--border-soft) 25%,
    var(--surface-soft) 50%,
    var(--border-soft) 75%
  );
  background-size: 220px 100%;
`;

const CoverBar = styled.div`
  height: 205px;
  margin-bottom: 10px;
  ${shimmerBar}
  animation: ${shimmer} 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const TextBar = styled.div<{ $width: string }>`
  width: ${(props) => props.$width};
  height: 14px;
  margin: 0 20px;
  border-radius: 10px;
  ${shimmerBar}
  animation: ${shimmer} 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
