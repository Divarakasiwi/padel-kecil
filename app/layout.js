import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "PadelKecil",
  description: "Padel community match system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        
        {/* HEADER */}
<div
  style={{
    textAlign: "center",
    padding: "20px 0 18px",
    fontWeight: 700,
    letterSpacing: "2.5px",
    fontSize: "22px",
    color: "#E8FFF9",
    textShadow: `
      0 0 6px rgba(79,209,197,0.6),
      0 0 16px rgba(79,209,197,0.4)
    `,
  }}
>
  PADEL KECIL
  <div
    style={{
      marginTop: "4px",
      fontSize: "12px",
      fontWeight: 400,
      letterSpacing: "1.2px",
      color: "#9FF5EA",
      opacity: 0.85,
    }}
  >
    by Fery
  </div>

  {/* GARIS HIAS */}
  <div
    style={{
      margin: "12px auto 0",
      width: "120px",
      height: "2px",
      borderRadius: "999px",
      background:
        "linear-gradient(90deg, transparent, #4FD1C5, transparent)",
      boxShadow: "0 0 12px rgba(79,209,197,0.6)",
    }}
  />
</div>


        {/* CONTENT */}
        {children}

      </body>
    </html>
  );
}
