/*
 * 레시피 재료가 지금 냉장고에 있는지 요리 재료 후보로 알아낸다. 레시피 상세 화면과 목록 카드가 함께 쓴다.
 * 레시피의 source·fridgeMatches는 만든 시점 값이라 요리 완료·되돌리기 뒤에도 바뀌지 않아서 이 값으로 표시를 맞춘다.
 * 컴포넌트 파일에서 함수를 함께 내보내면 Fast Refresh가 동작하지 않아 따로 둔다.
 */
import { getCookingCandidates } from "../../api/cooking";

// 재료 이름별로 지금 냉장고에 맞는 재료가 있는지. 기본 양념처럼 응답에 없는 재료는 들어 있지 않다.
export type Holdings = { recipeId: number; owned: Map<string, boolean> };

export async function getHoldings(recipeId: number): Promise<Holdings> {
  const ingredients = await getCookingCandidates(recipeId);
  return { recipeId, owned: new Map(ingredients.map((item) => [item.name, item.candidates.length > 0])) };
}
