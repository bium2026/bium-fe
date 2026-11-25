/*
 * 헤더에서 효과음을 켜고 끄는 버튼이다.
 * 켜면 바로 소리를 한 번 내서 어느 정도 크기로 나는지 들려준다.
 */
import styled from "@emotion/styled";
import { Volume2, VolumeX } from "lucide-react";
import { playSound } from "../../sound/soundEffects";
import { useSoundStore } from "../../store/soundStore";

function SoundToggle() {
  const enabled = useSoundStore((state) => state.enabled);
  const setEnabled = useSoundStore((state) => state.setEnabled);

  const handleClick = () => {
    setEnabled(!enabled);
    if (!enabled) playSound("toggleOn");
  };

  const label = enabled ? "효과음 끄기" : "효과음 켜기";

  return (
    <Button type="button" aria-label={label} title={label} onClick={handleClick}>
      {enabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
    </Button>
  );
}

export default SoundToggle;

// 옆의 로그아웃 버튼과 같은 크기·테두리로 맞춘다.
const Button = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background: var(--surface-soft);
  }

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
`;
