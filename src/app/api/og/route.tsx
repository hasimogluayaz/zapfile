import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getToolBySlug } from "@/lib/tools";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") || "tools";
  const tool = getToolBySlug(slug);

  const title = tool?.name ?? "ZapFile";
  const subtitle = tool?.description ?? "Free browser-based file tools";
  const emoji = tool?.emoji ?? "⚡";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f1117 0%, #1e1b4b 45%, #312e81 100%)",
          padding: 72,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          {emoji}
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#f1f2f6",
            lineHeight: 1.15,
            maxWidth: 900,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a0a4b8",
            marginTop: 20,
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            Z
          </div>
          <div style={{ color: "#818cf8", fontSize: 26, fontWeight: 600 }}>
            zapfile.xyz
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
