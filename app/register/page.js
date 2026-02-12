"use client";

import { useRef, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";

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

    if (!name.trim() || !phone.trim() || !photoFile) {
      setError("Lengkapi nama, nomor HP, dan foto terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);

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
      const photoUrl = await getDownloadURL(snapshot.ref);

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: player ? "820px" : "460px",
          background: "#121212",
          padding: player ? "28px 24px 24px" : "28px 24px 24px",
          borderRadius: "16px",
          border: "1px solid #222",
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  style={inputStyle}
                />
              </div>

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
              }}
            >
              Kartu Pemain
            </h2>
            <p
              style={{
                marginBottom: "20px",
                textAlign: "center",
                fontSize: "12px",
                color: "#A0AEC0",
              }}
            >
              Simpan gambar atau PDF kartu ini untuk dicetak seperti kartu debit.
            </p>

            <div
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
                  background:
                    "radial-gradient(circle at top left, #4FD1C5 0, #0B0B0B 55%)",
                  borderRadius: 20,
                  padding: 20,
                  color: "#E2E8F0",
                  position: "relative",
                  aspectRatio: "1.586", // kira2 kartu debit
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
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
                  }}
                >
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
                  }}
                >
                  Player Card
                </div>
              </div>

              {/* KARTU BELAKANG */}
              <div
                ref={backRef}
                style={{
                  background:
                    "radial-gradient(circle at bottom right, #4FD1C5 0, #0B0B0B 55%)",
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
                }}
              >
                <div
                  style={{
                    width: "70%",
                    height: "70%",
                    background: "#000",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                >
                  <img
                    src={qrUrl}
                    alt="QR Player"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    textAlign: "center",
                    opacity: 0.85,
                  }}
                >
                  Scan QR ini di panel host PADEL KECIL untuk bergabung ke court.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
