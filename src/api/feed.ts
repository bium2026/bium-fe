/*
 * 공개 냉장고 피드 API다.
 * 요청·응답 형식은 백엔드 FeedController의 DTO를 따른다.
 */
import type { FridgeContentsResponse } from "./fridge";
import { request, requestNoContent } from "./client";

// 아이콘이 없는 재료는 emoji가 null이다.
export type FeedItemPreview = {
  name: string;
  emoji: string | null;
};

// 보관 구역 하나의 재료 수와 앞에서부터 6개까지의 재료 (선반 → 왼쪽 문칸 → 오른쪽 문칸, 칸 안 순서)
export type FeedStoragePreview = {
  count: number;
  items: FeedItemPreview[];
};

// fridge: 냉장실, freezer: 냉동실, room: 실온
export type FeedStorages = {
  fridge: FeedStoragePreview;
  freezer: FeedStoragePreview;
  room: FeedStoragePreview;
};

export type FeedFridge = {
  fridgeId: number;
  name: string;
  // 피드 목록에서는 늘 true다. 멤버가 공개하지 않은 내 냉장고를 미리 볼 때만 false다.
  isPublic: boolean;
  ownerNickname: string | null;
  memberCount: number;
  itemCount: number;
  // 오늘부터 3일 안에 유통기한이 끝나는 재료 수 (이미 지난 재료는 세지 않는다)
  expiringCount: number;
  storages: FeedStorages;
  likeCount: number;
  liked: boolean;
  saved: boolean;
  // 이 냉장고에 남은 코멘트 수
  commentCount: number;
  // 내가 주인이나 멤버인 냉장고
  mine: boolean;
};

type FeedPage = {
  fridges: FeedFridge[];
  // 다음 페이지가 없으면 null이다. 있으면 다음 요청의 cursor로 그대로 보낸다.
  nextCursor: number | null;
};

type FeedFridgeDetail = {
  fridge: FeedFridge;
  contents: FridgeContentsResponse;
};

export type FeedReaction = {
  likeCount: number;
  liked: boolean;
  saved: boolean;
};

// 공개한 냉장고를 최근에 만든 순서로 10개씩 준다. saved면 내가 저장한 냉장고만 준다.
export function getFeed({ cursor, saved }: { cursor: number | null; saved: boolean }) {
  const params = new URLSearchParams();
  if (cursor !== null) params.set("cursor", String(cursor));
  if (saved) params.set("saved", "true");
  const query = params.toString();
  return request<FeedPage>(`/api/feed/fridges${query ? `?${query}` : ""}`);
}

// 공개하지 않은 냉장고도 멤버에게는 준다(내 냉장고 미리보기).
// 실패: FRIDGE_NOT_FOUND(404, 멤버가 아닌데 공개하지 않은 냉장고 포함)
export function getFeedFridge(fridgeId: number) {
  return request<FeedFridgeDetail>(`/api/feed/fridges/${fridgeId}`);
}

// 좋아요·저장은 여러 번 보내도 결과가 같다. 실패: FRIDGE_NOT_FOUND(404, 공개를 멈춘 냉장고 포함)
export function setFeedLike(fridgeId: number, liked: boolean) {
  return request<FeedReaction>(`/api/feed/fridges/${fridgeId}/like`, { method: liked ? "PUT" : "DELETE" });
}

export function setFeedSave(fridgeId: number, saved: boolean) {
  return request<FeedReaction>(`/api/feed/fridges/${fridgeId}/save`, { method: saved ? "PUT" : "DELETE" });
}

// 냉장고에 남긴 코멘트. 음식을 추천하지 않은 코멘트는 dishName이 null이다.
export type FeedComment = {
  commentId: number;
  authorNickname: string;
  content: string;
  dishName: string | null;
  createdAt: string;
  // 내가 쓴 코멘트
  mine: boolean;
  // 내가 지울 수 있는 코멘트 (내가 썼거나 냉장고 주인)
  deletable: boolean;
};

type FeedCommentPage = {
  comments: FeedComment[];
  // 다음 페이지가 없으면 null이다. 있으면 다음 요청의 cursor로 그대로 보낸다.
  nextCursor: number | null;
};

// 최신 코멘트부터 20개씩 준다. 공개하지 않은 냉장고는 멤버에게만 준다. 실패: FRIDGE_NOT_FOUND(404)
export function getFeedComments(fridgeId: number, cursor: number | null) {
  const query = cursor === null ? "" : `?cursor=${cursor}`;
  return request<FeedCommentPage>(`/api/feed/fridges/${fridgeId}/comments${query}`);
}

// content는 200자, dishName은 50자까지이고 둘 다 줄바꿈을 쓸 수 없다. 공개한 냉장고에만 쓸 수 있다.
// 실패: INVALID_INPUT(400), FRIDGE_NOT_FOUND(404, 공개를 멈춘 냉장고 포함)
export function createFeedComment(fridgeId: number, body: { content: string; dishName: string | null }) {
  return request<FeedComment>(`/api/feed/fridges/${fridgeId}/comments`, { method: "POST", body });
}

// 쓴 사람이나 냉장고 주인만 지울 수 있다.
// 실패: FEED_COMMENT_DELETE_FORBIDDEN(403), FEED_COMMENT_NOT_FOUND(404), FRIDGE_NOT_FOUND(404)
export function deleteFeedComment(fridgeId: number, commentId: number) {
  return requestNoContent(`/api/feed/fridges/${fridgeId}/comments/${commentId}`, { method: "DELETE" });
}
