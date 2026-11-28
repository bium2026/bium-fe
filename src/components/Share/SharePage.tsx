/*
 * 냉장고 공유 화면이다.
 * 지금 보고 있는 냉장고에 초대 코드로 다른 사람을 부르고, 멤버와 활동 기록을 본다.
 * 받은 코드로 다른 냉장고에 참여하는 것은 헤더의 냉장고 목록에서 한다.
 * 냉장고 이름과 내 역할은 헤더에서 고른 냉장고를 따르고, 초대 코드·멤버·활동 기록은 그 냉장고 기준으로 서버에서 불러온다.
 * 주인은 이름 옆 연필 버튼으로 냉장고 이름을 바꾼다. 서버에 반영된 뒤 헤더 목록의 이름도 함께 바뀐다.
 */
import { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router";
import { ApiError } from "../../api/client";
import { undoCooking } from "../../api/cooking";
import { renameFridge } from "../../api/fridge";
import type { Fridge, MemberRole } from "../../api/fridge";
import {
  createInvite,
  getActiveInvite,
  getActivities,
  getFridgeMembers,
  leaveFridge,
  removeFridgeMember,
  transferFridgeOwner,
} from "../../api/fridgeShare";
import type { Activity, ActivityPage, FridgeMember, InviteCode } from "../../api/fridgeShare";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";
import ActivityPanel from "./ActivityPanel";
import FridgeNameModal from "./FridgeNameModal";
import InvitePanel from "./InvitePanel";
import MemberPanel from "./MemberPanel";
import { getShareErrorMessage } from "./shareFormat";
import { Feedback, OutlineButton, ScreenReaderText } from "./shareStyles";

type ShareData = {
  // 주인이 아니거나 지금 쓸 수 있는 코드가 없으면 null
  invite: InviteCode | null;
  members: FridgeMember[];
  activities: Activity[];
  // 더 오래된 활동 기록을 받을 cursor. 다 받았으면 null
  activityCursor: number | null;
};

type ShareState =
  | { status: "loading" }
  | { status: "error"; code: string; message: string }
  | { status: "success"; data: ShareData };

// 초대 코드는 주인만 볼 수 있어서 멤버일 때는 부르지 않는다.
async function getShareData(fridgeId: number, myRole: MemberRole): Promise<ShareData> {
  const [invite, members, activityPage] = await Promise.all([
    myRole === "OWNER" ? getActiveInvite(fridgeId) : null,
    getFridgeMembers(fridgeId),
    getActivities(fridgeId),
  ]);
  return { invite, members, activities: activityPage.activities, activityCursor: activityPage.nextCursor };
}

// 다시 받은 첫 페이지로 앞쪽 기록을 바꾸고, 더 보기로 받아 둔 기록은 첫 페이지 마지막 기록 다음부터 그대로 둔다.
// 그 기록을 지금 목록에서 찾지 못하면(그사이 기록이 한 페이지보다 많이 쌓임) 사이가 비지 않게 첫 페이지만 남긴다.
function mergeFirstActivityPage(prev: ShareData, page: ActivityPage): ShareData {
  const last = page.activities.at(-1);
  const index = last ? prev.activities.findIndex((activity) => activity.id === last.id) : -1;
  if (page.nextCursor === null || index === -1) {
    return { ...prev, activities: page.activities, activityCursor: page.nextCursor };
  }
  return {
    ...prev,
    activities: [...page.activities, ...prev.activities.slice(index + 1)],
    activityCursor: prev.activityCursor,
  };
}

function SharePage() {
  const list = useFridgeStore((state) => state.list);
  const selectedFridgeId = useFridgeStore((state) => state.selectedFridgeId);
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const updateFridge = useFridgeStore((state) => state.updateFridge);
  const currentFridge = list.status === "success" ? pickFridge(list.fridges, selectedFridgeId) : null;
  const isOwner = currentFridge?.role === "OWNER";
  // 주인을 넘기면 공유 정보를 새로 그리므로, 넘겼다는 안내는 새로 그려도 남도록 여기에 둔다.
  const [transferNotice, setTransferNotice] = useState<{ fridgeId: number; nickname: string } | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  // 실패하면 모달이 오류를 보여 주도록 그대로 던진다.
  const handleRename = async (name: string) => {
    if (!currentFridge) return;
    try {
      updateFridge(await renameFridge(currentFridge.id, name));
    } catch (error) {
      // 다른 기기에서 주인을 넘겼거나 내보내졌으면 받아 둔 역할이 서버와 달라, 목록을 다시 받아 지금 역할을 보여 준다.
      if (error instanceof ApiError && (error.code === "FRIDGE_OWNER_ONLY" || error.code === "FRIDGE_NOT_FOUND")) {
        loadFridges();
      }
      throw error;
    }
  };

  return (
    <Wrapper>
      <Hero>
        <h1>냉장고 공유</h1>
        {currentFridge && (
          <FridgeLine>
            <strong>{currentFridge.name}</strong>
            <RoleBadge $owner={isOwner}>{isOwner ? "주인" : "멤버"}</RoleBadge>
            {isOwner && (
              <RenameButton
                type="button"
                aria-label="냉장고 이름 바꾸기"
                title="이름 바꾸기"
                onClick={() => setIsRenameOpen(true)}
              >
                <Pencil size={16} aria-hidden="true" />
              </RenameButton>
            )}
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
          <p>냉장고 화면에서 새 냉장고를 만들거나, 헤더 오른쪽 냉장고 버튼에서 받은 초대 코드로 참여할 수 있어요.</p>
        </StatusBox>
      )}

      {transferNotice && currentFridge?.id === transferNotice.fridgeId && !isOwner && (
        <Feedback role="status">
          {transferNotice.nickname} 님에게 주인을 넘겼어요. 이제 멤버로 함께 쓰고, 원하면 냉장고에서 나갈 수도 있어요.
        </Feedback>
      )}

      {/* 보고 있는 냉장고나 내 역할이 바뀌면 공유 정보를 처음부터 다시 불러온다. */}
      {currentFridge && (
        <ShareContent
          key={`${currentFridge.id}-${currentFridge.role}`}
          fridge={currentFridge}
          onTransferred={(nickname) => setTransferNotice({ fridgeId: currentFridge.id, nickname })}
        />
      )}

      <FridgeNameModal
        open={isRenameOpen && currentFridge !== null}
        title="냉장고 이름 바꾸기"
        initialName={currentFridge?.name ?? ""}
        submitLabel="저장"
        busyLabel="저장하는 중..."
        fallbackError="이름을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요."
        onClose={() => setIsRenameOpen(false)}
        onSubmit={handleRename}
      />
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
  onTransferred: (nickname: string) => void;
};

function ShareContent({ fridge, onTransferred }: ShareContentProps) {
  const { id: fridgeId, role: myRole } = fridge;
  const navigate = useNavigate();
  const selectFridge = useFridgeStore((state) => state.selectFridge);
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const removeFridge = useFridgeStore((state) => state.removeFridge);
  const updateFridge = useFridgeStore((state) => state.updateFridge);
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

  // 내보내기·되돌리기를 이어서 하면 활동 기록 요청이 겹친다.
  // 먼저 보낸 요청이 늦게 와서 새 기록을 덮지 않게 마지막 요청의 응답만 반영하고, 못 받으면 지금 기록을 그대로 둔다.
  const activitiesRequestRef = useRef(0);
  const refreshActivities = () => {
    const requestId = ++activitiesRequestRef.current;
    getActivities(fridgeId).then(
      (page) => {
        if (requestId === activitiesRequestRef.current) updateData((prev) => mergeFirstActivityPage(prev, page));
      },
      () => undefined,
    );
  };

  // 실패하면 활동 기록이 오류를 보여 주도록 그대로 던진다.
  const handleLoadMoreActivities = async () => {
    if (share.status !== "success" || share.data.activityCursor === null) return;
    const cursor = share.data.activityCursor;
    const page = await getActivities(fridgeId, cursor);
    updateData((prev) => {
      // 기다리는 사이 기록을 다시 받아 이어 붙일 자리가 바뀌었으면 받은 페이지를 버린다. 버튼은 바뀐 자리부터 다시 받는다.
      if (prev.activityCursor !== cursor) return prev;
      return { ...prev, activities: [...prev.activities, ...page.activities], activityCursor: page.nextCursor };
    });
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
      // 코드가 있었을 때만 안내를 켠다. 이어서 또 내보내면 코드가 이미 없어 안내가 꺼지면 안 된다.
      if (share.status === "success" && share.data.invite !== null) setIsInviteRevoked(true);
      updateData((prev) => ({ ...prev, invite: null }));
    } catch (error) {
      // 다른 기기에서 먼저 내보냈거나 스스로 나가 이미 멤버가 아니면, 내보내려던 결과와 같으므로 목록에서 빼고 넘어간다.
      // 이때는 서버가 초대 코드를 껐는지 알 수 없어 코드는 그대로 둔다.
      if (!(error instanceof ApiError && error.code === "FRIDGE_MEMBER_NOT_FOUND")) throw error;
    }
    updateData((prev) => ({ ...prev, members: prev.members.filter((item) => item.userId !== member.userId) }));
    // 내보내면 서버가 내보낸 기록을 남기므로 활동 기록을 다시 받는다.
    refreshActivities();
  };

  // 넘기면 내 역할이 멤버로 바뀌어 이 화면이 공유 정보를 처음부터 다시 불러온다(멤버 목록·넘긴 기록 포함).
  const handleTransfer = async (member: FridgeMember) => {
    await transferFridgeOwner(fridgeId, member.userId);
    onTransferred(member.nickname);
    // 고른 냉장고가 없으면 헤더는 내가 주인인 냉장고를 보여 주므로, 주인이 아니게 돼도 지금 냉장고를 계속 보게 고른다.
    if (useFridgeStore.getState().selectedFridgeId === null) selectFridge(fridgeId);
    updateFridge({ ...fridge, role: "MEMBER" });
  };

  // 실패하면 활동 기록이 오류를 보여 주도록 그대로 던진다.
  const handleUndoCooking = async (cookingLogId: number) => {
    try {
      await undoCooking(cookingLogId);
    } catch (error) {
      // 다른 멤버가 먼저 되돌렸으면 되돌리려던 결과와 같으므로 그대로 넘어간다.
      if (!(error instanceof ApiError && error.code === "ALREADY_UNDONE")) throw error;
    }
    updateData((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) =>
        activity.cookingLogId === cookingLogId ? { ...activity, undone: true } : activity,
      ),
    }));
    // 되돌리면 서버가 재료마다 되돌림 기록을 남기므로 다시 받는다.
    refreshActivities();
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
    // 기다리는 사이 헤더에서 다른 냉장고를 골랐으면 그 선택은 그대로 둔다.
    if (useFridgeStore.getState().selectedFridgeId === fridgeId) selectFridge(null);
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
          onTransfer={handleTransfer}
          onLeave={handleLeave}
        />
      </Grid>
      <ActivityPanel
        activities={share.data.activities}
        hasMore={share.data.activityCursor !== null}
        onLoadMore={handleLoadMoreActivities}
        onUndoCooking={handleUndoCooking}
      />
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

// 이름은 50자까지라 좁은 화면에서 넘치지 않게 줄을 바꾼다.
const FridgeLine = styled.div`
  min-height: 40px;
  max-width: 100%;
  border-radius: 999px;
  background: var(--surface);
  padding: 6px 8px 6px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  strong {
    min-width: 0;
    font-size: 16px;
    font-weight: 540;
    overflow-wrap: anywhere;
  }
`;

const RenameButton = styled.button`
  flex: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--block-mint);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const RoleBadge = styled.span<{ $owner: boolean }>`
  flex: none;
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
