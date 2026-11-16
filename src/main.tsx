import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './routes.tsx'
import GlobalStyle from './styles/GlobalStyle.tsx'
// 레시피 화면은 처음 들어갈 때 코드를 받아서, 추천 스토어도 그때서야 로그인 상태를 지켜보기 시작한다.
// 그 전에 다른 계정으로 로그인하면 이전 계정의 추천 목록이 남으므로 처음부터 불러 둔다.
import './store/recipeStore.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
  </StrictMode>,
)
