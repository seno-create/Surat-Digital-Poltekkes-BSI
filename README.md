# Sistem Persuratan Dinas

Aplikasi web pengelolaan **surat masuk, disposisi berjenjang, dan surat keluar** untuk institusi pendidikan (Poltekkes). Dibangun dengan Next.js 15, PostgreSQL (Supabase/Neon) via Prisma, NextAuth, dan Google Drive (Shared Drive) untuk penyimpanan scan surat.

## Fitur

| Modul | Isi |
|---|---|
| **Surat Masuk** | Pencatatan agenda dengan nomor agenda otomatis per tahun (`0001/SM/2026`), pengirim, perihal, sifat, klasifikasi, unggah scan ke Google Drive, pencarian & filter (teks, sifat, status, rentang tanggal). |
| **Disposisi** | Berjenjang: TU → Pimpinan → Kepala Unit → Staf. Pilihan instruksi baku + instruksi bebas, batas waktu, status (belum dibaca/dibaca/diproses/selesai), tanggapan, riwayat berbentuk pohon, penanda lewat batas waktu, **cetak lembar disposisi**. Surat otomatis berstatus *Selesai* saat semua disposisi ujung selesai. |
| **Surat Keluar** | Konsep dari template (placeholder `{{perihal}}`, `{{tanggal}}`, dll.), ajukan ke verifikator (pimpinan/kepala unit), setujui/revisi/tolak, **nomor surat otomatis** saat disetujui menurut klasifikasi & unit (format bisa diatur), tracking riwayat, pratinjau/cetak dengan kop, unggah scan bertanda tangan, tandai terkirim. |
| **Arsip** | Pencarian gabungan surat masuk & keluar per tahun/klasifikasi, tautan langsung ke file. |
| **Laporan** | Rekap per periode (per sifat, status, klasifikasi), **export Excel** (.xlsx, dengan sheet rekap) dan **export PDF**. |
| **Dashboard** | Statistik bulan/tahun berjalan, disposisi tertunda & terlambat, surat menunggu verifikasi, grafik volume surat per bulan. |
| **Master Data** | Pengguna (role, unit, jabatan, aktif/nonaktif, reset password), unit kerja, jabatan, klasifikasi surat, template surat. |
| **Audit Log** | Semua aksi penting (login, buat/ubah/hapus, disposisi, verifikasi, export) tercatat beserta pelaku & waktu. |

### Hak akses per role

| Role | Hak akses |
|---|---|
| **ADMIN** (Admin/TU) | Catat/edit/hapus surat masuk, teruskan ke pimpinan, lihat semua surat, kelola master data, audit log, pengaturan. |
| **PIMPINAN** | Lihat semua surat masuk, disposisi ke kepala unit/staf, verifikasi surat keluar. |
| **KEPALA_UNIT** | Lihat surat yang didisposisikan kepadanya, teruskan ke staf di unitnya, verifikasi surat keluar yang ditujukan kepadanya, lihat surat keluar unitnya. |
| **STAF** | Lihat & tanggapi disposisi untuknya, buat konsep surat keluar. |

File scan **tidak dibagikan publik**. Semua akses file lewat `/api/files/<id>` yang memeriksa login dan hak akses sebelum mengambil file dari Drive.

---

## 1. Siapkan database (pilih salah satu)

### Supabase
1. Buat project di <https://supabase.com>.
2. Buka **Project Settings → Database → Connection string**.
3. Salin **Transaction pooler** (port 6543) sebagai `DATABASE_URL` dan tambahkan `?pgbouncer=true&connection_limit=1` di belakangnya.
4. Salin **Session pooler / Direct connection** (port 5432) sebagai `DIRECT_URL`.

### Neon
1. Buat project di <https://neon.tech>.
2. Di **Connection Details**, salin string **Pooled connection** sebagai `DATABASE_URL`, dan string **non-pooled** (tanpa `-pooler` di host) sebagai `DIRECT_URL`.

---

## 2. Siapkan Google Drive (Shared Drive + service account)

Langkah ini membuat aplikasi bisa menyimpan scan ke Google Drive edukasi institusi, dengan struktur folder otomatis:

```
<Shared Drive>/
├── Surat Masuk/2026/11 - November/0001-SM-2026 Undangan Rakor.pdf
└── Surat Keluar/2026/11 - November/001-UM-TU-XI-2026 ....pdf
```

### 2a. Buat service account (Google Cloud Console)
1. Buka <https://console.cloud.google.com> dengan akun institusi, lalu buat project baru (mis. `surat-dinas`).
2. **APIs & Services → Library**, cari **Google Drive API**, klik **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**. Nama: `surat-dinas`. Lewati pemberian role (tidak perlu role IAM).
4. Buka service account tersebut, tab **Keys → Add key → Create new key → JSON**. File JSON akan terunduh. **Simpan rahasia, jangan di-commit ke GitHub.**
5. Dari file JSON, ambil:
   - `client_email` → isi ke `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → isi ke `GOOGLE_PRIVATE_KEY` (biarkan `\n` apa adanya, satu baris, dalam tanda kutip)

> Jika organisasi Google Workspace memblokir pembuatan key (*"Service account key creation is disabled"*), minta admin Workspace/Cloud menonaktifkan sementara kebijakan `iam.disableServiceAccountKeyCreation` untuk project ini.

### 2b. Buat Shared Drive dan beri akses
1. Di <https://drive.google.com> (akun edukasi), klik **Drive bersama / Shared drives → Baru**. Nama: mis. `Arsip Persuratan`.
2. Klik nama Shared Drive → **Kelola anggota / Manage members**.
3. Tambahkan email service account (`...@...iam.gserviceaccount.com`) dengan peran **Pengelola Konten (Content manager)**.
   - Jika muncul peringatan "berada di luar organisasi", pilih tetap bagikan. Bila ditolak, admin Workspace perlu mengizinkan berbagi Shared Drive ke luar domain (Admin console → Apps → Google Workspace → Drive and Docs → Sharing settings), atau minimal untuk Shared Drive ini.
4. Buka Shared Drive tersebut, lalu salin ID dari URL: `https://drive.google.com/drive/folders/`**`0AAbbCCddEEffUk9PVA`** → isi ke `GOOGLE_DRIVE_ROOT_ID`.
   (Boleh juga ID sebuah folder di dalam Shared Drive.)
5. Tambahkan juga staf TU/pimpinan sebagai anggota Shared Drive (Viewer/Commenter) bila mereka perlu membuka file langsung lewat tombol "Buka di Google Drive".

Setelah aplikasi berjalan, login sebagai admin, buka **Pengaturan → Tes Koneksi Google Drive** untuk memastikan konfigurasi benar.

---

## 3. Jalankan secara lokal (opsional)

```bash
npm install
cp .env.example .env        # lalu isi nilainya
npx prisma migrate deploy   # buat tabel
npm run db:seed             # data awal + akun admin
npm run dev                 # buka http://localhost:3000
```

Untuk mencoba alur lengkap dengan akun contoh (direktur, kabag.tu, kajur.kep, staf.tu, staf.kep; password `password123`):
`SEED_DEMO=1 npm run db:seed`. **Jangan pakai akun demo di produksi.**

---

## 4. Deploy ke Vercel

1. Push repositori ini ke GitHub.
2. Di <https://vercel.com/new>, **Import** repositori tersebut. Framework otomatis terdeteksi sebagai Next.js.
3. Di **Environment Variables**, isi semua variabel dari tabel di bawah (untuk *Production*, dan *Preview* bila perlu).
4. Klik **Deploy**. Script `vercel-build` otomatis menjalankan `prisma migrate deploy` sehingga tabel database dibuat/diperbarui pada setiap deploy.
5. Setelah deploy pertama, isi data awal & akun admin dari komputer Anda (sekali saja):
   ```bash
   DATABASE_URL="<DIRECT_URL produksi>" DIRECT_URL="<DIRECT_URL produksi>" \
   SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD='PasswordKuat!' npm run db:seed
   ```
6. Ubah `NEXTAUTH_URL` menjadi domain final (mis. `https://surat.poltekkes-xxx.ac.id`) lalu redeploy. Domain kustom bisa ditambahkan di **Project → Settings → Domains**.
7. Login sebagai admin, **segera ganti password** (menu Profil), lalu lengkapi master data: unit (kode unit dipakai di nomor surat), jabatan, klasifikasi (sesuaikan dengan pedoman klasifikasi arsip instansi), pengguna, dan template.

### Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✔ | URL PostgreSQL pooled (Supabase port 6543 + `?pgbouncer=true&connection_limit=1`, atau Neon pooled). |
| `DIRECT_URL` | ✔ | URL PostgreSQL langsung (non-pooled), dipakai untuk migrasi. |
| `NEXTAUTH_SECRET` | ✔ | String acak panjang. Buat dengan `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | ✔ | URL aplikasi, mis. `https://surat-dinas.vercel.app`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✔* | `client_email` dari file JSON service account. |
| `GOOGLE_PRIVATE_KEY` | ✔* | `private_key` dari file JSON (satu baris dengan `\n`). Di Vercel, tempel apa adanya termasuk `-----BEGIN PRIVATE KEY-----`. |
| `GOOGLE_DRIVE_ROOT_ID` | ✔* | ID Shared Drive atau folder induk. |
| `INSTANSI_NAMA` | | Nama instansi untuk kop surat, lembar disposisi, dan laporan. |
| `INSTANSI_ALAMAT` | | Alamat untuk kop. |
| `FORMAT_NOMOR_SURAT` | | Default `{urut}/{klasifikasi}/{unit}/{bulan_romawi}/{tahun}` → `001/UM/TU/XI/2026`. Token: `{urut} {klasifikasi} {unit} {bulan_romawi} {bulan} {tahun}`. |
| `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` | | Hanya dipakai saat menjalankan seed. |

\* Tanpa variabel Google, aplikasi tetap berjalan tetapi unggah scan dinonaktifkan.

---

## Catatan teknis

- **Batas ukuran unggahan**: Vercel membatasi body request ±4,5 MB, jadi unggahan dibatasi 4 MB (PDF/JPG/PNG/WEBP). Scan surat biasanya cukup dengan resolusi 150–200 dpi. Untuk file lebih besar perlu unggahan langsung ke Drive (resumable upload), bisa ditambahkan kemudian.
- **Penomoran** memakai tabel `Counter` dengan operasi atomik (`INSERT ... ON CONFLICT DO UPDATE`), jadi aman dari nomor ganda walau beberapa orang menyimpan bersamaan. Nomor agenda direset per tahun (`SM-2026`), nomor surat keluar juga per tahun (`SK-2026`).
- **Zona waktu**: tanggal default memakai Asia/Jakarta.
- Struktur kode:
  ```
  prisma/schema.prisma        model data
  prisma/seed.ts              data awal
  src/lib/                    auth, prisma, drive, penomoran, hak akses, laporan
  src/app/(app)/              halaman aplikasi (surat-masuk, disposisi, surat-keluar, arsip, laporan, master, ...)
  src/app/api/files/[fileId]  proxy file Google Drive (dengan cek hak akses)
  src/app/api/laporan/        export Excel & PDF
  ```

## Pengembangan berikutnya (usulan)
- Notifikasi email/WhatsApp untuk disposisi baru dan batas waktu.
- Tanda tangan elektronik (TTE) dan QR code verifikasi pada surat keluar.
- Unggahan besar langsung ke Google Drive (resumable upload).
- Penomoran surat keluar per unit atau per klasifikasi (saat ini satu urutan per tahun untuk seluruh instansi).
