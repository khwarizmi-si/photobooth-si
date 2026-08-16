# Photobooth Gumuruh

Aplikasi web photobooth bertema merah-putih untuk perayaan HUT ke-81 Republik Indonesia di kampung Gumuruh.

## Fitur

- **Dashboard Admin** dengan kontrol penuh
- **Dashboard User** (1 akun bersama) untuk semua peserta
- **Galeri Public** menampilkan semua foto
- **QR Code** untuk akses cepat ke galeri foto
- **Penyimpanan ganda**: Foto asli (tanpa frame) + Foto hasil (dengan frame)
- **Cloudflare R2** sebagai penyimpanan utama
- **Frame Management**: Hanya admin yang bisa upload, pilih, dan hapus frame

## Tech Stack

- **Frontend**: Svelte 5 (Runes)
- **Backend**: SvelteKit
- **Hosting**: Cloudflare Pages
- **Storage**: Cloudflare R2
- **Database**: Cloudflare KV
- **Styling**: Tailwind CSS

## Credentials Default

- **Admin**: username `panitia`, password `gumuruh2026`
- **User**: username `peserta`, password `gumuruh2026`

## Setup Cloudflare

1. Buat project Pages baru: `photobooth-gumuruh`
2. Buat bucket R2 baru untuk `GUMURUH_BUCKET`
3. Buat KV namespace baru untuk `GUMURUH_KV`
4. Update `wrangler.toml` dengan ID KV yang baru (ganti `REPLACE_WITH_YOUR_KV_ID`)
5. Deploy dengan `wrangler pages deploy`

## Developing

```sh
npm run dev
```

## Building

```sh
npm run build
```
