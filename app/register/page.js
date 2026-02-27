"use client";

import { useRef, useState, useEffect } from "react";
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

// Kode register dicek di server (API), tidak ada di client sehingga user tidak bisa melihatnya.
// Foto wajah di-upload via API ke Firebase Storage; thumbnail/kartu disimpan di Firestore.
const HIDE_PHOTO_UPLOAD = false;

const MAX_NAME_LENGTH = 40;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const RATE_LIMIT_MAX = 5; // maks. 5 submit per menit

function normalizeName(value) {
  return value.trim().replace(/\s{2,}/g, " ").slice(0, MAX_NAME_LENGTH);
}

async function compressImage(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/** Gambar base64 untuk Firestore: court/barista pakai thumbnail kecil, kartu pemain pakai ukuran lebih besar. */
async function createPhotoDataUrl(file, size, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }
      let w = img.width;
      let h = img.height;
      if (w > h && w > size) {
        h = (h * size) / w;
        w = size;
      } else if (h > size) {
        w = (w * size) / h;
        h = size;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl || "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve("");
    };
    img.src = objectUrl;
  });
}

/** Crop gambar sesuai posisi yang user pilih di preview (object-position %, sama seperti CSS). */
async function cropImageByPosition(file, posPercent, size = 400) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(size / iw, size / ih);
      const scaledW = iw * scale;
      const scaledH = ih * scale;
      const centerViewX = size / 2;
      const centerViewY = size / 2;
      const centerImgX = (posPercent.x / 100) * scaledW;
      const centerImgY = (posPercent.y / 100) * scaledH;
      const srcW = size / scale;
      const srcH = size / scale;
      let srcX = (centerImgX - centerViewX) / scale;
      let srcY = (centerImgY - centerViewY) / scale;
      srcX = Math.max(0, Math.min(iw - srcW, srcX));
      srcY = Math.max(0, Math.min(ih - srcH, srcY));
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, size, size);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function createQrUrl(playerId) {
  const data = encodeURIComponent(playerId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${data}&color=000000&bgcolor=FFFFFF`;
}

export default function RegisterPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoPreviewUrlRef = useRef("");
  const [photoPreviewPosition, setPhotoPreviewPosition] = useState({ x: 50, y: 50 });
  const photoDragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPos: { x: 50, y: 50 } });
  const [showCamera, setShowCamera] = useState(false);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    if (showCamera && cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [showCamera]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
        photoPreviewUrlRef.current = "";
      }
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ code: "", name: "", phone: "" });
  const [player, setPlayer] = useState(null);
  const [qrUrl, setQrUrl] = useState("");

  const submitTimestampsRef = useRef([]);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const cardsWrapperRef = useRef(null);
  const [downloading, setDownloading] = useState(""); // "pdf" | "jpeg" | ""

  const CARD_ASPECT = 1.586; // rasio kartu debit
  const CAPTURE_WIDTH = 800; // lebar total dua panel (satu kartu utuh, gap 0)
  const CAPTURE_GAP = 0;
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

      const gapPx = CAPTURE_GAP * SCALE;
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      }, 0);
    } catch (err) {
      console.error(err);
      setError("Tidak bisa akses kamera. Izinkan kamera di pengaturan browser atau pilih dari galeri.");
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureFromCamera = () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
        if (photoPreviewUrlRef.current) {
          URL.revokeObjectURL(photoPreviewUrlRef.current);
        }
        const previewUrl = URL.createObjectURL(file);
        photoPreviewUrlRef.current = previewUrl;
        setPhotoFile(file);
        setPhotoPreviewPosition({ x: 50, y: 50 });
        setPhotoPreview(previewUrl);
        setError("");
        stopCamera();
      },
      "image/jpeg",
      0.88
    );
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
    setPhotoPreviewPosition({ x: 50, y: 50 });
    const url = URL.createObjectURL(file);
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
    }
    photoPreviewUrlRef.current = url;
    setPhotoPreview(url);
    e.target.value = "";
  };

  const handleDaftarLagi = () => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = "";
    }
    setPlayer(null);
    setQrUrl("");
    setCode("");
    setName("");
    setPhone("");
    setError("");
    setFieldErrors({ code: "", name: "", phone: "" });
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoPreviewPosition({ x: 50, y: 50 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({ code: "", name: "", phone: "" });

    if (!navigator.onLine) {
      setError("Koneksi internet diperlukan untuk registrasi. Silakan cek koneksi.");
      return;
    }

    const now = Date.now();
    submitTimestampsRef.current = submitTimestampsRef.current.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (submitTimestampsRef.current.length >= RATE_LIMIT_MAX) {
      setError("Terlalu banyak percobaan. Coba lagi dalam 1 menit.");
      return;
    }
    submitTimestampsRef.current.push(now);

    const codeTrim = code.replace(/\D/g, "").trim();
    const codeValid = /^\d{6}$/.test(codeTrim);
    const normalizedName = normalizeName(name);
    const nameValid = !!normalizedName && normalizedName.length <= MAX_NAME_LENGTH;
    const digitsOnly = phone.replace(/\D/g, "");
    const phoneValid = digitsOnly.length >= 10 && digitsOnly.length <= 12;

    if (!codeValid) {
      setFieldErrors((prev) => ({ ...prev, code: "Kode harus 6 digit." }));
    }
    if (!nameValid) {
      setFieldErrors((prev) => ({
        ...prev,
        name: !normalizedName ? "Nama wajib diisi." : `Nama maksimal ${MAX_NAME_LENGTH} huruf.`,
      }));
    }
    if (!phoneValid) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "Nomor HP harus 10–12 digit (contoh: 08xxxxxxxxxx).",
      }));
    }
    if (!codeValid || !nameValid || !phoneValid) {
      setError("Lengkapi data dengan benar.");
      return;
    }

    if (!HIDE_PHOTO_UPLOAD && !photoFile) {
      setError("Lengkapi nama, nomor HP, dan foto terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    const fileToBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const timeout = (ms) =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    const doSave = async () => {
      let photoBase64 = "";
      let photoThumbnail = "";
      let photoCard = "";
      if (!HIDE_PHOTO_UPLOAD && photoFile) {
        let fileToUpload = photoFile;
        if (photoPreviewPosition.x !== 50 || photoPreviewPosition.y !== 50) {
          fileToUpload = await cropImageByPosition(photoFile, photoPreviewPosition, 400);
        }
        if (fileToUpload.size > 3 * 1024 * 1024) {
          fileToUpload = await compressImage(fileToUpload);
        }
        photoBase64 = await fileToBase64(fileToUpload);
        photoThumbnail = await createPhotoDataUrl(fileToUpload, 64, 0.6);
        photoCard = await createPhotoDataUrl(fileToUpload, 280, 0.78);
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeTrim,
          name: normalizedName,
          phone: phone.replace(/\D/g, ""),
          photoBase64,
          photoThumbnail,
          photoCard,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftar.");
      }

      const { playerId, player: playerData } = data;
      setQrUrl(createQrUrl(playerId));
      setPlayer(playerData);
    };

    try {
      await Promise.race([doSave(), timeout(45000)]);
    } catch (e) {
      console.error(e);
      setError(
        e?.message === "Timeout"
          ? "Koneksi terlalu lama. Cek internet atau coba lagi."
          : e?.message || "Terjadi kesalahan saat menyimpan data. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const isCardView = !!player;
  const memberSinceYear = isCardView && player.createdAt
    ? (player.createdAt.toDate ? player.createdAt.toDate().getFullYear() : new Date(player.createdAt).getFullYear())
    : new Date().getFullYear();

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
      {showCamera && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <p style={{ color: "#fff", marginBottom: 16, fontSize: 14 }}>Arahkan wajah ke kamera, lalu jepret</p>
          <div
            style={{
              width: "min(320px, 100vw - 48px)",
              aspectRatio: "1",
              borderRadius: "999px",
              overflow: "hidden",
              border: "3px solid #4FD1C5",
              background: "#000",
            }}
          >
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={captureFromCamera}
              style={{
                padding: "14px 28px",
                background: "#4FD1C5",
                color: "#0B0B0B",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Jepret
            </button>
            <button
              type="button"
              onClick={stopCamera}
              style={{
                padding: "14px 28px",
                background: "transparent",
                color: "#9FF5EA",
                border: "1px solid #4FD1C5",
                borderRadius: 12,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          width: "100%",
          maxWidth: player ? "820px" : "460px",
          background: isCardView ? "#ffffff" : "#121212",
          padding: player ? "28px 24px 24px" : "28px 24px 24px",
          borderRadius: "16px",
          border: isCardView ? "1px solid #e2e8f0" : "1px solid #222",
          boxShadow: isCardView
            ? "0 4px 20px rgba(0,0,0,0.08)"
            : "0 0 40px rgba(79,209,197,0.2), 0 0 80px rgba(79,209,197,0.12), 0 0 120px rgba(79,209,197,0.06)",
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
              {HIDE_PHOTO_UPLOAD
                ? "Isi data singkat. Kartu akan dibuat otomatis."
                : "Isi data singkat dan ambil selfie yang jelas. Kartu akan dibuat otomatis."}
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
                  onChange={(e) => {
                    const v = String(e.target.value || "").replace(/\D/g, "").slice(0, 6);
                    setCode(v);
                    if (fieldErrors.code) setFieldErrors((p) => ({ ...p, code: "" }));
                  }}
                  placeholder="Masukkan kode dari host"
                  style={{ ...inputStyle, borderColor: fieldErrors.code ? "#F56565" : undefined }}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{6}"
                />
                {fieldErrors.code && (
                  <div style={{ fontSize: 11, color: "#FEB2B2", marginTop: 4 }}>{fieldErrors.code}</div>
                )}
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
                  Nama (maks. {MAX_NAME_LENGTH} huruf)
                </label>
                <input
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\s{2,}/g, " ").slice(0, MAX_NAME_LENGTH);
                    setName(v);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
                  }}
                  onBlur={() => setName((prev) => prev.trim())}
                  placeholder="Nama panggilan"
                  style={{ ...inputStyle, borderColor: fieldErrors.name ? "#F56565" : undefined }}
                />
                {fieldErrors.name && (
                  <div style={{ fontSize: 11, color: "#FEB2B2", marginTop: 4 }}>{fieldErrors.name}</div>
                )}
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
                    const v = e.target.value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 12);
                    setPhone(v);
                    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" }));
                  }}
                  placeholder="08xxxxxxxxxx"
                  style={{ ...inputStyle, borderColor: fieldErrors.phone ? "#F56565" : undefined }}
                />
                {fieldErrors.phone && (
                  <div style={{ fontSize: 11, color: "#FEB2B2", marginTop: 4 }}>{fieldErrors.phone}</div>
                )}
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
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <button type="button" style={secondaryButtonStyle} onClick={startCamera}>
                      Ambil foto (kamera)
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => document.getElementById("photo-input-gallery")?.click()}
                    >
                      Pilih dari galeri
                    </button>
                    <input
                      id="photo-input-gallery"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                  <p style={{ marginTop: 6, fontSize: 11, color: "#718096" }}>
                    Setelah pilih foto, geser gambar agar wajah di tengah lingkaran.
                  </p>
                  {photoPreview && (
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                      <div
                        style={{
                          width: 180,
                          height: 180,
                          borderRadius: "999px",
                          border: "2px solid #4FD1C5",
                          boxShadow: "0 0 18px rgba(79,209,197,0.6)",
                          overflow: "hidden",
                          position: "relative",
                          cursor: "grab",
                          userSelect: "none",
                          touchAction: "none",
                          background: "radial-gradient(circle at 30% 20%, #4FD1C5 0, transparent 55%)",
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          const el = e.currentTarget;
                          el.setPointerCapture(e.pointerId);
                          photoDragRef.current = {
                            isDragging: true,
                            startX: e.clientX,
                            startY: e.clientY,
                            startPos: { ...photoPreviewPosition },
                          };
                        }}
                        onPointerMove={(e) => {
                          if (!photoDragRef.current.isDragging) return;
                          e.preventDefault();
                          const el = e.currentTarget;
                          const dx = e.clientX - photoDragRef.current.startX;
                          const dy = e.clientY - photoDragRef.current.startY;
                          const base = photoDragRef.current.startPos || { x: 50, y: 50 };
                          // Effort-less: geser 1x lebar lingkaran ≈ 100% posisi
                          const sensX = el?.clientWidth ? 100 / el.clientWidth : 0.35;
                          const sensY = el?.clientHeight ? 100 / el.clientHeight : 0.35;
                          setPhotoPreviewPosition({
                            x: Math.min(100, Math.max(0, base.x + dx * sensX)),
                            y: Math.min(100, Math.max(0, base.y + dy * sensY)),
                          });
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          photoDragRef.current.isDragging = false;
                        }}
                        onPointerCancel={(e) => {
                          if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                          photoDragRef.current.isDragging = false;
                        }}
                      >
                        <img
                          src={photoPreview}
                          alt="Preview"
                          draggable={false}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: `${photoPreviewPosition.x}% ${photoPreviewPosition.y}%`,
                            pointerEvents: "none",
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
                marginBottom: "24px",
                textAlign: "center",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Simpan gambar atau PDF kartu ini untuk dicetak seperti kartu debit.
            </p>

            {/* Satu kartu utuh (dua panel) – rapi seperti referensi */}
            <div
              ref={cardsWrapperRef}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
                alignItems: "stretch",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              }}
            >
              {/* KARTU DEPAN — referensi estetik: gradient, teal branding, dot pattern, teal glow */}
              <div
                ref={frontRef}
                style={{
                  background: "linear-gradient(145deg, #0a0f0e 0%, #0B0B0B 40%, #071012 100%)",
                  padding: 16,
                  color: "#E2E8F0",
                  position: "relative",
                  aspectRatio: "1.586",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  overflow: "hidden",
                  borderTopLeftRadius: 24,
                  borderBottomLeftRadius: 24,
                }}
              >
                {/* Minimal teal neon accents — kiri atas + kanan bawah */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "60%",
                    height: 2,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.6) 0%, transparent 100%)",
                    transform: "rotate(-12deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 12px rgba(79,209,197,0.4)",
                  }}
                />
                {/* Garis teal tambahan kiri atas dengan glow estetik */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "45%",
                    height: 3,
                    background: "linear-gradient(90deg, #4FD1C5 0%, rgba(79,209,197,0.5) 50%, transparent 100%)",
                    transform: "rotate(-28deg)",
                    transformOrigin: "left center",
                    marginTop: 16,
                    boxShadow: "0 0 20px rgba(79,209,197,0.6), 0 0 40px rgba(79,209,197,0.35), 0 0 60px rgba(79,209,197,0.2)",
                  }}
                />
                {/* Beberapa garis tipis tambahan untuk komposisi estetik */}
                <div
                  style={{
                    position: "absolute",
                    left: "-8%",
                    top: 32,
                    width: "55%",
                    height: 1,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.4) 0%, transparent 100%)",
                    transform: "rotate(-6deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 10px rgba(79,209,197,0.35)",
                    opacity: 0.7,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "-4%",
                    top: 52,
                    width: "40%",
                    height: 2,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.65) 0%, transparent 90%)",
                    transform: "rotate(-18deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 18px rgba(79,209,197,0.55)",
                    opacity: 0.65,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: "50%",
                    height: 2,
                    background: "linear-gradient(90deg, transparent 0%, rgba(79,209,197,0.5) 100%)",
                    transform: "rotate(12deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 10px rgba(79,209,197,0.3)",
                  }}
                />

                {/* Pola titik halus kanan (tekstur padel) */}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "50%",
                    backgroundImage: "radial-gradient(circle at 50% 50%, rgba(79,209,197,0.08) 1px, transparent 1px)",
                    backgroundSize: "14px 14px",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />

                {/* Top row: logo saja (tanpa teks) | MEMBER SINCE */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img
                      src="/logoutama.png"
                      alt="Padel Kecil"
                      style={{ height: 64, width: "auto", objectFit: "contain" }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: 0.9,
                      color: "#E2E8F0",
                    }}
                  >
                    Member Since {memberSinceYear}
                  </span>
                </div>

                {/* Main: foto kiri (besar), nama kanan — hierarchy kuat */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flex: 0,
                    minHeight: 0,
                    position: "relative",
                    zIndex: 1,
                    marginTop: 24,
                    marginBottom: 32,
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {(player.photoCard || player.photoThumbnail || player.photoUrl) ? (
                      <img
                        src={player.photoCard || player.photoThumbnail || player.photoUrl}
                        alt={player.name}
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid rgba(79,209,197,0.85)",
                          boxShadow: "0 0 20px rgba(79,209,197,0.5), 0 0 36px rgba(79,209,197,0.25), 0 0 48px rgba(0,0,0,0.2)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.12)",
                          border: "2px solid rgba(79,209,197,0.85)",
                          boxShadow: "0 0 20px rgba(79,209,197,0.45), 0 0 36px rgba(79,209,197,0.22), 0 0 48px rgba(0,0,0,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#E2E8F0",
                        }}
                      >
                        {(player.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        lineHeight: 1.2,
                        color: "#FFFFFF",
                      }}
                    >
                      {player.name}
                    </div>
                    {(player.badge === "queen" || player.badge === "toprank" || player.isVIP) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {player.badge === "queen" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              color: "#FFF8DC",
                              background: "rgba(255,215,0,0.2)",
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,215,0,0.5)",
                            }}
                          >
                            👑 QUEEN
                          </span>
                        )}
                        {player.badge === "toprank" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              color: "#4FD1C5",
                              background: "rgba(79,209,197,0.2)",
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(79,209,197,0.5)",
                            }}
                          >
                            🏆 TOP RANK
                          </span>
                        )}
                        {player.isVIP && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              color: "#FFD700",
                              background: "rgba(255,215,0,0.15)",
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,215,0,0.4)",
                            }}
                          >
                            ⭐ VIP
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom: label PLAYER CARD — selaras dengan Member Since */}
                <div
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    opacity: 0.9,
                    position: "relative",
                    zIndex: 1,
                    marginTop: "auto",
                    color: "#E2E8F0",
                  }}
                >
                  PLAYER CARD
                </div>
              </div>

              {/* KARTU BELAKANG */}
              <div
                ref={backRef}
                style={{
                  background: "radial-gradient(ellipse 90% 70% at 100% 100%, rgba(79,209,197,0.22) 0%, transparent 55%), #0B0B0B",
                  padding: 20,
                  color: "#E2E8F0",
                  position: "relative",
                  aspectRatio: "1.586",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  overflow: "hidden",
                  borderTopRightRadius: 24,
                  borderBottomRightRadius: 24,
                }}
              >
                {/* Garis tosca tebal + glow kuat */}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "125%",
                    height: 5,
                    background: "linear-gradient(90deg, transparent 35%, rgba(79,209,197,0.7) 50%, #4FD1C5 100%)",
                    transform: "rotate(32deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 24px #4FD1C5, 0 0 48px rgba(79,209,197,0.7), 0 0 72px rgba(79,209,197,0.4)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "80%",
                    height: 4,
                    background: "linear-gradient(90deg, transparent 25%, rgba(79,209,197,0.7) 50%, #4FD1C5 100%)",
                    transform: "rotate(22deg)",
                    transformOrigin: "right center",
                    marginTop: 26,
                    boxShadow: "0 0 20px rgba(79,209,197,0.8), 0 0 40px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "45%",
                    height: 3,
                    background: "linear-gradient(90deg, transparent 0%, rgba(79,209,197,0.9) 100%)",
                    transform: "rotate(10deg)",
                    transformOrigin: "right center",
                    marginTop: 50,
                    boxShadow: "0 0 16px rgba(79,209,197,0.6)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "115%",
                    height: 5,
                    background: "linear-gradient(90deg, #4FD1C5 0%, rgba(79,209,197,0.65) 45%, transparent 80%)",
                    transform: "rotate(-146deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 24px #4FD1C5, 0 0 48px rgba(79,209,197,0.7), 0 0 72px rgba(79,209,197,0.4)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "68%",
                    height: 4,
                    background: "linear-gradient(90deg, #4FD1C5 0%, rgba(79,209,197,0.6) 50%, transparent 100%)",
                    transform: "rotate(-156deg)",
                    transformOrigin: "left center",
                    marginBottom: 20,
                    boxShadow: "0 0 20px rgba(79,209,197,0.8), 0 0 40px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "35%",
                    height: 3,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.85) 0%, transparent 100%)",
                    transform: "rotate(-166deg)",
                    transformOrigin: "left center",
                    marginBottom: 42,
                    boxShadow: "0 0 14px rgba(79,209,197,0.6)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "44%",
                    width: "48%",
                    height: 3,
                    background: "linear-gradient(90deg, rgba(79,209,197,0.65), transparent)",
                    transform: "rotate(-90deg)",
                    transformOrigin: "left center",
                    boxShadow: "0 0 20px rgba(79,209,197,0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: "28%",
                    width: "40%",
                    height: 3,
                    background: "linear-gradient(90deg, transparent, rgba(79,209,197,0.6))",
                    transform: "rotate(90deg)",
                    transformOrigin: "right center",
                    boxShadow: "0 0 18px rgba(79,209,197,0.45)",
                  }}
                />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      opacity: 0.9,
                      fontFamily: "monospace",
                    }}
                  >
                    ID: {player.id}
                  </div>
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
                    }}
                  >
                    <img
                      src={qrUrl}
                      alt="QR Player"
                      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                    />
                  </div>
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
                gap: 14,
                marginTop: 28,
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
                  color: downloading ? "#9CA3AF" : "#fff",
                  minWidth: 168,
                  padding: "14px 20px",
                  borderRadius: 14,
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
                  background: "#fff",
                  border: "2px solid #4FD1C5",
                  borderColor: "#4FD1C5",
                  color: "#4FD1C5",
                  minWidth: 168,
                  padding: "14px 20px",
                  borderRadius: 14,
                }}
              >
                {downloading === "jpeg" ? "Mengunduh..." : "Download JPEG"}
              </button>
              <button
                type="button"
                onClick={handleDaftarLagi}
                style={{
                  ...secondaryButtonStyle,
                  background: "transparent",
                  border: "1px solid #94A3B8",
                  color: "#94A3B8",
                  minWidth: 168,
                  padding: "12px 20px",
                  borderRadius: 14,
                  marginTop: 8,
                }}
              >
                Daftar pemain lagi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
