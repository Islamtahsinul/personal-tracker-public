import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/app-icon";

// Full-bleed + safe-zone glyph so Android's adaptive-icon mask (circle,
// squircle, rounded-square, etc.) doesn't crop the mark.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<AppIconMark size={512} bleed safeZone />, { width: 512, height: 512 });
}
