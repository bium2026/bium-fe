/*
 * 계정 설정 화면이다. 로그인한 이메일을 보고 닉네임을 바꾼다.
 * 이메일·닉네임은 헤더의 계정 메뉴와 같은 스토어(profileStore)에서 읽어, 바꾸면 헤더에도 바로 보인다.
 */
import { useEffect } from "react";
import styled from "@emotion/styled";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useProfileStore } from "../../store/profileStore";
import { OutlineButton } from "./accountStyles";
import ProfileForm from "./ProfileForm";

function AccountPage() {
  const me = useProfileStore((state) => state.me);
  const loadProfile = useProfileStore((state) => state.loadProfile);

  // 다른 기기에서 바꿨을 수 있어 화면에 들어올 때 새로 받는다. 받는 동안에는 받아 둔 값을 그대로 보여 준다.
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <Wrapper>
      <BackLink to="/fridge">
        <ArrowLeft size={18} aria-hidden="true" />내 냉장고
      </BackLink>
      <Hero>
        <h1>계정 설정</h1>
        <p>로그인한 계정의 정보를 확인하고 닉네임을 바꿀 수 있어요.</p>
      </Hero>

      {(me.status === "idle" || me.status === "loading") && (
        <Skeleton aria-busy="true" aria-label="계정 정보를 불러오는 중이에요." />
      )}
      {me.status === "error" && (
        <StatusBox role="alert">
          <strong>계정 정보를 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.</p>
          <OutlineButton type="button" onClick={loadProfile}>
            다시 시도
          </OutlineButton>
        </StatusBox>
      )}
      {me.status === "success" && <ProfileForm profile={me.profile} />}
    </Wrapper>
  );
}

export default AccountPage;

const Wrapper = styled.section`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 24px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 50px;
  background: var(--surface);
  color: var(--text);
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const Hero = styled.header`
  border-radius: 24px;
  background: var(--block-lilac);
  padding: 28px;
  display: grid;
  gap: 10px;

  h1 {
    font-size: clamp(28px, 4.4vw, 40px);
    line-height: 1.15;
    font-weight: 540;
    letter-spacing: -0.4px;
  }

  p {
    font-size: 15px;
    font-weight: 330;
    line-height: 1.55;
  }

  @media (max-width: 760px) {
    border-radius: 0;
    margin-inline: -12px;
    padding: 22px 20px;
  }
`;

const Skeleton = styled.div`
  height: 260px;
  border-radius: 24px;
  background: var(--surface-soft);
`;

const StatusBox = styled.div`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  justify-items: start;
  gap: 10px;

  strong {
    font-size: 22px;
    font-weight: 700;
  }
`;
