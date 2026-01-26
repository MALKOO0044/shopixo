import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const title = decodeURIComponent(params.slug).replace(/[-_]/g, " ") || "Product";
  const price = "";

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
        <div style={{ fontSize: 48, color: "#4f46e5", fontWeight: 800 }}>Shopixo</div>
        <div style={{ marginTop: 12, fontSize: 56, color: "#111827", fontWeight: 800, maxWidth: 980 }}>
          {title}
        </div>
        {price && (
          <div style={{ marginTop: 16, fontSize: 40, color: "#1f2937", fontWeight: 700 }}>{price}</div>
        )}
        <div style={{ marginTop: 18, fontSize: 24, color: "#374151" }}>
          Modern Online Store • Fast Delivery • Secure Checkout
        </div>
      </div>
    ),
    { ...size }
  );
}
