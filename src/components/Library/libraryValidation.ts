/*
 * 식재료 도감 모달들이 함께 쓰는 입력 검사다.
 */

// 아이콘 검사는 냉장고 재료 수정 모달(IngredientEditModal)과 같은 규칙을 쓴다.
// 국기나 피부색이 들어간 이모지는 여러 글자로 이뤄져 있어서 length 대신 화면에 보이는 글자 수로 센다.
const graphemeSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

// 비어 있지 않은 아이콘 값이 이모지 한 개인지 검사한다. 빈 값을 허용할지는 쓰는 쪽에서 정한다.
export function getEmojiError(icon: string) {
  if ([...graphemeSegmenter.segment(icon)].length > 1) return "아이콘은 이모지 한 개만 넣어 주세요.";
  if (!emojiPattern.test(icon)) return "아이콘은 이모지로 넣어 주세요.";
  return "";
}
