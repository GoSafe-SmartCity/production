import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 50%, #16213e 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            HCMUTE
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "white",
            }}
          >
            S-Link
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a1a1aa",
            textAlign: "center",
          }}
        >
          Rút gọn liên kết và tạo mã QR dễ dàng
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 20,
            color: "#71717a",
          }}
        >
          Trường Đại học Công nghệ Kỹ thuật TP. Hồ Chí Minh
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
