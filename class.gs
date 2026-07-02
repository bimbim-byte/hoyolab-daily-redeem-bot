const DEFAULT_CONSTANTS = {
  genshin: {
    ACT_ID: "e202102251931481",
    game: "Genshin Impact",
    gameId: 2,
    gameBiz: "hk4e_global",
    redeemUrl: "https://public-operation-hk4e.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
    // redeemUrl: "https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
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
    return {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Connection': 'keep-alive',
      'x-rpc-app_version': '2.34.1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'x-rpc-client_type': '4'
    };
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
        region: accountData.region
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
            console.log(`箱 [SKIP] ${this.constants.game} | ${accountDetails.nickname} | Kode: [${code}]`);
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
    const message = `*🎁 ${gameName} - Redeem Code*
──────────────────
🏷️ *Nickname:* ${account.nickname}
🆔 *UID:* \`${account.uid}\`
🔑 *Kode:* \`${code}\`
📊 *Status API:* \`${status}\``;
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
