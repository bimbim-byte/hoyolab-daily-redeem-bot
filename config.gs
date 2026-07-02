const TELEGRAM_TOKEN = ""; // isi dengan bot telegram milikmu
const TELEGRAM_CHAT_ID = ""; // isi id telegram mu
const SHEET_NAME = "Akun"; // Sesuaikan dengan nama sheet pada spreadsheet
const WEBHOOK_URL = ""; // masukan kesini url aplikasinya ketika sudah melakukan deploy ke versi terbaru

const telegramUrl = "https://api.telegram.org/bot" + TELEGRAM_TOKEN;

const COMMON_HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Connection": "keep-alive",
  "x-rpc-app_version": "2.34.1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "x-rpc-client_type": "4"
};
