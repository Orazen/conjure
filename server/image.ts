import sharp from "sharp";
import type { Aspect } from "./workflow.ts";
import { nearestAspect } from "./workflow.ts";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];

/**
 * Normalise an uploaded photo: honour EXIF rotation, crop to the output aspect
 * around the most interesting region (faces, usually), and save a PNG at the
 * exact render size. FLUX 3 and LTX-2.5 then both see the same framing.
 */
export async function prepareInput(
  data: Uint8Array,
  aspect: Aspect | "auto",
  sizeFor: (a: Aspect) => [number, number],
): Promise<{ png: Buffer; aspect: Aspect; width: number; height: number }> {
  const img = sharp(data, { failOn: "error" }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("could not read image size");
  // metadata() reports pre-rotation size; swap for 90°/270° orientations.
  const rotated = (meta.orientation ?? 1) >= 5;
  const [w, h] = rotated ? [meta.height, meta.width] : [meta.width, meta.height];
  const chosen = aspect === "auto" ? nearestAspect(w, h) : aspect;
  const [width, height] = sizeFor(chosen);
  const png = await img
    .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
    .removeAlpha()
    .png()
    .toBuffer();
  return { png, aspect: chosen, width, height };
}

/** A tinted copy of the photo, used as the fake end frame in mock mode. */
export async function mockEndFrame(png: Buffer, color: string): Promise<Buffer> {
  return sharp(png).modulate({ saturation: 0.4 }).tint(color).png().toBuffer();
}
