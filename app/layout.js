import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "PadelKecil",
  description: "Padel community match system",
};

/** Viewport untuk tablet/iPad: lebar device, skala tetap + themeColor untuk address bar */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0B0B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className} style={{ background: "#0B0B0B" }}>
        {/* HEADER – Padel Kecil by Fery, tengah, besar & estetik */}
        <header
          style={{
            background: "#0B0B0B",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 24px 24px",
            textAlign: "center",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
            }}
            aria-label="Kembali ke beranda"
          >
            <div
              style={{
                fontSize: "clamp(26px, 6vw, 36px)",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "#E8FFF9",
                textShadow: "0 0 12px rgba(79,209,197,0.5), 0 0 24px rgba(79,209,197,0.25)",
                lineHeight: 1.2,
              }}
            >
              Padel Kecil
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "clamp(13px, 2.5vw, 16px)",
                fontWeight: 400,
                letterSpacing: "0.35em",
                color: "#9FF5EA",
                opacity: 0.9,
              }}
            >
              by Fery
            </div>
          </Link>
          <div
            style={{
              marginTop: "16px",
              width: "100px",
              height: "2px",
              borderRadius: "999px",
              background: "linear-gradient(90deg, transparent, #4FD1C5, transparent)",
              boxShadow: "0 0 14px rgba(79,209,197,0.5)",
            }}
          />
        </header>

        {/* CONTENT */}
        {children}

      </body>
    </html>
  );
}
