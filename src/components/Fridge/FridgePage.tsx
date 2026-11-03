/*
 * 내 냉장고 화면이다.
 * 좌우 화살표로 냉장실·냉동실·실온을 넘겨 보며, 지금 보는 구역은 주소(?zone=)에 남겨 새로고침해도 유지한다.
 * 헤더에서 고른 냉장고의 재료를 불러오고, 재료를 누르면 수정 모달을 연다. 저장·삭제는 서버에 반영된 뒤에 화면에 반영한다.
 * 재료를 끌어서 다른 칸이나 같은 칸의 다른 자리로 옮기고, 장본 음식 패널의 음식을 끌어다 냉장고에 넣는다.
 * 끄는 동안 좌우 화살표 위에 잠시 머무르면 옆 구역으로 넘어가서, 냉장실·냉동실·실온 어디로든 옮길 수 있다.
 * 옮긴 재료는 화면에 먼저 보여 주고 저장에 실패하면 원래 자리로 되돌린다. 저장을 기다리는 동안에는 다시 끌지 못하게 막는다.
 * 영수증 사진을 고르면 AI가 읽은 재료를 모달로 보여 주고, 확인한 재료를 냉장고에 한꺼번에 넣는다.
 */
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { ChevronLeft, ChevronRight, ReceiptText, ShoppingBag } from "lucide-react";
import { useSearchParams } from "react-router";
import { ApiError, NETWORK_ERROR } from "../../api/client";
import {
  addFridgeItems,
  changeFridgeItemPosition,
  deleteFridgeItem,
  getFridgeItems,
  getMyFridge,
  updateFridgeItem,
  type FridgeItemBulkCreateItem,
} from "../../api/fridge";
import { getPurchasedItems, movePurchasedItem, type PurchasedItem } from "../../api/purchasedItem";
import FridgeBoard, { DOOR_SLOT_COUNT } from "./FridgeBoard";
import IngredientEditModal, { type IngredientEditValues } from "./IngredientEditModal";
import IngredientItem from "./IngredientItem";
import PurchasedItemPanel, { type PurchasedListState } from "./PurchasedItemPanel";
import ReceiptScanModal, { ReceiptFileInput } from "./ReceiptScanModal";
import {
  emptyFridgeContents,
  findInContents,
  findIngredient,
  insertIntoZone,
  moveIngredientTo,
  parseDragId,
  sectionType,
  storageZone,
  toFridgeContents,
  toIngredient,
  zoneNavDropId,
  zoneStorage,
  type ItemLocation,
  type ZoneLocation,
} from "./fridgeLayout";
import type { FridgeContents, FridgeIngredient, SectionId, ZoneId, ZoneIngredients } from "./fridgeTypes";
import { adjacentZone, isZoneId, zoneMeta, zoneOrder, type ZoneDirection } from "./fridgeZones";
import { startReceiptScan, type ReceiptScan } from "./receiptScan";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; fridgeId: number };
type SlideDirection = ZoneDirection;
// 끌고 있는 것. DragOverlay가 손가락·마우스를 따라다니는 카드로 그린다.
type ActiveDrag = { kind: "fridge-item"; ingredient: FridgeIngredient } | { kind: "purchased"; item: PurchasedItem };

const DOOR_FULL_MESSAGE = `문칸에는 ${DOOR_SLOT_COUNT}개까지 넣을 수 있어요. 다른 재료를 먼저 옮겨 주세요.`;
// 재료를 끈 채로 화살표 위에 이만큼 머무르면 옆 구역으로 넘어간다.
const ZONE_SWITCH_DELAY_MS = 700;
const zoneWithParticle: Record<ZoneId, string> = { fridge: "냉장실로", freezer: "냉동실로", pantry: "실온으로" };

// 카드는 칸 안에 들어 있어 포인터 아래에 칸과 재료가 함께 잡힌다.
// 재료가 잡히면 그 재료 자리에 놓고, 빈 곳이면 그 칸 맨 뒤에 놓는다. 냉장고 밖에서 놓으면 아무것도 하지 않는다.
const detectCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const itemHit = hits.find((hit) => parseDragId(hit.id)?.kind === "fridge-item");
  return itemHit ? [itemHit] : hits.slice(0, 1);
};

// 키보드로는 끌지 않고 카드를 눌러 수정 모달을 열기 때문에, 마우스·터치로 끌 때 화면 읽기 프로그램에 알릴 문구만 둔다.
const announcements: Announcements = {
  onDragStart: () => "재료를 들었어요.",
  onDragOver: () => undefined,
  onDragEnd: ({ over }) => (over ? "재료를 놓았어요." : "냉장고 밖에 놓아서 옮기지 않았어요."),
  onDragCancel: () => "옮기기를 취소했어요.",
};

function getLoadErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === NETWORK_ERROR) return error.message;
  return "잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.";
}

function getSaveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === NETWORK_ERROR) return error.message;
  return fallback;
}

// 그사이 다른 멤버가 고치거나 지운 재료라 다시 시도해도 같은 결과라서, 냉장고를 새로 불러와야 하는 오류다.
function isStaleItemError(error: unknown) {
  return (
    error instanceof ApiError && (error.code === "CONCURRENT_MODIFICATION" || error.code === "FRIDGE_ITEM_NOT_FOUND")
  );
}

// 재료가 어느 구역·칸에 있든 id로 찾아 next로 바꾸고, next가 null이면 뺀다.
function replaceIngredient(contents: FridgeContents, id: number, next: FridgeIngredient | null): FridgeContents {
  const update = (items: FridgeIngredient[]) =>
    items.flatMap((item) => (item.id !== id ? [item] : next ? [next] : []));
  const updateZone = (zone: ZoneIngredients): ZoneIngredients => ({
    shelf: update(zone.shelf),
    leftDoor: update(zone.leftDoor),
    rightDoor: update(zone.rightDoor),
  });
  return {
    fridge: updateZone(contents.fridge),
    freezer: updateZone(contents.freezer),
    pantry: updateZone(contents.pantry),
  };
}

// 서버가 새 재료를 보관 위치의 중앙 칸 맨 뒤에 놓으므로 화면에서도 선반 맨 뒤에 붙인다.
function appendToShelf(contents: FridgeContents, added: { zoneId: ZoneId; ingredient: FridgeIngredient }[]) {
  const next = { ...contents };
  for (const { zoneId, ingredient } of added) {
    next[zoneId] = { ...next[zoneId], shelf: [...next[zoneId].shelf, ingredient] };
  }
  return next;
}

// 놓은 곳이 재료면 그 재료 자리, 칸의 빈 곳이면 그 칸 맨 뒤다.
function resolveDropLocation(zone: ZoneIngredients, overId: UniqueIdentifier): ItemLocation | null {
  const target = parseDragId(overId);
  if (target?.kind === "section") return { sectionId: target.sectionId, index: zone[target.sectionId].length };
  if (target?.kind === "fridge-item") return findIngredient(zone, target.id);
  return null;
}

function isDoorFull(zone: ZoneIngredients, to: ItemLocation, fromSectionId: SectionId | null) {
  return to.sectionId !== "shelf" && to.sectionId !== fromSectionId && zone[to.sectionId].length >= DOOR_SLOT_COUNT;
}

function FridgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("next");
  const [fridgeContents, setFridgeContents] = useState<FridgeContents>(emptyFridgeContents);
  const [selectedIngredient, setSelectedIngredient] = useState<FridgeIngredient | null>(null);
  const [purchased, setPurchased] = useState<PurchasedListState>({ status: "loading" });
  const [purchasedAttempt, setPurchasedAttempt] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<SectionId | null>(null);
  // 끌고 있는 재료가 올라가 있는 화살표. 머무르는 동안 옆 구역으로 넘기는 타이머를 함께 둔다.
  const [highlightedNav, setHighlightedNav] = useState<ZoneDirection | null>(null);
  const hoveredNavRef = useRef<ZoneDirection | null>(null);
  const zoneSwitchTimerRef = useRef<number | undefined>(undefined);
  // 옮기기·넣기 요청을 기다리는 중이면 true다. 끝날 때까지 다른 재료를 끌지 못하게 막아 요청이 겹치지 않게 한다.
  const [isMoving, setIsMoving] = useState(false);
  // 상태(isMoving)는 다음 렌더에서야 바뀌어서, 그 사이 들어온 두 번째 놓기도 막으려고 바로 바뀌는 값을 함께 둔다.
  const movingRef = useRef(false);
  const [movingPurchasedId, setMovingPurchasedId] = useState<number | null>(null);
  // 고른 영수증 사진을 읽는 요청. null이면 영수증 모달이 닫힌다.
  const [receiptScan, setReceiptScan] = useState<ReceiptScan | null>(null);
  // 영수증으로 넣기와 옮기기·넣기 결과를 알려 준다.
  const [notice, setNotice] = useState("");
  const zoneTitleRef = useRef<HTMLHeadingElement>(null);
  const removedWhileOpenRef = useRef(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // 짧게 누르거나 밀면 화면을 스크롤하고, 길게 눌러야 끌기가 시작되게 한다.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const fridgeId = load.status === "success" ? load.fridgeId : null;

  useEffect(() => {
    let ignore = false;
    const loadContents = async () => {
      try {
        const fridge = await getMyFridge();
        if (ignore) return;
        if (!fridge) {
          setLoad({ status: "error", message: "연결된 냉장고가 없어요." });
          return;
        }
        const response = await getFridgeItems(fridge.id);
        if (ignore) return;
        setFridgeContents(toFridgeContents(response));
        setLoad({ status: "success", fridgeId: fridge.id });
      } catch (error) {
        if (!ignore) setLoad({ status: "error", message: getLoadErrorMessage(error) });
      }
    };
    loadContents();
    return () => {
      ignore = true;
    };
  }, [loadAttempt]);

  // 장본 음식은 냉장고에 묶여 있어 냉장고를 받은 뒤 불러온다. 못 불러와도 냉장고 화면은 그대로 쓸 수 있게 따로 둔다.
  useEffect(() => {
    if (fridgeId === null) return;
    let ignore = false;
    getPurchasedItems(fridgeId).then(
      (items) => {
        if (!ignore) setPurchased({ status: "success", items });
      },
      () => {
        if (!ignore) setPurchased({ status: "error" });
      },
    );
    return () => {
      ignore = true;
    };
  }, [fridgeId, purchasedAttempt]);

  useEffect(() => () => window.clearInterval(zoneSwitchTimerRef.current), []);

  // 모달을 연 재료 카드가 지워졌으면 모달이 닫힐 때 포커스를 돌려줄 곳이 없어 구역 제목으로 옮긴다.
  useEffect(() => {
    if (selectedIngredient !== null || !removedWhileOpenRef.current) return;
    removedWhileOpenRef.current = false;
    zoneTitleRef.current?.focus();
  }, [selectedIngredient]);

  const zoneParam = searchParams.get("zone");
  const zoneId = isZoneId(zoneParam) ? zoneParam : zoneOrder[0];
  const zone = zoneMeta[zoneId];
  const prevZone = zoneMeta[adjacentZone(zoneId, "prev")];
  const nextZone = zoneMeta[adjacentZone(zoneId, "next")];

  const contents = fridgeContents[zoneId];
  const itemCount = contents.shelf.length + contents.leftDoor.length + contents.rightDoor.length;
  const isLoading = load.status === "loading";
  const purchasedItems = purchased.status === "success" ? purchased.items : [];

  // 끄는 동안 타이머로도 불러서, 그때 화면에 그려진 구역이 아니라 주소에 있는 지금 구역을 기준으로 넘긴다.
  const moveZone = (nextDirection: SlideDirection) => {
    setDirection(nextDirection);
    // 구역을 넘길 때마다 방문 기록이 쌓이면 뒤로 가기로 냉장고 화면을 벗어나기 어려워서 주소를 바꿔치기한다.
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const currentZoneId = params.get("zone");
        const current = isZoneId(currentZoneId) ? currentZoneId : zoneOrder[0];
        params.set("zone", adjacentZone(current, nextDirection));
        return params;
      },
      { replace: true },
    );
  };

  const removeIngredient = (id: number) => {
    removedWhileOpenRef.current = true;
    setFridgeContents((prev) => replaceIngredient(prev, id, null));
  };

  // 다른 멤버가 이미 지운 재료면 다시 눌러도 계속 실패하므로, 오류는 모달에 그대로 보여 주고 화면에서도 뺀다.
  const removeIfGone = (id: number, error: unknown) => {
    if (error instanceof ApiError && error.code === "FRIDGE_ITEM_NOT_FOUND") removeIngredient(id);
  };

  // 실패하면 모달이 오류를 보여 주고, 화면은 서버에 반영된 뒤에만 바꾸므로 되돌릴 것이 없다.
  const handleSave = async (ingredient: FridgeIngredient, values: IngredientEditValues) => {
    try {
      const updated = await updateFridgeItem(ingredient.id, { ...values, version: ingredient.version });
      // 모달이 아이콘·유통기한을 꼭 받아서 보내므로 서버도 비워서 돌려주지 않지만, 응답 타입은 null을 허용해 보낸 값으로 채운다.
      setFridgeContents((prev) =>
        replaceIngredient(prev, ingredient.id, {
          ...ingredient,
          name: updated.name,
          emoji: updated.emoji ?? values.emoji,
          expiresAt: updated.expiresAt ?? values.expiresAt,
          version: updated.version,
        }),
      );
    } catch (error) {
      removeIfGone(ingredient.id, error);
      throw error;
    }
  };

  const handleDelete = async (ingredient: FridgeIngredient) => {
    try {
      await deleteFridgeItem(ingredient.id, ingredient.version);
      removeIngredient(ingredient.id);
    } catch (error) {
      removeIfGone(ingredient.id, error);
      throw error;
    }
  };

  const handleRetry = () => {
    if (isLoading) return;
    setLoad({ status: "loading" });
    setLoadAttempt((prev) => prev + 1);
  };

  const handlePurchasedRetry = () => {
    setPurchased({ status: "loading" });
    setPurchasedAttempt((prev) => prev + 1);
  };

  // 그사이 다른 멤버가 바꾼 냉장고를 다시 받는다. 받지 못하면 지금 화면을 그대로 둔다.
  const refreshContents = async (targetFridgeId: number) => {
    try {
      setFridgeContents(toFridgeContents(await getFridgeItems(targetFridgeId)));
    } catch {
      // 다음에 화면을 다시 열면 새로 불러온다.
    }
  };

  const removePurchasedItem = (id: number) => {
    setPurchased((prev) =>
      prev.status === "success" ? { status: "success", items: prev.items.filter((item) => item.id !== id) } : prev,
    );
  };

  const moveIngredient = async (targetFridgeId: number, from: ZoneLocation, to: ZoneLocation) => {
    const sameSection = from.zoneId === to.zoneId && from.location.sectionId === to.location.sectionId;
    const targetSection = fridgeContents[to.zoneId][to.location.sectionId];
    // 같은 칸의 빈 곳에 놓으면 맨 뒤로 옮기는 것이라 마지막 자리로 맞춘다.
    const target: ZoneLocation = sameSection
      ? { ...to, location: { ...to.location, index: Math.min(to.location.index, targetSection.length - 1) } }
      : to;
    if (sameSection && from.location.index === target.location.index) return;
    const fromSectionInTargetZone = from.zoneId === target.zoneId ? from.location.sectionId : null;
    if (isDoorFull(fridgeContents[target.zoneId], target.location, fromSectionInTargetZone)) {
      setNotice(DOOR_FULL_MESSAGE);
      return;
    }

    const ingredient = fridgeContents[from.zoneId][from.location.sectionId][from.location.index];
    setFridgeContents((prev) => moveIngredientTo(prev, from, target));
    movingRef.current = true;
    setIsMoving(true);
    setNotice("");
    try {
      const updated = await changeFridgeItemPosition(ingredient.id, {
        storage: zoneStorage[target.zoneId],
        section: sectionType[target.location.sectionId],
        index: target.location.index,
        version: ingredient.version,
      });
      setFridgeContents((prev) => replaceIngredient(prev, ingredient.id, toIngredient(updated)));
      // 다른 구역으로 옮기면 지금 화면에서 사라지므로 어디로 갔는지 알려 준다.
      if (from.zoneId !== target.zoneId) {
        setNotice(`${ingredient.name}을(를) ${zoneWithParticle[target.zoneId]} 옮겼어요.`);
      }
    } catch (error) {
      if (isStaleItemError(error)) {
        setNotice("다른 멤버가 먼저 바꾼 재료라 냉장고를 다시 불러왔어요.");
        await refreshContents(targetFridgeId);
      } else {
        setFridgeContents((prev) => {
          const current = findInContents(prev, ingredient.id);
          return current ? moveIngredientTo(prev, current, from) : prev;
        });
        setNotice(getSaveErrorMessage(error, "재료를 옮기지 못했어요. 다시 시도해 주세요."));
      }
    } finally {
      movingRef.current = false;
      setIsMoving(false);
    }
  };

  // 장본 음식은 서버가 냉장고 재료를 만든 뒤에야 id와 버전을 알 수 있어, 응답을 받은 뒤에 화면에 넣는다.
  const putPurchasedItem = async (targetFridgeId: number, item: PurchasedItem, to: ZoneLocation) => {
    if (isDoorFull(fridgeContents[to.zoneId], to.location, null)) {
      setNotice(DOOR_FULL_MESSAGE);
      return;
    }
    movingRef.current = true;
    setIsMoving(true);
    setMovingPurchasedId(item.id);
    setNotice("");
    try {
      const created = await movePurchasedItem(item.id, {
        storage: zoneStorage[to.zoneId],
        section: sectionType[to.location.sectionId],
        index: to.location.index,
      });
      setFridgeContents((prev) => ({
        ...prev,
        [to.zoneId]: insertIntoZone(prev[to.zoneId], to.location, toIngredient(created)),
      }));
      removePurchasedItem(item.id);
      setNotice(`${item.name}을(를) ${zoneMeta[to.zoneId].title}에 넣었어요.`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "PURCHASED_ITEM_NOT_FOUND") {
        removePurchasedItem(item.id);
        setNotice("다른 멤버가 먼저 넣었거나 뺀 장본 음식이에요. 냉장고를 다시 불러왔어요.");
        await refreshContents(targetFridgeId);
      } else {
        setNotice(getSaveErrorMessage(error, `${item.name}을(를) 넣지 못했어요. 다시 시도해 주세요.`));
      }
    } finally {
      movingRef.current = false;
      setIsMoving(false);
      setMovingPurchasedId(null);
    }
  };

  const handlePutToShelf = (item: PurchasedItem) => {
    if (fridgeId === null || movingRef.current) return;
    putPurchasedItem(fridgeId, item, { zoneId, location: { sectionId: "shelf", index: contents.shelf.length } });
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const dragged = parseDragId(active.id);
    if (dragged?.kind === "fridge-item") {
      const location = findIngredient(contents, dragged.id);
      if (location) setActiveDrag({ kind: "fridge-item", ingredient: contents[location.sectionId][location.index] });
    } else if (dragged?.kind === "purchased") {
      const item = purchasedItems.find((purchasedItem) => purchasedItem.id === dragged.id);
      if (item) setActiveDrag({ kind: "purchased", item });
    }
  };

  const stopZoneSwitch = () => {
    window.clearInterval(zoneSwitchTimerRef.current);
    zoneSwitchTimerRef.current = undefined;
    hoveredNavRef.current = null;
    setHighlightedNav(null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    const target = over ? parseDragId(over.id) : null;
    if (target?.kind === "zone-nav") {
      setHighlightedSection(null);
      if (hoveredNavRef.current === target.direction) return;
      stopZoneSwitch();
      hoveredNavRef.current = target.direction;
      setHighlightedNav(target.direction);
      // 화살표 위에 머무르는 동안 옆 구역으로 넘기고, 계속 머무르면 그다음 구역으로 넘긴다.
      zoneSwitchTimerRef.current = window.setInterval(() => moveZone(target.direction), ZONE_SWITCH_DELAY_MS);
      return;
    }
    stopZoneSwitch();
    setHighlightedSection(over ? (resolveDropLocation(contents, over.id)?.sectionId ?? null) : null);
  };

  // 화살표에 놓으면 화살표가 가리키는 구역의 선반 맨 뒤, 그 밖에는 지금 보는 구역에서 놓은 자리다.
  const resolveDropTarget = (overId: UniqueIdentifier): ZoneLocation | null => {
    const target = parseDragId(overId);
    if (target?.kind === "zone-nav") {
      const targetZoneId = adjacentZone(zoneId, target.direction);
      return {
        zoneId: targetZoneId,
        location: { sectionId: "shelf", index: fridgeContents[targetZoneId].shelf.length },
      };
    }
    const location = resolveDropLocation(contents, overId);
    return location ? { zoneId, location } : null;
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    stopZoneSwitch();
    setActiveDrag(null);
    setHighlightedSection(null);
    if (!over || fridgeId === null || movingRef.current) return;
    const to = resolveDropTarget(over.id);
    const dragged = parseDragId(active.id);
    if (!to || !dragged) return;

    if (dragged.kind === "fridge-item") {
      // 끄는 동안 다른 구역으로 넘어왔을 수 있어 모든 구역에서 찾는다.
      const from = findInContents(fridgeContents, dragged.id);
      if (from) moveIngredient(fridgeId, from, to);
    } else if (dragged.kind === "purchased") {
      const item = purchasedItems.find((purchasedItem) => purchasedItem.id === dragged.id);
      if (item) putPurchasedItem(fridgeId, item, to);
    }
  };

  const handleDragCancel = () => {
    stopZoneSwitch();
    setActiveDrag(null);
    setHighlightedSection(null);
  };

  const handleReceiptSelect = (file: File) => {
    setNotice("");
    setReceiptScan(startReceiptScan(file));
  };

  // 넣은 재료를 다시 불러오지 않고 응답으로 바로 붙인다.
  const handleReceiptAdd = async (receiptFridgeId: number, items: FridgeItemBulkCreateItem[]) => {
    const added = await addFridgeItems(receiptFridgeId, items);
    // 응답은 보낸 순서대로 오므로 같은 자리의 보관 위치로 구역을 정한다.
    setFridgeContents((prev) =>
      appendToShelf(
        prev,
        added.map((item, index) => ({ zoneId: storageZone[items[index].storage], ingredient: toIngredient(item) })),
      ),
    );
    setNotice(`${added.length}개를 냉장고에 넣었어요.`);
  };

  const dragPreview: FridgeIngredient | null =
    activeDrag?.kind === "fridge-item"
      ? activeDrag.ingredient
      : activeDrag?.kind === "purchased"
        ? { ...activeDrag.item, version: 0 }
        : null;

  return (
    <Wrapper>
      {/* 구역을 넘기는 화살표도 재료를 놓을 수 있는 곳이라 페이저까지 끌기 영역에 넣는다. */}
      <DndContext
        sensors={sensors}
        collisionDetection={detectCollision}
        accessibility={{ announcements }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Pager>
          <ZoneNavButton
            direction="prev"
            targetTitle={prevZone.title}
            highlighted={highlightedNav === "prev"}
            onClick={() => moveZone("prev")}
          />
          <ZoneHeading aria-live="polite">
            <ZoneTitle ref={zoneTitleRef} tabIndex={-1} $tone={zone.tone}>
              {zone.title}
            </ZoneTitle>
            <ZoneSubtitle>
              {activeDrag ? (
                "화살표 위에 잠시 머무르면 옆 구역으로 넘어가요"
              ) : (
                <>
                  {zone.subtitle}
                  {load.status === "success" && ` · 재료 ${itemCount}개`}
                </>
              )}
            </ZoneSubtitle>
          </ZoneHeading>
          <ZoneNavButton
            direction="next"
            targetTitle={nextZone.title}
            highlighted={highlightedNav === "next"}
            onClick={() => moveZone("next")}
          />
        </Pager>

        <Toolbar>
          <Notice role="status">{notice}</Notice>
          {load.status === "success" && (
            <ToolbarButton type="button" aria-expanded={isPanelOpen} onClick={() => setIsPanelOpen((prev) => !prev)}>
              <ShoppingBag size={18} aria-hidden="true" />
              방금 장본 음식 넣기
              {purchasedItems.length > 0 && <Count aria-label={`${purchasedItems.length}개`}>{purchasedItems.length}</Count>}
            </ToolbarButton>
          )}
          <ToolbarButton type="button" onClick={() => receiptInputRef.current?.click()}>
            <ReceiptText size={18} aria-hidden="true" />
            영수증으로 추가
          </ToolbarButton>
          <ReceiptFileInput ref={receiptInputRef} onSelect={handleReceiptSelect} />
        </Toolbar>

        {load.status === "error" ? (
          <StatusBox role="alert">
            <strong>냉장고 재료를 불러오지 못했어요.</strong>
            <p>{load.message}</p>
            <RetryButton type="button" onClick={handleRetry}>
              다시 시도
            </RetryButton>
          </StatusBox>
        ) : (
          <BoardLayout $panelOpen={isPanelOpen}>
            {/* 구역이 바뀔 때마다 key가 바뀌어 슬라이드 애니메이션이 다시 재생된다. */}
            <SlidingStage key={zoneId} $direction={direction}>
              <FridgeBoard
                zone={zone}
                contents={contents}
                loading={isLoading}
                dragDisabled={isMoving}
                highlightedSection={highlightedSection}
                onSelectIngredient={setSelectedIngredient}
              />
            </SlidingStage>
            {isPanelOpen && (
              <PurchasedItemPanel
                state={purchased}
                zoneTitle={zone.title}
                disabled={isMoving}
                movingId={movingPurchasedId}
                onPut={handlePutToShelf}
                onRetry={handlePurchasedRetry}
                onClose={() => setIsPanelOpen(false)}
              />
            )}
          </BoardLayout>
        )}

        <DragOverlay>
          {dragPreview && (
            <OverlayCard aria-hidden="true">
              <IngredientItem ingredient={dragPreview} variant="shelf" onSelect={() => undefined} />
            </OverlayCard>
          )}
        </DragOverlay>
      </DndContext>

      <IngredientEditModal
        ingredient={selectedIngredient}
        onClose={() => setSelectedIngredient(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ReceiptScanModal
        scan={receiptScan}
        onPickFile={handleReceiptSelect}
        onClose={() => setReceiptScan(null)}
        onAdd={handleReceiptAdd}
      />
    </Wrapper>
  );
}

export default FridgePage;

type ZoneNavButtonProps = {
  direction: ZoneDirection;
  targetTitle: string;
  // 끌고 있는 재료가 이 화살표 위에 있으면 강조한다.
  highlighted: boolean;
  onClick: () => void;
};

// 구역을 넘기는 화살표다. 재료를 끈 채로 위에 머무르면 옆 구역으로 넘어가고, 위에 놓으면 그 구역 선반 맨 뒤로 옮긴다.
function ZoneNavButton({ direction, targetTitle, highlighted, onClick }: ZoneNavButtonProps) {
  const { setNodeRef } = useDroppable({ id: zoneNavDropId(direction) });
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <ArrowButton
      ref={setNodeRef}
      type="button"
      aria-label={`${direction === "prev" ? "이전" : "다음"} 구역, ${targetTitle} 보기`}
      onClick={onClick}
      $highlighted={highlighted}
    >
      <Icon size={28} aria-hidden="true" />
    </ArrowButton>
  );
}

const slideFromPrev = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideFromNext = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
`;

const Wrapper = styled.section`
  display: grid;
  justify-items: center;
  gap: 24px;

  @media (max-width: 760px) {
    gap: 16px;
  }
`;

// 냉장고 보드(FridgeBoard)와 같은 최대 폭으로 맞춘다.
const Pager = styled.div`
  width: min(1240px, 100%);
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 8px;
`;

const ArrowButton = styled.button<{ $highlighted: boolean }>`
  width: 48px;
  height: 48px;
  border: ${(props) => (props.$highlighted ? "2px dashed var(--text)" : "0")};
  border-radius: 999px;
  background: ${(props) => (props.$highlighted ? "var(--block-lime)" : "var(--surface-soft)")};
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const Toolbar = styled.div`
  width: min(1240px, 100%);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px 16px;
`;

const Notice = styled.p`
  font-size: 14px;
  font-weight: 480;
  word-break: keep-all;
`;

const ToolbarButton = styled.button`
  min-height: 44px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;

  &:hover {
    background: var(--surface-soft);
  }
`;

const ZoneHeading = styled.div`
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
`;

const ZoneTitle = styled.h1<{ $tone: string }>`
  min-width: 120px;
  border: 1px solid color-mix(in srgb, ${(props) => props.$tone} 82%, var(--text));
  border-radius: 50px;
  background: color-mix(in srgb, ${(props) => props.$tone} 65%, var(--surface));
  padding: 2px 20px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 540;
  letter-spacing: -0.26px;
`;

const ZoneSubtitle = styled.p`
  font-size: 15px;
  font-weight: 330;
`;

const SlidingStage = styled.div<{ $direction: SlideDirection }>`
  width: 100%;
  display: grid;
  justify-items: center;
  animation: ${(props) => (props.$direction === "prev" ? slideFromPrev : slideFromNext)} 0.26s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const StatusBox = styled.div`
  width: min(1240px, 100%);
  min-height: 220px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 28px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;

  strong {
    font-size: 24px;
    font-weight: 700;
  }

  p {
    max-width: 540px;
    font-size: 15px;
    line-height: 1.55;
  }
`;

const RetryButton = styled.button`
  margin-top: 6px;
  border: 1px solid var(--text);
  border-radius: 50px;
  background: var(--surface);
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 480;
  cursor: pointer;
`;

const Count = styled.span`
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--text);
  color: var(--surface);
  padding: 0 6px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 480;
`;

// 장본 음식 패널을 열면 넓은 화면에서는 냉장고 오른쪽에, 좁은 화면에서는 냉장고 아래에 놓는다.
const BoardLayout = styled.div<{ $panelOpen: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: ${(props) =>
    props.$panelOpen ? "minmax(0, 1fr) minmax(260px, 300px)" : "minmax(0, 1240px)"};
  justify-content: center;
  align-items: start;
  gap: 24px;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    gap: 16px;
  }
`;

// 끌고 있는 카드가 선반 카드와 같은 크기로 보이게 선반 한 줄 높이(FridgeBoard의 ShelfList --row)와 맞춘다.
const OverlayCard = styled.div`
  width: 112px;
  height: 112px;
  cursor: grabbing;

  @media (max-width: 760px) {
    width: 72px;
    height: 80px;
  }
`;
