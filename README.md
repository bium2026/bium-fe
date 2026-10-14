# BIUM FE

BIUM은 냉장고 속 식재료를 정리하고, 가진 재료로 만들 수 있는 레시피를 추천받는 웹 서비스입니다. 이 레포는 BIUM의 프론트엔드입니다.

## 기술 스택

React 19, Vite, TypeScript (strict), Zustand, Emotion, dnd-kit, lucide-react, react-icons, react-router

## 실행 방법

Node.js와 npm이 필요합니다.

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에서 `VITE_API_URL`을 실행 중인 백엔드 서버 주소로 맞춥니다. 기본값은 `http://localhost:8080`입니다.
`.env`는 Git에 올리지 않습니다. `VITE_` 값은 빌드 결과에 그대로 노출되므로 API 키 같은 비밀값은 넣지 않습니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입 검사(`tsc -b`) 후 프로덕션 빌드 (`dist/`) |
| `npm run lint` | ESLint 검사 |
| `npm run preview` | 빌드 결과를 로컬에서 미리 보기 |

## 폴더 구조

```
src/
  api/          서버 호출 함수와 요청·응답 타입
  components/   기능별 화면 폴더 (Fridge, Recipe, Library, Layout ...)
  store/        Zustand 스토어
  styles/       전역 스타일 (GlobalStyle.tsx)
  assets/       이미지
  routes.tsx    화면 라우트 목록 (새 화면은 여기에 추가)
```

## 문서

- `AGENTS.md`: 개발 규칙 (AI 작업 규칙 포함)
- `DESIGN.md`: 디자인 기준
