## 🤖 Pengaturan Telegram
Di bagian ini akan dijelaskan cara pengisian data untuk:
`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`, dan `WEBHOOK_URL`

### Mengambil TELEGRAM_TOKEN

1. **Buat Bot Telegram Baru:**
   * Cari akun [@BotFather](https://t.me/BotFather) resmi di Telegram.
   * Kirim perintah `/newbot` untuk memulai pembuatan bot baru.
   * Ikuti instruksi untuk memberikan **nama** (*display name*) dan **username** bot Anda (username harus diakhiri dengan kata `bot`, contoh: `MyRedeemBot_bot`).
2. **Salin HTTP API Token:**
   * Setelah berhasil, BotFather akan mengirimkan pesan berisi token akses HTTP API Anda.
   * Salin token tersebut dan masukkan ke variabel `TELEGRAM_TOKEN` pada Apps Script Anda.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_BT1.png) 

### Mengambil TELEGRAM_CHAT_ID

1. **Cari Bot ID:**
   * Cari akun [@myidbot](https://t.me/myidbot) di Telegram.
2. **Dapatkan ID Anda:**
   * Mulai percakapan (*Start*) lalu kirim perintah `/getid`.
   * Bot akan membalas dengan deretan angka (ID Telegram Anda).
   * Salin angka tersebut dan masukkan ke variabel `TELEGRAM_CHAT_ID` pada Apps Script Anda.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_BT2.png) 

### Mengambil WEBHOOK_URL

Agar bot Telegram Anda bisa menerima pesan secara otomatis dari Google Apps Script, Anda harus mengaktifkan Webhook. Ikuti langkah-langkah berikut:

1. **Deploy Google Apps Script:**
   * Buka editor Google Apps Script Anda.
   * Klik tombol **Deploy** di pojok kanan atas, lalu pilih **New deployment**.
   * Klik ikon gerigi (Configuration) di sebelah kiri, lalu pilih **Web app**.
   * Atur konfigurasinya sebagai berikut:
     * **Description:** (Bebas, misal: `v1`)
     * **Execute as:** `Me (email_anda@gmail.com)`
     * **Who has access:** `Anyone` *(PENTING: Harus diatur ke "Anyone" agar Telegram bisa mengirimkan data ke script Anda)*.
   * Klik tombol **Deploy**.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_GS1.png)


2. **Salin Web App URL:**
   * Setelah proses deploy selesai, salin URL yang tertera di bawah kolom **Web app**. URL ini biasanya diawali dengan `https://script.google.com/macros/s/...`.
   * Tempel URL tersebut ke variabel `WEBHOOK_URL` pada Apps Script Anda.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_GS2.png)

3. **Jalankan Fungsi Setup Webhook (Jika Ada):**
   * Setelah menyimpan variabel `WEBHOOK_URL` di script Anda, pilih fungsi `setWebhook` di menu atas editor Apps Script, lalu klik **Run**.
   * Ini akan mendaftarkan URL Web App Anda ke server Telegram agar bot bisa mulai merespons perintah.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_GS3.png)

4 **Untuk Test silahkan buka telegram dan mulai percakapan dengan kirim pesan ```/start``` atau ```/menu```**

---

## ⏱️ Mengatur Trigger (Pemicu) Otomatis

1. Kembali ke tab Apps Script, lalu klik ikon **Pemicu (Triggers)** 🕒 di bilah sisi kiri. Di sini kita akan membuat pemicu untuk fungsi: `jalankanAutoCheckIn`, `jalankanAutoRedeem`, dan `pantauKodeBaru`.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_TG1.png)

2. Klik tombol **+ Tambah Pemicu (+ Add Trigger)** di pojok kanan bawah.

![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_TG2.png)

3. Anda bebas untuk mengikuti rekomendasi pengaturan waktu dari saya atau menyesuaikannya dengan keinginan Anda sendiri.
4. **Pengaturan Trigger untuk `jalankanAutoCheckIn`:**
   *(Sesuaikan pengaturan seperti pada gambar di bawah ini)*

   ![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_TG3.png)

5. **Pengaturan Trigger untuk `jalankanAutoRedeem`:**
   *(Sesuaikan pengaturan seperti pada gambar di bawah ini)*

   ![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_TG4.png)

6. **Pengaturan Trigger untuk `pantauKodeBaru`:**
   *(Sesuaikan pengaturan seperti pada gambar di bawah ini)*

   ![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_TG4.png)