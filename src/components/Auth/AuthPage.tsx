/*
 * 로그인·회원가입 화면이다.
 * 왼쪽 라임 블록에 서비스 소개를, 오른쪽 카드에 로그인/회원가입 전환과 폼을 보여 준다.
 */
import { useState } from "react";
import styled from "@emotion/styled";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

type AuthMode = "login" | "signup";

const modes: { id: AuthMode; label: string }[] = [
  { id: "login", label: "로그인" },
  { id: "signup", label: "회원가입" },
];

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <Page>
      <Panel>
        <Intro>
          <Brand>
            <LogoMark aria-hidden="true">B</LogoMark>
            <h1>Bium</h1>
          </Brand>
          <IntroText>
            <Headline>
              냉장고 속 재료로
              <br />
              오늘의 한 끼를 정해요
            </Headline>
            <Description>가진 재료를 정리하고, 지금 만들 수 있는 레시피를 추천받아 보세요.</Description>
          </IntroText>
        </Intro>

        <Card>
          <ModeToggle>
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

          {mode === "login" ? <LoginForm /> : <SignupForm />}
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
  background: var(--bg);

  @media (max-width: 760px) {
    place-items: start center;
    padding: 16px 12px 32px;
  }
`;

const Panel = styled.div`
  width: min(960px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 440px);
  gap: 24px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const Intro = styled.section`
  border-radius: 24px;
  background: var(--block-lime);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 32px;

  @media (max-width: 760px) {
    padding: 24px 20px;
    gap: 20px;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.26px;
  }
`;

const LogoMark = styled.span`
  width: 23px;
  height: 23px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`;

const IntroText = styled.div`
  display: grid;
  gap: 14px;
`;

const Headline = styled.p`
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.16;
  font-weight: 480;
  letter-spacing: -0.26px;
  color: var(--text);
`;

const Description = styled.p`
  font-size: 16px;
  font-weight: 330;
  line-height: 1.45;
  color: var(--text);
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 50px;
  background: var(--surface-soft);
`;

const ModeButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 0;
  border-radius: 50px;
  background: ${(props) => (props.$active ? "var(--text)" : "transparent")};
  color: ${(props) => (props.$active ? "var(--surface)" : "var(--text)")};
  font-size: 16px;
  font-weight: 480;
  cursor: pointer;
`;
