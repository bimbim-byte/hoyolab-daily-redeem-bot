# 🚀 HoYoLAB Automation Engine with TELEGRAM BOT

Sistem otomasi berbasis **Google Apps Script (GAS)** yang dirancang untuk melakukan **Auto Check-In** harian dan **Auto Redeem Code** secara mandiri untuk game miHoYo/HoYoverse (*Genshin Impact, Honkai: Star Rail, dan Zenless Zone Zero*).

---

## 🌟 Fitur Utama

* **🤖 Auto Check-In Pintar:** Secara otomatis melakukan absen harian ke HoYoLAB.
* **🔑 Auto Redeem Code Terpusat:** Memantau kode baru secara real-time.
* **🛡️ Isolasi Kegagalan & Anti-Crash (`Try...Catch`):** Jika salah satu cookie akun kedaluwarsa atau mati, skrip tidak akan mogok massal. Skrip akan mengisolasi error tersebut, melaporkannya, dan langsung melanjutkan proses ke akun berikutnya.
* **📊 Database Google Sheets Terintegrasi:** Seluruh riwayat check-in masuk ke sheet `Login` dan riwayat penukaran kode dicatat ke sheet `Redeem` dengan mekanisme `SpreadsheetApp.flush()` untuk mencegah data duplikat.
* **🔔 Alarm Telegram:** Notifikasi instan ke Telegram Anda untuk laporan keberhasilan hadiah atau *System Alert Error* jika cookie akun bermasalah.

---

## 🏁 Sebelum Memulai
Ikutilah tutorial pada tautan berikut untuk mendapatkan nilai ID Cookie Anda:
👉 [Panduan Mengambil Cookie](https://github.com/bimbim-byte/hoyolab-daily-redeem-bot/tree/main/tutorial_get_cookie)

---

## 🚩 Langkah Eksekusi Kode
Setelah berhasil mendapatkan cookie, silakan ikuti tutorial di bawah ini untuk menjalankan kode menggunakan sistem *Trigger* otomatis serta integrasi notifikasi Telegram:
👉 [Panduan Trigger & Notifikasi Telegram](https://github.com/bimbim-byte/hoyolab-daily-redeem-bot/tree/main/tutorial_set_appsscript)

---

## 🤖 Daftar Perintah (Command) Bot Telegram

Berikut adalah daftar perintah yang bisa Anda gunakan langsung di dalam chat bot Telegram untuk mengelola akun Anda:

| Perintah | Deskripsi |
| :--- | :--- |
| `/adddata` | Menambahkan akun baru (nama game, cookie) ke dalam sistem. |
| `/editdata` | Mengubah atau memperbarui cookie pada akun yang sudah terdaftar. |
| `/hapusdata` | Menghapus data akun dari sistem. |
| `/redeem` | Melakukan klaim/redeem kode secara manual untuk semua akun. |
| `/showall` | Menampilkan seluruh daftar akun yang telah terdaftar beserta statusnya. |

> 💡 **Tips:** Anda bisa mendaftarkan perintah-perintah di atas ke [@BotFather](https://t.me/BotFather) menggunakan menu `/setcommands` agar perintah tersebut muncul secara otomatis sebagai tombol menu cepat di pojok kiri bawah ruang obrolan bot Anda.