/*
 * 로그인·회원가입 화면이다.
 * 왼쪽 라임 블록에 서비스 소개를, 오른쪽 카드에 로그인/회원가입 전환과 폼을 보여 준다.
 * 전환할 때 토글 표시와 폼이 옆으로 미끄러지고, 카드 높이도 부드럽게 바뀐다.
 */
import { useLayoutEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import AuthIntro from "./AuthIntro";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

type AuthMode = "login" | "signup";

const modes: { id: AuthMode; label: string }[] = [
  { id: "login", label: "로그인" },
  { id: "signup", label: "회원가입" },
];

const slideEasing = "cubic-bezier(0.22, 1, 0.36, 1)";

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const viewportRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const signupRef = useRef<HTMLDivElement>(null);

  const activeIndex = modes.findIndex((item) => item.id === mode);

  // height: auto는 transition이 안 되므로, 보이는 폼의 실제 높이를 재서 직접 넣는다.
  // 오류 메시지가 생겨 폼 높이가 바뀔 때도 따라가도록 ResizeObserver로 지켜본다.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const panel = (mode === "login" ? loginRef : signupRef).current;
    if (!viewport || !panel) return;

    const syncHeight = () => {
      viewport.style.height = `${panel.getBoundingClientRect().height}px`;
    };
    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [mode]);

  return (
    <Page>
      <Panel>
        <AuthIntro />

        <Card>
          <ModeToggle>
            <ModeIndicator aria-hidden="true" $index={activeIndex} />
            {modes.map((item) => (
              <ModeButton
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                $active={mode === item.id}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </ModeButton>
            ))}
          </ModeToggle>

          <Viewport ref={viewportRef}>
            <Track $index={activeIndex}>
              {/* 화면 밖으로 밀려난 폼은 inert로 탭 이동과 스크린 리더에서 제외한다. */}
              <Slide ref={loginRef} inert={mode !== "login"} $active={mode === "login"}>
                <LoginForm />
              </Slide>
              <Slide ref={signupRef} inert={mode !== "signup"} $active={mode === "signup"}>
                <SignupForm />
              </Slide>
            </Track>
          </Viewport>
        </Card>
      </Panel>
    </Page>
  );
}

export default AuthPage;

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 32px;
  background: var(--bg-ivory);

  @media (max-width: 760px) {
    place-items: start center;
    padding: 16px 12px 32px;
  }
`;

const Panel = styled.div`
  width: min(1040px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 440px);
  align-items: center;
  gap: 24px;

  @media (max-width: 960px) {
    width: min(520px, 100%);
    grid-template-columns: 1fr;
  }

  @media (max-width: 760px) {
    gap: 16px;
  }
`;

const Card = styled.section`
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  padding: 32px;
  display: grid;
  align-content: start;
  gap: 24px;

  @media (max-width: 760px) {
    padding: 24px 20px;
  }
`;

const ModeToggle = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 50px;
  background: var(--surface-soft);
`;

const ModeIndicator = styled.span<{ $index: number }>`
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 12px) / 2);
  border-radius: 50px;
  background: var(--text);
  transform: translateX(${(props) => (props.$index === 0 ? "0" : "calc(100% + 4px)")});
  transition: transform 0.45s ${slideEasing};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ModeButton = styled.button<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  min-height: 44px;
  border: 0;
  border-radius: 50px;
  background: transparent;
  color: ${(props) => (props.$active ? "var(--surface)" : "var(--text)")};
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;
  transition: color 0.3s ease;
`;

// 입력 칸 포커스 테두리(2px + 간격 2px)가 overflow에 잘리지 않도록 바깥으로 6px 여유를 둔다.
const Viewport = styled.div`
  margin: -6px;
  overflow: hidden;
  transition: height 0.45s ${slideEasing};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Track = styled.div<{ $index: number }>`
  display: grid;
  grid-template-columns: 100% 100%;
  align-items: start;
  transform: translateX(${(props) => props.$index * -100}%);
  transition: transform 0.45s ${slideEasing};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Slide = styled.div<{ $active: boolean }>`
  padding: 6px;
  opacity: ${(props) => (props.$active ? 1 : 0)};
  transition: opacity 0.3s ease;
`;
