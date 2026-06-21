# 📋 Product Requirements Document (PRD) - REVISI FINAL

## Web Photobooth Wisuda SI - Black & Gold Elegant Edition

### Dengan Single User Account + Admin, Cloudflare R2 Storage, & Admin-Only Frame Management

---

## 📌 Dokumen Informasi

| Item | Detail |
| --- | --- |
| **Nama Proyek** | Photobooth Wisuda SI |
| **Versi PRD** | 3.2 (Final) |
| **Tanggal** | 18 Juni 2026 |
| **Status** | ✅ Siap Development |
| **Target Platform** | Web (Desktop/Laptop) |

---

## 1. 🎯 Ringkasan Proyek

### 1.1 Latar Belakang

Acara wisuda membutuhkan pengalaman dokumentasi yang berkesan bagi para wisudawan dan keluarganya. Photobooth digital memungkinkan pengambilan foto cepat dengan frame khusus acara, langsung dapat diakses dan diunduh melalui galeri online. Dengan sistem **single user account**, semua wisudawan bisa menggunakan 1 akun bersama untuk mengakses galeri, namun admin tetap memiliki kontrol penuh.

### 1.2 Tujuan

Membangun aplikasi web photobooth dengan:

1. **Dashboard Admin** untuk panitia dengan kontrol penuh
2. **Dashboard User** (1 akun bersama) untuk semua wisudawan
3. **Galeri Public** menampilkan semua foto wisuda dengan tema elegan
4. **QR Code** untuk akses cepat ke galeri foto
5. **Penyimpanan ganda**: Foto asli (tanpa frame) + Foto hasil (dengan frame)
6. **Cloudflare R2** sebagai penyimpanan utama (10GB gratis)
7. **Kontrol Admin**: Kemampuan menonaktifkan fitur foto untuk user
8. **Frame Management**: **HANYA ADMIN** yang bisa upload, pilih, dan hapus frame
9. **Single User Account**: Semua wisudawan pakai 1 akun user yang sama

### 1.3 Target Pengguna

| Role | Siapa | Kebutuhan |
| --- | --- | --- |
| **Admin** | Panitia acara (1 orang) | Login, ambil foto, upload, **kelola frame (EXCLUSIVE)**, kontrol akses user |
| **User** | Semua wisudawan & keluarga (1 akun bersama) | Login (1 akun), ambil foto, lihat galeri, download foto via QR Code |

### 1.4 Value Proposition

- ✨ **Elegan**: Desain hitam-emas premium
- 📸 **Fleksibel**: 2 tipe penyimpanan (asli + frame)
- 👥 **Sederhana**: 1 akun user untuk semua wisudawan
- 🎮 **Kontrol Penuh**: Admin bisa matikan/nyalakan fitur foto untuk user
- 🖼️ **Frame Exclusive**: Hanya admin yang bisa kelola frame
- 📱 **Akses Cepat**: Scan QR Code langsung lihat semua foto
- 💰 **Gratis**: Cloudflare R2 free tier 10GB
- ⚡ **Cepat**: CDN Cloudflare untuk loading super cepat

---

## 2. 🔐 Sistem Autentikasi

### 2.1 Halaman Login

```
┌──────────────────────────────────────────────────────┐
│                                                       │
│              ✦ [Logo Acara] ✦                        │
│                                                       │
│              ──── ✦ ──── ✦ ────                      │
│                                                       │
│                   LOGIN                              │
│               Akses Terbatas                         │
│                                                       │
│     ┌─────────────────────────────────────┐         │
│     │  👤  Username / NIM                 │         │
│     └─────────────────────────────────────┘         │
│                                                       │
│     ┌─────────────────────────────────────┐         │
│     │  🔒  Password                       │         │
│     └─────────────────────────────────────┘         │
│                                                       │
│     [   ✦ M A S U K   ]                             │
│                                                       │
│     ⚠️ Username atau password salah                 │
│                                                       │
│              ──── ✦ ──── ✦ ────                      │
│                                                       │
│              © Wisuda 2026                           │
│              Powered by Photobooth                   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 2.2 Role & Credentials (SEDERHANA)

```jsx
// Data User (disimpan di KV) - HANYA 2 AKUN
const USERS = {
  admin: {
    username: 'panitia',
    password: 'wisuda2026',
    role: 'admin',
    name: 'Panitia Wisuda'
  },
  user: {
    username: 'wisudawan',  // SATU AKUN UNTUK SEMUA
    password: 'wisuda2026',
    role: 'user',
    name: 'Wisudawan',
    isPhotoEnabled: true // Default: true, bisa di-toggle admin
  }
};

// ✅ SEDERHANA - Hanya 2 akun!
// Admin: 1 akun
// User: 1 akun (dipakai bersama oleh semua wisudawan)
```

---

## 3. 📱 Halaman-Halaman Aplikasi

### 3.1 Halaman Admin Dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  ✦ WISUDA 2026                            [📊 45] [👤 Admin] │
│  ───────────────────────────────────────────────────────────── │
│                                                                   │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐  │
│  │    📸 PREVIEW KAMERA         │  │  ⚡ STATUS              │  │
│  │                              │  │                         │  │
│  │    ┌────────────────┐       │  │  📸 Sesi: 3/3          │  │
│  │    │   LIVE WEBCAM  │       │  │  💾 Total: 45 Foto     │  │
│  │    │                │       │  │  📦 245 MB / 10 GB     │  │
│  │    └────────────────┘       │  │  🖼️ Frame: Gold Elegant│  │
│  │                              │  │                         │  │
│  │    [ 📷 AMBIL FOTO ]        │  │  ──────────────────     │  │
│  │                              │  │  [🖼️ KELOLA FRAME]     │  │
│  │    📸 1/3                    │  │  [📱 Galeri Public]    │  │
│  └──────────────────────────────┘  └─────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🎮 KONTROL ADMIN                                         │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  👤 Manajemen User                              │     │  │
│  │  │  ┌──────────┬────────────┬──────────┐          │     │  │
│  │  │  │ Role     │ Nama       │ Foto ON  │          │     │  │
│  │  │  ├──────────┼────────────┼──────────┤          │     │  │
│  │  │  │ Admin    │ Panitia    │ ✅      │          │     │  │
│  │  │  │ User     │ Wisudawan  │ ✅ ON   │ [🔒 OFF]│     │  │
│  │  │  └──────────┴────────────┴──────────┘          │     │  │
│  │  │  ℹ️ Semua wisudawan pakai 1 akun user          │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🖼️ HASIL FOTO TERAKHIR                                  │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │  │
│  │  │📸 1 │ │📸 2 │ │📸 3 │ │📸 4 │ │📸 5 │               │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │  │
│  │  ────── ✦ Lihat Semua di Galeri ✦ ──────               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Halaman Admin - Frame Management (EXCLUSIVE)

```
┌────────────────────────────────────────────────────────────────────┐
│  ✦ WISUDA 2026                   [👤 Admin]  [← Kembali]      │
│  ───────────────────────────────────────────────────────────── │
│                                                                   │
│                    🖼️ MANAJEMEN FRAME                           │
│                    ───── ✦ ─────                                 │
│                    [ADMIN ONLY - HANYA ADMIN]                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📤 UPLOAD FRAME BARU                                    │  │
│  │  ┌──────────────────────────────────────────────────┐     │  │
│  │  │  [📁 Pilih File PNG]  [⬆️ Upload]              │     │  │
│  │  │  ⚠️ Format: PNG (transparan)                    │     │  │
│  │  │  ⚠️ Resolusi: 1080x1350px                      │     │  │
│  │  │  ⚠️ Maks: 5MB                                  │     │  │
│  │  └──────────────────────────────────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📋 DAFTAR FRAME                                         │  │
│  │  ┌──────┬──────────────────┬──────────┬──────────┐       │  │
│  │  │ #   │ Nama Frame        │ Status  │ Aksi     │       │  │
│  │  ├──────┼──────────────────┼──────────┼──────────┤       │  │
│  │  │ 1   │ Gold Elegant      │ ✅ Aktif │ [🗑️]    │       │  │
│  │  │ 2   │ Classic Black     │ ⬜ Non   │ [👑 Aktif]│     │  │
│  │  │ 3   │ Modern Minimalis  │ ⬜ Non   │ [👑 Aktif]│     │  │
│  │  └──────┴──────────────────┴──────────┴──────────┘       │  │
│  │  ──────────────────────────────────────────────────────    │  │
│  │  🖼️ Preview Frame: [Sample Photo + Frame]                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│              ──── ✦ ────                                         │
│              Total: 3 Frame                                     │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 3.3 Halaman User Dashboard (Satu Akun Bersama)

```
┌────────────────────────────────────────────────────────────────────┐
│  ✦ WISUDA 2026                            [📊 45] [👤 User]  │
│  ───────────────────────────────────────────────────────────── │
│                                                                   │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐  │
│  │    📸 PREVIEW KAMERA         │  │  ⚡ STATUS              │  │
│  │                              │  │                         │  │
│  │    ┌────────────────┐       │  │  📸 Sesi: 3/3          │  │
│  │    │   LIVE WEBCAM  │       │  │  💾 Total: 45 Foto     │  │
│  │    │                │       │  │  🖼️ Frame: Gold Elegant│  │
│  │    └────────────────┘       │  │                         │  │
│  │                              │  │  ──────────────────     │  │
│  │    [ 📷 AMBIL FOTO ]        │  │  [📱 Galeri Public]    │  │
│  │    ⚠️ Fitur Dinonaktifkan   │  │                         │  │
│  │    Admin Menonaktifkan Foto  │  │                         │  │
│  │                              │  │                         │  │
│  │    📸 1/3                    │  │                         │  │
│  └──────────────────────────────┘  └─────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🖼️ HASIL FOTO TERAKHIR                                  │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │  │
│  │  │📸 1 │ │📸 2 │ │📸 3 │ │📸 4 │ │📸 5 │               │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │  │
│  │  ────── ✦ Lihat Semua di Galeri ✦ ──────               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│              ──── ✦ ────                                         │
│              Selamat datang, Wisudawan! 🎓                      │
│              Gunakan akun ini untuk semua peserta               │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
```

**Perbedaan Admin vs User Dashboard:**

| Fitur | Admin | User |
| --- | --- | --- |
| Ambil Foto | ✅ Selalu bisa | ✅ Bisa (jika di-enable admin) |
| **Ganti/Upload Frame** | ✅ **YA (EXCLUSIVE)** | ❌ **TIDAK BISA** |
| Manajemen User | ✅ (1 user saja) | ❌ |
| Kontrol Fitur Foto | ✅ | ❌ |
| Galeri Public | ✅ | ✅ |
| Logout | ✅ | ✅ |
| **Jumlah Akun** | **1 (Admin)** | **1 (Semua wisudawan)** |

---

### 3.4 Halaman Hasil Foto (Setelah Ambil)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    ✦ FOTO BERHASIL ✦                            │
│                    ───── ✦ ─────                                 │
│                                                                   │
│      ┌─────────────────────────────────────────┐                │
│      │                                         │                │
│      │          [HASIL FOTO + FRAME]           │                │
│      │                                         │                │
│      │                                         │                │
│      └─────────────────────────────────────────┘                │
│                                                                   │
│                    ───── ✦ ─────                                 │
│                                                                   │
│          [📥 DOWNLOAD]      [☁️ SIMPAN & UPLOAD]               │
│                                                                   │
│          💾 Status:                                          │
│          ✅ Foto asli tersimpan di galeri                        │
│          ✅ Foto dengan frame tersimpan di galeri               │
│                                                                   │
│                    [📸 AMBIL LAGI]                              │
│                                                                   │
│              ✦ Foto berhasil diupload ke galeri! ✦              │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
```

**Catatan Penting:**

- Saat upload, sistem menyimpan **2 versi foto**:
    1. **Foto asli** (tanpa frame) - untuk arsip
    2. **Foto dengan frame** - untuk galeri public
- Frame yang digunakan adalah **frame aktif** yang dipilih oleh admin

---

### 3.5 Halaman Galeri Public

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    ✦ GALERI FOTO WISUDA ✦                       │
│                    ───── ✦ ─────                                 │
│                    Momen Indah Wisuda 2026                       │
│                                                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │📸   │ │📸   │ │📸   │ │📸   │ │📸   │ │📸   │              │
│  │     │ │     │ │     │ │     │ │     │ │     │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │📸   │ │📸   │ │📸   │ │📸   │ │📸   │ │📸   │              │
│  │     │ │     │ │     │ │     │ │     │ │     │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │📸   │ │📸   │ │📸   │ │📸   │ │📸   │ │📸   │              │
│  │     │ │     │ │     │ │     │ │     │ │     │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                                   │
│          [📱 Lihat Semua di Galeri]                             │
│                                                                   │
│              ──── ✦ Total 45 Foto ✦ ────                       │
│                                                                   │
│              © Wisuda 2026 - Powered by Photobooth              │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
```

---

### 3.6 Halaman QR Code & Share

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    ✦ BAGIKAN GALERI ✦                           │
│                    ───── ✦ ─────                                 │
│                                                                   │
│    Scan QR Code untuk melihat semua foto wisuda:                │
│                                                                   │
│         ┌─────────────────────────────┐                         │
│         │                             │                         │
│         │       [QR CODE]             │                         │
│         │                             │                         │
│         └─────────────────────────────┘                         │
│                                                                   │
│              ───── ✦ ─────                                       │
│                                                                   │
│         🔗 photobooth.wisuda2026.com/gallery                    │
│                                                                   │
│         [📥 Download QR Code]   [📋 Copy Link]                 │
│                                                                   │
│              ──── ✦ ────                                         │
│                                                                   │
│    Total 45 foto wisuda tersedia untuk diunduh                  │
│                                                                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. ⚙️ Fitur Fungsional

### 4.1 Autentikasi (SEDERHANA)

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| AUTH-01 | Login | Form username + password | High |
| AUTH-02 | Role-based Access | Admin vs User | High |
| AUTH-03 | Session | Cookie-based session (8 jam) | High |
| AUTH-04 | Logout | Hapus session | High |
| AUTH-05 | Auto-logout | 8 jam tidak aktif | High |
| AUTH-06 | **Simple Users** | **Hanya 2 akun (Admin + User)** | High |

**User Database Schema (KV) - SEDERHANA:**

```jsx
// Key: 'users' - HANYA 2 AKUN!
{
  'panitia': {
    password: 'wisuda2026',
    role: 'admin',
    name: 'Panitia Wisuda',
    photo_enabled: true
  },
  'wisudawan': {
    password: 'wisuda2026',
    role: 'user',
    name: 'Wisudawan',
    photo_enabled: true // Bisa di-toggle admin
  }
}
```

**Endpoint (SEDERHANA):**

```jsx
// Login
POST /api/auth/login
Body: { username, password }
Response: {
  success: true,
  user: { username, role, name, photo_enabled }
}

// Get current user
GET /api/auth/me
Response: {
  user: { username, role, name, photo_enabled }
}

// Admin - Toggle User Photo (SEDERHANA)
PUT /api/admin/toggle-user-photo
Body: { photo_enabled: true/false }
Response: { success: true }
```

---

### 4.2 Frame Management (ADMIN ONLY) ⭐

| ID | Fitur | Deskripsi | Prioritas | Akses |
| --- | --- | --- | --- | --- |
| FRM-01 | Upload Frame | Upload PNG ke R2 | High | **Admin Only** |
| FRM-02 | Set Active | Pilih frame aktif | High | **Admin Only** |
| FRM-03 | List Frames | Tampilkan semua frame | High | **Admin Only** |
| FRM-04 | Preview | Preview dengan sample | High | **Admin Only** |
| FRM-05 | Delete Frame | Hapus frame | Medium | **Admin Only** |
| FRM-06 | View Active Frame | Lihat frame yang aktif | High | **All Users** |

**Frame Requirements:**

- Format: PNG (transparan)
- Resolusi: 1080x1350px
- Desain: Black & Gold
- Ukuran file: < 5MB

**Endpoint (Admin Only):**

```jsx
// Admin - Manage Frames
GET /api/admin/frames
Response: {
  frames: [
    { id: 'frame1', name: 'Gold Elegant', url: '...', active: true }
  ]
}

POST /api/admin/frames/upload
Body: FormData { file, name }
Response: { success: true, frame: { id, name, url } }

PUT /api/admin/frames/:id/activate
Response: { success: true }

DELETE /api/admin/frames/:id
Response: { success: true }

// Public - Get active frame
GET /api/frames/active
Response: { frame: { id, name, url } }
```

---

### 4.3 Kontrol Admin (SEDERHANA)

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| CTRL-01 | **Toggle User Photo** | **Enable/disable fitur foto untuk user (1 akun)** | High |
| CTRL-02 | View User Status | Lihat status user | High |
| CTRL-03 | **Frame Management** | **Upload, pilih, hapus frame** | High |

**Konsep Kontrol (SEDERHANA):**

```jsx
// Middleware untuk cek akses foto
async function canTakePhoto(user) {
  if (user.role === 'admin') return true;
  return user.photo_enabled === true; // Cek 1 user saja
}

// Middleware untuk cek akses frame
async function canManageFrames(user) {
  return user.role === 'admin'; // HANYA ADMIN
}

// Pada endpoint /api/photo/capture
export async function POST({ request, locals }) {
  const user = locals.user;

  if (!canTakePhoto(user)) {
    return json({
      success: false,
      error: 'Fitur foto dinonaktifkan oleh admin'
    }, { status: 403 });
  }

  // Proses capture...
}
```

**Admin Control UI (SEDERHANA):**

```
┌────────────────────────────────────────────────────────────┐
│  🎮 KONTROL ADMIN                                         │
│  ┌──────────────────────────────────────────────────┐     │
│  │  👤 Manajemen User                              │     │
│  │  ┌──────────┬────────────┬──────────┐          │     │
│  │  │ Role     │ Nama       │ Foto ON  │          │     │
│  │  ├──────────┼────────────┼──────────┤          │     │
│  │  │ Admin    │ Panitia    │ ✅      │          │     │
│  │  │ User     │ Wisudawan  │ ✅ ON   │ [🔒 OFF]│     │
│  │  └──────────┴────────────┴──────────┘          │     │
│  │  ℹ️ Semua wisudawan pakai 1 akun user          │     │
│  └──────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

---

### 4.4 Pengambilan Foto (Enhanced)

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| PHOTO-01 | Camera Preview | Live webcam dengan overlay | High |
| PHOTO-02 | Multi-Shot 3x | 3 foto berturut-turut | High |
| PHOTO-03 | Countdown | 3-2-1 sebelum foto | High |
| PHOTO-04 | Progress | Indikator 1/3, 2/3, 3/3 | High |
| PHOTO-05 | Thumbnail | Preview sementara | High |
| PHOTO-06 | Frame Composition | Gabung 3 foto + frame | High |
| PHOTO-07 | **Save Both Versions** | Simpan asli + frame | High |
| PHOTO-08 | Flash Effect | Efek lampu kilat | Medium |
| PHOTO-09 | Sound | Efek suara klik | Low |
| PHOTO-10 | **Permission Check** | Cek akses sebelum capture | High |

**Flow dengan 2 Versi:**

```
1. User login (admin/user)
2. Cek permission foto (if user)
3. Tampilkan preview kamera
4. Klik "Ambil Foto"
5. Countdown 3 → 2 → 1
6. Capture foto ke-1 (thumbnail muncul)
7. Countdown 3 → 2 → 1
8. Capture foto ke-2
9. Countdown 3 → 2 → 1
10. Capture foto ke-3
11. Simpan 3 foto asli (tanpa frame) → R2
12. Gabungkan semua foto dengan frame aktif
13. Simpan hasil (dengan frame) → R2
14. Simpan metadata ke KV (2 URL)
15. Redirect ke halaman hasil
```

**Data Structure:**

```jsx
// Metadata per foto
{
  id: "WISUDA_20260618_143025_FOTO_0001",
  original_photos: [
    "<https://pub-xxx.r2.dev/2026/06/18/original/WISUDA_20260618_143025_1.jpg>",
    "<https://pub-xxx.r2.dev/2026/06/18/original/WISUDA_20260618_143025_2.jpg>",
    "<https://pub-xxx.r2.dev/2026/06/18/original/WISUDA_20260618_143025_3.jpg>"
  ],
  framed_photo: "<https://pub-xxx.r2.dev/2026/06/18/framed/WISUDA_20260618_143025_frame.jpg>",
  thumbnail: "<https://pub-xxx.r2.dev/2026/06/18/thumb/WISUDA_20260618_143025_thumb.jpg>",
  created_by: "wisudawan", // SATU USER
  created_at: "2026-06-18T14:30:25Z",
  frame_used: "Gold Elegant" // Frame yang digunakan
}
```

---

### 4.5 Penyimpanan Foto (R2 - Enhanced)

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| SAVE-01 | Upload Original | Simpan 3 foto asli | High |
| SAVE-02 | Upload Framed | Simpan 1 foto dengan frame | High |
| SAVE-03 | Upload Thumbnail | Simpan thumbnail kecil | High |
| SAVE-04 | Download Original | Download foto asli | High |
| SAVE-05 | Download Framed | Download foto dengan frame | High |
| SAVE-06 | Naming Convention | Format nama file | High |
| SAVE-07 | Folder Structure | Terorganisir per tipe | High |
| SAVE-08 | Public URL | Dapatkan URL publik | High |
| SAVE-09 | Notifikasi | Sukses/gagal upload | High |

**Folder Structure R2:**

```
wisuda-photos/
├── 2026/
│   └── 06/
│       └── 18/
│           ├── original/
│           │   ├── WISUDA_20260618_143025_1.jpg
│           │   ├── WISUDA_20260618_143025_2.jpg
│           │   └── WISUDA_20260618_143025_3.jpg
│           ├── framed/
│           │   └── WISUDA_20260618_143025_frame.jpg
│           └── thumb/
│               └── WISUDA_20260618_143025_thumb.jpg
```

**Naming Convention:**

```
Format Original: WISUDA_YYYYMMDD_HHMMSS_N.jpg (N: 1,2,3)
Format Framed: WISUDA_YYYYMMDD_HHMMSS_frame.jpg
Format Thumb: WISUDA_YYYYMMDD_HHMMSS_thumb.jpg

Contoh:
WISUDA_20260618_143025_1.jpg
WISUDA_20260618_143025_2.jpg
WISUDA_20260618_143025_3.jpg
WISUDA_20260618_143025_frame.jpg
WISUDA_20260618_143025_thumb.jpg
```

---

### 4.6 Galeri Public

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| GAL-01 | List Photos | Tampilkan semua foto (framed) | High |
| GAL-02 | Grid View | 3 kolom grid thumbnail | High |
| GAL-03 | Modal Preview | Klik foto → fullscreen | High |
| GAL-04 | **Download Options** | Download asli / with frame | High |
| GAL-05 | **View Original** | Lihat foto asli (tanpa frame) | Medium |
| GAL-06 | Infinite Scroll | Load more saat scroll | Medium |
| GAL-07 | Search/Filter | Cari berdasarkan tanggal | Low |
| GAL-08 | Slideshow | Auto slideshow | Low |

**Gallery Endpoint:**

```jsx
GET /api/gallery/list
Response: {
  photos: [
    {
      id: "photo_001",
      original_urls: ["url1", "url2", "url3"],
      framed_url: "url_frame",
      thumbnail_url: "url_thumb",
      created_by: "wisudawan",
      created_at: "2026-06-18T14:30:25Z"
    }
  ],
  total: 45
}

// Download specific version
GET /api/gallery/download/:id?type=original|framed
```

---

### 4.7 QR Code

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| QR-01 | Generate QR | QR dari URL galeri | High |
| QR-02 | Download QR | Simpan sebagai PNG | High |
| QR-03 | Copy Link | Copy URL galeri | High |
| QR-04 | Custom Design | Logo di tengah QR | Medium |

---

## 5. 🏗️ Arsitektur Teknis

### 5.1 Stack Teknologi

| Layer | Teknologi | Keterangan |
| --- | --- | --- |
| **Frontend** | Svelte 5 (Runes) | UI Framework |
| **Backend** | SvelteKit | Full-stack framework |
| **Hosting** | Cloudflare Pages | Deployment |
| **Storage** | Cloudflare R2 | Foto & frame (2 tipe) |
| **Database** | Cloudflare KV | User, session, metadata |
| **Image Processing** | Canvas API | Frame composition, thumbnail |
| **Styling** | Tailwind CSS + custom | Black & Gold theme |
| **QR Code** | `@kodav.dev/svelte5-qrcode` | QR generator |

### 5.2 Cloudflare Configuration

```toml
# wrangler.toml
name = "wisuda-photobooth-si"
compatibility_date = "2024-12-18"

[[r2_buckets]]
binding = "PHOTO_BUCKET"
bucket_name = "wisuda-photos"

[[r2_buckets]]
binding = "FRAME_BUCKET"
bucket_name = "wisuda-frames"

[[kv_namespaces]]
binding = "WISUDA_KV"
id = "abc123"
```

### 5.3 Environment Variables

```
# Auth
ADMIN_USERNAME=panitia
ADMIN_PASSWORD=wisuda2026
USER_USERNAME=wisudawan
USER_PASSWORD=wisuda2026

# R2
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# App
APP_URL=https://photobooth.wisuda2026.com
MAX_FILE_SIZE=5MB
SESSION_EXPIRY=28800 # 8 jam dalam detik
```

### 5.4 Database Schema (KV) - SEDERHANA

```jsx
// Key: 'users' - HANYA 2 AKUN!
{
  'panitia': {
    password: 'wisuda2026',
    role: 'admin',
    name: 'Panitia Wisuda',
    photo_enabled: true
  },
  'wisudawan': {
    password: 'wisuda2026',
    role: 'user',
    name: 'Wisudawan',
    photo_enabled: true
  }
}

// Key: 'photos'
[
  {
    id: "WISUDA_20260618_143025_FOTO_0001",
    original_urls: [
      "<https://pub-xxx.r2.dev/.../original/...1.jpg>",
      "<https://pub-xxx.r2.dev/.../original/...2.jpg>",
      "<https://pub-xxx.r2.dev/.../original/...3.jpg>"
    ],
    framed_url: "<https://pub-xxx.r2.dev/.../framed/...frame.jpg>",
    thumbnail_url: "<https://pub-xxx.r2.dev/.../thumb/...thumb.jpg>",
    created_by: "wisudawan",
    created_at: "2026-06-18T14:30:25Z"
  }
]

// Key: 'active_frame'
"frame_elegant_gold.png"

// Key: 'sessions'
{
  "session_id_123": {
    username: "wisudawan", // atau "panitia"
    role: "user", // atau "admin"
    created_at: 1234567890,
    expires_at: 1234567890
  }
}

// Key: 'photo_counter'
45
```

---

## 6. 🧩 Implementasi Kunci (SEDERHANA)

### 6.1 Login Flow with Simple Users

```jsx
// src/routes/api/auth/login/+server.js
export async function POST({ request, cookies, env }) {
  const { username, password } = await request.json();

  // Get users from KV (HANYA 2 USER)
  const users = await env.WISUDA_KV.get('users', { type: 'json' });
  const user = users?.[username];

  if (!user || user.password !== password) {
    return json({ success: false, message: 'Invalid credentials' }, { status: 401 });
  }

  const sessionId = crypto.randomUUID();

  await env.WISUDA_KV.put(`session_${sessionId}`, JSON.stringify({
    username,
    role: user.role,
    created_at: Date.now(),
    expires_at: Date.now() + 8 * 60 * 60 * 1000
  }), { expirationTtl: 28800 });

  cookies.set('session', sessionId, {
    httpOnly: true,
    secure: true,
    maxAge: 28800,
    path: '/'
  });

  return json({
    success: true,
    user: {
      username,
      role: user.role,
      name: user.name,
      photo_enabled: user.photo_enabled
    }
  });
}
```

### 6.2 Admin Control - Toggle User Photo (SEDERHANA)

```jsx
// src/routes/api/admin/toggle-user-photo/+server.js
export async function PUT({ request, locals, env }) {
  // Cek role admin
  if (locals.user?.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { photo_enabled } = await request.json();
  const users = await env.WISUDA_KV.get('users', { type: 'json' });

  // Update user account (wisudawan)
  if (users['wisudawan']) {
    users['wisudawan'].photo_enabled = photo_enabled;
    await env.WISUDA_KV.put('users', JSON.stringify(users));

    return json({
      success: true,
      message: `Fitur foto ${photo_enabled ? 'diaktifkan' : 'dinonaktifkan'} untuk user`
    });
  }

  return json({ error: 'User not found' }, { status: 404 });
}
```

### 6.3 Upload with 2 Versions

```jsx
// src/routes/api/upload/+server.js
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST({ request, cookies, env }) {
  // Auth check
  const session = await verifySession(cookies.get('session'), env);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  // Cek permission (jika user)
  const users = await env.WISUDA_KV.get('users', { type: 'json' });
  const user = users[session.username];

  if (user.role === 'user' && !user.photo_enabled) {
    return json({
      error: 'Fitur foto dinonaktifkan oleh admin'
    }, { status: 403 });
  }

  const formData = await request.formData();
  const originalPhotos = [
    formData.get('photo1'),
    formData.get('photo2'),
    formData.get('photo3')
  ];
  const framedPhoto = formData.get('framed_photo');
  const thumbnail = formData.get('thumbnail');

  const fileName = generateFileName();
  const datePath = getDatePath();

  // Upload semua file
  const uploadPromises = [];

  // Original photos
  originalPhotos.forEach((file, index) => {
    const key = `${datePath}/original/${fileName}_${index + 1}.jpg`;
    uploadPromises.push(uploadToR2(file, key));
  });

  // Framed photo
  const framedKey = `${datePath}/framed/${fileName}_frame.jpg`;
  uploadPromises.push(uploadToR2(framedPhoto, framedKey));

  // Thumbnail
  const thumbKey = `${datePath}/thumb/${fileName}_thumb.jpg`;
  uploadPromises.push(uploadToR2(thumbnail, thumbKey));

  await Promise.all(uploadPromises);

  // Simpan metadata
  const photoData = {
    id: fileName,
    original_urls: originalPhotos.map((_, i) =>
      `${env.R2_PUBLIC_URL}/${datePath}/original/${fileName}_${i + 1}.jpg`
    ),
    framed_url: `${env.R2_PUBLIC_URL}/${datePath}/framed/${fileName}_frame.jpg`,
    thumbnail_url: `${env.R2_PUBLIC_URL}/${datePath}/thumb/${fileName}_thumb.jpg`,
    created_by: session.username,
    created_at: new Date().toISOString()
  };

  await savePhotoToKV(photoData, env);

  return json({
    success: true,
    ...photoData
  });
}
```

### 6.4 Middleware - Simple Permission Check

```jsx
// src/lib/auth.js
export async function canTakePhoto(session, env) {
  if (!session) return false;

  const users = await env.WISUDA_KV.get('users', { type: 'json' });
  const user = users?.[session.username];

  if (!user) return false;

  // Admin always can
  if (user.role === 'admin') return true;

  // User must have photo_enabled = true
  return user.photo_enabled === true;
}

// src/hooks.server.js
export async function handle({ event, resolve }) {
  // ... session check

  // Add to locals for easy access
  event.locals.canTakePhoto = async () => {
    return await canTakePhoto(event.locals.session, event.platform.env);
  };

  return resolve(event);
}
```

---

## 7. 📐 Non-Functional Requirements

### 7.1 Performance

| Metrik | Target |
| --- | --- |
| Page Load Time | < 2 detik |
| Camera Preview Latency | < 100ms |
| Frame Composition | < 1 detik |
| Upload 2 Versions | < 5 detik |
| Gallery Load | < 1.5 detik |

### 7.2 Security

| Requirement | Implementation |
| --- | --- |
| Authentication | Session-based (cookie) |
| Authorization | Middleware per endpoint |
| Role-based Access | Admin vs User |
| File Validation | MIME type, size, extension |
| CSRF Protection | SameSite cookies |
| HTTPS | Wajib (Cloudflare default) |

### 7.3 Compatibility

| Browser | Minimum Version |
| --- | --- |
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

### 7.4 Storage Limits

| Item | Limit |
| --- | --- |
| Free Tier | 10 GB (R2) |
| File Size | 5 MB per foto |
| Max Photos | ~2000 foto (5 MB each) |
| Per Photo | 4 file (3 original + 1 framed + 1 thumb) |

---

## 8. 🧪 Testing Requirements (SEDERHANA)

### 8.1 Test Cases

| ID | Test | Expected Result |
| --- | --- | --- |
| TC-01 | Login admin | Redirect ke dashboard admin |
| TC-02 | Login user | Redirect ke dashboard user |
| TC-03 | Login invalid | Tampil error |
| TC-04 | Admin toggle user photo | User tidak bisa ambil foto |
| TC-05 | User ambil foto (enabled) | Berhasil, 2 versi tersimpan |
| TC-06 | User ambil foto (disabled) | Error "Fitur dinonaktifkan" |
| TC-07 | Upload 2 versi | Original + framed di R2 |
| TC-08 | Download original | File terdownload |
| TC-09 | Download framed | File terdownload |
| TC-10 | Admin upload frame | Frame tersimpan di R2 |
| TC-11 | Admin set active frame | Frame aktif berubah |
| TC-12 | User coba akses frame management | Error 403 Unauthorized |
| TC-13 | Gallery list | Foto tampil di grid |
| TC-14 | Session timeout | Redirect ke login |

---

## 9. 📅 Timeline (SEDERHANA)

| Fase | Durasi | Deliverable |
| --- | --- | --- |
| Phase 1: Setup | 1 hari | Project init, Cloudflare setup |
| Phase 2: Auth | 1 hari | Login, 2 akun (admin + user) |
| Phase 3: Admin Control | 1 hari | Toggle foto user, simple control |
| Phase 4: Camera | 2 hari | Preview, multi-shot 3x |
| Phase 5: Frame + 2 Versi | 3 hari | Composition, 2 tipe penyimpanan |
| Phase 6: Storage R2 | 2 hari | Upload original + framed |
| Phase 7: Gallery | 2 hari | Grid, modal, download options |
| Phase 8: Frame Admin | 1 hari | Admin-only frame management |
| Phase 9: QR Code | 1 hari | Generate, download |
| Phase 10: Polish | 2 hari | Styling, testing |
| **Total** | **16 hari** | **Production ready** |

---

## 10. 📝 Perubahan dari PRD Sebelumnya

| Perubahan | Sebelumnya | Sekarang |
| --- | --- | --- |
| **User System** | Multi-user (banyak akun) | **Single user (1 akun bersama)** |
| **Login** | Banyak akun berbeda | **2 akun: Admin + User** |
| **Manajemen User** | Tambah/edit/hapus user | **Toggle foto ON/OFF saja** |
| **Kontrol** | Kompleks | **Sederhana** |
| **Frame Management** | Admin only | Admin only (tetap) |
| **Galeri** | Sama | Sama (semua foto) |
| **Kompleksitas** | Medium | **Rendah - Sederhana** |

---

## 11. ✅ Approval

| Role | Nama | Tanda Tangan | Tanggal |
| --- | --- | --- | --- |
| **Product Owner** | ________ | _________ | ____ |
| **Project Manager** | ________ | _________ | ____ |
| **Lead Developer** | ________ | _________ | ____ |

---

**Document Version:** 3.2 (Final - Sederhana)

**Status:** ✅ Ready for Development

**Last Updated:** 18 Juni 2026

---

*Dokumen ini adalah panduan lengkap untuk pengembangan Web Photobooth Wisuda SI dengan sistem sederhana (2 akun). Semua fitur, desain, dan arsitektur telah disesuaikan dengan kebutuhan.* 🚀