import { createBrowserRouter, Navigate } from 'react-router'
import AuthPage from './components/Auth/AuthPage.tsx'
import FridgePage from './components/Fridge/FridgePage.tsx'
import RequireAuth from './components/Auth/RequireAuth.tsx'
import AppLayout from './components/Layout/AppLayout.tsx'
import LibraryPage from './components/Library/LibraryPage.tsx'
import RecipeDetailPage from './components/Recipe/RecipeDetailPage.tsx'
import RecipePage from './components/Recipe/RecipePage.tsx'
import SharePage from './components/Share/SharePage.tsx'
import ShoppingListPage from './components/ShoppingList/ShoppingListPage.tsx'

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
      { path: '/library', element: <LibraryPage /> },
      { path: '/fridge', element: <FridgePage /> },
      { path: '/recipes', element: <RecipePage /> },
      { path: '/recipes/:recipeId', element: <RecipeDetailPage /> },
      { path: '/shopping', element: <ShoppingListPage /> },
      { path: '/share', element: <SharePage /> },
    ],
  },
])
