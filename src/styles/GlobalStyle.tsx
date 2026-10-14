/*
 * 전역 스타일과 색상 토큰을 정의한다.
 * 앱 전체에서 쓰는 배경, 글자, 강조색, 포커스 상태를 여기서 통일한다.
 */
import { Global, css } from "@emotion/react";

const globalStyles = css`
  :root {
    --bg: #ffffff;
    --surface: #ffffff;
    --surface-soft: #f7f7f5;
    --text: #000000;
    --text-muted: #000000;
    --border: #e6e6e6;
    --border-soft: #f1f1f1;
    --accent: #000000;
    --accent-strong: #000000;
    --accent-soft: #dceeb1;
    --block-lime: #dceeb1;
    --block-lilac: #c5b0f4;
    --block-cream: #f4ecd6;
    --block-pink: #efd4d4;
    --block-mint: #c8e6cd;
    --block-coral: #f3c9b6;
    --block-navy: #1f1d3d;
    --accent-magenta: #ff3d8b;
    --success: #1ea64a;
    --shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 18px 38px rgba(0, 0, 0, 0.09);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    margin: 0;
    padding: 0;
    min-height: 100%;
  }

  body {
    font-family: Inter, "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
    font-feature-settings: "kern";
    color: var(--text);
    background: var(--bg);
  }

  h1,
  h2,
  h3,
  h4,
  p,
  ul,
  ol {
    margin: 0;
    padding: 0;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    color: inherit;
  }

  button {
    letter-spacing: -0.1px;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid #000000;
    outline-offset: 2px;
  }
`;

function GlobalStyle() {
  return <Global styles={globalStyles} />;
}

export default GlobalStyle;
