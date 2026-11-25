/*
 * 냉장고 본체 안쪽 배경에 차가운 구역만 움직임을 깔아 냉장실·냉동실을 실온과 한눈에 구분하게 한다.
 * 냉장실은 위에서 찬 공기가 내려오며 찬 바람이 옆으로 흐르고, 냉동실은 눈송이가 내리며 가장자리에 서리가 낀다.
 * 실온은 장식이 어색해 보여 구역 색으로만 구분한다.
 * 선반과 재료 카드 뒤에 깔리는 장식이라 화면 읽기 프로그램과 마우스·터치 입력에서는 빠진다.
 */
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Snowflake, Wind } from "lucide-react";
import type { ZoneId } from "./fridgeTypes";

type ZoneAmbienceProps = {
  zoneId: ZoneId;
};

// 위치·크기·시간은 렌더마다 같아야 해서 정해 둔 값을 쓴다. left는 %, delay는 초다.
const mists = [
  { left: 4, width: 46, duration: 9, delay: 0 },
  { left: 40, width: 56, duration: 11, delay: 3.5 },
  { left: 18, width: 40, duration: 10, delay: 7 },
];

const winds = [
  { top: 18, size: 30, duration: 14, delay: 0 },
  { top: 52, size: 24, duration: 17, delay: 6 },
  { top: 80, size: 28, duration: 15, delay: 11 },
];

const flakes = [
  { left: 6, size: 20, duration: 11, delay: 0 },
  { left: 18, size: 16, duration: 9, delay: 4 },
  { left: 31, size: 24, duration: 13, delay: 2 },
  { left: 45, size: 18, duration: 10, delay: 6.5 },
  { left: 58, size: 22, duration: 12, delay: 1 },
  { left: 70, size: 16, duration: 9.5, delay: 5 },
  { left: 82, size: 20, duration: 11.5, delay: 3 },
  { left: 93, size: 17, duration: 10.5, delay: 7.5 },
];

function ZoneAmbience({ zoneId }: ZoneAmbienceProps) {
  if (zoneId === "pantry") return null;

  return (
    <Layer aria-hidden="true" $zoneId={zoneId}>
      {zoneId === "fridge" &&
        winds.map((wind, index) => (
          <Breeze
            key={`wind-${index}`}
            style={{ top: `${wind.top}%`, animationDuration: `${wind.duration}s`, animationDelay: `${-wind.delay}s` }}
          >
            <Wind size={wind.size} strokeWidth={2} />
          </Breeze>
        ))}
      {zoneId === "fridge" &&
        mists.map((mist, index) => (
          <Mist
            key={index}
            style={{
              left: `${mist.left}%`,
              width: `${mist.width}%`,
              animationDuration: `${mist.duration}s`,
              animationDelay: `${-mist.delay}s`,
            }}
          />
        ))}
      {zoneId === "freezer" &&
        flakes.map((flake, index) => (
          <Flake
            key={index}
            style={{ left: `${flake.left}%`, animationDuration: `${flake.duration}s`, animationDelay: `${-flake.delay}s` }}
          >
            <Snowflake size={flake.size} strokeWidth={2.2} />
          </Flake>
        ))}
    </Layer>
  );
}

export default ZoneAmbience;

// 움직임을 줄인 환경에서는 각 장식을 멈춘 채 중간 지점에 두어 구역 구분은 남긴다.
// 장식이 높이의 몇 %만큼 움직일지(cqh) 정하려고 이 층을 크기 컨테이너로 둔다.
// 냉동실은 가장자리에 흰빛을 안쪽으로 번지게 해 서리가 낀 것처럼 보인다.
const Layer = styled.div<{ $zoneId: ZoneId }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  container-type: size;
  box-shadow: ${(props) =>
    props.$zoneId === "freezer" ? "inset 0 0 28px 6px color-mix(in srgb, var(--surface) 85%, transparent)" : "none"};
`;

const fall = keyframes`
  0% { transform: translateY(-40%); opacity: 0; }
  20% { opacity: 0.9; }
  80% { opacity: 0.6; }
  100% { transform: translateY(260%); opacity: 0; }
`;

const Mist = styled.span`
  position: absolute;
  top: 0;
  height: 40%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, var(--surface) 10%, transparent 70%);
  opacity: 0;
  animation: ${fall} ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.6;
    transform: translateY(40%);
  }
`;

const drift = keyframes`
  0% { transform: translateX(-40px); opacity: 0; }
  15% { opacity: 0.8; }
  85% { opacity: 0.8; }
  100% { transform: translateX(calc(100cqw + 40px)); opacity: 0; }
`;

// 흰 바람은 밝은 민트 위에서 묻혀서 구역 테두리 색으로 그린다.
const Breeze = styled.span`
  position: absolute;
  left: 0;
  display: block;
  color: var(--zone-frame);
  line-height: 0;
  opacity: 0;
  animation: ${drift} linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: translateX(40cqw);
  }
`;

const snow = keyframes`
  0% { transform: translate(0, -24px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translate(12px, 50cqh) rotate(120deg); }
  90% { opacity: 1; }
  100% { transform: translate(-6px, 100cqh) rotate(240deg); opacity: 0; }
`;

const Flake = styled.span`
  position: absolute;
  top: 0;
  display: block;
  color: var(--surface);
  line-height: 0;
  animation: ${snow} linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: translateY(30cqh);
  }
`;
