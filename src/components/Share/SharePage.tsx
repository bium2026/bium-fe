/*
 * 냉장고 공유 화면이다.
 * 지금 보고 있는 냉장고에 초대 코드로 다른 사람을 부르고, 멤버와 활동 기록을 본다.
 * 받은 코드로 다른 냉장고에 참여하는 것은 헤더의 냉장고 목록에서 한다.
 * 냉장고 이름과 내 역할은 헤더에서 고른 냉장고를 따르고, 초대 코드·멤버·활동 기록은 그 냉장고 기준으로 서버에서 불러온다.
 */
import { useEffect, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { useNavigate } from "react-router";
import { ApiError } from "../../api/client";
import type { Fridge, MemberRole } from "../../api/fridge";
import {
  createInvite,
  getActiveInvite,
  getActivities,
  getFridgeMembers,
  leaveFridge,
  removeFridgeMember,
} from "../../api/fridgeShare";
import type { Activity, FridgeMember, InviteCode } from "../../api/fridgeShare";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import ActivityPanel from "./ActivityPanel";
import InvitePanel from "./InvitePanel";
import MemberPanel from "./MemberPanel";
import { getShareErrorMessage } from "./shareFormat";
import { OutlineButton, ScreenReaderText } from "./shareStyles";

type ShareData = {
  // 주인이 아니거나 지금 쓸 수 있는 코드가 없으면 null
  invite: InviteCode | null;
  members: FridgeMember[];
  activities: Activity[];
};

type ShareState =
  | { status: "loading" }
  | { status: "error"; code: string; message: string }
  | { status: "success"; data: ShareData };

// 초대 코드는 주인만 볼 수 있어서 멤버일 때는 부르지 않는다.
async function getShareData(fridgeId: number, myRole: MemberRole): Promise<ShareData> {
  const [invite, members, activities] = await Promise.all([
    myRole === "OWNER" ? getActiveInvite(fridgeId) : null,
    getFridgeMembers(fridgeId),
    getActivities(fridgeId),
  ]);
  return { invite, members, activities };
}

function SharePage() {
  const list = useFridgeStore((state) => state.list);
  const selectedFridgeId = useFridgeStore((state) => state.selectedFridgeId);
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const currentFridge = list.status === "success" ? pickFridge(list.fridges, selectedFridgeId) : null;
  const isOwner = currentFridge?.role === "OWNER";

  return (
    <Wrapper>
      <Hero>
        <h1>냉장고 공유</h1>
        {currentFridge && (
          <FridgeLine>
            <strong>{currentFridge.name}</strong>
            <RoleBadge $owner={isOwner}>{isOwner ? "주인" : "멤버"}</RoleBadge>
          </FridgeLine>
        )}
        <p>가족이나 룸메이트와 냉장고를 함께 관리하고, 누가 무엇을 바꿨는지 확인해요.</p>
      </Hero>

      {list.status === "error" && (
        <StatusBox role="alert">
          <strong>공유 정보를 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.</p>
          {/* 냉장고 목록부터 다시 불러온다. 목록을 받으면 이 화면이 그 냉장고의 공유 정보를 불러온다. */}
          <OutlineButton type="button" onClick={() => loadFridges()}>
            다시 시도
          </OutlineButton>
        </StatusBox>
      )}

      {(list.status === "idle" || list.status === "loading") && <ShareSkeleton />}

      {list.status === "success" && !currentFridge && (
        <StatusBox>
          <strong>아직 속한 냉장고가 없어요.</strong>
          <p>헤더 오른쪽 냉장고 버튼에서 받은 초대 코드로 참여할 수 있어요.</p>
        </StatusBox>
      )}

      {/* 보고 있는 냉장고나 내 역할이 바뀌면 공유 정보를 처음부터 다시 불러온다. */}
      {currentFridge && <ShareContent key={`${currentFridge.id}-${currentFridge.role}`} fridge={currentFridge} />}
    </Wrapper>
  );
}

export default SharePage;

function ShareSkeleton() {
  return (
    <Grid aria-busy="true">
      <ScreenReaderText role="status">공유 정보를 불러오는 중이에요.</ScreenReaderText>
      <Skeleton aria-hidden="true" />
      <Skeleton aria-hidden="true" />
      <Skeleton aria-hidden="true" $wide />
    </Grid>
  );
}

type ShareContentProps = {
  fridge: Fridge;
};

function ShareContent({ fridge }: ShareContentProps) {
  const { id: fridgeId, role: myRole } = fridge;
  const navigate = useNavigate();
  const selectFridge = useFridgeStore((state) => state.selectFridge);
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const removeFridge = useFridgeStore((state) => state.removeFridge);
  const [share, setShare] = useState<ShareState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  // 멤버를 내보내면 서버가 지금 초대 코드도 함께 끈다. 코드가 사라진 이유를 초대 코드 칸에 알려 준다.
  const [isInviteRevoked, setIsInviteRevoked] = useState(false);

  useEffect(() => {
    let ignore = false;
    getShareData(fridgeId, myRole).then(
      (data) => {
        if (!ignore) setShare({ status: "success", data });
      },
      (error: unknown) => {
        if (ignore) return;
        setShare({
          status: "error",
          code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
          message: getShareErrorMessage(error, "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요."),
        });
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeId, myRole, loadAttempt]);

  // 아래 요청들은 공유 정보를 받은 뒤에만 보내므로, 성공 상태일 때만 값을 바꾼다.
  const updateData = (update: (prev: ShareData) => ShareData) => {
    setShare((prev) => (prev.status === "success" ? { status: "success", data: update(prev.data) } : prev));
  };

  const handleRetry = () => {
    setShare({ status: "loading" });
    setLoadAttempt((prev) => prev + 1);
  };

  // 아래 요청들은 서버에 반영된 뒤에 화면을 바꾼다. 실패하면 화면은 그대로 두고, 각 영역이 오류를 보여 주도록 그대로 던진다.
  const handleCreateInvite = async () => {
    const invite = await createInvite(fridgeId);
    updateData((prev) => ({ ...prev, invite }));
    setIsInviteRevoked(false);
  };

  const handleRemove = async (member: FridgeMember) => {
    try {
      await removeFridgeMember(fridgeId, member.userId);
      // 내보낸 사람이 같은 코드로 다시 들어오지 못하게 서버가 지금 초대 코드도 함께 껐다.
      setIsInviteRevoked(share.status === "success" && share.data.invite !== null);
      updateData((prev) => ({ ...prev, invite: null }));
    } catch (error) {
      // 다른 기기에서 먼저 내보냈거나 스스로 나가 이미 멤버가 아니면, 내보내려던 결과와 같으므로 목록에서 빼고 넘어간다.
      // 이때는 서버가 초대 코드를 껐는지 알 수 없어 코드는 그대로 둔다.
      if (!(error instanceof ApiError && error.code === "FRIDGE_MEMBER_NOT_FOUND")) throw error;
    }
    updateData((prev) => ({ ...prev, members: prev.members.filter((item) => item.userId !== member.userId) }));
    // 내보내면 서버가 그 사람의 나가기 기록을 남기므로 활동 기록을 다시 받는다. 못 받으면 지금 기록을 그대로 둔다.
    getActivities(fridgeId).then(
      (activities) => updateData((prev) => ({ ...prev, activities })),
      () => undefined,
    );
  };

  // 나가면 이 냉장고를 더 볼 수 없으므로 내가 주인인 냉장고로 돌아가 냉장고 화면을 보여 준다.
  const handleLeave = async () => {
    try {
      await leaveFridge(fridgeId);
    } catch (error) {
      // 다른 기기에서 먼저 나갔거나 주인이 내보내 이미 멤버가 아니면, 나가려던 결과와 같으므로 그대로 넘어간다.
      if (!(error instanceof ApiError && error.code === "FRIDGE_NOT_FOUND")) throw error;
    }
    // 화면을 먼저 옮긴다. 목록을 먼저 바꾸면 이 화면이 내 냉장고로 다시 그려져 공유 정보를 괜히 불러온다.
    // 이동은 기본으로 startTransition에 담겨 목록 변경보다 늦게 그려지므로 바로 그리게 한다.
    navigate("/fridge", { replace: true, flushSync: true });
    // 나간 냉장고를 헤더 목록에서 바로 빼고, 서버 기준 목록도 다시 불러온다.
    removeFridge(fridgeId);
    loadFridges();
    selectFridge(null);
  };

  if (share.status === "loading") return <ShareSkeleton />;

  if (share.status === "error") {
    return (
      <StatusBox role="alert">
        <strong>공유 정보를 불러오지 못했어요.</strong>
        <p>{share.message}</p>
        {share.code === "FRIDGE_NOT_FOUND" ? (
          // 화면을 연 뒤 주인이 나를 내보냈으면 같은 냉장고로는 계속 실패해서, 냉장고 목록을 다시 받아 내가 속한 냉장고로 옮긴다.
          <OutlineButton type="button" onClick={() => loadFridges()}>
            냉장고 목록 다시 불러오기
          </OutlineButton>
        ) : (
          <OutlineButton type="button" onClick={handleRetry}>
            다시 시도
          </OutlineButton>
        )}
      </StatusBox>
    );
  }

  return (
    <>
      <Grid>
        <InvitePanel
          invite={share.data.invite}
          isRevoked={isInviteRevoked}
          canInvite={myRole === "OWNER"}
          onCreate={handleCreateInvite}
        />
        <MemberPanel
          members={share.data.members}
          myRole={myRole}
          onRemove={handleRemove}
          onLeave={handleLeave}
        />
      </Grid>
      <ActivityPanel activities={share.data.activities} />
    </>
  );
}

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
