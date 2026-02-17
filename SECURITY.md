# Keamanan – Yang Tidak Boleh Kelihatan / Harus Dilindungi

## ✅ Sudah aman (server-only)

- **REGISTER_CODE** – Cek kode registrasi hanya di API `/api/register`, tidak di client.
- **HOST_PIN** – Cek hanya di API `POST /api/auth/host`; session pakai cookie httpOnly (signed dengan SESSION_SECRET).
- **BARISTA_PIN** – Cek hanya di API `POST /api/auth/barista`; claim minuman lewat `POST /api/barista/claim` (cookie dicek di server).
- **SESSION_SECRET** – Dipakai untuk tanda-tangan cookie host/barista; hanya di server.
- **.env.local** – Tidak di-commit; rahasia hanya di mesin Anda dan di Vercel (Environment Variables).

---

## ℹ️ Firebase config (`NEXT_PUBLIC_FIREBASE_*`)

- **Harus di client:** SDK Firebase di browser butuh config (apiKey, projectId, dll). Itu wajar dan tidak bisa "disembunyikan" sepenuhnya.
- **Yang melindungi data:** Bukan apiKey, tapi **Firestore Security Rules** dan **Storage Rules**. Pastikan rules ketat (siapa boleh baca/tulis apa).
- **Saran:** Di Firebase Console, batasi API key (HTTP referrer untuk domain Anda) dan jaga rules agar client hanya bisa akses data yang memang untuk role mereka.

---

## Checklist singkat

| Item | Di env | Di client? | Status |
|------|--------|------------|--------|
| REGISTER_CODE | REGISTER_CODE | ❌ | ✅ Aman |
| HOST_PIN | HOST_PIN | ❌ | ✅ Aman |
| BARISTA_PIN | BARISTA_PIN | ❌ | ✅ Aman |
| SESSION_SECRET | SESSION_SECRET | ❌ | ✅ Aman |
| Firebase config | NEXT_PUBLIC_* | ✅ (wajar) | Jaga Rules + batasi API key di Console |

Di Vercel: set **REGISTER_CODE**, **HOST_PIN**, **BARISTA_PIN**, **SESSION_SECRET** (tanpa prefix NEXT_PUBLIC_). Jangan pakai lagi NEXT_PUBLIC_HOST_PIN atau NEXT_PUBLIC_BARISTA_PIN.
