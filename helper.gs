function getHoyoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Akun");

  if (!sheet) {
    throw new Error("Sheet dengan nama 'Akun' tidak ditemukan!");
  }

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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
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
