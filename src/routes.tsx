import { createBrowserRouter, Navigate } from 'react-router'
import AuthPage from './components/Auth/AuthPage.tsx'
import RecipeDetailPage from './components/Recipe/RecipeDetailPage.tsx'
import RecipeLayout from './components/Recipe/RecipeLayout.tsx'
import RecipePage from './components/Recipe/RecipePage.tsx'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthPage /> },
  {
    path: '/recipes',
    element: <RecipeLayout />,
    children: [
      { index: true, element: <RecipePage /> },
      { path: ':recipeId', element: <RecipeDetailPage /> },
    ],
  },
])
