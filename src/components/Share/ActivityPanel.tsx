/*
 * 냉장고를 함께 쓰는 사람들이 재료를 어떻게 바꿨는지 최근 순으로 보여 주는 활동 기록이다.
 * 요리로 줄이거나 되돌린 기록은 재료마다 한 줄씩 오는데, 되돌리기는 요리 단위라서 같은 요리는 한 줄로 묶는다.
 * 재료를 줄인 줄의 되돌리기 버튼으로 그 요리에서 뺀 재료를 모두 냉장고로 되돌린다.
 */
import { useState } from "react";
import styled from "@emotion/styled";
import { ArrowRightLeft, LogIn, LogOut, CircleMinus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Activity, ActivityAction } from "../../api/fridgeShare";
import { formatActivityTime, getShareErrorMessage } from "./shareFormat";
import { OutlineButton, Panel, PanelHeader } from "./shareStyles";

type ActivityPanelProps = {
  activities: Activity[];
  onUndoCooking: (cookingLogId: number) => Promise<void>;
};

// 활동 기록 한 줄. 요리 기록은 같은 요리의 재료 이름을 itemNames에 모은다.
type ActivityRow = Activity & { itemNames: string[] };

const MAX_SHOWN_ITEM_NAMES = 3;

const actionMeta: Record<ActivityAction, { icon: LucideIcon; verb: string; tone: string }> = {
  ADD: { icon: Plus, verb: "추가했어요", tone: "var(--block-mint)" },
  UPDATE: { icon: Pencil, verb: "수정했어요", tone: "var(--block-cream)" },
  MOVE: { icon: ArrowRightLeft, verb: "옮겼어요", tone: "var(--block-lilac)" },
  DELETE: { icon: Trash2, verb: "삭제했어요", tone: "var(--block-pink)" },
  DEDUCT: { icon: CircleMinus, verb: "요리에 써서 줄였어요", tone: "var(--block-coral)" },
  RESTORE: { icon: RotateCcw, verb: "요리 전으로 되돌렸어요", tone: "var(--block-cream)" },
  JOIN: { icon: LogIn, verb: "냉장고에 참여했어요", tone: "var(--block-lime)" },
  LEAVE: { icon: LogOut, verb: "냉장고에서 나갔어요", tone: "var(--surface-soft)" },
};

// 같은 요리의 같은 동작을 맨 처음(가장 최근) 줄에 모은다. 서버는 재료를 넣은 반대 순서로 주므로 이름 순서를 되돌린다.
function groupActivities(activities: Activity[]) {
  const rows: ActivityRow[] = [];
  const cookingRows = new Map<string, ActivityRow>();
  for (const activity of activities) {
    const itemNames = activity.itemName ? [activity.itemName] : [];
    if (activity.cookingLogId === null) {
      rows.push({ ...activity, itemNames });
      continue;
    }
    const key = `${activity.cookingLogId}-${activity.action}`;
    const row = cookingRows.get(key);
    if (row) {
      row.itemNames.unshift(...itemNames);
    } else {
      const newRow = { ...activity, itemNames };
      cookingRows.set(key, newRow);
      rows.push(newRow);
    }
  }
  return rows;
}

function getItemNamesText(itemNames: string[]) {
  const shown = itemNames.slice(0, MAX_SHOWN_ITEM_NAMES).join(", ");
  const hiddenCount = itemNames.length - MAX_SHOWN_ITEM_NAMES;
  return hiddenCount > 0 ? `${shown} 외 ${hiddenCount}개` : shown;
}

function getActivityText({ nickname, action, itemNames }: ActivityRow) {
  const { verb } = actionMeta[action];
  return itemNames.length > 0
    ? `${nickname} 님이 ${getItemNamesText(itemNames)}을(를) ${verb}`
    : `${nickname} 님이 ${verb}`;
}

function ActivityPanel({ activities, onUndoCooking }: ActivityPanelProps) {
  // 되돌리는 중인 요리와, 되돌리지 못한 요리의 오류를 요리마다 따로 둔다.
  const [undoingIds, setUndoingIds] = useState<number[]>([]);
  const [undoErrors, setUndoErrors] = useState<Record<number, string>>({});

  const handleUndo = async (cookingLogId: number) => {
    if (undoingIds.includes(cookingLogId)) return;
    setUndoingIds((prev) => [...prev, cookingLogId]);
    setUndoErrors((prev) => ({ ...prev, [cookingLogId]: "" }));
    try {
      await onUndoCooking(cookingLogId);
    } catch (error) {
      setUndoErrors((prev) => ({
        ...prev,
        [cookingLogId]: getShareErrorMessage(error, "되돌리지 못했어요. 잠시 후 다시 시도해 주세요."),
      }));
    } finally {
      setUndoingIds((prev) => prev.filter((id) => id !== cookingLogId));
    }
  };

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
          {groupActivities(activities).map((row) => {
            const { icon: Icon, tone } = actionMeta[row.action];
            const { cookingLogId } = row;
            const canUndo = row.action === "DEDUCT" && cookingLogId !== null;
            const isUndoing = cookingLogId !== null && undoingIds.includes(cookingLogId);
            const undoError = cookingLogId !== null ? undoErrors[cookingLogId] : undefined;
            return (
              <li key={row.id}>
                <IconMark aria-hidden="true" $tone={tone}>
                  <Icon size={16} />
                </IconMark>
                <Text>{getActivityText(row)}</Text>
                <Side>
                  {canUndo &&
                    (row.undone ? (
                      <UndoneLabel>되돌림</UndoneLabel>
                    ) : (
                      <OutlineButton
                        type="button"
                        aria-disabled={isUndoing}
                        aria-label={`${getItemNamesText(row.itemNames)} 요리 되돌리기`}
                        onClick={() => handleUndo(cookingLogId)}
                      >
                        {isUndoing ? "되돌리는 중" : "되돌리기"}
                      </OutlineButton>
                    ))}
                  <Time dateTime={row.createdAt}>{formatActivityTime(row.createdAt)}</Time>
                </Side>
                {undoError && <UndoError role="alert">{undoError}</UndoError>}
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

const Side = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px 12px;
`;

const UndoneLabel = styled.span`
  font-size: 13px;
  font-weight: 480;
  white-space: nowrap;
`;

const UndoError = styled.p`
  grid-column: 2 / -1;
  font-size: 13px;
  font-weight: 540;
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
