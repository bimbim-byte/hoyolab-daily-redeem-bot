const TELEGRAM_TOKEN = "";        // MASUKAN BOT TOKEN TELEGRAM MU
const TELEGRAM_CHAT_ID = "";      // MASUKAN ID CHAT TELEGRAM MU
const WEBHOOK_URL = "";           // SETELAH MELAKUKAN DEPLOYMENT BARU, MASUKAN URL APP NYA KE WEBHOOK URL, LALU JALANKAN SETWEBHOOK()

const telegramUrl = "https://api.telegram.org/bot" + TELEGRAM_TOKEN;

const COMMON_HEADERS = {  
  "Accept": "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Connection": "keep-alive",
  "x-rpc-app_version": "2.34.1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "x-rpc-client_type": "4"
};

function setupSpreadsheet(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),cfg=[
    {n:"Akun",t:"col",v:["game","ltoken_v2","ltuid_v2","cookie","info"]},
    {n:"ListRedeem",t:"row",v:["game","code","description","created","url","telegram_notif"]},
    {n:"Redeem",t:"row",v:["timestamp","game","uid","nickname","code","status"]},
    {n:"Login",t:"row",v:["timestamp","game","uid","nickname","day","status"]}
  ];
  cfg.forEach(c=>{
    let s=ss.getSheetByName(c.n)||ss.insertSheet(c.n);
    ss.setActiveSheet(s);
    let d=c.t=="col"?s.getRange(1,1,c.v.length,1).getValues().flat():s.getRange(1,1,1,c.v.length).getValues()[0];
    if(!c.v.every((v,i)=>v===d[i]))
      c.t=="col"?s.getRange(1,1,c.v.length,1).setValues(c.v.map(v=>[v])):s.getRange(1,1,1,c.v.length).setValues([c.v]);
  });
}

function setWebhook() {
  const response = UrlFetchApp.fetch(telegramUrl + "/setWebhook?url=" + WEBHOOK_URL);
  Logger.log(response.getContentText());
}

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
  const dbhash_constants = {
    genshin: {
      game: "Genshin Impact",
      giftUrl: "https://genshin.hoyoverse.com/en/gift?code="
    },
    hsr: {
      game: "Honkai: Star Rail",
      giftUrl: "https://hsr.hoyoverse.com/gift?code="
    },
    zzz: {
      game: "Zenless Zone Zero",
      giftUrl: "https://zenless.hoyoverse.com/redemption?code="
    }
  }

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
    if (!sheet) { setupSpreadsheet(); }

    const existingRows = sheet.getDataRange().getValues();

    for (const apiKey in dbhash_constants) {
      const gameCodes = apiData[apiKey];
      if (!Array.isArray(gameCodes)) continue;

      const gameInfo = dbhash_constants[apiKey];

      for (const item of gameCodes) {
        const code = item.code;
        const description = item.description || "No description";

        const createdDate = item.added_at ? new Date(item.added_at * 1000) : new Date();
        const formattedCreatedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        const manualUrl = gameInfo.giftUrl + code;

        let existingRowIndex = -1;
        let currentStatusNotif = "";

        for (let r = 0; r < existingRows.length; r++) {
          if (existingRows[r][0].toString() === gameInfo.game && existingRows[r][1].toString() === code.toString()) {
            existingRowIndex = r + 1;
            currentStatusNotif = existingRows[r][5] ? existingRows[r][5].toString() : "";
            break;
          }
        }

        if (existingRowIndex !== -1 && currentStatusNotif === "Selesai Dikirim") {
          continue;
        }

        console.log(`[Proses] Mengirim/Mengulang notifikasi untuk ${gameInfo.game}: ${code} (Status Sebelumnya: ${currentStatusNotif || "Baru"})`);

        let telegramStatus = "Token Kosong";
        if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
          const kirimNotif = sendNewNotif(gameInfo.game, code, description, manualUrl);
          telegramStatus = kirimNotif ? "Selesai Dikirim" : "Gagal Mengirim";
        }
        if (existingRowIndex === -1) {
          sheet.appendRow([
            gameInfo.game,
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

const DEFAULT_CONSTANTS = {
  genshin: {
    ACT_ID: "e202102251931481",
    game: "Genshin Impact",
    gameId: 2,
    gameBiz: "hk4e_global",
    redeemUrl: "https://public-operation-hk4e.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
    // redeemUrl: "https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
    giftUrl: "https://genshin.hoyoverse.com/en/gift?code=",
    url: {
      info: "https://sg-hk4e-api.hoyolab.com/event/sol/info",
      home: "https://sg-hk4e-api.hoyolab.com/event/sol/home",
      sign: "https://sg-hk4e-api.hoyolab.com/event/sol/sign"
    }
  },
  starrail: {
    ACT_ID: "e202303301540311",
    game: "Honkai: Star Rail",
    gameId: 6,
    gameBiz: "hkrpg_global",
    redeemUrl: "https://public-operation-hkrpg.hoyoverse.com/common/apicdkey/api/webExchangeCdkeyRisk",
    // redeemUrl: "https://sg-hkrpg-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkeyRisk",
    giftUrl: "https://hsr.hoyoverse.com/gift?code=",
    url: {
      info: "https://sg-public-api.hoyolab.com/event/luna/os/info",
      home: "https://sg-public-api.hoyolab.com/event/luna/os/home",
      sign: "https://sg-public-api.hoyolab.com/event/luna/os/sign"
    }
  },
  zenless: {
    ACT_ID: "e202406031448091",
    game: "Zenless Zone Zero",
    gameId: 8,
    gameBiz: "nap_global",
    redeemUrl: "https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkeyRisk",
    giftUrl: "https://zenless.hoyoverse.com/redemption?code=",
    url: {
      info: "https://sg-public-api.hoyolab.com/event/luna/zzz/os/info",
      home: "https://sg-public-api.hoyolab.com/event/luna/zzz/os/home",
      sign: "https://sg-public-api.hoyolab.com/event/luna/zzz/os/sign"
    }
  }
};

class Game {
  constructor(name, constants) {
    this.name = name;
    this.constants = constants;
  }

  get commonHeaders() {
    return COMMON_HEADERS;
  }

  async fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await UrlFetchApp.fetch(url, options);
        return JSON.parse(response.getContentText());
      } catch (error) {
        if (i === retries - 1) throw error;
        Utilities.sleep(2000);
      }
    }
  }

  async getAccountDetails(hoyolabCookie, accountIndex) {
    let ltuid = "Unknown";
    try {
      if (!hoyolabCookie || typeof hoyolabCookie !== 'string') {
        throw new Error("Data cookie kosong atau bukan teks string murni.");
      }

      const ltuidMatch = hoyolabCookie.match(/ltuid(?:|_v2)=([^;]+)/);
      ltuid = ltuidMatch ? ltuidMatch[1].trim() : null;

      if (!ltuid) {
        throw new Error("Format cookie salah, teks 'ltuid' atau 'ltuid_v2' tidak ditemukan.");
      }

      const url = `https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ltuid}`;
      const options = {
        method: "GET",
        headers: { "User-Agent": this.commonHeaders['User-Agent'], Cookie: hoyolabCookie },
        muteHttpExceptions: true
      };

      let response;
      try {
        response = await UrlFetchApp.fetch(url, options);
      } catch (fetchErr) {
        throw new Error(`Koneksi internet/API HoYoLAB down: ${fetchErr.message}`);
      }

      let body;
      try {
        body = JSON.parse(response.getContentText());
      } catch (jsonErr) {
        throw new Error(`Gagal membaca respons JSON dari server HoYoLAB.`);
      }

      if (body.retcode !== 0) {
        throw new Error(`Cookie Mati/Expired (retcode: ${body.retcode}, msg: ${body.message})`);
      }

      if (!body.data || !Array.isArray(body.data.list)) {
        throw new Error("Format data list karakter dari API HoYoLAB tidak sesuai.");
      }

      const accountData = body.data.list.find((acc) => acc.game_id === this.constants.gameId);

      if (!accountData) {
        throw new Error(`Karakter aktif untuk game ini tidak ditemukan di HoYoLAB.`);
      }

      return {
        success: true,
        uid: accountData.game_role_id,
        nickname: accountData.nickname,
        rank: accountData.level,
        region: accountData.region,
        level: accountData.level
      };

    } catch (error) {
      const namaKategori = `Akun Indeks Ke-${accountIndex} (LTUID: ${ltuid})`;
      handleError(`Get Profile (${this.constants.game})`, namaKategori, error.message);
      return { success: false, message: error.message, ltuid: ltuid };
    }
  }

  async runCheckIn(hoyolabCookies) {
    console.log(`=== Memulai Auto Check-In untuk ${this.constants.game} ===`);

    for (let i = 0; i < hoyolabCookies.length; i++) {
      const cookie = hoyolabCookies[i];

      const accountResult = await this.getAccountDetails(cookie, i);
      if (!accountResult.success) {
        continue;
      }

      const accountDetails = accountResult;

      try {
        const info = await this.getSignInfo(cookie);
        if (!info || !info.success) {
          throw new Error("Gagal mendapatkan status absen harian dari API SignInfo.");
        }

        const isTodaySigned = info.data.isSigned;
        let totalDays = info.data.total;

        let holdsSheetRecord = false;

        try {
          const sheetLogin = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Login");
          if (!sheetLogin) { setupSpreadsheet(); sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Login"); }
          if (sheetLogin) {
            const rows = sheetLogin.getDataRange().getValues();
            const todayString = new Date().toDateString();
            holdsSheetRecord = rows.some(row => {
              const rowDate = row[0] instanceof Date ? row[0].toDateString() : "";
              return row[2].toString() === accountDetails.uid.toString() && rowDate === todayString;
            });
          }
        } catch (sheetErr) {
          console.warn(`⚠️ [Warning Sheet] Gagal membaca sheet 'Login' (Akan dilewati): ${sheetErr.message}`);
        }

        if (isTodaySigned) {
          console.info(`[Check-In Info] ${accountDetails.nickname} sudah absen hari ini.`);
          if (!holdsSheetRecord) {
            this.writeToLoginSheet(this.constants.game, accountDetails, totalDays, "Sudah Check-In (Manual/Web)");
          }
        } else {
          const signResult = await this.sign(cookie);
          if (signResult && signResult.success) {
            totalDays += 1;
            this.writeToLoginSheet(this.constants.game, accountDetails, totalDays, "Berhasil Check-In");

            try {
              if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
                const awardsData = await this.getAwardsData(cookie);
                const awardName = awardsData.success ? awardsData.data[totalDays - 1].name : "Hadiah Harian";
                const awardCnt = awardsData.success ? awardsData.data[totalDays - 1].cnt : "1";
                TelegramNotifier.sendCheckInNotification(this.constants.game, accountDetails, totalDays, `${awardName} x${awardCnt}`);
              }
            } catch (teleErr) {
              console.error(`🚨 [Error Notif] Gagal memproses notifikasi sukses Telegram: ${teleErr.message}`);
            }
          } else {
            const apiMsg = signResult ? JSON.stringify(signResult.data) : "No Response";
            throw new Error(`Ditolak oleh server Hoyoverse saat absen: ${apiMsg}`);
          }
        }

      } catch (err) {
        handleError(`Sistem Check-In (${this.constants.game})`, accountDetails.nickname, err.message);
      }

      Utilities.sleep(2000);
    }
  }

  async sign(cookie) {
    try {
      const payload = { act_id: this.constants.ACT_ID };
      const options = {
        method: "POST",
        contentType: "application/json",
        headers: {
          ...this.commonHeaders,
          Cookie: cookie,
          "x-rpc-signgame": this.getSignGameHeader()
        },
        payload: JSON.stringify(payload)
      };
      const res = UrlFetchApp.fetch(this.constants.url.sign, options);
      const body = JSON.parse(res.getContentText());
      if (res.getResponseCode() !== 200 || body.retcode !== 0) return { success: false, data: body };
      return { success: true };
    } catch (error) {
      return { success: false, data: error };
    }
  }

  async getSignInfo(cookie) {
    const url = `${this.constants.url.info}?act_id=${this.constants.ACT_ID}`;
    const options = { headers: { Cookie: cookie, "x-rpc-signgame": this.getSignGameHeader() } };
    try {
      const body = await this.fetchWithRetry(url, options);
      if (body.retcode !== 0) throw new Error();
      return { success: true, data: { total: body.data.total_sign_day, today: body.data.today, isSigned: body.data.is_sign } };
    } catch (error) {
      return { success: false, data: error };
    }
  }

  async getAwardsData(cookie) {
    const url = `${this.constants.url.home}?act_id=${this.constants.ACT_ID}`;
    const options = { headers: { ...this.commonHeaders, Cookie: cookie, "x-rpc-signgame": this.getSignGameHeader() } };
    try {
      const body = await this.fetchWithRetry(url, options);
      if (body.retcode !== 0) throw new Error();
      return { success: true, data: body.data.awards };
    } catch (error) {
      return { success: false, data: error };
    }
  }

  async runRedeem(hoyolabCookies, redeemCookies) {
    console.log(`=== Memulai Auto Redeem untuk ${this.constants.game} ===`);
    let activeCodes = [];
    try {
      const apiGameKey = this.name === "starrail" ? "hsr" : (this.name === "zenless" ? "zzz" : this.name);
      const apiUrl = "https://db.hashblen.com/codes";
      const response = UrlFetchApp.fetch(apiUrl);
      const data = JSON.parse(response.getContentText());

      if (data.retcode !== 0 || !data[apiGameKey]) {
        throw new Error(`API Hashblen merespons retcode: ${data.retcode}`);
      }
      activeCodes = data[apiGameKey];
    } catch (apiErr) {
      handleError(`Fetch API Code (${this.constants.game})`, "Sistem Utama", `Gagal memuat kode baru: ${apiErr.message}`);
      return;
    }

    let sheetRows = [];
    try {
      const sheetRedeem = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Redeem");
      if (!sheet) { setupSpreadsheet(); }
      sheetRows = sheetRedeem ? sheetRedeem.getDataRange().getValues() : [];
    } catch (sheetErr) {
      handleError(`Database Sheet (${this.constants.game})`, "Sistem Utama", `Gagal membaca sheet 'Redeem': ${sheetErr.message}`);
      return;
    }

    for (let i = 0; i < hoyolabCookies.length; i++) {
      const hlbCookie = hoyolabCookies[i];
      const rdmCookie = redeemCookies[i];

      if (!rdmCookie) {
        handleError(`Validasi Config (${this.constants.game})`, `Akun Indeks Ke-${i}`, "Data di REDEEM_COOKIES kosong / tidak dipasang!");
        continue;
      }

      const accountResult = await this.getAccountDetails(hlbCookie, i);
      if (!accountResult.success) continue;

      const accountDetails = accountResult;
      const saringBarisTerbaru = [...sheetRows].reverse();

      for (const item of activeCodes) {
        const code = item.code;

        try {
          const isAlreadyRedeemed = saringBarisTerbaru.some(row => {
            if (!row[2] || !row[4]) return false;

            const isMatchUidAndCode = row[2].toString() === accountDetails.uid.toString() && row[4].toString() === code.toString();

            if (isMatchUidAndCode) {
              const currentStatus = row[5] ? row[5].toString().trim() : "";
              const skipStatuses = [
                "OK",
                "Redemption code has already been used",
                "This Redemption Code is already in use",
                "Kode telah digunakan",
                "Kode Penukaran ini sudah digunakan"
              ];
              if (skipStatuses.includes(currentStatus)) return true;
            }
            return false;
          });

          if (isAlreadyRedeemed) {
            console.log(`😿 [SKIP] ${this.constants.game} | ${accountDetails.nickname} | Kode: [${code}]`);
            continue;
          }

          console.log(`🚀 [PROSES] Mencoba kode [${code}] untuk ${accountDetails.nickname}...`);

          let apiResponseStatus = "FAILED_EXECUTION";
          try {
            apiResponseStatus = await this.executeRedeem(rdmCookie, accountDetails, code);
          } catch (execErr) {
            throw new Error(`Gagal menembak API klaim Hoyoverse: ${execErr.message}`);
          }

          this.writeToRedeemSheet(this.constants.game, accountDetails, code, apiResponseStatus);
          SpreadsheetApp.flush();

          try {
            if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
              TelegramNotifier.sendRedeemNotification(this.constants.game, accountDetails, code, apiResponseStatus);
            }
          } catch (notifErr) {
            console.error(`🚨 [Error Notif Redeem] Gagal kirim ke telegram: ${notifErr.message}`);
          }

          Utilities.sleep(6000);

        } catch (codeErr) {
          handleError(`Looping Redeem [${code}]`, accountDetails.nickname, codeErr.message);
        }
      }
    }
  }

  async executeRedeem(redeemCookie, accountDetails, code) {
    let url = this.constants.redeemUrl;
    const isPostMethod = (this.name === "starrail" || this.name === "zenless");

    let options = {
      'method': isPostMethod ? 'post' : 'get',
      'headers': {
        ...this.commonHeaders,
        'Cookie': redeemCookie
      },
      'muteHttpExceptions': true
    };

    if (isPostMethod) {
      const uuidMatch = redeemCookie.match(/_(?:MHYUUID|HYVUUID)=([^;]+)/);
      const extractedUuid = uuidMatch ? uuidMatch[1].trim() : "2a445cc3-67ad-432c-9476-7d526c349221";

      let body = {
        "t": Date.now(),
        "lang": "en",
        "game_biz": this.constants.gameBiz,
        "uid": accountDetails.uid.toString(),
        "region": accountDetails.region,
        "cdkey": code,
        "platform": "4",
        "device_uuid": extractedUuid
      };

      options.contentType = "application/json";
      options.payload = JSON.stringify(body);
    } else {
      const params = [
        `uid=${accountDetails.uid}`,
        `region=${accountDetails.region}`,
        `lang=id`,
        `cdkey=${code}`,
        `game_biz=${this.constants.gameBiz}`,
        `sLangKey=en-us`
      ];
      url = `${url}?${params.join("&")}`;
    }

    try {
      const response = await UrlFetchApp.fetch(url, options);
      const resData = JSON.parse(response.getContentText());
      return resData.message || JSON.stringify(resData);
    } catch (err) {
      return `Error Fetch: ${err.message}`;
    }
  }

  writeToRedeemSheet(gameName, accountDetails, code, status) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Redeem");
      if (!sheet) { setupSpreadsheet(); sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Redeem");}
      if (sheet) {
        sheet.appendRow([
          new Date(),
          gameName,
          "'" + accountDetails.uid,
          accountDetails.nickname,
          code,
          status
        ]);
        SpreadsheetApp.flush();
      }
    } catch (err) {
      console.error("Gagal menulis ke Sheet Redeem: " + err.message);
    }
  }

  writeToLoginSheet(gameName, accountDetails, dayCount, status) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Login");
      if (!sheet) { setupSpreadsheet(); sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Login"); }
      if (sheet) {
        sheet.appendRow([new Date(), gameName, "'" + accountDetails.uid, accountDetails.nickname, dayCount, status]);
      }
    } catch (err) {
      console.error("Gagal menulis ke Sheet Login: " + err.message);
    }
  }

  getSignGameHeader() {
    switch (this.name) {
      case "starrail": return "hkrpg";
      case "genshin": return "hk4e";
      case "zenless": return "zzz";
      default: return "";
    }
  }

  handleError(message, accountName, error = null) {
    const errorMessage = error ? `${message}: ${error}` : message;
    console.error(`${this.constants.game}: ${errorMessage}`);
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      TelegramNotifier.sendNotificationError(this.constants.game, accountName, errorMessage);
    }
  }
}

class TelegramNotifier {
  static sendRequest(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const payload = { chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown", disable_notification: false };
    UrlFetchApp.fetch(url, { method: "POST", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
  }

  static sendCheckInNotification(gameName, account, totalDays, award) {
    const message = `*📌 ${gameName} - Check-In Sukses*
──────────────────
🏷️ *Nickname:* ${account.nickname}
🆔 *UID:* \`${account.uid}\`
📅 *Total Absen:* Hari ke-${totalDays}
🎁 *Hadiah:* _${award}_`;
    this.sendRequest(message);
  }

  static sendRedeemNotification(gameName, account, code, status) {
    let statusMessage = status;
    if (status && status.includes("Please log in")) {
      statusMessage = `❌ Gagal (Cookie kedaluwarsa! Silakan perbarui cookie untuk UID ini menggunakan perintah /editdata)`;
    } else {
      statusMessage = `\`${status}\``; // Format default dengan backtick jika statusnya normal/lainnya
    }
    const message = `*🎁 ${gameName} - Redeem Code*
──────────────────
🏷️ *Nickname:* ${account.nickname}
🆔 *UID:* \`${account.uid}\`
🔑 *Kode:* \`${code}\`
📊 *Status API:* \`${statusMessage}\``;
    this.sendRequest(message);
  }

  static sendNotificationError(gameName, accountName, error) {
    const message = `*⚠️ SYSTEM ALERT ERROR - ${gameName}*
──────────────────
📌 *Akun:* ${accountName}
❌ *Keterangan:* \`${error}\``;
    this.sendRequest(message);
  }
}

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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }
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

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }

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
      cache.put("state_" + chatId, "ADD_COOKIE", 300);
      sendMessage(chatId, "🔑 Masukkan <b>ltoken_v2</b>:");
    } 
    else if (state === "ADD_COOKIE") {
      savedData.cookie = text;
      const selected_cookie = extractCookies(savedData.cookie);
      savedData.ltoken = selected_cookie.ltoken_v2;
      savedData.ltuid = selected_cookie.ltuid_v2;
      savedData.cookie = savedData.cookie.trim();

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

    const gameName = data[0][colIndex - 1];     // Baris 1: Nama Game
    const ltokenV2 = data[1][colIndex - 1];     // Baris 2: ltoken_v2 asli
    const ltuidV2  = data[2][colIndex - 1];     // Baris 3: ltuid_v2 asli
    let baseCookie = data[3][colIndex - 1];     // Baris 4: Cookie dasar dari sheet
    const infoRowText = data[4][colIndex - 1];  // Baris 5: Info teks akun

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
      
      const profileResult = await gameInstance.getAccountDetails(baseCookie, colIndex);
      
      if (!profileResult.success) {
        throw new Error(`Gagal memverifikasi profil akun. API Server merespons: ${profileResult.message}`);
      }

      const apiResponseStatus = await gameInstance.executeRedeem(baseCookie, profileResult, codeToRedeem);

      gameInstance.writeToRedeemSheet(gameName, profileResult, codeToRedeem, apiResponseStatus);

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

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }
  const data = sheet.getDataRange().getValues();
  const colIndex = findColumnByUid(data, uid);

  if (colIndex === -1) return sendMessage(chatId, `❌ Data dengan UID ${uid} tidak ditemukan.`);

  cache.put("state_" + chatId, "EDIT_COOKIE_" + uid, 300);
  sendMessage(chatId, `✍️ Anda akan mengubah <b>cookie</b> untuk UID ${uid}.\n\nSilakan kirimkan cookie baru sekarang, atau ketik <b>batal</b> untuk keluar.`);
}

function handleHapusDataStart(chatId, uid, cache) {
  if (!uid) return sendMessage(chatId, "⚠️ Format salah. Gunakan: <code>/hapusdata [UID]</code>");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }
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

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }
  const data = sheet.getDataRange().getValues();
  const colIndex = findColumnByUid(data, uid);

  if (colIndex === -1) return sendMessage(chatId, `❌ Data dengan UID ${uid} tidak ditemukan.`);

  const game = data[0][colIndex - 1];
  const info = data[4][colIndex - 1];

  cache.put("state_" + chatId, "REDEEM_MANUAL_" + uid, 300);
  
  sendMessage(chatId, `🎁 <b>Redeem Kode Manual</b>\n🎮 Game: [${game}]\nℹ️ Akun: ${info}\n\nSilakan ketik/kirimkan <b>KODE REDEEM</b> sekarang, atau ketik <b>batal</b> untuk keluar.`);
}

function handleCallbackQuery(callback, cache) {
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const cbData = callback.data;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }

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

function getHoyoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }

  const data = sheet.getDataRange().getValues();

  const games = data[0];
  const ltokens = data[1];
  const ltuids = data[2];
  const cookies = data[3];

  const HOYOLAB_ACCOUNTS = {};
  const REDEEM_COOKIES = {};

  for (let i = 1; i < games.length; i++) {
    const gameName = games[i];

    if (!gameName) continue;

    if (!HOYOLAB_ACCOUNTS[gameName]) {
      HOYOLAB_ACCOUNTS[gameName] = [];
    }
    if (!REDEEM_COOKIES[gameName]) {
      REDEEM_COOKIES[gameName] = [];
    }

    const tokenStr = `ltoken_v2=${ltokens[i]}; ltuid_v2=${ltuids[i]};`;
    HOYOLAB_ACCOUNTS[gameName].push(tokenStr);
    REDEEM_COOKIES[gameName].push(cookies[i]);
  }

  return { HOYOLAB_ACCOUNTS, REDEEM_COOKIES };
}

function getLtuid(cookie) {
  const match = cookie.match(/ltuid_v2=(\d+)/);
  return match ? match[1] : null;
}

function getGameRecord(game, cookie) {
  const ltuid = getLtuid(cookie);

  if (!ltuid) {
    throw new Error("ltuid_v2 tidak ditemukan.");
  }

  const url = `https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${ltuid}`;
  const options = {
    method: "get",
    muteHttpExceptions: true,
    headers: {
      ...COMMON_HEADERS,
      Cookie: cookie
    }
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.retcode !== 0) {
    throw new Error(json.message);
  }

  const targetGameId = DEFAULT_CONSTANTS[game].gameId;
  const role = json.data.list.find(r => r.game_id === targetGameId);

  if (!role) return null;

  return {
    nickname: role.nickname,
    level: role.level,
    uid: role.game_role_id,
    region: role.region,
    regionName: role.region_name,
    gameId: role.game_id,
    display: `${role.nickname} (Lv.${role.level}) (${role.game_role_id})`
  };
}

function updateHoyoInfo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }
  const data = sheet.getDataRange().getValues();

  const games = data[0];
  const cookieRow = 3; 
  const infoRow = 4;   

  for (let col = 1; col < games.length; col++) {
    const game = games[col];
    if (!game) continue;

    const cookie = data[cookieRow][col];
    if (!cookie) continue;

    try {
      const account = getGameRecord(game, cookie);

      if (account && account.display) {
        sheet.getRange(infoRow + 1, col + 1).setValue(account.display);
      } else {
        sheet.getRange(infoRow + 1, col + 1).setValue("Tidak ditemukan");
      }

    } catch (e) {
      sheet.getRange(infoRow + 1, col + 1).setValue("Error");
      Logger.log(e);
    }
  }
}

function sendNewNotif(gameName, code, description, claimUrl) {
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

function extractCookies(rawCookie) {
  // Fungsi pembantu untuk mengambil cookie berdasarkan nama
  function getCookieValue(cookieString, name) {
    const match = cookieString.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  const ltuid = getCookieValue(rawCookie, 'ltuid_v2');
  const ltoken = getCookieValue(rawCookie, 'ltoken_v2');

  Logger.log("Hasil Ekstraksi Cookie:");
  Logger.log("ltuid_v2: " + ltuid);
  Logger.log("ltoken_v2: " + ltoken);

  return {
    ltuid_v2: ltuid,
    ltoken_v2: ltoken
  };
}


async function tambahAkunBaruWizard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Akun");
  if (!sheet) { setupSpreadsheet(); }

  let gameKey = "";
  while (true) {
    let inputGame = Browser.inputBox(
      "➕ TAMBAH AKUN: LANGKAH 1/2", 
      "Pilih Game yang ingin dimasukkan:\\n\\n1. Genshin Impact (ketik 1 atau genshin)\\n2. Honkai: Star Rail (ketik 2 or starrail)\\n3. Zenless Zone Zero (ketik 3 or zenless)\\n\\nKetik 'batal' untuk keluar.", 
      Browser.Buttons.OK_CANCEL
    );

    if (inputGame === "cancel" || inputGame.toLowerCase() === "batal") {
      Browser.msgBox("❌ Dibatalkan", "Proses penambahan akun dibatalkan.", Browser.Buttons.OK);
      return;
    }

    inputGame = inputGame.trim().toLowerCase();

    if (inputGame === "1" || inputGame === "genshin") {
      gameKey = "genshin";
      break;
    } else if (inputGame === "2" || inputGame === "starrail" || inputGame === "star rail") {
      gameKey = "starrail";
      break;
    } else if (inputGame === "3" || inputGame === "zenless" || inputGame === "zzz") {
      gameKey = "zenless";
      break;
    } else {
      Browser.msgBox("⚠️ Peringatan", "Pilihan tidak valid! Masukkan angka (1/2/3) atau nama game yang sesuai.", Browser.Buttons.OK);
    }
  }

  let cookie = Browser.inputBox("➕ TAMBAH AKUN: LANGKAH 2/2", "Masukkan nilai Cookie Anda:\\n(Bisa dikosongkan jika token sudah menyatu di Cookie baris 4)", Browser.Buttons.OK_CANCEL);
  if (cookie === "cancel") return;
  const selected_cookie = extractCookies(cookie);
  let ltoken = selected_cookie.ltoken_v2;
  let ltuid = selected_cookie.ltuid_v2;
  cookie = cookie.trim();

  let finalCookie = cookie;
  if (!finalCookie.includes("ltoken_v2=") && ltoken && ltuid) {
    finalCookie = `ltoken_v2=${ltoken}; ltuid_v2=${ltuid}; ${finalCookie}`;
  }

  ss.toast("⏳ Sedang memverifikasi kredensial akun ke API HoYoLAB...", "Verifikasi Akun", -1);

  try {
    if (!DEFAULT_CONSTANTS[gameKey]) {
      throw new Error("Konfigurasi template game tidak ditemukan.");
    }

    const gameInstance = new Game(gameKey, DEFAULT_CONSTANTS[gameKey]);

    const lastColumn = sheet.getLastColumn();
    const nextColumnIndex = lastColumn + 1; 

    const profileResult = await gameInstance.getAccountDetails(finalCookie, nextColumnIndex);

    if (!profileResult.success) {
      throw new Error(profileResult.message || "Cookie tidak valid atau expired.");
    }

    // Format: Nickname (Lv.xx) (UID)
    const formattedInfo = `${profileResult.nickname} (Lv.${profileResult.level || '?'}) (${profileResult.uid})`;
    sheet.getRange(1, nextColumnIndex).setValue(gameKey);
    sheet.getRange(2, nextColumnIndex).setValue(ltoken);
    sheet.getRange(3, nextColumnIndex).setValue(ltuid);
    sheet.getRange(4, nextColumnIndex).setValue(finalCookie);
    sheet.getRange(5, nextColumnIndex).setValue(formattedInfo);

    Browser.msgBox(
      "✅ Berhasil Menambahkan Akun", 
      `Akun valid dan berhasil disimpan!\\n\\n🎮 Game: ${DEFAULT_CONSTANTS[gameKey].game}\\n👤 Nickname: ${profileResult.nickname}\\n🆔 UID: ${profileResult.uid}\\n👑 Level : ${profileResult.level}\\n🌍 Server: ${profileResult.region}`, 
      Browser.Buttons.OK
    );

  } catch (err) {
    Browser.msgBox(
      "❌ Akun Gagal Ditambahkan", 
      `Kredensial atau Cookie yang Anda masukkan tidak valid.\\n\\n⚠️ Detail Error: ${err.message}\\n\\nData tidak disimpan ke spreadsheet. Silakan coba lagi dengan cookie yang segar!`, 
      Browser.Buttons.OK
    );
  } finally {
    ss.toast("Proses selesai.", "Status", 1);
  }
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Hoyoverse Bot')
    .addItem('➕ Tambah Akun via Wizard', 'tambahAkunBaruWizard')
    .addToUi();
}
