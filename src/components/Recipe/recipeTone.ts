/*
 * 레시피 카드와 상세 화면의 대표 이미지 배경색을 정한다.
 * 목록 순서대로 파스텔 색을 돌려 써서 같은 레시피는 두 화면에서 같은 색이 된다.
 */
const recipeTones = [
  "var(--block-cream)",
  "var(--block-mint)",
  "var(--block-coral)",
  "var(--block-pink)",
];

export function getRecipeTone(index: number) {
  return recipeTones[index % recipeTones.length];
}
