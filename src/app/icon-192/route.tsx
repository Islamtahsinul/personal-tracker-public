import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/app-icon";

// Standalone route (rather than the icon.tsx convention) so manifest.ts has
// a stable URL to reference for the PWA home-screen icon.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<AppIconMark size={192} />, { width: 192, height: 192 });
}
