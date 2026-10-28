/*
 * 냉장고 공유 화면의 패널과 버튼이 함께 쓰는 스타일이다.
 */
import styled from "@emotion/styled";

export const Panel = styled.section`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 24px;
  display: grid;
  /* 입력칸처럼 기본 폭이 있는 요소가 좁은 화면에서 패널 밖으로 밀어내지 않게 한다. */
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 16px;

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

export const PanelHeader = styled.div`
  display: grid;
  gap: 4px;

  h2 {
    font-size: 22px;
    font-weight: 540;
    letter-spacing: -0.26px;
  }

  p {
    font-size: 14px;
    font-weight: 330;
    line-height: 1.5;
  }
`;

const buttonBase = `
  min-height: 42px;
  border-radius: 999px;
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
  &:disabled,
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const PrimaryButton = styled.button`
  ${buttonBase}
  border: 0;
  background: var(--text);
  color: var(--surface);
`;

export const OutlineButton = styled.button`
  ${buttonBase}
  border: 1px solid var(--text);
  background: var(--surface);
  color: var(--text);
`;

export const Feedback = styled.p<{ $error?: boolean }>`
  border-radius: 8px;
  background: ${(props) => (props.$error ? "var(--block-pink)" : "var(--block-mint)")};
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
`;

export const ScreenReaderText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;
