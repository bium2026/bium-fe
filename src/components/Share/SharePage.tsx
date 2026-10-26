/*
 * 냉장고 공유 화면이다.
 * 초대 코드로 다른 사람을 부르거나 받은 코드로 참여하고, 멤버와 활동 기록을 본다.
 * 지금은 퍼블리싱 단계라 목데이터와 가짜 요청을 쓰고, 공유 API가 나오면 서버 요청으로 바꾼다.
 */
import { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { useNavigate, useSearchParams } from "react-router";
import ActivityPanel from "./ActivityPanel";
import InvitePanel from "./InvitePanel";
import JoinPanel from "./JoinPanel";
import MemberPanel from "./MemberPanel";
import { createInviteMock, getShareMock, joinFridgeMock, mockRequest } from "./shareMockData";
import { OutlineButton, ScreenReaderText } from "./shareStyles";
import type { FridgeMember, ShareData } from "./shareTypes";

type ShareStatus = "loading" | "success" | "error";

const MOCK_LOADING_MS = 1200;

// 퍼블리싱 확인용: ?preview=loading|error|member|empty|fail 로 각 상태 화면을 볼 수 있다. API 연동 시 지운다.
function getPreviewStatus(value: string | null): ShareStatus {
  if (value === "loading" || value === "error") return value;
  return "success";
}

function SharePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview");
  const shouldFail = preview === "fail";
  const [status, setStatus] = useState<ShareStatus>(() => getPreviewStatus(preview));
  const [data, setData] = useState<ShareData>(() => getShareMock(preview));
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const isOwner = data.fridge.myRole === "OWNER";

  const handleRetry = () => {
    setStatus("loading");
    // TODO: 공유 API가 정해지면 서버 요청으로 바꾼다. 지금은 로딩 화면을 보여 주기 위한 지연이다.
    timerRef.current = window.setTimeout(() => setStatus("success"), MOCK_LOADING_MS);
  };

  // 아래 요청들은 실패하면 각 영역이 오류를 보여 주도록 그대로 던진다.
  const handleCreateInvite = async () => {
    const invite = await mockRequest(createInviteMock, shouldFail);
    setData((prev) => ({ ...prev, invite }));
  };

  const handleJoin = (code: string) =>
    mockRequest(() => joinFridgeMock(code, data.invite?.code ?? null), shouldFail);

  const handleRemove = async (member: FridgeMember) => {
    await mockRequest(() => undefined, shouldFail);
    setData((prev) => ({ ...prev, members: prev.members.filter((item) => item.userId !== member.userId) }));
  };

  // 나가면 이 냉장고를 더 볼 수 없으므로 내 냉장고 화면으로 보낸다.
  const handleLeave = async () => {
    await mockRequest(() => undefined, shouldFail);
    navigate("/fridge", { replace: true });
  };

  return (
    <Wrapper>
      <Hero>
        <h1>냉장고 공유</h1>
        {status === "success" && (
          <FridgeLine>
            <strong>{data.fridge.name}</strong>
            <RoleBadge $owner={isOwner}>{isOwner ? "주인" : "멤버"}</RoleBadge>
          </FridgeLine>
        )}
        <p>가족이나 룸메이트와 냉장고를 함께 관리하고, 누가 무엇을 바꿨는지 확인해요.</p>
      </Hero>

      {status === "error" && (
        <StatusBox role="alert">
          <strong>공유 정보를 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.</p>
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        </StatusBox>
      )}

      {status === "loading" && (
        <Grid aria-busy="true">
          <ScreenReaderText role="status">공유 정보를 불러오는 중이에요.</ScreenReaderText>
          <Skeleton aria-hidden="true" />
          <Skeleton aria-hidden="true" />
          <Skeleton aria-hidden="true" $wide />
        </Grid>
      )}

      {status === "success" && (
        <>
          <Grid>
            <Column>
              <InvitePanel invite={data.invite} canInvite={isOwner} onCreate={handleCreateInvite} />
              <JoinPanel onJoin={handleJoin} />
            </Column>
            <MemberPanel
              members={data.members}
              myRole={data.fridge.myRole}
              onRemove={handleRemove}
              onLeave={handleLeave}
            />
          </Grid>
          <ActivityPanel activities={data.activities} />
        </>
      )}
    </Wrapper>
  );
}

export default SharePage;

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

const Wrapper = styled.section`
  display: grid;
  gap: 24px;
`;

const Hero = styled.header`
  border-radius: 16px;
  background: var(--block-mint);
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

const FridgeLine = styled.div`
  min-height: 40px;
  border-radius: 999px;
  background: var(--surface);
  padding: 6px 8px 6px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  strong {
    font-size: 16px;
    font-weight: 540;
  }
`;

const RoleBadge = styled.span<{ $owner: boolean }>`
  border-radius: 999px;
  background: ${(props) => (props.$owner ? "var(--text)" : "var(--surface-soft)")};
  color: ${(props) => (props.$owner ? "var(--surface)" : "var(--text)")};
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 540;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`;

const Column = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 900px) {
    gap: 16px;
  }
`;

const StatusBox = styled.div`
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

const Skeleton = styled.div<{ $wide?: boolean }>`
  grid-column: ${(props) => (props.$wide ? "1 / -1" : "auto")};
  height: ${(props) => (props.$wide ? "200px" : "260px")};
  border-radius: 16px;
  background: linear-gradient(90deg, var(--surface-soft) 25%, var(--border-soft) 50%, var(--surface-soft) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
