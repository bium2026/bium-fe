/*
 * 레시피 추천 화면 퍼블리싱용 목데이터다.
 * 서버 연동 후에는 API 응답으로 바꾸고 이 파일은 지운다.
 */
import type { Recipe, UrgentIngredient } from "./recipeTypes";

export const urgentIngredientsMock: UrgentIngredient[] = [
  { id: "egg", emoji: "🥚", name: "계란", daysLeft: 1 },
  { id: "tofu", emoji: "🧊", name: "두부", daysLeft: 2 },
  { id: "spinach", emoji: "🥬", name: "시금치", daysLeft: 3 },
  { id: "chicken", emoji: "🍗", name: "닭가슴살", daysLeft: 4 },
  { id: "milk", emoji: "🥛", name: "우유", daysLeft: 5 },
];

export const recipesMock: Recipe[] = [
  {
    id: "tofu-egg-rice",
    name: "두부 계란 볶음밥",
    emoji: "🍳",
    summary: "유통기한이 가까운 두부와 계란을 한 번에 쓰는 담백한 한 그릇 메뉴예요.",
    cookTime: "12분",
    difficulty: "하",
    servings: "1인분",
    calories: "430kcal",
    usedIngredients: ["🥚 계란 D-1", "🧊 두부 D-2"],
    ingredients: [
      { name: "두부", amount: "1/2모", status: "냉장고 보유", required: true },
      { name: "계란", amount: "2개", status: "냉장고 보유", required: true },
      { name: "밥", amount: "1공기", status: "기본 재료", required: true },
      { name: "간장", amount: "1큰술", status: "양념", required: true },
      { name: "대파", amount: "1/3대", status: "없으면 생략", required: false },
    ],
    steps: [
      "두부는 키친타월로 눌러 물기를 빼고 작게 깍둑썰기해요.",
      "기름 두른 팬에 두부를 넣고 겉이 노릇해질 때까지 구워요.",
      "계란을 풀어 넣고 반쯤 익으면 밥을 넣어 고루 볶아요.",
      "간장을 팬 가장자리에 둘러 향을 내고 대파를 넣어 마무리해요.",
    ],
    tips: [
      "두부 물기를 충분히 빼야 볶음밥이 질척해지지 않아요.",
      "찬밥을 쓰면 밥알이 덜 뭉쳐요.",
    ],
    nutrition: [
      { label: "단백질", value: "24g" },
      { label: "탄수화물", value: "52g" },
      { label: "지방", value: "14g" },
    ],
    fridgeMatches: ["두부", "계란"],
  },
  {
    id: "chicken-spinach-salad",
    name: "닭가슴살 시금치 샐러드",
    emoji: "🥗",
    summary: "닭가슴살과 시금치로 가볍게 만드는 고단백 샐러드예요.",
    cookTime: "15분",
    difficulty: "하",
    servings: "2인분",
    calories: "360kcal",
    usedIngredients: ["🍗 닭가슴살 D-4", "🥬 시금치 D-3"],
    ingredients: [
      { name: "닭가슴살", amount: "1팩", status: "냉장고 보유", required: true },
      { name: "시금치", amount: "한 줌", status: "냉장고 보유", required: true },
      { name: "올리브오일", amount: "1큰술", status: "드레싱", required: true },
      { name: "레몬즙", amount: "1큰술", status: "식초로 대체 가능", required: false },
    ],
    steps: [
      "닭가슴살은 데우거나 익혀서 먹기 좋게 찢어요.",
      "시금치는 씻어서 물기를 털고 한입 크기로 잘라요.",
      "올리브오일과 레몬즙, 소금을 섞어 드레싱을 만들어요.",
      "재료를 그릇에 담고 드레싱을 뿌려 가볍게 버무려요.",
    ],
    tips: ["시금치는 드레싱을 먹기 직전에 뿌려야 숨이 덜 죽어요."],
    nutrition: [
      { label: "단백질", value: "32g" },
      { label: "탄수화물", value: "9g" },
      { label: "지방", value: "18g" },
    ],
    fridgeMatches: ["닭가슴살", "시금치"],
  },
  {
    id: "milk-egg-toast",
    name: "우유 계란 프렌치토스트",
    emoji: "🍞",
    summary: "남은 우유와 계란으로 10분 만에 만드는 간단한 아침 메뉴예요.",
    cookTime: "10분",
    difficulty: "하",
    servings: "1인분",
    calories: "390kcal",
    usedIngredients: ["🥛 우유 D-5", "🥚 계란 D-1"],
    ingredients: [
      { name: "식빵", amount: "2장", status: "기본 재료", required: true },
      { name: "계란", amount: "1개", status: "냉장고 보유", required: true },
      { name: "우유", amount: "100ml", status: "냉장고 보유", required: true },
      { name: "설탕", amount: "1작은술", status: "없으면 생략", required: false },
    ],
    steps: [
      "계란, 우유, 설탕을 섞어 달걀물을 만들어요.",
      "식빵 양면을 달걀물에 충분히 적셔요.",
      "약불로 달군 팬에 버터나 기름을 두르고 앞뒤로 노릇하게 구워요.",
    ],
    tips: ["불이 세면 겉만 타고 속이 덜 익으니 약불로 천천히 구워요."],
    nutrition: [
      { label: "단백질", value: "16g" },
      { label: "탄수화물", value: "48g" },
      { label: "지방", value: "13g" },
    ],
    fridgeMatches: ["우유", "계란"],
  },
  {
    id: "tofu-spinach-soup",
    name: "두부 시금치 된장국",
    emoji: "🍲",
    summary: "두부와 시금치를 넣어 속이 편한 국물 요리예요.",
    cookTime: "20분",
    difficulty: "중",
    servings: "2인분",
    calories: "180kcal",
    usedIngredients: ["🧊 두부 D-2", "🥬 시금치 D-3"],
    ingredients: [
      { name: "두부", amount: "1/2모", status: "냉장고 보유", required: true },
      { name: "시금치", amount: "한 줌", status: "냉장고 보유", required: true },
      { name: "된장", amount: "1.5큰술", status: "양념", required: true },
      { name: "멸치 육수", amount: "500ml", status: "물로 대체 가능", required: false },
    ],
    steps: [
      "육수나 물을 끓이고 된장을 풀어요.",
      "두부를 깍둑썰어 넣고 5분 정도 끓여요.",
      "시금치를 넣고 한소끔만 더 끓인 뒤 불을 꺼요.",
    ],
    tips: ["시금치는 오래 끓이면 색이 누렇게 변하니 마지막에 넣어요."],
    nutrition: [
      { label: "단백질", value: "14g" },
      { label: "탄수화물", value: "11g" },
      { label: "지방", value: "7g" },
    ],
    fridgeMatches: ["두부", "시금치"],
  },
];
