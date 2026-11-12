/*
 * 탄수화물·단백질·지방을 열량 비율 도넛 차트로 보여 준다.
 * 레시피뿐 아니라 재료 100g 영양에도 쓸 수 있도록 g 값과 기준 문구만 받는다.
 */
import styled from "@emotion/styled";

type NutritionChartProps = {
  carbohydrateG: number | null;
  proteinG: number | null;
  fatG: number | null;
  caloriesKcal?: number | null;
  // 영양 값의 기준 (예: "1인분", "100g")
  basis: string;
  // stack: 그래프 아래에 범례 (레시피 사이드 칸), row: 그래프 옆에 범례 (모달처럼 높이가 아까운 곳)
  layout?: "stack" | "row";
};

type Macro = {
  key: string;
  label: string;
  grams: number | null;
  kcalPerGram: number;
  color: string;
};

const MACROS: Omit<Macro, "grams">[] = [
  { key: "carbohydrate", label: "탄수화물", kcalPerGram: 4, color: "var(--block-coral)" },
  { key: "protein", label: "단백질", kcalPerGram: 4, color: "var(--block-lilac)" },
  { key: "fat", label: "지방", kcalPerGram: 9, color: "var(--block-lime)" },
];

const EMPTY = "-";
const RADIUS = 42;
const STROKE = 16;
// 조각 길이를 둘레 기준으로 직접 계산한다. pathLength는 일부 브라우저(예전 iOS Safari)에서 dasharray에 반영되지 않는다.
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// 조각 사이 틈 (퍼센트 단위)
const GAP = 1.2;

// 합이 정확히 100이 되도록 가장 큰 소수 부분부터 1씩 올린다.
function toPercents(energies: number[]) {
  const total = energies.reduce((sum, value) => sum + value, 0);
  const raw = energies.map((value) => (value / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let rest = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of order) {
    if (rest <= 0) break;
    floors[index] += 1;
    rest -= 1;
  }
  return floors;
}

// 서버 값은 소수 둘째 자리까지 와서 g은 소수 한 자리, kcal은 정수로 보여 준다.
function roundGram(value: number) {
  return Math.round(value * 10) / 10;
}

function formatGram(value: number | null) {
  return value === null ? EMPTY : `${roundGram(value)}g`;
}

function percentToLength(percent: number) {
  return (percent / 100) * CIRCUMFERENCE;
}

export default function NutritionChart({
  carbohydrateG,
  proteinG,
  fatG,
  caloriesKcal = null,
  basis,
  layout = "stack",
}: NutritionChartProps) {
  const grams = [carbohydrateG, proteinG, fatG];
  const macros: Macro[] = MACROS.map((macro, index) => ({ ...macro, grams: grams[index] }));
  const known = macros.filter((macro) => macro.grams !== null);

  if (known.length === 0 && caloriesKcal === null) {
    return <Message>영양 정보가 없어요.</Message>;
  }

  const energies = macros.map((macro) => (macro.grams ?? 0) * macro.kcalPerGram);
  const totalEnergy = energies.reduce((sum, value) => sum + value, 0);
  const isComplete = known.length === macros.length;

  if (!isComplete || totalEnergy === 0) {
    return (
      <Wrap>
        <Legend aria-label={`${basis} 영양 정보`}>
          {caloriesKcal !== null && (
            <LegendRow>
              <DotSpace aria-hidden="true" />
              <span>열량</span>
              <strong>{Math.round(caloriesKcal)}kcal</strong>
            </LegendRow>
          )}
          {macros.map((macro) => (
            <LegendRow key={macro.key}>
              <Dot $color={macro.color} aria-hidden="true" />
              <span>{macro.label}</span>
              <strong>{formatGram(macro.grams)}</strong>
            </LegendRow>
          ))}
        </Legend>
        <Note>
          {isComplete
            ? "탄수화물·단백질·지방이 모두 0이라 비율 차트를 그릴 수 없어요."
            : "탄수화물·단백질·지방 중 없는 값이 있어 비율 차트를 그리지 못했어요."}
        </Note>
      </Wrap>
    );
  }

  const percents = toPercents(energies);
  const isEstimate = caloriesKcal === null;
  const kcal = Math.round(caloriesKcal ?? totalEnergy);
  const visible = percents.filter((percent) => percent > 0).length;

  const segments = macros.map((macro, index) => ({
    macro,
    percent: percents[index],
    start: percents.slice(0, index).reduce((sum, value) => sum + value, 0),
  }));

  const ariaLabel = `${basis} 영양 정보, ${isEstimate ? "약 " : ""}${kcal}킬로칼로리. ${segments
    .map(({ macro, percent }) => `${macro.label} ${roundGram(macro.grams ?? 0)}그램 ${percent}퍼센트`)
    .join(", ")}`;

  return (
    <Wrap $layout={layout}>
      <DonutBox $layout={layout}>
        <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel}>
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--surface-soft)"
            strokeWidth={STROKE}
            aria-hidden="true"
          />
          <g transform="rotate(-90 50 50)" aria-hidden="true">
            {segments.map(({ macro, percent, start }) =>
              percent === 0 ? null : (
                <circle
                  key={macro.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={macro.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${percentToLength(Math.max(percent - (visible > 1 ? GAP : 0), 0.5))} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-percentToLength(start)}
                />
              ),
            )}
          </g>
        </svg>
        <Center $layout={layout} aria-hidden="true">
          <small>{isEstimate ? "약" : " "}</small>
          <strong>{kcal}</strong>
          <span>kcal</span>
          <em>{basis}</em>
        </Center>
      </DonutBox>

      <Legend aria-hidden="true">
        {segments.map(({ macro, percent }) => (
          <LegendRow key={macro.key}>
            <Dot $color={macro.color} />
            <span>{macro.label}</span>
            <strong>{formatGram(macro.grams)}</strong>
            <Percent>{percent}%</Percent>
          </LegendRow>
        ))}
      </Legend>
      <Note>탄수화물·단백질·지방의 열량 비율이에요.</Note>
    </Wrap>
  );
}

const Wrap = styled.div<{ $layout?: "stack" | "row" }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;

  ${(props) =>
    props.$layout === "row" &&
    `
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    align-items: center;
    column-gap: 16px;
    row-gap: 10px;

    & > p {
      grid-column: 1 / -1;
    }

    @media (max-width: 760px) {
      grid-template-columns: 92px minmax(0, 1fr);
      column-gap: 12px;
    }
  `}
`;

const Message = styled.p`
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 16px 12px;
  font-size: 14px;
  text-align: center;
`;

const DonutBox = styled.div<{ $layout: "stack" | "row" }>`
  position: relative;
  width: 100%;
  max-width: ${(props) => (props.$layout === "row" ? "112px" : "168px")};
  aspect-ratio: 1;

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

const Center = styled.div<{ $layout: "stack" | "row" }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.15;

  small {
    font-size: 11px;
    font-weight: 480;
  }

  strong {
    font-size: ${(props) => (props.$layout === "row" ? "19px" : "24px")};
    font-weight: 800;
  }

  span {
    font-size: 12px;
    font-weight: 700;
  }

  em {
    margin-top: 3px;
    font-size: 11px;
    font-style: normal;
    font-weight: 480;
  }
`;

const Legend = styled.ul`
  list-style: none;
  width: 100%;
  display: grid;
  gap: 8px;
`;

const LegendRow = styled.li`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 9px 12px;
  font-size: 14px;

  strong {
    font-weight: 700;
  }

  @media (max-width: 760px) {
    gap: 6px;
    padding: 8px 10px;
    font-size: 13px;
  }
`;

const Dot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  box-shadow: inset 0 0 0 1px var(--border);
`;

// 열량 줄은 색 점이 없어서, 다른 줄과 글자 위치를 맞추려고 같은 폭을 비워 둔다.
const DotSpace = styled.span`
  width: 12px;
`;

const Percent = styled.span`
  min-width: 40px;
  text-align: right;
  font-weight: 700;

  @media (max-width: 760px) {
    min-width: 34px;
  }
`;

const Note = styled.p`
  font-size: 12px;
  text-align: center;
`;
