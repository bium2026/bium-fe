/*
 * 도감 재료 사진을 올리기 전에 고른 파일을 확인하고 줄인다.
 * 서버는 JPG·PNG를 5MB까지 받아 긴 변 256px PNG로 다시 만든다. 휴대폰 사진은 크고 무거워서
 * 브라우저에서 먼저 긴 변을 줄인 PNG로 바꿔 보내면 빨리 올라가고 크기 제한에도 걸리지 않는다.
 */

export const INGREDIENT_IMAGE_ACCEPT = "image/jpeg,image/png";

const IMAGE_TYPES = ["image/jpeg", "image/png"];
// 서버가 256px로 다시 줄이므로 화질을 남길 만큼만 크게 보낸다.
const MAX_SIDE = 512;
const MAX_BYTES = 5 * 1024 * 1024;

export type PreparedImage = { status: "ok"; file: File } | { status: "error"; message: string };

export async function prepareIngredientImage(file: File): Promise<PreparedImage> {
  if (!IMAGE_TYPES.includes(file.type)) return { status: "error", message: "JPG나 PNG 사진만 올릴 수 있어요." };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { status: "error", message: "사진을 열지 못했어요. 다른 사진을 골라 주세요." };
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return sizeChecked(file);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // 투명한 배경을 살리려고 PNG로 바꾼다.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return sizeChecked(file);
    const name = file.name.replace(/\.[^.]*$/, "") || "ingredient";
    return sizeChecked(new File([blob], `${name}.png`, { type: "image/png", lastModified: file.lastModified }));
  } finally {
    bitmap.close();
  }
}

// 서버의 크기 제한을 넘으면 보내기 전에 알린다.
function sizeChecked(file: File): PreparedImage {
  if (file.size > MAX_BYTES) return { status: "error", message: "사진은 5MB까지 올릴 수 있어요." };
  return { status: "ok", file };
}
