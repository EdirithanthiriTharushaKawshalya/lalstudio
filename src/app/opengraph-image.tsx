import { ImageResponse } from "next/og";
export const alt = "LAL STUDIO — Since 1982 · Ambalangoda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraph() {
  return new ImageResponse(
    <div
      style={{
        background: "#161616",
        color: "#f6f5f1",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 70,
      }}
    >
      <div style={{ fontSize: 26, letterSpacing: 5 }}>
        SINCE 1982 · AMBALANGODA
      </div>
      <div style={{ fontSize: 100, letterSpacing: -5 }}>LAL STUDIO</div>
      <div style={{ fontSize: 36 }}>For the moments you want to keep.</div>
    </div>,
    size,
  );
}
