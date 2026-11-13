/*
 * 냉장고 피드 화면들이 함께 쓰는 머리 영역, 상태 상자, 버튼 스타일이다.
 */
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import type { Freshness } from "./feedFormat";

export const Wrapper = styled.section`
  display: grid;
  gap: 24px;
`;

export const Hero = styled.header`
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
  }

  @media (max-width: 760px) {
    border-radius: 0;
    margin-inline: -12px;
    padding: 22px 20px;
  }
`;

export const StatusBox = styled.div`
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

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

export const Skeleton = styled.div<{ $height?: number }>`
  height: ${(props) => props.$height ?? 260}px;
  border-radius: 16px;
  background: linear-gradient(90deg, var(--surface-soft) 25%, var(--border-soft) 50%, var(--surface-soft) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const OutlineButton = styled.button`
  min-height: 42px;
  border: 1px solid var(--text);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  /* 요청 중에는 aria-disabled로 막아 눌렀던 버튼에서 포커스가 빠지지 않게 한다. */
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const MineBadge = styled.span`
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 540;
  white-space: nowrap;
`;

// 재료 하나를 아이콘과 이름으로 보여 주는 칩
export const ItemChip = styled.li`
  min-height: 32px;
  border-radius: 999px;
  background: var(--surface);
  padding: 5px 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 480;
  max-width: 100%;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const freshnessBackground: Record<Freshness, string> = {
  expired: "var(--text)",
  urgent: "var(--block-coral)",
  soon: "var(--block-cream)",
  safe: "var(--block-mint)",
};

export const ScreenReaderText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;
