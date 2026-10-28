/*
 * 헤더에서 지금 보고 있는 냉장고를 보여 주고, 내가 속한 다른 냉장고로 바꾸는 버튼이다.
 * 내가 주인인 냉장고와 초대 코드로 참여한 냉장고가 함께 나오고, 목록 아래에서 초대 코드로 새 냉장고에 참여할 수 있다.
 */
import { useEffect, useId, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Check, ChevronDown, Refrigerator, UserPlus } from "lucide-react";
import { useNavigate } from "react-router";
import type { Fridge } from "../../api/fridge";
import JoinFridgeModal from "../Share/JoinFridgeModal";
import { joinFridgeMock, mockRequest } from "../Share/shareMockData";
import { pickFridge, useFridgeStore } from "../../store/fridgeStore";

function FridgeSwitcher() {
  const menuId = useId();
  const navigate = useNavigate();
  const list = useFridgeStore((state) => state.list);
  const selectedFridgeId = useFridgeStore((state) => state.selectedFridgeId);
  const selectFridge = useFridgeStore((state) => state.selectFridge);
  const loadFridges = useFridgeStore((state) => state.loadFridges);
  const [isOpen, setIsOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadFridges();
  }, [loadFridges]);

  // 목록 밖을 누르면 닫는다.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // 냉장고 목록을 불러오지 못하면 각 화면이 오류를 보여 주므로 헤더에서는 버튼을 숨긴다.
  if (list.status !== "success") return null;
  const current = pickFridge(list.fridges, selectedFridgeId);
  if (!current) return null;

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = (fridge: Fridge) => {
    selectFridge(fridge.id);
    close();
  };

  const openJoin = () => {
    setIsOpen(false);
    setIsJoinOpen(true);
  };

  // TODO: 공유 API 연동 때 POST /api/fridges/join으로 바꾼다. 지금은 퍼블리싱용 가짜 요청이다.
  // 참여하면 목록에 새 냉장고가 생기도록 다시 불러온다. 실패하면 모달이 오류를 보여 주도록 그대로 던진다.
  const handleJoin = async (code: string) => {
    const fridge = await mockRequest(() => joinFridgeMock(code), false);
    loadFridges();
    return fridge;
  };

  const handleOpenFridge = (fridge: Fridge) => {
    setIsJoinOpen(false);
    selectFridge(fridge.id);
    navigate("/fridge");
  };

  return (
    <Root
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) close();
      }}
    >
      <Trigger
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`지금 보는 냉장고 ${current.name}, 다른 냉장고로 바꾸기`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Refrigerator size={16} aria-hidden="true" />
        <TriggerName>{current.name}</TriggerName>
        <ChevronDown size={16} aria-hidden="true" />
      </Trigger>

      {isOpen && (
        <Popover id={menuId}>
          <PopoverTitle>내 냉장고</PopoverTitle>
          <Options>
            {list.fridges.map((fridge) => {
              const isCurrent = fridge.id === current.id;
              return (
                <li key={fridge.id}>
                  <Option type="button" aria-current={isCurrent || undefined} onClick={() => handleSelect(fridge)}>
                    <OptionName>{fridge.name}</OptionName>
                    <RoleBadge $owner={fridge.role === "OWNER"}>{fridge.role === "OWNER" ? "주인" : "멤버"}</RoleBadge>
                    <CheckMark aria-hidden="true">{isCurrent && <Check size={16} />}</CheckMark>
                  </Option>
                </li>
              );
            })}
          </Options>
          {list.fridges.length === 1 && <Hint>초대 코드로 다른 냉장고에 참여하면 여기서 바꿔 볼 수 있어요.</Hint>}
          <JoinButton type="button" onClick={openJoin}>
            <UserPlus size={16} aria-hidden="true" />
            초대 코드로 참여
          </JoinButton>
        </Popover>
      )}

      <JoinFridgeModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        // 모달을 연 목록 버튼은 이미 사라져서, 닫히면 헤더의 냉장고 버튼으로 포커스를 돌려놓는다.
        returnFocusRef={triggerRef}
        onJoin={handleJoin}
        onOpenFridge={handleOpenFridge}
      />
    </Root>
  );
}

export default FridgeSwitcher;

const Root = styled.div`
  position: relative;
  justify-self: end;
  min-width: 0;
  max-width: 100%;
`;

const Trigger = styled.button`
  max-width: 100%;
  min-height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 0 10px 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 480;
  cursor: pointer;

  svg {
    flex-shrink: 0;
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const TriggerName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Popover = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: min(260px, calc(100vw - 24px));
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
  padding: 8px;
  display: grid;
  gap: 4px;
`;

const PopoverTitle = styled.p`
  padding: 6px 8px 2px;
  font-size: 12px;
  font-weight: 540;
`;

const Options = styled.ul`
  list-style: none;
  display: grid;
  gap: 2px;
`;

const Option = styled.button`
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  padding: 0 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 20px;
  align-items: center;
  gap: 8px;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &[aria-current="true"] {
    background: var(--surface-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: -2px;
  }
`;

const OptionName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 480;
`;

const RoleBadge = styled.span<{ $owner: boolean }>`
  border-radius: 999px;
  background: ${(props) => (props.$owner ? "var(--text)" : "var(--block-cream)")};
  color: ${(props) => (props.$owner ? "var(--surface)" : "var(--text)")};
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 540;
`;

const CheckMark = styled.span`
  display: grid;
  place-items: center;
`;

const JoinButton = styled.button`
  min-height: 42px;
  border: 0;
  border-top: 1px solid var(--border-soft);
  border-radius: 0 0 10px 10px;
  background: transparent;
  color: var(--text);
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 540;
  cursor: pointer;

  &:hover {
    background: var(--surface-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: -2px;
  }
`;

const Hint = styled.p`
  border-top: 1px solid var(--border-soft);
  padding: 8px 8px 4px;
  font-size: 13px;
  font-weight: 330;
  line-height: 1.5;
`;
