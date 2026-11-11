/*
 * 재료 수정 모달 안에서 재료의 100g당 영양 정보를 불러와 도넛 그래프로 보여 준다.
 * 식약처 식품영양성분 DB에서 찾은 값이라, 맞는 식품이 없으면 없다고 알려 준다.
 */
import { useEffect, useId, useState } from "react";
import styled from "@emotion/styled";
import { RotateCw } from "lucide-react";
import { ApiError } from "../../api/client";
import { getFridgeItemNutrition, type FridgeItemNutrition } from "../../api/fridge";
import NutritionChart from "../Recipe/NutritionChart";

type NutritionResult =
  | { requestKey: string; status: "success"; nutrition: FridgeItemNutrition | null }
  // retryable: 식약처 응답 실패(502)처럼 다시 부르면 될 수 있는 오류인지. 지운 재료(404)는 다시 불러도 같다.
  | { requestKey: string; status: "error"; message: string; retryable: boolean };

type IngredientNutritionProps = {
  itemId: number;
  itemName: string;
};

function IngredientNutrition({ itemId, itemName }: IngredientNutritionProps) {
  const titleId = useId();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const requestKey = `${itemId}-${attempt}`;

  useEffect(() => {
    let ignore = false;
    getFridgeItemNutrition(itemId).then(
      (nutrition) => {
        if (!ignore) setResult({ requestKey, status: "success", nutrition });
      },
      (error: unknown) => {
        if (ignore) return;
        const message =
          error instanceof ApiError ? error.message : "영양 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
        const retryable = !(error instanceof ApiError && error.status === 404);
        setResult({ requestKey, status: "error", message, retryable });
      },
    );
    return () => {
      ignore = true;
    };
  }, [itemId, requestKey]);

  // 다시 시도하거나 다른 재료를 열면 이전 결과 대신 로딩을 보여 준다.
  const current = result?.requestKey === requestKey ? result : null;
  const nutrition = current?.status === "success" ? current.nutrition : null;
  // 기준량은 서버 값으로만 정한다. 값이 없을 때는 "영양 정보"라고만 쓴다.
  const basis = nutrition ? `${nutrition.baseAmountG}g` : null;

  return (
    <Section aria-labelledby={titleId} aria-busy={current === null}>
      <Title id={titleId}>{basis ? `${basis}당 영양 정보` : "영양 정보"}</Title>

      {current === null && <Placeholder>영양 정보를 불러오는 중...</Placeholder>}

      {current?.status === "error" && (
        <Placeholder role="alert">
          {current.message}
          {current.retryable && (
            <RetryButton type="button" onClick={() => setAttempt((value) => value + 1)}>
              <RotateCw size={14} aria-hidden="true" />
              다시 시도
            </RetryButton>
          )}
        </Placeholder>
      )}

      {current?.status === "success" && !nutrition && (
        <Placeholder>{itemName}의 영양 정보를 찾지 못했어요.</Placeholder>
      )}

      {nutrition && basis && (
        <>
          <NutritionChart
            carbohydrateG={nutrition.carbohydrateG}
            proteinG={nutrition.proteinG}
            fatG={nutrition.fatG}
            caloriesKcal={nutrition.caloriesKcal}
            basis={basis}
            layout="row"
          />
          <Source>
            {nutrition.foodName !== itemName && `'${nutrition.foodName}' 기준 · `}식약처 식품영양성분 DB
          </Source>
        </>
      )}
    </Section>
  );
}

export default IngredientNutrition;

const Section = styled.section`
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: grid;
  gap: 10px;
`;

const Title = styled.h3`
  font-size: 13px;
  font-weight: 540;
`;

// 그래프가 들어오면 높이가 크게 바뀌어 아래 버튼이 밀리므로, 안내 칸도 그래프 높이(약 112px)만큼 잡아 둔다.
const Placeholder = styled.p`
  min-height: 112px;
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 14px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  text-align: center;
`;

const RetryButton = styled.button`
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 540;
  color: var(--text);
  cursor: pointer;
`;

const Source = styled.p`
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
`;
