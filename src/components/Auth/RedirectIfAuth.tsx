/*
 * RequireAuth의 반대로, 로그인 화면(/login)을 감싼다.
 * 이미 로그인한 채로 열면 로그인 폼 대신 냉장고 화면으로 보낸다.
 * 화면에 들어올 때의 로그인 상태만 보고 판단한다. 계속 지켜보면 로그인에 성공한 순간 LoginForm의 이동과 겹쳐 두 번 이동한다.
 */
import { useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "../../store/authStore";

type RedirectIfAuthProps = {
  children: ReactNode;
};

function RedirectIfAuth({ children }: RedirectIfAuthProps) {
  // RequireAuth와 같은 기준으로 본다. 기준이 다르면 빈 토큰이 저장됐을 때 두 가드가 서로에게 보내며 맴돈다.
  const [isLoggedIn] = useState(() => Boolean(useAuthStore.getState().accessToken));

  if (isLoggedIn) return <Navigate to="/fridge" replace />;
  return children;
}

export default RedirectIfAuth;
