/*
 * 로그인해야 볼 수 있는 화면을 감싼다.
 * 토큰이 없으면(로그인 전이거나 401로 지워졌으면) 로그인 화면으로 보낸다.
 * 초대 링크처럼 열려던 주소가 있으면 로그인한 뒤 그 주소로 돌아오게 함께 넘긴다.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "../../store/authStore";

type RequireAuthProps = {
  children: ReactNode;
};

function RequireAuth({ children }: RequireAuthProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  if (!accessToken) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

export default RequireAuth;
