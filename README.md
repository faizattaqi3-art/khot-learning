# KHOT LEARNING — مَدْرَسَةُ الْخَطِّ

**Tagline:** Learn, Practice, Create.

KHOT Learning adalah prototipe platform pembelajaran seni menulis kaligrafi Arab. Proyek menggunakan HTML5, CSS3, Vanilla JavaScript ES Modules, HTML Canvas API, Pointer Events, dan adapter Firebase opsional.

## 1. Status implementasi

### Sudah dapat dicoba dalam mode demo lokal
- Landing, login demo santri, login demo pengajar, dan formulir registrasi.
- Dashboard terpisah berdasarkan role.
- Kurikulum 5 level dan 21 materi awal.
- Detail materi: tujuan, teori, contoh Arab, dan kaidah latihan.
- Galeri referensi teks kaligrafi.
- Tracing: template transparan di lapisan panduan dan goresan di lapisan terpisah.
- Free practice: kanvas kosong dengan kertas polos, bergaris, dan kotak.
- Mouse, touch, dan stylus melalui Pointer Events.
- Pengaturan warna dan ketebalan pena, penghapus, undo, redo, clear, reset, dan unduh PNG.
- Penyimpanan karya, pengumpulan tugas, daftar status tugas, serta panel review pengajar.
- Rubrik penilaian otomatis dengan bobot 30%, 25%, 25%, 15%, dan 5%.
- Pengelolaan data contoh kelas, materi, dan tugas.
- Progres belajar tersimpan di `localStorage`.
- PWA manifest dan service worker untuk cache app shell.

### Firebase telah diisi dengan konfigurasi Web App Anda
- Firebase Authentication untuk login, registrasi santri, dan pemulihan password.
- Cloud Firestore untuk profil pengguna, submission, dan assessment.
- Firebase Storage untuk berkas gambar karya.
- Realtime Database diinisialisasi menggunakan URL proyek Anda dan tersedia sebagai `realtimeDatabaseInstance` untuk fitur yang akan dikembangkan.
- Firebase Analytics diinisialisasi secara opsional apabila browser mendukungnya.
- Firestore Security Rules dan Storage Security Rules tersedia sebagai dasar pembatasan akses.

**Penting:** inisialisasi SDK tidak otomatis mengaktifkan layanan pada Firebase Console. Authentication (Email/Password), Firestore Database, dan Storage tetap harus dibuat/diaktifkan pada proyek Firebase. Kode aplikasi saat ini menggunakan Firestore untuk profil, submission, dan assessment; Realtime Database sudah dikoneksikan tetapi belum dipakai sebagai penyimpanan fitur utama.

**Catatan penting:** dashboard, kurikulum, materi, tugas, daftar kelas, dan progres pada versi prototipe ini masih memakai `localStorage`. Autentikasi Firebase, upload karya, dokumen pengumpulan, serta dokumen penilaian memiliki jalur integrasi cloud dasar. Ini belum merupakan LMS produksi penuh dan belum menyinkronkan seluruh 12 collection secara menyeluruh.

## 2. Menjalankan secara lokal

Jangan membuka `index.html` dengan alamat `file://`. Jalankan melalui server lokal agar JavaScript ES Modules berfungsi.

### Pilihan A — VS Code Live Server
1. Ekstrak folder `khot-learning`.
2. Buka folder tersebut di Visual Studio Code.
3. Pasang ekstensi **Live Server**.
4. Klik kanan `index.html` → **Open with Live Server**.
5. Browser akan membuka aplikasi pada alamat lokal seperti `http://127.0.0.1:5500`.

### Pilihan B — Python
Buka terminal pada folder proyek, lalu jalankan:

```bash
python -m http.server 8080
```

Buka `http://localhost:8080` pada browser.

### Akun demo
Pada halaman awal, pilih:
- **Santri** untuk mencoba dashboard santri.
- **Pengajar** untuk mencoba dashboard pengajar.

Mode demo tidak memerlukan email atau password. Data disimpan pada browser yang sama. Untuk mencoba alur pengumpulan dan penilaian, masuk sebagai santri, buat dan kumpulkan karya, lalu keluar dan masuk sebagai pengajar pada browser yang sama.

## 3. Konfigurasi Firebase

### A. Buat proyek
1. Buka Firebase Console dan buat proyek baru.
2. Tambahkan aplikasi Web pada Project Overview.
3. Salin objek konfigurasi Web App yang diberikan Firebase.
4. Aktifkan **Authentication → Sign-in method → Email/Password**.
5. Buat database **Cloud Firestore**.
6. Aktifkan **Storage**.

### B. Konfigurasi Web App
Konfigurasi yang Anda kirim sudah dimasukkan ke `js/firebase-config.js`, termasuk `databaseURL` dan `measurementId`. Tidak perlu mengganti placeholder lagi.

Firebase SDK dimuat dari CDN resmi Google menggunakan ES Modules agar aplikasi HTML statis tetap dapat dijalankan melalui Live Server atau hosting seperti InfinityFree. Karena pola ini tidak menggunakan bundler, perintah `npm install firebase` tidak diperlukan untuk menjalankan aplikasi ini. Perintah tersebut baru diperlukan apabila proyek diubah memakai bundler seperti Vite.

Konfigurasi Firebase Web (termasuk API key) memang berada di frontend dan dapat dilihat pengunjung situs; konfigurasi itu bukan rahasia server. Jangan pernah memasukkan service-account private key atau kredensial Admin SDK ke JavaScript frontend. Keamanan data dan hak akses harus ditegakkan dengan Firebase Security Rules yang ketat, Authentication, serta validasi backend tepercaya untuk operasi administratif. Batasi API key di Google Cloud Console bila sesuai, tetapi jangan mengandalkan penyembunyian key sebagai kontrol akses.

### C. Terapkan Security Rules
Dari Firebase Console, buka Firestore Database → Rules, lalu salin isi:

`firebase/firestore.rules`

Buka Storage → Rules, lalu salin isi:

`firebase/storage.rules`

Jangan memakai Rules terbuka seperti `allow read, write: if true` pada aplikasi yang menyimpan data santri.

### D. Buat akun pengajar
Form registrasi publik hanya membuat role `student`. Akun pengajar harus ditetapkan oleh administrator.

1. Buat akun pengajar melalui Authentication → Users (atau registrasikan akun sementara sebagai santri).
2. Salin UID akun pengajar.
3. Pada Firestore, buat dokumen `users/{UID}` atau perbarui dokumen profil sesuai UID tersebut.
4. Isi field minimal, misalnya:

```json
{
  "uid": "UID_PENGAJAR",
  "name": "Ust. Ahmad",
  "email": "pengajar@domain.com",
  "role": "teacher",
  "assignedClasses": ["kelas-a", "kelas-b"]
}
```

5. Untuk profil santri, administrator perlu mengisi `classId` dengan ID kelas yang sesuai. Nilai `classId` santri harus sama dengan salah satu ID pada `assignedClasses` pengajar.

Rules awal membatasi guru berdasarkan `assignedClasses`. Akun guru yang belum memiliki `assignedClasses` tidak akan dapat membaca submission kelas.

### E. Authorized domains
Pada Authentication → Settings → Authorized domains, tambahkan domain tempat aplikasi dijalankan. Untuk domain proyek Anda, tambahkan `khotlearning.gt.tc` (tanpa `https://`) setelah domain aktif. Untuk penggunaan publik, aktifkan HTTPS/SSL terlebih dahulu. Firebase Authentication tidak dapat diandalkan pada halaman publik HTTP biasa.

## 4. Deploy ke GitHub Pages

GitHub Pages dapat menyajikan aplikasi ini sebagai situs statis. Seluruh aset lokal memakai path relatif (`css/...`, `js/...`, `assets/...`), jadi aplikasi dapat berjalan pada alamat proyek seperti `https://USERNAME.github.io/NAMA-REPO/`. Service worker juga didaftarkan dengan path relatif agar cakupannya mengikuti lokasi aplikasi.

### Unggah melalui situs GitHub
1. Buat repository baru di GitHub. Pilih **Public** jika ingin memakai GitHub Pages pada paket yang tidak menyediakan Pages untuk repository private.
2. Pada folder `khot-learning` hasil ekstrak ZIP, buka halaman utama repository dan pilih **Add file → Upload files**.
3. Unggah **isi folder** `khot-learning` ke root repository. Pastikan `index.html` berada langsung di root, bersama `css/`, `js/`, `assets/`, `manifest.json`, `service-worker.js`, `firebase.json`, dan `firebase/`.
4. Pilih **Commit changes**.
5. Buka **Settings → Pages**. Pada bagian build/deployment, pilih **Deploy from a branch**, cabang `main`, folder `/(root)`, lalu simpan.
6. Tunggu proses penerbitan selesai; GitHub akan menampilkan alamat situs di halaman Pages.
7. Di Firebase Console, tambahkan host GitHub Pages Anda (misalnya `USERNAME.github.io`, tanpa protokol atau path repository) pada **Authentication → Settings → Authorized domains**.
8. Buka situs dengan HTTPS dan coba mode demo. Firebase Auth, Firestore, Storage, dan Realtime Database hanya akan berfungsi setelah layanan diaktifkan dan Rules dipasang dengan benar.

Untuk pembaruan, unggah/commit perubahan file ke cabang dan folder sumber yang sama. Folder `firebase/` berisi berkas Rules untuk dokumentasi dan pengelolaan; GitHub Pages tidak menerapkannya ke Firebase. Salin Rules ke Firebase Console atau deploy secara terpisah dengan Firebase CLI.

### Catatan keamanan Firebase
Konfigurasi Firebase Web yang dipakai aplikasi akan tersedia pada JavaScript publik situs. Ini perilaku normal untuk aplikasi web Firebase dan tidak boleh dianggap sebagai rahasia. Jangan menaruh service-account key, Admin SDK credentials, password, atau token privat di repository. Terapkan kontrol akses melalui Firebase Authentication dan Firebase Security Rules; periksa dan uji Rules sebelum menyimpan data nyata, khususnya data santri dan karya mereka.

## 5. Deploy ke hosting

### Opsi A — Hosting statis seperti InfinityFree
Aplikasi frontend ini terdiri atas berkas statis sehingga dapat diunggah ke hosting web biasa.

1. Pastikan domain memiliki HTTPS/SSL aktif.
2. Buka File Manager hosting.
3. Masuk ke folder web root, biasanya `htdocs`.
4. Unggah **isi folder** `khot-learning` (bukan folder pembungkusnya) ke dalam `htdocs`.
5. Pastikan `index.html` berada langsung di dalam `htdocs`.
6. Pastikan folder `css`, `js`, dan `assets`, serta `manifest.json` dan `service-worker.js`, ikut terunggah.
7. Masukkan domain tersebut ke Firebase Authentication → Authorized domains.
8. Buka domain dan uji mode demo terlebih dahulu.

Contoh struktur di web root:

```text
htdocs/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
├── js/
├── assets/
└── firebase/
```

Folder `firebase/` berisi Rules untuk administrasi; Rules tetap harus dipasang melalui Firebase Console atau Firebase CLI. Jangan menganggap mengunggah folder Rules ke hosting otomatis mengaktifkannya.

### Opsi B — Firebase Hosting
1. Instal Node.js dan Firebase CLI.
2. Jalankan `npm install -g firebase-tools`.
3. Login dengan `firebase login`.
4. Dari folder proyek jalankan `firebase use --add` dan pilih project ID.
5. Jalankan `firebase deploy`.

File `firebase.json` sudah disediakan. Sesuaikan project yang dipilih sebelum deployment.

## 6. Struktur proyek

```text
khot-learning/
├── index.html
├── manifest.json
├── service-worker.js
├── firebase.json
├── README.md
├── assets/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   ├── variables.css
│   ├── global.css
│   ├── app.css
│   ├── canvas.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── data.js
│   ├── store.js
│   ├── canvas-engine.js
│   ├── firebase-config.js
│   └── firebase-service.js
└── firebase/
    ├── firestore.rules
    └── storage.rules
```

Aplikasi memakai satu entry point `index.html` dengan tampilan SPA (Single Page Application). Halaman santri dan pengajar dirender sesuai role melalui `js/app.js`; pemisahan ini mengurangi duplikasi layout pada prototipe awal.

## 7. Struktur data Firestore yang disiapkan

| Collection | Tujuan | Status pada prototipe |
|---|---|---|
| `users` | Profil dan role pengguna | Auth + profil dasar |
| `classes` | Data kelas | Contoh lokal; Rules tersedia |
| `enrollments` | Relasi santri dan kelas | Rules tersedia |
| `levels` | Level kurikulum | Rules tersedia |
| `categories` | Kategori khat | Rules tersedia |
| `lessons` | Materi pembelajaran | Konten contoh lokal; Rules tersedia |
| `exercises` | Latihan per materi | Rules tersedia |
| `assignments` | Tugas | Contoh lokal; Rules tersedia |
| `submissions` | Pengumpulan karya | Jalur upload dan dokumen cloud tersedia |
| `assessments` | Penilaian karya | Jalur dokumen cloud tersedia |
| `progress` | Progres pembelajaran | Rules tersedia; progres prototipe lokal |
| `announcements` | Pengumuman | Rules tersedia |

Gambar karya disimpan di Firebase Storage pada pola `artworks/{uid}/{filename}`. Firestore menyimpan URL dan metadata, bukan isi gambar berukuran besar.

## 8. Rubrik penilaian

Nilai akhir dihitung dengan formula:

```text
Nilai = (Bentuk × 30%) + (Proporsi × 25%) + (Kaidah × 25%)
      + (Kerapian × 15%) + (Kreativitas × 5%)
```

Setiap aspek diisi pada rentang 0–100.

## 9. Batasan prototipe saat ini

- Data demo lokal hanya tersedia pada browser dan perangkat tempat data dibuat.
- Mode demo tidak menyediakan keamanan akun; pilihan role demo hanya untuk pengujian UI.
- Data kelas dan santri pada dashboard pengajar merupakan contoh, bukan direktori akun Firebase.
- Materi, tugas, dan progres belum disinkronkan penuh ke Firestore.
- Upload submission cloud memerlukan `classId` santri yang ditetapkan administrator agar pengajar kelas yang berwenang dapat membacanya.
- Belum ada video hosting, notifikasi real-time, editor materi kaya, atau analisis tulisan berbasis AI.
- PWA membutuhkan HTTPS atau localhost. Cache offline menyimpan app shell; Firebase Auth, Firestore, Realtime Database, Analytics, dan Storage memerlukan koneksi internet.
- Firebase Rules merupakan fondasi keamanan dan tetap harus diuji menggunakan Firebase Emulator / Rules Playground sebelum dipakai untuk data sebenarnya.

## 10. Rekomendasi sebelum produksi

1. Lengkapi sinkronisasi seluruh collection ke Firestore.
2. Bangun Cloud Functions atau backend tepercaya untuk provisioning akun, pengelolaan role, dan operasi administratif.
3. Terapkan validasi kelas dan enrollment pada semua operasi.
4. Tambahkan batas ukuran, moderasi, serta kebijakan retensi karya santri.
5. Uji Security Rules dengan akun santri dan pengajar dari kelas yang berbeda.
6. Uji aksesibilitas, browser mobile, stylus, dan performa canvas pada perangkat target.
7. Siapkan kebijakan privasi dan persetujuan penggunaan data untuk lingkungan pendidikan.
