import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/app-icon";

// iOS applies its own rounded-corner mask to apple-touch-icon, so this is
// drawn edge-to-edge (bleed) rather than pre-rounded — see AppIconMark.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconMark size={180} bleed />, size);
}
