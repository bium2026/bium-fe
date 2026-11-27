/*
 * 다른 사람을 내 냉장고에 부르는 초대 코드 영역이다.
 * 냉장고 주인만 코드를 만들 수 있고, 새 코드를 만들면 이전 코드는 더 이상 쓸 수 없다.
 * 화면을 연 채로 만료 시각이 지나면 코드를 숨기고 새로 만들게 안내한다.
 * 코드 대신 초대 링크(/join/코드)를 복사해 보내면 받은 사람이 열어서 바로 참여할 수 있다.
 */
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Copy, Link2, RefreshCw } from "lucide-react";
import type { InviteCode } from "../../api/fridgeShare";
import { formatExpiresAt, formatInviteCode, getShareErrorMessage, isExpired } from "./shareFormat";
import { Feedback, OutlineButton, Panel, PanelHeader, PrimaryButton, ScreenReaderText } from "./shareStyles";
import { playSound } from "../../sound/soundEffects";

const COPIED_FEEDBACK_MS = 2000;

type InvitePanelProps = {
  invite: InviteCode | null;
  // 멤버를 내보내 지금 코드가 꺼졌을 때 true
  isRevoked: boolean;
  canInvite: boolean;
  onCreate: () => Promise<void>;
};

type CopyTarget = "code" | "link";
type CopyState = { status: "idle" } | { status: "copied" | "failed"; target: CopyTarget };

function getInviteLink(code: string) {
  return `${window.location.origin}/join/${code}`;
}

function InvitePanel({ invite, isRevoked, canInvite, onCreate }: InvitePanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyState, setCopyState] = useState<CopyState>({ status: "idle" });
  const copyTimerRef = useRef<number | undefined>(undefined);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  // 복사가 끝나기 전에 새 코드로 바뀌었는지 확인하려고 지금 코드를 따로 들고 있는다.
  const currentCodeRef = useRef(invite?.code);
  // 만료 시각이 지났는지 다시 보려고, 만료 시각에 맞춰 바꾸는 지금 시각이다.
  const [now, setNow] = useState(() => Date.now());
  const expiresAt = invite?.expiresAt;
  const activeInvite = invite && !isExpired(invite.expiresAt, now) ? invite : null;
  const isInviteExpired = invite !== null && activeInvite === null;

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  useEffect(() => {
    if (!expiresAt || isInviteExpired) return;
    const timer = window.setTimeout(() => setNow(Date.now()), new Date(expiresAt).getTime() - Date.now());
    return () => window.clearTimeout(timer);
  }, [expiresAt, isInviteExpired]);

  useEffect(() => {
    currentCodeRef.current = invite?.code;
  }, [invite]);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setErrorMessage("");
    setCopyState({ status: "idle" });
    const isFirstCode = !activeInvite;
    try {
      await onCreate();
      playSound("success");
      // 첫 코드(만료 뒤 새 코드 포함)를 만들면 만들기 버튼이 사라지므로, 바로 쓸 복사 버튼으로 포커스를 옮긴다.
      if (isFirstCode) requestAnimationFrame(() => copyButtonRef.current?.focus());
    } catch (error) {
      playSound("error");
      setErrorMessage(getShareErrorMessage(error, "초대 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (target: CopyTarget) => {
    if (!activeInvite || isCreating) return;
    const { code } = activeInvite;
    window.clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText(target === "code" ? code : getInviteLink(code));
      if (currentCodeRef.current !== code) return;
      playSound("success");
      setCopyState({ status: "copied", target });
      copyTimerRef.current = window.setTimeout(() => setCopyState({ status: "idle" }), COPIED_FEEDBACK_MS);
    } catch {
      // 브라우저가 클립보드 권한을 막으면 코드나 링크를 직접 골라 복사할 수 있게 안내한다.
      if (currentCodeRef.current !== code) return;
      playSound("error");
      setCopyState({ status: "failed", target });
    }
  };

  const isCopied = (target: CopyTarget) => copyState.status === "copied" && copyState.target === target;

  if (!canInvite) {
    return (
      <Panel aria-labelledby="share-invite-title">
        <PanelHeader>
          <h2 id="share-invite-title">초대 코드</h2>
          <p>초대 코드는 냉장고 주인만 만들 수 있어요. 다른 사람을 부르려면 주인에게 코드를 받아 전해 주세요.</p>
        </PanelHeader>
      </Panel>
    );
  }

  return (
    <Panel aria-labelledby="share-invite-title" aria-busy={isCreating}>
      <PanelHeader>
        <h2 id="share-invite-title">초대 코드</h2>
        <p>
          링크를 받은 사람은 열어서 바로 참여할 수 있어요. 코드를 받은 사람은 헤더의 냉장고 메뉴에서 '초대 코드로 참여'를
          눌러 코드를 입력하면 이 냉장고를 함께 관리할 수 있어요.
        </p>
      </PanelHeader>

      {activeInvite ? (
        <>
          <CodeBox>
            <Code aria-hidden="true">{formatInviteCode(activeInvite.code)}</Code>
            {/* 화면 읽기 프로그램이 코드를 한 글자씩 읽도록 띄어 쓴 값을 따로 둔다. */}
            <ScreenReaderText>초대 코드 {activeInvite.code.split("").join(" ")}</ScreenReaderText>
            <Expires>{formatExpiresAt(activeInvite.expiresAt)}</Expires>
          </CodeBox>
          <Actions>
            <PrimaryButton
              ref={copyButtonRef}
              type="button"
              onClick={() => handleCopy("code")}
              aria-disabled={isCreating || undefined}
            >
              <Copy size={16} aria-hidden="true" />
              {isCopied("code") ? "복사했어요" : "코드 복사"}
            </PrimaryButton>
            <OutlineButton type="button" onClick={() => handleCopy("link")} aria-disabled={isCreating || undefined}>
              <Link2 size={16} aria-hidden="true" />
              {isCopied("link") ? "복사했어요" : "링크 복사"}
            </OutlineButton>
            <OutlineButton type="button" onClick={handleCreate} aria-disabled={isCreating || undefined}>
              <RefreshCw size={16} aria-hidden="true" />
              {isCreating ? "만드는 중..." : "새 코드 만들기"}
            </OutlineButton>
          </Actions>
          <Note>새 코드를 만들면 지금 코드는 바로 쓸 수 없게 돼요.</Note>
        </>
      ) : (
        <>
          {isRevoked && (
            <Feedback role="status">멤버를 내보내서 이전 초대 코드는 더 이상 쓸 수 없어요. 새 코드를 만들어 주세요.</Feedback>
          )}
          {isInviteExpired && (
            <Feedback role="status">초대 코드가 만료돼서 더 이상 쓸 수 없어요. 새 코드를 만들어 주세요.</Feedback>
          )}
          <Actions>
            <PrimaryButton type="button" onClick={handleCreate} aria-disabled={isCreating || undefined}>
              {isCreating ? "만드는 중..." : "초대 코드 만들기"}
            </PrimaryButton>
          </Actions>
        </>
      )}

      <div aria-live="polite">
        {copyState.status === "failed" && copyState.target === "code" && (
          <Feedback $error>코드를 복사하지 못했어요. 코드를 직접 선택해 복사해 주세요.</Feedback>
        )}
        {copyState.status === "failed" && copyState.target === "link" && activeInvite && (
          <Feedback $error>
            링크를 복사하지 못했어요. 아래 주소를 직접 선택해 복사해 주세요.
            <LinkText>{getInviteLink(activeInvite.code)}</LinkText>
          </Feedback>
        )}
        {copyState.status === "copied" && (
          <ScreenReaderText>{copyState.target === "code" ? "초대 코드를" : "초대 링크를"} 복사했어요.</ScreenReaderText>
        )}
      </div>
      {errorMessage && (
        <Feedback $error role="alert">
          {errorMessage}
        </Feedback>
      )}
    </Panel>
  );
}

export default InvitePanel;

const LinkText = styled.span`
  display: block;
  margin-top: 4px;
  font-weight: 540;
  overflow-wrap: anywhere;
  user-select: all;
`;

const CodeBox = styled.div`
  border-radius: 12px;
  background: var(--block-lime);
  padding: 18px 20px;
  display: grid;
  gap: 4px;
`;

const Code = styled.strong`
  font-variant-numeric: tabular-nums;
  font-size: clamp(26px, 4vw, 32px);
  font-weight: 700;
  letter-spacing: 2px;
  user-select: all;
`;

const Expires = styled.span`
  font-size: 14px;
  font-weight: 480;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Note = styled.p`
  font-size: 13px;
  font-weight: 330;
`;
