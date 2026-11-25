/*
 * 효과음을 켤지 끌지 보관하는 스토어다.
 * 새로고침해도 고른 설정이 남도록 localStorage에 저장한다.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

type SoundState = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

// 움직임 줄이기를 켠 사용자는 갑작스러운 자극을 싫어할 수 있어서, 아직 고른 적이 없으면 꺼 둔 채로 시작한다.
const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      enabled: !prefersReducedMotion,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "bium-sound" },
  ),
);
