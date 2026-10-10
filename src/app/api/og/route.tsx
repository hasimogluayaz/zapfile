import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getToolBySlug } from "@/lib/tools";

export const runtime = "edge";

// Same geometry as public/logo.svg (Lucide "zap" on a volt tile).
const ZAP_PATH =
  "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z";

const INK = "#16181D";
const PAPER = "#F6F7F9";
const VOLT = "#FFD60A";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") || "tools";
  const tool = getToolBySlug(slug);

  const title = tool?.name ?? "Work on your files without uploading them.";
  const subtitle = tool?.description ?? "Free browser-based file tools";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: VOLT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24">
              <path
                d={ZAP_PATH}
                fill={INK}
                stroke={INK}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em" }}>
            ZapFile
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#525761",
              marginTop: 20,
              maxWidth: 1000,
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, color: "#525761" }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: VOLT }} />
          Free, private, runs in your browser
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
