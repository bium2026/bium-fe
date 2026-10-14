/*
 * 로그인·회원가입 화면 왼쪽의 서비스 소개 블록이다.
 * 라임 블록 위에 임박 재료 목록과 AI 추천 레시피를 미리보기로 겹쳐 보여 주고,
 * 아래에 주요 기능을 칩으로 정리한다.
 */
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { BookOpen, Bot, Clock3, Refrigerator } from "lucide-react";

// 서비스 화면을 보여 주기 위한 예시 데이터다. 실제 사용자 데이터와 무관하다.
const previewItems = [
  { id: "spinach", icon: "🥬", name: "시금치", daysLeft: 1 },
  { id: "egg", icon: "🥚", name: "계란", daysLeft: 2 },
  { id: "mushroom", icon: "🍄", name: "버섯", daysLeft: 3 },
];

const features = [
  { id: "fridge", label: "내 냉장고", icon: Refrigerator },
  { id: "library", label: "식재료 도감", icon: BookOpen },
  { id: "recipe", label: "AI 레시피", icon: Bot },
];

function AuthIntro() {
  return (
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

      <Preview aria-hidden="true">
        <UrgentCard>
          <PreviewHeader>
            <strong>임박 재료</strong>
            <span>{previewItems.length}개</span>
          </PreviewHeader>
          <PreviewList>
            {previewItems.map((item) => (
              <li key={item.id}>
                <span>{item.icon}</span>
                {item.name}
                <DayBadge $urgent={item.daysLeft <= 1}>D-{item.daysLeft}</DayBadge>
              </li>
            ))}
          </PreviewList>
        </UrgentCard>

        <RecipeNote>
          <NoteLabel>
            <Bot size={14} />
            AI 추천 레시피
          </NoteLabel>
          <NoteTitle>시금치 계란볶음</NoteTitle>
          <NoteMeta>
            <Clock3 size={13} />
            15분 · 임박 재료 2개 사용
          </NoteMeta>
        </RecipeNote>
      </Preview>

      <FeatureList aria-label="주요 기능">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <FeatureItem key={feature.id}>
              <FeatureIcon>
                <Icon size={14} aria-hidden="true" />
              </FeatureIcon>
              {feature.label}
            </FeatureItem>
          );
        })}
      </FeatureList>
    </Intro>
  );
}

export default AuthIntro;

const float = keyframes`
  from {
    translate: 0 0;
  }
  to {
    translate: 0 -6px;
  }
`;

const Intro = styled.section`
  align-self: stretch;
  border-radius: 24px;
  background: var(--block-lime);
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow: hidden;

  @media (max-width: 960px) {
    padding: 32px;
    gap: 20px;
  }

  @media (max-width: 760px) {
    padding: 24px 20px;
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

// 블록이 오른쪽 카드 높이에 맞춰 늘어나도 두 미리보기 카드가 붙어 있도록 남는 공간의 가운데에 둔다.
const Preview = styled.div`
  position: relative;
  margin-block: auto;
  padding-bottom: 64px;

  @media (max-width: 960px) {
    display: none;
  }
`;

const UrgentCard = styled.div`
  width: min(270px, 78%);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  padding: 18px;
  rotate: -2deg;
  animation: ${float} 3.6s ease-in-out infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;

  strong {
    font-size: 16px;
    font-weight: 700;
  }

  span {
    font-size: 13px;
    font-weight: 480;
  }
`;

const PreviewList = styled.ul`
  list-style: none;

  li {
    min-height: 40px;
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 480;
    color: var(--text);
  }

  li + li {
    border-top: 1px solid var(--border-soft);
  }
`;

const DayBadge = styled.em<{ $urgent: boolean }>`
  border-radius: 50px;
  background: ${(props) => (props.$urgent ? "var(--block-pink)" : "var(--surface-soft)")};
  padding: 2px 8px;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
`;

const RecipeNote = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  width: min(230px, 64%);
  border-radius: 16px;
  background: var(--block-lilac);
  box-shadow: var(--shadow-sm);
  padding: 16px;
  display: grid;
  gap: 6px;
  rotate: 3deg;
  animation: ${float} 3.6s ease-in-out infinite alternate;
  animation-delay: -1.8s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const NoteLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 540;
`;

const NoteTitle = styled.strong`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.26px;
`;

const NoteMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 330;
`;

const FeatureList = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const FeatureItem = styled.li`
  min-height: 36px;
  border-radius: 50px;
  background: var(--surface);
  padding: 6px 14px 6px 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 480;

  @media (max-width: 760px) {
    min-height: 32px;
    padding: 4px 10px 4px 4px;
    gap: 6px;
    font-size: 13px;
  }
`;

const FeatureIcon = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--block-lime);
  display: grid;
  place-items: center;

  @media (max-width: 760px) {
    width: 22px;
    height: 22px;
  }
`;
