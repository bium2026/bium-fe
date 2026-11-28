/*
 * 헤더 오른쪽 끝의 계정 버튼이다. 로그인한 사람 닉네임의 첫 글자를 보여 주고,
 * 누르면 닉네임·이메일과 함께 계정 설정 화면으로 가는 링크, 로그아웃 버튼을 보여 준다.
 * 헤더 메뉴를 가운데에 두려고 오른쪽 칸 폭을 정해 두어서, 닉네임 전체는 버튼이 아니라 펼친 목록에 보여 준다.
 */
import { useEffect, useId, useRef, useState } from "react";
import styled from "@emotion/styled";
import { LogOut, RotateCw, Settings, UserRound } from "lucide-react";
import { Link } from "react-router";
import { logout } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useProfileStore } from "../../store/profileStore";

function AccountMenu() {
  const menuId = useId();
  const me = useProfileStore((state) => state.me);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 목록 밖을 누르면 닫는다.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const profile = me.status === "success" ? me.profile : null;
  // 이모지처럼 두 글자(UTF-16)로 된 글자도 반으로 자르지 않게 글자 단위로 나눈다.
  const initial = profile ? Array.from(profile.nickname)[0] : null;

  // 서버에 닿지 못해도 이 기기에서는 바로 로그아웃한다. 지우지 못한 리프레시 토큰은 14일 뒤 만료된다.
  const handleLogout = () => {
    const { refreshToken } = useAuthStore.getState();
    clearAuth();
    if (refreshToken) logout(refreshToken).catch(() => undefined);
  };

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
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
        aria-label={profile ? `${profile.nickname}님의 계정 메뉴` : "계정 메뉴"}
        title={profile?.nickname ?? "계정"}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {initial ? <Initial aria-hidden="true">{initial}</Initial> : <UserRound size={16} aria-hidden="true" />}
      </Trigger>

      {isOpen && (
        <Popover id={menuId}>
          {profile && (
            <Who>
              <Nickname>{profile.nickname}님</Nickname>
              {profile.email && <Email>{profile.email}</Email>}
            </Who>
          )}
          {me.status === "loading" && <Who aria-busy="true">계정 정보를 불러오는 중이에요.</Who>}
          {me.status === "error" && (
            <Who role="alert">
              계정 정보를 불러오지 못했어요.
              <RetryButton type="button" onClick={loadProfile}>
                <RotateCw size={14} aria-hidden="true" />
                다시 시도
              </RetryButton>
            </Who>
          )}
          <ItemLink to="/account" onClick={() => setIsOpen(false)}>
            <Settings size={16} aria-hidden="true" />
            계정 설정
          </ItemLink>
          {/* 토큰을 지우면 RequireAuth가 로그인 화면으로 보내므로 여기서 따로 이동하지 않는다. 냉장고·추천 목록은 각 스토어가 로그인 변화를 보고 비운다. */}
          <Item type="button" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            로그아웃
          </Item>
        </Popover>
      )}
    </Root>
  );
}

export default AccountMenu;

const Root = styled.div`
  position: relative;
  flex-shrink: 0;
`;

// 옆의 효과음·알림 버튼과 같은 크기·테두리로 맞춘다.
const Trigger = styled.button`
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover,
  &[aria-expanded="true"] {
    background: var(--surface-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const Initial = styled.span`
  font-size: 14px;
  font-weight: 540;
  line-height: 1;
`;

const Popover = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: min(240px, calc(100vw - 24px));
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
  padding: 8px;
  display: grid;
  gap: 2px;
`;

const Who = styled.div`
  border-bottom: 1px solid var(--border-soft);
  margin-bottom: 4px;
  padding: 6px 8px 10px;
  display: grid;
  justify-items: start;
  gap: 4px;
  font-size: 13px;
  font-weight: 330;
  line-height: 1.5;
`;

const Nickname = styled.strong`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 540;
`;

const Email = styled.span`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RetryButton = styled.button`
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-weight: 480;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const itemStyle = `
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-size: 15px;
  font-weight: 480;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background: var(--surface-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: -2px;
  }
`;

const Item = styled.button`
  ${itemStyle}
`;

const ItemLink = styled(Link)`
  ${itemStyle}
`;
