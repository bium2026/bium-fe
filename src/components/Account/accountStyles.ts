/*
 * 계정 화면의 카드·입력칸·버튼이 함께 쓰는 스타일이다. 유통기한 알림 설정 화면과 같은 모양으로 맞춘다.
 */
import styled from "@emotion/styled";

export const Card = styled.form`
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  padding: 28px;
  display: grid;
  /* 입력칸처럼 기본 폭이 있는 요소가 좁은 화면에서 카드 밖으로 밀어내지 않게 한다. */
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;

  @media (max-width: 760px) {
    padding: 20px;
  }
`;

export const CardHeader = styled.div`
  display: grid;
  gap: 6px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 540;
  }

  p {
    font-size: 14px;
    font-weight: 330;
    line-height: 1.5;
  }
`;

export const Field = styled.div`
  display: grid;
  gap: 6px;

  label {
    font-size: 15px;
    font-weight: 540;
  }

  input {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 10px 14px;
    font-size: 16px;
  }

  input[aria-invalid="true"] {
    border-color: var(--text);
    box-shadow: inset 0 0 0 1px var(--text);
  }

  input:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 1px;
  }
`;

export const Hint = styled.p<{ $error?: boolean }>`
  font-size: 13px;
  font-weight: ${(props) => (props.$error ? 540 : 330)};
`;

export const Feedback = styled.p<{ $error: boolean }>`
  border-radius: 8px;
  background: ${(props) => (props.$error ? "var(--block-pink)" : "var(--block-mint)")};
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 480;
  line-height: 1.5;
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
`;

const buttonBase = `
  min-height: 44px;
  border-radius: 50px;
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

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
