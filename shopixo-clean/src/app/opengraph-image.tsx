import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #EEF2FF 0%, #ECFEFF 100%)",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 56,
            color: "#1f2937",
            fontWeight: 800,
          }}
        >
          Shopixo
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 36,
            color: "#111827",
            fontWeight: 700,
          }}
        >
          Modern Online Store
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#374151",
          }}
        >
          Secure checkout • Fast delivery • Curated collections
        </div>
      </div>
    ),
    { ...size }
  );
}
