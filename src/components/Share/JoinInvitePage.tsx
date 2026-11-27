/*
 * 초대 링크(/join/:code)로 들어와 그 냉장고에 참여하는 화면이다.
 * 로그인하지 않았으면 RequireAuth가 로그인 화면으로 보내고, 로그인하면 이 주소로 돌아온다.
 * 링크를 열자마자 참여하지 않고, 참여할지 한 번 물은 뒤 헤더의 '초대 코드로 참여'와 같은 API로 참여한다.
 */
import { useState } from "react";
import styled from "@emotion/styled";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import type { Fridge } from "../../api/fridge";
import { joinFridge } from "../../api/fridgeShare";
import { useAuthStore } from "../../store/authStore";
import { useFridgeStore } from "../../store/fridgeStore";
import { playSound } from "../../sound/soundEffects";
import { formatInviteCode, getInviteCodeError, getShareErrorMessage, normalizeInviteCode } from "./shareFormat";
import { Feedback, OutlineButton, Panel, PanelHeader, PrimaryButton } from "./shareStyles";

type JoinState =
  | { status: "idle" }
  | { status: "joining" }
  | { status: "joined"; fridge: Fridge }
  // 다시 눌러도 결과가 같은 실패(만료·이미 멤버·없는 코드)는 참여 버튼을 거두고 냉장고로 보낸다.
  | { status: "failed"; message: string; canRetry: boolean };

const FINAL_ERROR_CODES = ["INVITE_EXPIRED", "INVITE_NOT_FOUND", "ALREADY_FRIDGE_MEMBER"];

function getJoinFailure(error: unknown): { message: string; canRetry: boolean } {
  // 코드 검사 실패(INVALID_INPUT)와 형식이 틀린 요청 본문(BAD_REQUEST)이 모두 400으로 온다.
  if (error instanceof ApiError && error.status === 400) {
    return { message: "초대 링크의 코드가 올바르지 않아요. 받은 링크를 다시 확인해 주세요.", canRetry: false };
  }
  return {
    message: getShareErrorMessage(error, "냉장고에 참여하지 못했어요. 잠시 후 다시 시도해 주세요."),
    canRetry: !(error instanceof ApiError && FINAL_ERROR_CODES.includes(error.code)),
  };
}

function JoinInvitePage() {
  const navigate = useNavigate();
  const code = normalizeInviteCode(useParams().code ?? "");
  const codeError = getInviteCodeError(code);
  const addFridge = useFridgeStore((state) => state.addFridge);
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const selectFridge = useFridgeStore((state) => state.selectFridge);
  const [state, setState] = useState<JoinState>({ status: "idle" });

  const handleJoin = async () => {
    if (codeError || state.status === "joining") return;
    setState({ status: "joining" });
    const requestToken = useAuthStore.getState().accessToken;
    try {
      const fridge = await joinFridge(code);
      // 기다리는 사이 다른 계정으로 바뀌었으면 이전 계정이 참여한 냉장고를 지금 계정의 목록에 넣지 않는다.
      if (useAuthStore.getState().accessToken !== requestToken) throw new Error("로그인한 계정이 바뀌었어요.");
      addFridge(fridge);
      playSound("success");
      setState({ status: "joined", fridge });
    } catch (error) {
      playSound("error");
      // 다른 기기에서 이미 참여한 냉장고면 헤더 목록에 없을 수 있어 서버 목록을 다시 받는다.
      if (error instanceof ApiError && error.code === "ALREADY_FRIDGE_MEMBER") loadFridges();
      setState({ status: "failed", ...getJoinFailure(error) });
    }
  };

  const openFridge = (fridge: Fridge) => {
    selectFridge(fridge.id);
    navigate("/fridge", { replace: true });
  };

  const goHome = () => navigate("/fridge", { replace: true });

  const isJoining = state.status === "joining";
  const canJoin = !codeError && (state.status === "idle" || isJoining || (state.status === "failed" && state.canRetry));

  return (
    <Wrapper>
      <Panel aria-labelledby="join-invite-title" aria-busy={isJoining}>
        <PanelHeader>
          <h1 id="join-invite-title">초대받은 냉장고에 참여</h1>
          <p>참여하면 그 냉장고의 재료를 함께 넣고, 고치고, 꺼낼 수 있어요.</p>
        </PanelHeader>

        {codeError ? (
          <Feedback $error role="alert">
            초대 링크의 코드가 올바르지 않아요. 받은 링크를 다시 확인하거나 주인에게 새 링크를 받아 주세요.
          </Feedback>
        ) : (
          <CodeBox>
            <span>초대 코드</span>
            <strong>{formatInviteCode(code)}</strong>
          </CodeBox>
        )}

        {state.status === "joined" && (
          <Feedback role="status">‘{state.fridge.name}’에 참여했어요. 이제 헤더에서 이 냉장고로 바꿔 볼 수 있어요.</Feedback>
        )}
        {state.status === "failed" && (
          <Feedback $error role="alert">
            {state.message}
          </Feedback>
        )}

        <Actions>
          {state.status === "joined" ? (
            <PrimaryButton type="button" onClick={() => openFridge(state.fridge)} autoFocus>
              냉장고 보러 가기
            </PrimaryButton>
          ) : (
            <>
              <OutlineButton type="button" onClick={goHome} aria-disabled={isJoining || undefined}>
                {canJoin ? "참여하지 않기" : "내 냉장고로 가기"}
              </OutlineButton>
              {canJoin && (
                <PrimaryButton type="button" onClick={handleJoin} aria-disabled={isJoining || undefined}>
                  {isJoining ? "참여하는 중..." : state.status === "failed" ? "다시 시도" : "참여하기"}
                </PrimaryButton>
              )}
            </>
          )}
        </Actions>
      </Panel>
    </Wrapper>
  );
}

export default JoinInvitePage;

const Wrapper = styled.section`
  width: min(560px, 100%);
  justify-self: center;

  h1 {
    font-size: 22px;
    font-weight: 540;
    letter-spacing: -0.26px;
  }
`;

const CodeBox = styled.div`
  border-radius: 12px;
  background: var(--block-lime);
  padding: 18px 20px;
  display: grid;
  gap: 4px;

  span {
    font-size: 14px;
    font-weight: 480;
  }

  strong {
    font-variant-numeric: tabular-nums;
    font-size: clamp(26px, 4vw, 32px);
    font-weight: 700;
    letter-spacing: 2px;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
