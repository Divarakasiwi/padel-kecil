# Keamanan PADEL KECIL

Panduan singkat agar aplikasi lebih tahan terhadap serangan dan penyalahgunaan.

---

## 1. Firebase Rules (penting)

Rules membatasi siapa bisa baca/tulis apa di Firestore dan Storage. **Tanpa rules, data bisa diakses atau diubah siapa saja.**

### Deploy rules ke Firebase

Setelah mengubah `firestore.rules` atau `storage.rules`, deploy:

```bash
# Firestore
npx firebase deploy --only firestore:rules

# Storage
npx firebase deploy --only storage
```

Pastikan project Firebase sudah di-link (`firebase use` atau `firebase init`).

### Yang sudah diatur

- **Firestore `players`**: baca semua; buat hanya dengan field yang valid (nama, HP, photoUrl, badge, isVIP); update hanya field `badge` dan `isVIP`; hapus tidak diizinkan.
- **Firestore `matches`**: buat boleh (simpan hasil match); update/hapus tidak diizinkan.
- **Storage `players/*`**: upload hanya file gambar & maks 5MB; hapus tidak diizinkan dari client.

---

## 2. Jangan commit rahasia

- API key Firebase di front-end **boleh** dipakai (dibatasi domain di Firebase Console), tapi jangan simpan kunci admin atau service account di repo.
- Kode registrasi host (`NEXT_PUBLIC_REGISTER_CODE`) pakai env di production (Vercel/Netlify), jangan hardcode.

---

## 3. Batasi domain di Firebase

Di [Firebase Console](https://console.firebase.google.com) → Project → Authentication (atau App Check) / API key:

- Tambahkan hanya domain production (mis. `padelkecil.vercel.app`, domain custom) agar API hanya dipanggil dari app kamu.

---

## 4. Login host

Saat ini login host pakai `sessionStorage` (client-only). Siapa pun yang buka `/host` dan login bisa akses dashboard. Untuk lebih aman:

- Nanti bisa pakai **Firebase Auth** (email/Google) untuk host, lalu di Firestore/Storage rules cek `request.auth != null` untuk aksi khusus host (mis. update badge).
- Sementara, proteksi utama tetap **Firestore + Storage rules** agar data tidak bisa diubah sembarangan meski orang buka dashboard.

---

## 5. Ringkasan checklist

| Langkah | Status |
|--------|--------|
| Firestore rules deployed | ⬜ Jalankan `firebase deploy --only firestore:rules` |
| Storage rules deployed | ⬜ Jalankan `firebase deploy --only storage` |
| Env production (kode register, dll.) | ⬜ Set di Vercel/hosting |
| Batasi domain di Firebase Console | ⬜ Sesuai domain production |
| Nanti: Firebase Auth untuk host | Opsional |

Dengan rules yang ketat dan env yang aman, aplikasi jauh lebih tahan terhadap penyalahgunaan data dan serangan umum.
