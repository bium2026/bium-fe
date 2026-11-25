/*
 * 동작마다 내는 짧은 효과음이다. 음원 파일 없이 Web Audio API로 그때그때 소리를 만든다.
 * 브라우저는 사용자가 화면을 누르기 전에는 소리를 막으므로, 첫 누름·키 입력 때 AudioContext를 만들거나 다시 켠다.
 * 효과음을 꺼 두면 아무 소리도 내지 않고 AudioContext도 만들지 않는다.
 */
import { useSoundStore } from "../store/soundStore";

export type SoundName =
  | "tap"
  | "success"
  | "delete"
  | "error"
  | "toggleOn"
  | "toggleOff"
  | "drop"
  | "open"
  | "close";

type Note = {
  // 시작 음높이(Hz)와, 소리가 끝날 때까지 미끄러질 음높이
  from: number;
  to?: number;
  // 효과음 시작부터 이 음이 시작되기까지의 시간과 길이(초)
  at?: number;
  duration: number;
  type?: OscillatorType;
  // 전체 음량에 곱하는 값(0~1)
  volume?: number;
};

// 귀에 거슬리지 않게 작게 낸다.
const MASTER_VOLUME = 0.12;

const sounds: Record<SoundName, Note[]> = {
  // 짧고 높은 "톡"
  tap: [{ from: 900, to: 1200, duration: 0.05, type: "triangle", volume: 0.35 }],
  // 도·미·솔로 올라가는 "띠로링"
  success: [
    { from: 1047, duration: 0.1, volume: 0.8 },
    { from: 1319, at: 0.07, duration: 0.1, volume: 0.8 },
    { from: 1568, at: 0.14, duration: 0.18, volume: 0.8 },
  ],
  // 아래로 떨어지는 "뿅"
  delete: [{ from: 700, to: 180, duration: 0.2, volume: 0.9 }],
  // 낮게 두 번 "뿌뿌"
  error: [
    { from: 330, duration: 0.11, type: "triangle", volume: 0.9 },
    { from: 247, at: 0.13, duration: 0.16, type: "triangle", volume: 0.9 },
  ],
  // 위로 튀어 오르고 반짝이는 "뾰롱"
  toggleOn: [
    { from: 660, to: 1320, duration: 0.12, volume: 0.8 },
    { from: 1760, at: 0.09, duration: 0.12, volume: 0.5 },
  ],
  // 살짝 내려가는 "뿅"
  toggleOff: [{ from: 880, to: 440, duration: 0.1, volume: 0.6 }],
  // 물방울이 떨어지는 "퐁"
  drop: [{ from: 380, to: 1100, duration: 0.08, volume: 0.9 }],
  open: [{ from: 520, to: 880, duration: 0.11, volume: 0.5 }],
  close: [{ from: 880, to: 520, duration: 0.11, volume: 0.5 }],
};

let context: AudioContext | null = null;
// 버튼 소리를 다른 효과음과 겹쳐 내지 않으려고, 마지막으로 소리를 낸 시각을 남긴다.
let lastPlayedAt = -Infinity;
let lastTapAt = -Infinity;
const CLOSE_AFTER_SOUND_MS = 400;

function getContext() {
  if (typeof AudioContext === "undefined") return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function playNote(ctx: AudioContext, note: Note) {
  const start = ctx.currentTime + (note.at ?? 0);
  const end = start + note.duration;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = note.type ?? "sine";
  oscillator.frequency.setValueAtTime(note.from, start);
  if (note.to) oscillator.frequency.exponentialRampToValueAtTime(note.to, end);

  // 딱 끊기면 "틱" 하는 잡음이 나서, 빠르게 커졌다가 부드럽게 줄어들게 한다.
  const peak = MASTER_VOLUME * (note.volume ?? 1);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

export function playSound(name: SoundName) {
  if (!useSoundStore.getState().enabled) return;
  // 저장에 성공하면 모달이 바로 닫히므로, 성공 소리에 닫는 소리가 겹치지 않게 한다.
  if (name === "close" && performance.now() - lastPlayedAt < CLOSE_AFTER_SOUND_MS) return;
  const ctx = getContext();
  if (!ctx) return;
  sounds[name].forEach((note) => playNote(ctx, note));
  if (name === "tap") lastTapAt = performance.now();
  else lastPlayedAt = performance.now();
}

const TAPPABLE = 'button, a[href], [role="button"], [role="tab"], input[type="checkbox"], summary';

// 화면 전체의 버튼·링크 누름에 "톡" 소리를 붙인다. 버튼마다 따로 붙이지 않아도 된다.
// 같은 누름으로 좋아요·모달 열기처럼 다른 효과음이 났으면 버튼 소리는 내지 않는다.
// main.tsx에서 한 번 부른다.
export function installSoundEffects() {
  const unlock = () => {
    if (useSoundStore.getState().enabled) getContext();
  };
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(TAPPABLE) : null;
      if (!target || target.matches(":disabled")) return;
      const clickedAt = performance.now();
      // 클릭 처리와 그에 따른 화면 갱신이 끝난 뒤에 다른 소리가 났는지 본다.
      window.setTimeout(() => {
        if (lastPlayedAt < clickedAt && lastTapAt < clickedAt) playSound("tap");
      }, 0);
    },
    true,
  );
}
