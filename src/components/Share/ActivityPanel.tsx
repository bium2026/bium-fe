/*
 * 냉장고를 함께 쓰는 사람들이 재료를 어떻게 바꿨는지 최근 순으로 보여 주는 활동 기록이다.
 */
import styled from "@emotion/styled";
import { ArrowRightLeft, LogIn, LogOut, CircleMinus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatActivityTime } from "./shareFormat";
import { Panel, PanelHeader } from "./shareStyles";
import type { Activity, ActivityAction } from "./shareTypes";

type ActivityPanelProps = {
  activities: Activity[];
};

const actionMeta: Record<ActivityAction, { icon: LucideIcon; verb: string; tone: string }> = {
  ADD: { icon: Plus, verb: "추가했어요", tone: "var(--block-mint)" },
  UPDATE: { icon: Pencil, verb: "수정했어요", tone: "var(--block-cream)" },
  MOVE: { icon: ArrowRightLeft, verb: "옮겼어요", tone: "var(--block-lilac)" },
  DELETE: { icon: Trash2, verb: "삭제했어요", tone: "var(--block-pink)" },
  DEDUCT: { icon: CircleMinus, verb: "요리에 써서 줄였어요", tone: "var(--block-coral)" },
  RESTORE: { icon: RotateCcw, verb: "되돌렸어요", tone: "var(--block-cream)" },
  JOIN: { icon: LogIn, verb: "냉장고에 참여했어요", tone: "var(--block-lime)" },
  LEAVE: { icon: LogOut, verb: "냉장고에서 나갔어요", tone: "var(--surface-soft)" },
};

function getActivityText({ nickname, action, itemName }: Activity) {
  const { verb } = actionMeta[action];
  return itemName ? `${nickname} 님이 ${itemName}을(를) ${verb}` : `${nickname} 님이 ${verb}`;
}

function ActivityPanel({ activities }: ActivityPanelProps) {
  return (
    <Panel aria-labelledby="share-activity-title">
      <PanelHeader>
        <h2 id="share-activity-title">활동 기록</h2>
        <p>누가 어떤 재료를 넣고, 고치고, 꺼냈는지 볼 수 있어요.</p>
      </PanelHeader>

      {activities.length === 0 ? (
        <Empty>아직 기록이 없어요. 재료를 넣거나 고치면 여기에 남아요.</Empty>
      ) : (
        <List>
          {activities.map((activity) => {
            const { icon: Icon, tone } = actionMeta[activity.action];
            return (
              <li key={activity.id}>
                <IconMark aria-hidden="true" $tone={tone}>
                  <Icon size={16} />
                </IconMark>
                <Text>{getActivityText(activity)}</Text>
                <Time dateTime={activity.createdAt}>{formatActivityTime(activity.createdAt)}</Time>
              </li>
            );
          })}
        </List>
      )}
    </Panel>
  );
}

export default ActivityPanel;

const List = styled.ol`
  list-style: none;
  display: grid;

  li {
    min-height: 52px;
    padding: 8px 0;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }

  li + li {
    border-top: 1px solid var(--border-soft);
  }
`;

const IconMark = styled.span<{ $tone: string }>`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: ${(props) => props.$tone};
  display: grid;
  place-items: center;
`;

const Text = styled.p`
  font-size: 15px;
  font-weight: 480;
  line-height: 1.4;
`;

const Time = styled.time`
  font-size: 13px;
  font-weight: 330;
  white-space: nowrap;
`;

const Empty = styled.p`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 20px;
  font-size: 15px;
  line-height: 1.5;
`;
