/*
 * 로그인 뒤 화면들이 함께 쓰는 상단 헤더다.
 * 브랜드와 냉장고·식재료 도감·AI 레시피·냉장고 공유 메뉴를 보여 주고, 지금 보고 있는 화면의 메뉴에 밑줄을 긋는다.
 */
import styled from "@emotion/styled";
import { BookOpen, Bot, Refrigerator, Users } from "lucide-react";
import { Link, NavLink } from "react-router";

const menus = [
  { to: "/fridge", label: "내 냉장고", icon: Refrigerator },
  { to: "/library", label: "식재료 도감", icon: BookOpen },
  { to: "/recipes", label: "AI 레시피", icon: Bot },
  { to: "/share", label: "냉장고 공유", icon: Users },
];

function AppHeader() {
  return (
    <Header>
      <Brand to="/fridge" aria-label="Bium 홈, 내 냉장고로 이동">
        <LogoMark aria-hidden="true">B</LogoMark>
        <BrandName>Bium</BrandName>
      </Brand>

      <Menu aria-label="주요 메뉴">
        {menus.map((menu) => {
          const Icon = menu.icon;
          return (
            <MenuLink key={menu.to} to={menu.to}>
              <Icon size={16} aria-hidden="true" />
              {menu.label}
            </MenuLink>
          );
        })}
      </Menu>

      <HeaderSpacer aria-hidden="true" />
    </Header>
  );
}

export default AppHeader;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  padding: 0 max(32px, calc((100vw - 1280px) / 2));
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr) 170px;
  align-items: center;
  gap: 16px;

  /* 메뉴가 네 개라 좁은 화면에서는 양옆 칸을 줄여 가운데 메뉴 자리를 넓힌다. */
  @media (max-width: 1000px) {
    grid-template-columns: 120px minmax(0, 1fr) 120px;
  }

  @media (max-width: 760px) {
    height: auto;
    padding: 8px 14px 0;
    grid-template-columns: 1fr;
    gap: 4px;
  }
`;

const Brand = styled(Link)`
  justify-self: start;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text);
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;

const LogoMark = styled.span`
  width: 23px;
  height: 23px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`;

const BrandName = styled.span`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.26px;
`;

const Menu = styled.nav`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-width: 0;

  @media (max-width: 1000px) {
    gap: 16px;
  }

  @media (max-width: 760px) {
    justify-content: flex-start;
    overflow-x: auto;
    gap: 16px;
  }
`;

// NavLink는 현재 주소와 맞으면 active 클래스와 aria-current="page"를 붙인다.
// /recipes/:recipeId 같은 하위 주소에서도 상위 메뉴가 활성으로 남는다.
const MenuLink = styled(NavLink)`
  height: 100%;
  border-bottom: 2px solid transparent;
  color: var(--text);
  font-size: 16px;
  font-weight: 330;
  text-decoration: none;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &.active {
    border-bottom-color: var(--text);
    font-weight: 540;
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: -2px;
  }

  @media (max-width: 760px) {
    height: 42px;
  }
`;

const HeaderSpacer = styled.div`
  @media (max-width: 760px) {
    display: none;
  }
`;
