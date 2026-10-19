import { createBrowserRouter, Navigate } from 'react-router'
import AuthPage from './components/Auth/AuthPage.tsx'
import AppLayout from './components/Layout/AppLayout.tsx'
import PreparingPage from './components/Layout/PreparingPage.tsx'
import RecipeDetailPage from './components/Recipe/RecipeDetailPage.tsx'
import RecipePage from './components/Recipe/RecipePage.tsx'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/fridge', element: <PreparingPage title="내 냉장고" /> },
      { path: '/library', element: <PreparingPage title="식재료 도감" /> },
      { path: '/recipes', element: <RecipePage /> },
      { path: '/recipes/:recipeId', element: <RecipeDetailPage /> },
    ],
  },
])
