import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "HCMUTE S-Link & QR Code";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)",
        }}
      >
        {/* Logo/Icon Area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 20,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 16,
            }}
          >
            HCMUTE
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: "white",
              marginBottom: 24,
            }}
          >
            S-Link & QR Code
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 28,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Rút gọn liên kết và tạo mã QR dễ dàng
        </div>

        {/* Bottom Badge */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#71717a",
            }}
          >
            link.hcmute.edu.vn
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
