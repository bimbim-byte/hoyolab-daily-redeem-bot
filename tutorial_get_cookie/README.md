## Cara Mendapatkan COOKIE Anda

1. Buka halaman [profil HoyoLab](https://www.hoyolab.com/accountCenter/postList) Anda dan masuk (*log in*) menggunakan akun Hoyoverse Anda.
2. Buka konsol browser dengan menekan tombol `F12`.
3. Masuk ke tab **Network**.

   ![Network Tab](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_T1.png)

4. Cari `getGameRecordCard` pada kolom pencarian permintaan jaringan (*network requests*), lalu klik pada hasil yang muncul. (Jika tidak ada yang muncul, silakan segarkan/refresh halaman dengan kondisi konsol browser tetap terbuka).

   ![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_T2.png)

5. Masuk ke tab **Headers**, lalu gulir ke bawah hingga menemukan bagian **Request Headers**. Salin (*copy*) seluruh nilai dari **cookie** tersebut.

   ![image](https://raw.githubusercontent.com/bimbim-byte/hoyolab-daily-redeem-bot/refs/heads/main/assets/SS_T3.png)
  
6. [Selanjutnya untuk mengatur file spreadsheet dan Apps Script](https://github.com/bimbim-byte/hoyolab-daily-redeem-bot/tree/main/tutorial_set_appsscript)