import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import AuthPage from './components/Auth/AuthPage.tsx'
import RequireAuth from './components/Auth/RequireAuth.tsx'
import AppLayout from './components/Layout/AppLayout.tsx'

// 로그인해야 보는 화면은 그 화면에 처음 들어갈 때 코드를 받아, 첫 화면(로그인)을 가볍게 연다.
// 다른 화면으로 옮길 때는 코드를 다 받은 뒤에 화면을 바꾸므로 따로 로딩 화면을 두지 않는다.
// 새로고침 직후 코드를 받는 동안에는 헤더만 먼저 보이도록 본문 자리를 비워 둔다.
function page(load: () => Promise<{ default: ComponentType }>) {
  return {
    hydrateFallbackElement: <></>,
    lazy: { Component: async () => (await load()).default },
  }
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/library', ...page(() => import('./components/Library/LibraryPage.tsx')) },
      { path: '/fridge', ...page(() => import('./components/Fridge/FridgePage.tsx')) },
      { path: '/recipes', ...page(() => import('./components/Recipe/RecipePage.tsx')) },
      { path: '/recipes/:recipeId', ...page(() => import('./components/Recipe/RecipeDetailPage.tsx')) },
      { path: '/shopping', ...page(() => import('./components/ShoppingList/ShoppingListPage.tsx')) },
      { path: '/share', ...page(() => import('./components/Share/SharePage.tsx')) },
    ],
  },
])
