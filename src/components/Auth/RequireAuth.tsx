/*
 * 로그인해야 볼 수 있는 화면을 감싼다.
 * 토큰이 없으면(로그인 전이거나 401로 지워졌으면) 로그인 화면으로 보낸다.
 */
import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "../../store/authStore";

type RequireAuthProps = {
  children: ReactNode;
};

function RequireAuth({ children }: RequireAuthProps) {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

export default RequireAuth;
