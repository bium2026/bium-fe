/*
 * 냉장고를 함께 쓰는 멤버 목록이다.
 * 주인은 다른 멤버를 내보내거나 주인을 넘길 수 있고, 멤버는 스스로 나갈 수 있다. 모두 한 번 더 확인한 뒤 진행한다.
 * 주인을 넘기면 나는 멤버가 되어 나가기를 할 수 있다.
 */
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styled from "@emotion/styled";
import type { MemberRole } from "../../api/fridge";
import type { FridgeMember } from "../../api/fridgeShare";
import { formatJoinedDate, getShareErrorMessage } from "./shareFormat";
import { Feedback, OutlineButton, Panel, PanelHeader, PrimaryButton } from "./shareStyles";
import { playSound } from "../../sound/soundEffects";

type MemberPanelProps = {
  members: FridgeMember[];
  myRole: MemberRole;
  onRemove: (member: FridgeMember) => Promise<void>;
  onTransfer: (member: FridgeMember) => Promise<void>;
  onLeave: () => Promise<void>;
};

type MemberAction = "remove" | "transfer" | "leave";

const actionLabel: Record<MemberAction, string> = {
  remove: "내보내기",
  transfer: "주인 넘기기",
  leave: "나가기",
};

const failureMessage: Record<MemberAction, string> = {
  remove: "멤버를 내보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  transfer: "주인을 넘기지 못했어요. 잠시 후 다시 시도해 주세요.",
  leave: "냉장고에서 나가지 못했어요. 잠시 후 다시 시도해 주세요.",
};

function getConfirmText(action: MemberAction, nickname: string) {
  if (action === "leave") return "이 냉장고에서 나갈까요? 다시 들어오려면 초대 코드를 받아야 해요.";
  if (action === "transfer") {
    return `${nickname} 님에게 주인을 넘길까요? 나는 멤버가 되고, 초대 코드·내보내기·피드 공개는 ${nickname} 님만 할 수 있어요.`;
  }
  return `${nickname} 님을 냉장고에서 내보낼까요? 지금 초대 코드도 함께 못 쓰게 돼요.`;
}

const roleLabel: Record<MemberRole, string> = {
  OWNER: "주인",
  MEMBER: "멤버",
};

// 주인은 다른 멤버를 내보내거나 주인을 넘길 수 있다. 주인이 나가면 냉장고를 관리할 사람이 없어지므로 멤버만 나갈 수 있다.
function getActions(member: FridgeMember, myRole: MemberRole): MemberAction[] {
  if (myRole === "OWNER") return member.isMe ? [] : ["transfer", "remove"];
  return member.isMe ? ["leave"] : [];
}

function MemberPanel({ members, myRole, onRemove, onTransfer, onLeave }: MemberPanelProps) {
  // 확인을 띄운 멤버와 동작. 모든 동작이 그 멤버 줄 아래에 확인을 보여 준다.
  const [confirming, setConfirming] = useState<{ userId: number; action: MemberAction } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleConfirm = async (member: FridgeMember, action: MemberAction) => {
    if (isBusy) return;
    setIsBusy(true);
    setErrorMessage("");
    try {
      if (action === "leave") await onLeave();
      else if (action === "transfer") {
        // 넘기면 내 역할이 바뀌어 공유 화면을 새로 그리므로 이 패널의 상태는 더 바꾸지 않는다.
        await onTransfer(member);
        playSound("success");
        return;
      } else {
        await onRemove(member);
        // 내보낸 멤버 줄이 사라져 포커스가 갈 곳을 잃으므로 목록 제목으로 옮긴다.
        requestAnimationFrame(() => titleRef.current?.focus());
      }
      playSound("delete");
      setConfirming(null);
    } catch (error) {
      playSound("error");
      setErrorMessage(getShareErrorMessage(error, failureMessage[action]));
    } finally {
      setIsBusy(false);
    }
  };

  const cancelConfirm = () => {
    if (isBusy || confirming === null) return;
    const trigger = triggerRefs.current.get(`${confirming.userId}-${confirming.action}`);
    setConfirming(null);
    setErrorMessage("");
    // 확인 영역이 사라지면 포커스가 갈 곳을 잃으므로 처음 누른 버튼으로 돌려놓는다.
    requestAnimationFrame(() => trigger?.focus());
  };

  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") cancelConfirm();
  };

  return (
    <Panel aria-labelledby="share-member-title">
      <PanelHeader>
        <h2 id="share-member-title" ref={titleRef} tabIndex={-1}>
          멤버 <Count>{members.length}</Count>
        </h2>
        {members.length === 1 && <p>아직 함께 쓰는 사람이 없어요. 초대 코드를 보내 멤버를 불러 보세요.</p>}
      </PanelHeader>

      <List>
        {members.map((member) => {
          const actions = getActions(member, myRole);
          const confirmingAction = confirming?.userId === member.userId ? confirming.action : null;
          return (
            <li key={member.userId}>
              <Row>
                <Avatar aria-hidden="true" $owner={member.role === "OWNER"}>
                  {member.nickname.slice(0, 1)}
                </Avatar>
                <Info>
                  <Name>
                    <span>{member.nickname}</span>
                    {member.isMe && <MeTag>나</MeTag>}
                  </Name>
                  <Meta>
                    <RoleBadge $owner={member.role === "OWNER"}>{roleLabel[member.role]}</RoleBadge>
                    {formatJoinedDate(member.joinedAt)}
                  </Meta>
                </Info>
                {actions.length > 0 && (
                  <Actions>
                    {actions.map((action) => (
                      <OutlineButton
                        key={action}
                        ref={(node) => {
                          const key = `${member.userId}-${action}`;
                          if (node) triggerRefs.current.set(key, node);
                          else triggerRefs.current.delete(key);
                        }}
                        type="button"
                        onClick={() => {
                          setConfirming({ userId: member.userId, action });
                          setErrorMessage("");
                        }}
                        // 확인을 띄운 동안에는 다른 버튼을 눌러 확인 대상이 바뀌지 않게 막는다.
                        disabled={confirming !== null}
                      >
                        {actionLabel[action]}
                      </OutlineButton>
                    ))}
                  </Actions>
                )}
              </Row>

              {confirmingAction && (
                <Confirm
                  role="group"
                  aria-label={
                    confirmingAction === "leave"
                      ? "냉장고 나가기 확인"
                      : `${member.nickname} 님 ${actionLabel[confirmingAction]} 확인`
                  }
                  onKeyDown={handleConfirmKeyDown}
                >
                  <p>{getConfirmText(confirmingAction, member.nickname)}</p>
                  <ConfirmButtons>
                    {/* 실수로 내보내지 않도록 취소에 먼저 포커스를 둔다. */}
                    <OutlineButton type="button" onClick={cancelConfirm} aria-disabled={isBusy || undefined} autoFocus>
                      취소
                    </OutlineButton>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleConfirm(member, confirmingAction)}
                      aria-disabled={isBusy || undefined}
                    >
                      {isBusy ? "처리하는 중..." : actionLabel[confirmingAction]}
                    </PrimaryButton>
                  </ConfirmButtons>
                  {errorMessage && (
                    <Feedback $error role="alert">
                      {errorMessage}
                    </Feedback>
                  )}
                </Confirm>
              )}
            </li>
          );
        })}
      </List>
    </Panel>
  );
}

export default MemberPanel;

const Count = styled.span`
  font-size: 16px;
  font-weight: 480;
`;

const List = styled.ul`
  list-style: none;
  display: grid;

  li + li {
    border-top: 1px solid var(--border-soft);
  }
`;

const Row = styled.div`
  min-height: 64px;
  padding: 10px 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 40px minmax(0, 1fr);
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 760px) {
    grid-column: 2 / -1;
    justify-content: flex-start;
  }
`;

const Avatar = styled.span<{ $owner: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: ${(props) => (props.$owner ? "var(--block-lilac)" : "var(--block-cream)")};
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
`;

const Info = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`;

const Name = styled.strong`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 540;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const MeTag = styled.em`
  flex-shrink: 0;
  font-style: normal;
  border-radius: 999px;
  background: var(--surface-soft);
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 480;
`;

const Meta = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 13px;
  font-weight: 330;
`;

const RoleBadge = styled.span<{ $owner: boolean }>`
  border-radius: 999px;
  background: ${(props) => (props.$owner ? "var(--text)" : "var(--surface-soft)")};
  color: ${(props) => (props.$owner ? "var(--surface)" : "var(--text)")};
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 540;
  white-space: nowrap;
`;

const Confirm = styled.div`
  margin-bottom: 12px;
  border-radius: 8px;
  background: var(--block-pink);
  padding: 14px;
  display: grid;
  gap: 12px;

  p {
    font-size: 15px;
    font-weight: 480;
    line-height: 1.5;
  }
`;

const ConfirmButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
