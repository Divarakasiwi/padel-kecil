"use client";

import { useRef, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "6px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#0B0B0B",
  color: "#fff",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#4FD1C5",
  color: "#000",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#1A1A1A",
  color: "#E2E8F0",
  fontWeight: 500,
  cursor: "pointer",
};

const REGISTER_CODE =
  process.env.NEXT_PUBLIC_REGISTER_CODE && process.env.NEXT_PUBLIC_REGISTER_CODE.length === 6
    ? process.env.NEXT_PUBLIC_REGISTER_CODE
    : "123456"; // ganti via env di produksi

// Sementara disembunyikan agar bisa cek hasil cetak kartu tanpa upload foto
const HIDE_PHOTO_UPLOAD = true;

async function compressImage(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      let { width, height } = img;
      const maxDim = maxSize;
      if (width > height && width > maxDim) {
        height = (height * maxDim) / width;
        width = maxDim;
      } else if (height > maxDim) {
        width = (width * maxDim) / height;
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.(\w+)$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function createQrUrl(playerId) {
  const data = encodeURIComponent(playerId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${data}`;
}

export default function RegisterPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState(null); // data player setelah sukses daftar
  const [qrUrl, setQrUrl] = useState("");

  const frontRef = useRef(null);
  const backRef = useRef(null);
  const cardsWrapperRef = useRef(null);
  const [downloading, setDownloading] = useState(""); // "pdf" | "jpeg" | ""

  const CARD_ASPECT = 1.586; // rasio kartu debit
  const CAPTURE_WIDTH = 800;
  const CAPTURE_GAP = 20;
  const CAPTURE_CARD_W = (CAPTURE_WIDTH - CAPTURE_GAP) / 2;
  const CAPTURE_CARD_H = Math.round(CAPTURE_CARD_W / CARD_ASPECT);

  const waitForLayout = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const handleDownloadJPEG = async () => {
    if (!cardsWrapperRef.current || !frontRef.current || !backRef.current || !player) return;
    setDownloading("jpeg");
    const wrapper = cardsWrapperRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    const prev = {
      wrapperWidth: wrapper.style.width,
      wrapperGrid: wrapper.style.gridTemplateColumns || "1fr 1fr",
      frontWidth: front.style.width,
      frontHeight: front.style.height,
      backWidth: back.style.width,
      backHeight: back.style.height,
    };
    const SCALE = 2;
    try {
      wrapper.style.width = `${CAPTURE_WIDTH}px`;
      wrapper.style.gridTemplateColumns = `${CAPTURE_CARD_W}px ${CAPTURE_CARD_W}px`;
      front.style.width = `${CAPTURE_CARD_W}px`;
      front.style.height = `${CAPTURE_CARD_H}px`;
      back.style.width = `${CAPTURE_CARD_W}px`;
      back.style.height = `${CAPTURE_CARD_H}px`;
      await waitForLayout();
      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(front, { scale: SCALE, useCORS: true, backgroundColor: null, logging: false }),
        html2canvas(back, { scale: SCALE, useCORS: true, backgroundColor: null, logging: false }),
      ]);
      wrapper.style.width = prev.wrapperWidth;
      wrapper.style.gridTemplateColumns = prev.wrapperGrid;
      front.style.width = prev.frontWidth;
      front.style.height = prev.frontHeight;
      back.style.width = prev.backWidth;
      back.style.height = prev.backHeight;

      const gapPx = 20 * SCALE;
      const cardW = CAPTURE_CARD_W * SCALE;
      const cardH = CAPTURE_CARD_H * SCALE;
      const totalW = CAPTURE_WIDTH * SCALE;
      const composite = document.createElement("canvas");
      composite.width = totalW;
      composite.height = cardH;
      const ctx = composite.getContext("2d");
      ctx.fillStyle = "#f0f2f5";
      ctx.fillRect(0, 0, totalW, cardH);
      ctx.drawImage(frontCanvas, 0, 0, cardW, cardH, 0, 0, cardW, cardH);
      ctx.drawImage(backCanvas, 0, 0, cardW, cardH, cardW + gapPx, 0, cardW, cardH);
      const dataUrl = composite.toDataURL("image/jpeg", 0.92);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `kartu-pemain-${player.name.replace(/\s+/g, "-")}.jpg`;
      a.click();
    } catch (e) {
      console.error(e);
      wrapper.style.width = prev.wrapperWidth;
      wrapper.style.gridTemplateColumns = prev.wrapperGrid;
      front.style.width = prev.frontWidth;
      front.style.height = prev.frontHeight;
      back.style.width = prev.backWidth;
      back.style.height = prev.backHeight;
    } finally {
      setDownloading("");
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardsWrapperRef.current || !frontRef.current || !backRef.current || !player) return;
    setDownloading("pdf");
    const wrapper = cardsWrapperRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    const prev = {
      wrapperWidth: wrapper.style.width,
      wrapperGrid: wrapper.style.gridTemplateColumns || "1fr 1fr",
      frontWidth: front.style.width,
      frontHeight: front.style.height,
      backWidth: back.style.width,
      backHeight: back.style.height,
    };
    try {
      wrapper.style.width = `${CAPTURE_WIDTH}px`;
      wrapper.style.gridTemplateColumns = `${CAPTURE_CARD_W}px ${CAPTURE_CARD_W}px`;
      front.style.width = `${CAPTURE_CARD_W}px`;
      front.style.height = `${CAPTURE_CARD_H}px`;
      back.style.width = `${CAPTURE_CARD_W}px`;
      back.style.height = `${CAPTURE_CARD_H}px`;
      await waitForLayout();
      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(front, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        }),
        html2canvas(back, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        }),
      ]);
      wrapper.style.width = prev.wrapperWidth;
      wrapper.style.gridTemplateColumns = prev.wrapperGrid;
      front.style.width = prev.frontWidth;
      front.style.height = prev.frontHeight;
      back.style.width = prev.backWidth;
      back.style.height = prev.backHeight;

      const frontData = frontCanvas.toDataURL("image/jpeg", 0.92);
      const backData = backCanvas.toDataURL("image/jpeg", 0.92);

      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const boxW = (pageW - margin * 3) / 2;
      const boxH = boxW / CARD_ASPECT;

      // Gambar sesuai aspek rasio asli agar tidak gepeng
      const drawImage = (dataUrl, x, y, canvas) => {
        const imgAspect = canvas.width / canvas.height;
        const boxAspect = boxW / boxH;
        let w = boxW, h = boxH;
        if (imgAspect > boxAspect) {
          h = boxW / imgAspect;
        } else {
          w = boxH * imgAspect;
        }
        const dx = x + (boxW - w) / 2;
        const dy = y + (boxH - h) / 2;
        pdf.addImage(dataUrl, "JPEG", dx, dy, w, h);
      };
      const yCard = (pageH - boxH) / 2;
      drawImage(frontData, margin, yCard, frontCanvas);
      drawImage(backData, margin * 2 + boxW, yCard, backCanvas);

      pdf.save(`kartu-pemain-${player.name.replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      console.error(e);
      wrapper.style.width = prev.wrapperWidth;
      wrapper.style.gridTemplateColumns = prev.wrapperGrid;
      front.style.width = prev.frontWidth;
      front.style.height = prev.frontHeight;
      back.style.width = prev.backWidth;
      back.style.height = prev.backHeight;
    } finally {
      setDownloading("");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    setError("");
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!navigator.onLine) {
      setError("Koneksi internet diperlukan untuk registrasi. Silakan cek koneksi.");
      return;
    }

    if (code.trim().length !== 6 || code.trim() !== REGISTER_CODE) {
      setError("kode salah, silakan coba lagi");
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setError("Lengkapi nama dan nomor HP terlebih dahulu.");
      return;
    }
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 12) {
      setError("Nomor HP harus 10–12 digit (contoh: 08xxxxxxxxxx).");
      return;
    }

    if (!HIDE_PHOTO_UPLOAD && !photoFile) {
      setError("Lengkapi nama, nomor HP, dan foto terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);

      let photoUrl = "";
      if (!HIDE_PHOTO_UPLOAD && photoFile) {
        // compress image jika besar
        let fileToUpload = photoFile;
        if (photoFile.size > 3 * 1024 * 1024) {
          fileToUpload = await compressImage(photoFile);
        }
        // upload ke Storage
        const storageRef = ref(
          storage,
          `players/${Date.now()}_${fileToUpload.name.replace(/\s+/g, "_")}`
        );
        const snapshot = await uploadBytes(storageRef, fileToUpload);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      // simpan ke Firestore
      const docRef = await addDoc(collection(db, "players"), {
        name: name.trim(),
        phone: phone.trim(),
        photoUrl,
        badge: null,
        isVIP: false,
        status: "active",
        createdAt: serverTimestamp(),
      });

      const playerId = docRef.id;
      const qr = createQrUrl(playerId);

      setPlayer({
        id: playerId,
        name: name.trim(),
        photoUrl,
      });
      setQrUrl(qr);
    } catch (e) {
      console.error(e);
      setError("Terjadi kesalahan saat menyimpan data. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const isCardView = !!player;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isCardView ? "#f0f2f5" : "#0B0B0B",
        color: isCardView ? "#1a1a1a" : "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: player ? "820px" : "460px",
          background: isCardView ? "#ffffff" : "#121212",
          padding: player ? "28px 24px 24px" : "28px 24px 24px",
          borderRadius: "16px",
          border: isCardView ? "1px solid #e2e8f0" : "1px solid #222",
          boxShadow: isCardView ? "0 4px 20px rgba(0,0,0,0.08)" : "none",
        }}
      >
        {!player ? (
          <>
            <h2
              style={{
                marginBottom: "6px",
                textAlign: "center",
                fontSize: "22px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Daftar Pemain
            </h2>
            <p
              style={{
                marginBottom: "20px",
                textAlign: "center",
                fontSize: "12px",
                color: "#A0AEC0",
              }}
            >
              Isi data singkat dan ambil selfie yang jelas. Kartu akan dibuat otomatis.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#A0AEC0",
                  }}
                >
                  Kode (6 digit)
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Masukkan kode dari host"
                  style={inputStyle}
                  maxLength={6}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#A0AEC0",
                  }}
                >
                  Nama
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama panggilan"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#A0AEC0",
                  }}
                >
                  Nomor HP
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={12}
                  value={phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                    setPhone(v);
                  }}
                  placeholder="08xxxxxxxxxx"
                  style={inputStyle}
                />
              </div>

              {!HIDE_PHOTO_UPLOAD && (
                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "#A0AEC0",
                    }}
                  >
                    Foto wajah
                  </label>
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => {
                        const input = document.getElementById("photo-input");
                        if (input) {
                          input.click();
                        }
                      }}
                    >
                      Ambil foto / pilih dari galeri
                    </button>
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                  <p
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#718096",
                    }}
                  >
                    Gunakan kamera depan, pastikan wajah menghadap kamera dan terang.
                  </p>
                  {photoPreview && (
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 180,
                          height: 180,
                          borderRadius: "999px",
                          border: "2px solid #4FD1C5",
                          boxShadow: "0 0 18px rgba(79,209,197,0.6)",
                          overflow: "hidden",
                          position: "relative",
                          background:
                            "radial-gradient(circle at 30% 20%, #4FD1C5 0, transparent 55%)",
                        }}
                      >
                        <img
                          src={photoPreview}
                          alt="Preview"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 12,
                    color: "#FEB2B2",
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" style={buttonStyle} disabled={loading}>
                {loading ? "MENYIMPAN..." : "DAFTAR"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2
              style={{
                marginBottom: "6px",
                textAlign: "center",
                fontSize: "22px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#1a1a1a",
              }}
            >
              Kartu Pemain
            </h2>
            <p
              style={{
                marginBottom: "20px",
                textAlign: "center",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Simpan gambar atau PDF kartu ini untuk dicetak seperti kartu debit.
            </p>

            <div
              ref={cardsWrapperRef}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              {/* KARTU DEPAN */}
              <div
                ref={frontRef}
                style={{
                  background: "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(79,209,197,0.18) 0%, transparent 50%), #0B0B0B",
                  borderRadius: 20,
                  padding: 20,
                  color: "#E2E8F0",
                  position: "relative",
                  aspectRatio: "1.586",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                  overflow: "hidden",
                }}
              >
                {/* Garis dekoratif tosca – terang & glow seperti referensi */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "140%",
                    height: 3,
                    background: "linear-gradient(90deg, #4FD1C5 0%, rgba(79,209,197,0.5) 50%, transparent 85%)",
                    transform: "rotate(-32deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 16px #4FD1C5, 0 0 32px rgba(79,209,197,0.6)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "90%",
                    height: 2,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.95) 0%, transparent 100%)",
                    transform: "rotate(-22deg)",
                    transformOrigin: "left center",
                    marginTop: 28,
                    boxShadow: "0 0 10px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: "110%",
                    height: 3,
                    background: "linear-gradient(90deg, transparent 25%, rgba(79,209,197,0.5) 50%, #4FD1C5 100%)",
                    transform: "rotate(148deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 16px #4FD1C5, 0 0 32px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: "75%",
                    height: 2,
                    background: "linear-gradient(90deg, transparent 0%, rgba(79,209,197,0.8) 100%)",
                    transform: "rotate(158deg)",
                    transformOrigin: "right center",
                    marginBottom: 22,
                    boxShadow: "0 0 8px rgba(79,209,197,0.4)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "48%",
                    width: "45%",
                    height: 2,
                    background: "linear-gradient(90deg, transparent, rgba(79,209,197,0.6))",
                    transform: "rotate(90deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 6px rgba(79,209,197,0.3)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: "28%",
                    width: "38%",
                    height: 2,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.5), transparent)",
                    transform: "rotate(-90deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 6px rgba(79,209,197,0.3)",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      opacity: 0.9,
                    }}
                  >
                    PADEL KECIL
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>
                    ID: {player.id}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid rgba(255,255,255,0.85)",
                        boxShadow: "0 0 12px rgba(0,0,0,0.7)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)",
                        border: "2px solid rgba(255,255,255,0.85)",
                        boxShadow: "0 0 12px rgba(0,0,0,0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontWeight: 600,
                        color: "#E2E8F0",
                      }}
                    >
                      {(player.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                      }}
                    >
                      {player.name}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    opacity: 0.8,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  Player Card
                </div>
              </div>

              {/* KARTU BELAKANG */}
              <div
                ref={backRef}
                style={{
                  background: "radial-gradient(ellipse 70% 60% at 80% 80%, rgba(79,209,197,0.18) 0%, transparent 50%), #0B0B0B",
                  borderRadius: 20,
                  padding: 20,
                  color: "#E2E8F0",
                  position: "relative",
                  aspectRatio: "1.586",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                  overflow: "hidden",
                }}
              >
                {/* Garis dekoratif tosca – terang & glow */}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "130%",
                    height: 3,
                    background: "linear-gradient(90deg, transparent 20%, rgba(79,209,197,0.5) 50%, #4FD1C5 100%)",
                    transform: "rotate(32deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 16px #4FD1C5, 0 0 32px rgba(79,209,197,0.6)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "85%",
                    height: 2,
                    background: "linear-gradient(90deg, transparent 0%, rgba(79,209,197,0.95) 100%)",
                    transform: "rotate(22deg)",
                    transformOrigin: "right center",
                    marginTop: 26,
                    boxShadow: "0 0 10px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "120%",
                    height: 3,
                    background: "linear-gradient(90deg, #4FD1C5 0%, rgba(79,209,197,0.5) 75%, transparent 100%)",
                    transform: "rotate(-148deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 16px #4FD1C5, 0 0 32px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "70%",
                    height: 2,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.8) 0%, transparent 100%)",
                    transform: "rotate(-158deg)",
                    transformOrigin: "left center",
                    marginBottom: 20,
                    boxShadow: "0 0 8px rgba(79,209,197,0.4)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "46%",
                    width: "42%",
                    height: 2,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.6), transparent)",
                    transform: "rotate(-90deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 6px rgba(79,209,197,0.3)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: "26%",
                    width: "36%",
                    height: 2,
                    background: "linear-gradient(90deg, transparent, rgba(79,209,197,0.5))",
                    transform: "rotate(90deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 6px rgba(79,209,197,0.3)",
                  }}
                />

                <div
                  style={{
                    width: "52%",
                    aspectRatio: "1",
                    flexShrink: 0,
                    background: "#000",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 10,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <img
                    src={qrUrl}
                    alt="QR Player"
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "center",
                    opacity: 0.95,
                    position: "relative",
                    zIndex: 1,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Scan untuk bermain
                </div>
                <div
                  style={{
                    fontSize: 9,
                    textAlign: "center",
                    opacity: 0.75,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  Panel host PADEL KECIL
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={!!downloading}
                style={{
                  ...buttonStyle,
                  background: downloading ? "#2D3748" : "#4FD1C5",
                  minWidth: 160,
                }}
              >
                {downloading === "pdf" ? "Mengunduh..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={handleDownloadJPEG}
                disabled={!!downloading}
                style={{
                  ...secondaryButtonStyle,
                  background: "transparent",
                  borderColor: "#4FD1C5",
                  color: "#4FD1C5",
                  minWidth: 160,
                }}
              >
                {downloading === "jpeg" ? "Mengunduh..." : "Download JPEG"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
