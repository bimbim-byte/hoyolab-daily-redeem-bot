function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    handleTelegram(update);
  } catch (err) {
    Logger.log(err);
  }
}

function handleTelegram(update) {
  const cache = CacheService.getScriptCache();

  if (update.callback_query) {
    handleCallbackQuery(update.callback_query, cache);
    return;
  }

  if (!update.message) return;

  const chatId = update.message.chat.id;
  const text = update.message.text ? update.message.text.trim() : "";
  const userState = cache.get("state_" + chatId);

  if (userState) {
    handleStateConversation(chatId, text, userState, cache);
    return;
  }

  if (text.startsWith("/start")) {
    sendMessage(chatId, "👋 Halo! Bot CRUD Spreadsheet siap digunakan.");
  } 
  else if (text === "/menu") {
    sendMessage(chatId, "📌 MENU \n/adddata - Menambahkan akun \n/editdata - Merubah cookie akun \n/hapusdata - Menghapus akun \n/redeem - Redeem kode manual \n/showall - Menampilkan seluruh akun");
  }
  else if (text === "/showall") {
    handleShowAll(chatId);
  } 
  else if (text.startsWith("/getdata")) {
    const uid = text.split(" ")[1];
    handleGetData(chatId, uid);
  } 
  else if (text === "/adddata") {
    cache.put("state_" + chatId, "ADD_GAME", 300);
    sendMessage(chatId, "🎮 Silakan masukkan nama game.\nPilihan: <b>genshin</b>, <b>starrail</b>, atau <b>zenless</b>");
  } 
  else if (text.startsWith("/editdata")) {
    const uid = text.split(" ")[1];
    handleEditDataStart(chatId, uid, cache);
  } 
  else if (text.startsWith("/hapusdata")) {
    const uid = text.split(" ")[1];
    handleHapusDataStart(chatId, uid, cache);
  }
  else if (text.startsWith("/redeem")) {
    const uid = text.split(" ")[1];
    handleManualRedeemStart(chatId, uid, cache);
  }
}

function handleShowAll(chatId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data[0].length <= 1) {
    sendMessage(chatId, "📭 Belum ada data di spreadsheet.");
    return;
  }

  let message = "";
  for (let col = 1; col < data[0].length; col++) {
    const game = data[0][col];
    const info = data[4][col] || "Belum ada info";
    message += `[${game}] - ${info}\n`;
  }
  sendMessage(chatId, message);
}

function handleGetData(chatId, uid) {
  if (!uid) return sendMessage(chatId, "⚠️ Format salah. Gunakan: <code>/getdata [UID]</code>");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const colIndex = findColumnByUid(data, uid);

  if (colIndex === -1) return sendMessage(chatId, `❌ Data dengan UID ${uid} tidak ditemukan.`);

  let msg = `<b>🔍 Data Ditemukan:</b>\n\n`;
  msg += `🎮 Game: ${data[0][colIndex - 1]}\n`;
  msg += `🔑 ltoken_v2: <code>${data[1][colIndex - 1]}</code>\n`;
  msg += `🆔 ltuid_v2: <code>${data[2][colIndex - 1]}</code>\n`;
  msg += `🍪 cookie: <code>${data[3][colIndex - 1]}</code>\n`;
  msg += `ℹ️ info: ${data[4][colIndex - 1]}`;

  sendMessage(chatId, msg);
}

async function handleStateConversation(chatId, text, state, cache) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (text.toLowerCase() === "batal") {
    cache.remove("state_" + chatId);
    cache.remove("data_" + chatId);
    sendMessage(chatId, "❌ Proses interaksi dibatalkan.");
    return;
  }

  if (state.startsWith("ADD_")) {
    let savedData = cache.get("data_" + chatId) ? JSON.parse(cache.get("data_" + chatId)) : {};

    if (state === "ADD_GAME") {
      const validGames = ["genshin", "starrail", "zenless"];
      if (!validGames.includes(text.toLowerCase())) {
        sendMessage(chatId, "⚠️ Game tidak valid! Ketik: <b>genshin</b>, <b>starrail</b>, atau <b>zenless</b>");
        return;
      }
      savedData.game = text.toLowerCase();
      cache.put("data_" + chatId, JSON.stringify(savedData), 300);
      cache.put("state_" + chatId, "ADD_LTOKEN", 300);
      sendMessage(chatId, "🔑 Masukkan <b>ltoken_v2</b>:");
    } 
    else if (state === "ADD_LTOKEN") {
      savedData.ltoken = text;
      cache.put("data_" + chatId, JSON.stringify(savedData), 300);
      cache.put("state_" + chatId, "ADD_LTUID", 300);
      sendMessage(chatId, "🆔 Masukkan <b>ltuid_v2</b>:");
    } 
    else if (state === "ADD_LTUID") {
      savedData.ltuid = text;
      cache.put("data_" + chatId, JSON.stringify(savedData), 300);
      cache.put("state_" + chatId, "ADD_COOKIE", 300);
      sendMessage(chatId, "🍪 Masukkan <b>cookie</b>:");
    } 
    else if (state === "ADD_COOKIE") {
      savedData.cookie = text;
      sendMessage(chatId, "⏳ Menyimpan data & memperbarui baris info...");

      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(savedData.game);
      sheet.getRange(2, nextCol).setValue(savedData.ltoken);
      sheet.getRange(3, nextCol).setValue(savedData.ltuid);
      sheet.getRange(4, nextCol).setValue(savedData.cookie);

      updateHoyoInfo();
      SpreadsheetApp.flush();

      const infoResult = sheet.getRange(5, nextCol).getValue();
      if (infoResult && infoResult !== "Error" && infoResult !== "Tidak ditemukan") {
        sendMessage(chatId, `✅ Penambahan berhasil!\n[${savedData.game}] - ${infoResult}`);
      } else {
        sendMessage(chatId, `⚠️ Data disimpan, namun status info: <b>${infoResult}</b>. Mohon periksa validitas cookie.`);
      }

      cache.remove("state_" + chatId);
      cache.remove("data_" + chatId);
    }
  }
  else if (state.startsWith("EDIT_COOKIE_")) {
    const uid = state.replace("EDIT_COOKIE_", "");
    const data = sheet.getDataRange().getValues();
    const colIndex = findColumnByUid(data, uid);

    if (colIndex === -1) {
      sendMessage(chatId, "❌ Terjadi kesalahan. Data tidak ditemukan lagi.");
      cache.remove("state_" + chatId);
      return;
    }

    sheet.getRange(4, colIndex).setValue(text);
    sendMessage(chatId, "⏳ Cookie baru disimpan. Memperbarui informasi akun Hoyoverse...");

    updateHoyoInfo();
    SpreadsheetApp.flush();

    const infoResult = sheet.getRange(5, colIndex).getValue();
    sendMessage(chatId, `✅ Perubahan cookie berhasil!\nInfo terbaru: <b>${infoResult}</b>`);
    cache.remove("state_" + chatId);
  }
  else if (state.startsWith("REDEEM_MANUAL_")) {
    const uid = state.replace("REDEEM_MANUAL_", "");
    const data = sheet.getDataRange().getValues();
    const colIndex = findColumnByUid(data, uid);

    if (colIndex === -1) {
      sendMessage(chatId, "❌ Terjadi kesalahan. Data UID tersebut tidak ditemukan lagi di sheet.");
      cache.remove("state_" + chatId);
      return;
    }

    // 1. Ambil data mentah per baris berdasarkan koordinat kolom akun (colIndex - 1)
    const gameName = data[0][colIndex - 1];     // Baris 1: Nama Game
    const ltokenV2 = data[1][colIndex - 1];     // Baris 2: ltoken_v2 asli
    const ltuidV2  = data[2][colIndex - 1];     // Baris 3: ltuid_v2 asli
    let baseCookie = data[3][colIndex - 1];     // Baris 4: Cookie dasar dari sheet
    const infoRowText = data[4][colIndex - 1];  // Baris 5: Info teks akun

    // 2. Satukan ltoken_v2 dan ltuid_v2 ke dalam string cookie jika belum ada di dalamnya
    if (baseCookie && !baseCookie.includes("ltoken_v2=")) {
      baseCookie = `ltoken_v2=${ltokenV2}; ltuid_v2=${ltuidV2}; ${baseCookie}`;
    }

    const codeToRedeem = text.toUpperCase();
    sendMessage(chatId, `⏳ Memproses redeem kode <b>${codeToRedeem}</b> untuk UID ${uid}...`);

    try {
      if (!DEFAULT_CONSTANTS[gameName]) {
        throw new Error(`Konfigurasi untuk game '${gameName}' tidak terdaftar di sistem.`);
      }

      const gameInstance = new Game(gameName, DEFAULT_CONSTANTS[gameName]);
      
      // Gunakan baseCookie yang sudah di-inject ltoken & ltuid lengkap
      const profileResult = await gameInstance.getAccountDetails(baseCookie, colIndex);
      
      if (!profileResult.success) {
        throw new Error(`Gagal memverifikasi profil akun. API Server merespons: ${profileResult.message}`);
      }

      // Jalankan redeem menggunakan cookie yang sudah lengkap
      const apiResponseStatus = await gameInstance.executeRedeem(baseCookie, profileResult, codeToRedeem);

      // Catat transaksi
      gameInstance.writeToRedeemSheet(gameName, profileResult, codeToRedeem, apiResponseStatus);

      // Kirim Notifikasi Sukses ke Telegram
      sendMessage(chatId, `📊 <b>Hasil Redeem Manual:</b>\n🎮 Game: ${gameInstance.constants.game}\n👤 Nickname: <b>${profileResult.nickname}</b>\n🆔 UID: <code>${uid}</code>\n🌍 Server: <code>${profileResult.region}</code>\n🔑 Kode: <code>${codeToRedeem}</code>\n\n📝 <b>Respon:</b>\n<code>${apiResponseStatus}</code>`);
      
    } catch (err) {
      sendMessage(chatId, `❌ <b>Proses Redeem Gagal!</b>\n⚠️ Keterangan: _${err.message}_`);
      Logger.log(err);
    }

    cache.remove("state_" + chatId);
  }
}

function handleEditDataStart(chatId, uid, cache) {
  if (!uid) return sendMessage(chatId, "⚠️ Format salah. Gunakan: <code>/editdata [UID]</code>");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const colIndex = findColumnByUid(data, uid);

  if (colIndex === -1) return sendMessage(chatId, `❌ Data dengan UID ${uid} tidak ditemukan.`);

  cache.put("state_" + chatId, "EDIT_COOKIE_" + uid, 300);
  sendMessage(chatId, `✍️ Anda akan mengubah <b>cookie</b> untuk UID ${uid}.\n\nSilakan kirimkan cookie baru sekarang, atau ketik <b>batal</b> untuk keluar.`);
}

function handleHapusDataStart(chatId, uid, cache) {
  if (!uid) return sendMessage(chatId, "⚠️ Format salah. Gunakan: <code>/hapusdata [UID]</code>");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const colIndex = findColumnByUid(data, uid);

  if (colIndex === -1) return sendMessage(chatId, `❌ Data dengan UID ${uid} tidak ditemukan.`);

  const game = data[0][colIndex - 1];
  const info = data[4][colIndex - 1];

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔴 Ya, Hapus", callback_data: "DELETE_CONFIRM_" + uid },
        { text: "⚪ Batal", callback_data: "DELETE_CANCEL" }
      ]
    ]
  };

  sendInlineKeyboard(chatId, `⚠️ <b>Apakah Anda yakin ingin menghapus akun ini?</b>\n\n[${game}] - ${info}`, keyboard);
}

function handleManualRedeemStart(chatId, uid, cache) {
  if (!uid) return sendMessage(chatId, "⚠️ Format salah. Gunakan: <code>/redeem [UID]</code>");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const colIndex = findColumnByUid(data, uid);

  if (colIndex === -1) return sendMessage(chatId, `❌ Data dengan UID ${uid} tidak ditemukan.`);

  const game = data[0][colIndex - 1];
  const info = data[4][colIndex - 1];

  // Set state percakapan menunggu input kode redeem
  cache.put("state_" + chatId, "REDEEM_MANUAL_" + uid, 300); // Expired dalam 5 menit
  
  sendMessage(chatId, `🎁 <b>Redeem Kode Manual</b>\n🎮 Game: [${game}]\nℹ️ Akun: ${info}\n\nSilakan ketik/kirimkan <b>KODE REDEEM</b> sekarang, atau ketik <b>batal</b> untuk keluar.`);
}

function handleCallbackQuery(callback, cache) {
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const cbData = callback.data;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (cbData.startsWith("DELETE_CONFIRM_")) {
    const uid = cbData.replace("DELETE_CONFIRM_", "");
    const sheetData = sheet.getDataRange().getValues();
    const colIndex = findColumnByUid(sheetData, uid);

    if (colIndex !== -1) {
      sheet.deleteColumn(colIndex);
      editMessageText(chatId, messageId, "✅ Akun telah berhasil dihapus secara permanen.");
    } else {
      editMessageText(chatId, messageId, "❌ Gagal menghapus, data UID sudah tidak ada.");
    }
  } 
  else if (cbData === "DELETE_CANCEL") {
    editMessageText(chatId, messageId, "❌ Penghapusan dibatalkan.");
  }

  UrlFetchApp.fetch(telegramUrl + "/answerCallbackQuery", {
    method: "post",
    payload: { callback_query_id: callback.id }
  });
}

// ====================================================================
function findColumnByUid(data, uid) {
  if (data.length < 5) return -1;
  for (let col = 1; col < data[0].length; col++) {
    const infoText = String(data[4][col]);
    if (infoText.includes(uid)) {
      return col + 1;
    }
  }
  return -1;
}

function sendMessage(chatId, text) {
  UrlFetchApp.fetch(telegramUrl + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    })
  });
}

function sendInlineKeyboard(chatId, text, keyboard) {
  UrlFetchApp.fetch(telegramUrl + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      reply_markup: keyboard
    })
  });
}

function editMessageText(chatId, messageId, text) {
  UrlFetchApp.fetch(telegramUrl + '/editMessageText', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML"
    })
  });
}

function handleError(modul, namaAkun, pesanError) {
  const formatLog = `❌ [ERROR - ${modul}] | Akun: ${namaAkun} | Pesan: ${pesanError}`;
  console.error(formatLog);

  if (typeof TELEGRAM_TOKEN !== 'undefined' && TELEGRAM_TOKEN && typeof TELEGRAM_CHAT_ID !== 'undefined' && TELEGRAM_CHAT_ID) {
    const msg = `⚠️ *SYSTEM ERROR ALERT*\n` +
                `──────────────────\n` +
                `📂 *Modul:* \`${modul}\`\n` +
                `👤 *Akun:* \`${namaAkun}\`\n` +
                `❌ *Keterangan:* _${pesanError}_`;
    try {
      UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        contentType: "application/json",
        payload: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: msg,
          parse_mode: "Markdown",
          disable_notification: false
        }),
        muteHttpExceptions: true
      });
    } catch (tgErr) {
      console.error(`🚨 [Gagal Kirim Telegram Error] ${tgErr.message}`);
    }
  }
}
