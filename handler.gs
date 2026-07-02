function jalankanAutoCheckIn() {
  console.log("=== Memulai Proses Auto Check-In ===");

  const hoyoData = getHoyoData();
  const HOYOLAB_ACCOUNTS = hoyoData.HOYOLAB_ACCOUNTS;

  for (const gameName in HOYOLAB_ACCOUNTS) {
    const hlbCookies = HOYOLAB_ACCOUNTS[gameName];
    if (Array.isArray(hlbCookies) && hlbCookies.length > 0) {
      const game = new Game(gameName, DEFAULT_CONSTANTS[gameName]);
      game.runCheckIn(hlbCookies);
    }
  }
}

function jalankanAutoRedeem() {
  console.log("=== Memulai Proses Auto Redeem Code ===");
  const hoyoData = getHoyoData();

  const HOYOLAB_ACCOUNTS = hoyoData.HOYOLAB_ACCOUNTS;
  const REDEEM_COOKIES = hoyoData.REDEEM_COOKIES;

  for (const gameName in HOYOLAB_ACCOUNTS) {
    const hlbCookies = HOYOLAB_ACCOUNTS[gameName];
    const rdmCookies = REDEEM_COOKIES[gameName] || [];

    if (Array.isArray(hlbCookies) && hlbCookies.length > 0) {
      const game = new Game(gameName, DEFAULT_CONSTANTS[gameName]);
      game.runRedeem(hlbCookies, rdmCookies);
    }
  }
}

function pantauKodeBaru() {
  console.log("=== Memulai Pemantauan Kode Baru dari API ===");

  try {
    const apiUrl = "https://db.hashblen.com/codes";
    const response = UrlFetchApp.fetch(apiUrl);
    const apiData = JSON.parse(response.getContentText());

    if (apiData.retcode !== 0) {
      console.error("Gagal mengambil data dari API: Retcode tidak 0");
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("ListRedeem");

    if (!sheet) {
      sheet = ss.insertSheet("ListRedeem");
      sheet.appendRow(["game", "code", "description", "created", "url", "telegram_send_notif"]);
    }

    const existingRows = sheet.getDataRange().getValues();

    const gameMappings = {
      genshin: { name: "Genshin Impact", urlTemplate: "https://genshin.hoyoverse.com/en/gift?code=" },
      hsr:     { name: "Honkai: Star Rail", urlTemplate: "https://hsr.hoyoverse.com/gift?code=" },
      zzz:     { name: "Zenless Zone Zero", urlTemplate: "https://zenless.hoyoverse.com/redemption?code=" }
    };

    for (const apiKey in gameMappings) {
      const gameCodes = apiData[apiKey];
      if (!Array.isArray(gameCodes)) continue;

      const gameInfo = gameMappings[apiKey];

      for (const item of gameCodes) {
        const code = item.code;
        const description = item.description || "No description";

        const createdDate = item.added_at ? new Date(item.added_at * 1000) : new Date();
        const formattedCreatedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        const manualUrl = gameInfo.urlTemplate + code;

        let existingRowIndex = -1;
        let currentStatusNotif = "";

        for (let r = 0; r < existingRows.length; r++) {
          if (existingRows[r][0].toString() === gameInfo.name && existingRows[r][1].toString() === code.toString()) {
            existingRowIndex = r + 1;
            currentStatusNotif = existingRows[r][5] ? existingRows[r][5].toString() : "";
            break;
          }
        }

        if (existingRowIndex !== -1 && currentStatusNotif === "Selesai Dikirim") {
          continue;
        }

        console.log(`[Proses] Mengirim/Mengulang notifikasi untuk ${gameInfo.name}: ${code} (Status Sebelumnya: ${currentStatusNotif || "Baru"})`);

        let telegramStatus = "Token Kosong";
        if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
          const kirimNotif = kirimNotifKodeBaruTelegram(gameInfo.name, code, description, manualUrl);
          telegramStatus = kirifNotif ? "Selesai Dikirim" : "Gagal Mengirim";
        }

        if (existingRowIndex === -1) {
          sheet.appendRow([
            gameInfo.name,
            code,
            description,
            formattedCreatedDate,
            manualUrl,
            telegramStatus
          ]);
        } else {
          sheet.getRange(existingRowIndex, 6).setValue(telegramStatus);
          console.log(`[Update] Mengubah status baris ke-${existingRowIndex} menjadi: ${telegramStatus}`);
        }

        Utilities.sleep(1000);
      }
    }

  } catch (e) {
    console.error(`[Error Pemantauan] Gagal memproses kode baru: ${e.message}`);
  }

  console.log("=== Proses Pemantauan Kode Baru Selesai ===");
}

function kirimNotifKodeBaruTelegram(gameName, code, description, claimUrl) {
  const message = `*🚨 KODE REDEEM BARU TERDETEKSI!*
──────────────────
🎮 *Game:* ${gameName}
🔑 *Kode:* \`${code}\`
📝 *Deskripsi:* _${description}_

👉 *Klaim Manual Melalui Tautan Berikut:*
[Klik untuk Klaim Kode](${claimUrl})`;

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "Markdown",
    disable_notification: false
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const resData = JSON.parse(response.getContentText());
    return resData.ok === true;
  } catch (err) {
    console.error(`Gagal mengirim pesan Telegram: ${err.message}`);
    return false;
  }
}
