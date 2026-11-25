/*
 * 재료 아이콘이다. 도감 재료에 사진을 올렸으면 사진을, 아니면 이모지를 보여 준다.
 * 사진 크기는 1em이라서 지금 이모지를 감싼 요소의 글자 크기를 그대로 따른다. 화면마다 크기를 따로 정하지 않아도 된다.
 * 사진을 받지 못하면(지워졌거나 서버에 닿지 못하면) 이모지로 돌아간다.
 * 이름은 옆에 따로 보여 주거나 화면 읽기 프로그램용 글이 있어서, 사진은 꾸밈으로 두고 대체 글을 비운다.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import styled from "@emotion/styled";
import { toServerUrl } from "../../api/client";

type IngredientIconProps = {
  emoji: string | null | undefined;
  imageUrl?: string | null;
  // 사진도 이모지도 없을 때 보여 줄 것 (예: 이름 첫 글자)
  fallback?: ReactNode;
};

function IngredientIcon({ emoji, imageUrl, fallback = null }: IngredientIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (imageUrl && failedUrl !== imageUrl) {
    return (
      <Photo
        src={toServerUrl(imageUrl)}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setFailedUrl(imageUrl)}
      />
    );
  }
  return <>{emoji || fallback}</>;
}

export default IngredientIcon;

const Photo = styled.img`
  width: 1.15em;
  height: 1.15em;
  border-radius: 0.28em;
  object-fit: cover;
  vertical-align: middle;
  /* 냉장고 재료는 끌어서 옮기므로 사진이 따로 끌리지 않게 한다. */
  pointer-events: none;
  user-select: none;
`;
