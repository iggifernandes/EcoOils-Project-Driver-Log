// VERSION: 1.0.0
// EcoOils Mentari — Driver's Log & Pre-Use Checklist backend
// Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste the
// /exec URL into CONFIG.APPS_SCRIPT_URL in index.html.

const SUBMISSIONS_SHEET_NAME = 'Submissions';
const DRIVERS_SHEET_NAME = 'Drivers';
const PHOTO_ROOT_FOLDER_NAME = 'Driver Log - Odometer Photos';

function getSS_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet_(name, headers) {
  const ss = getSS_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function submissionsSheet_() {
  return getOrCreateSheet_(SUBMISSIONS_SHEET_NAME, [
    'Timestamp', 'Activity', 'Driver Name', 'Vehicle', 'Date', 'Time',
    'Odometer (km)', 'Odometer Photo URL',
    'Pre-trip Check', 'Fit to Drive', 'Hours Slept',
    'Tyres', 'Lights', 'Windscreen & Mirrors', 'Brakes & Handbrake',
    'Oil/Coolant/Fuel', 'Fire Ext. & First Aid',
    'Driver Seatbelt', 'Passenger Seatbelt', 'Failed Items', 'Safe to Operate',
    'Incident/Near-Miss', 'Fatigue Level (1-5)'
  ]);
}

function driversSheet_() {
  return getOrCreateSheet_(DRIVERS_SHEET_NAME, ['Name', 'Last Used']);
}

function getOrCreatePhotoFolder_() {
  const root = getOrCreateRootFolder_();
  const monthLabel = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM');
  const it = root.getFoldersByName(monthLabel);
  if (it.hasNext()) return it.next();
  return root.createFolder(monthLabel);
}

function getOrCreateRootFolder_() {
  const it = DriveApp.getFoldersByName(PHOTO_ROOT_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(PHOTO_ROOT_FOLDER_NAME);
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'drivers') {
    const sheet = driversSheet_();
    const data = sheet.getDataRange().getValues();
    const drivers = [];
    for (let i = 1; i < data.length; i++) {
      const name = data[i][0];
      const lastUsed = data[i][1];
      if (name) drivers.push({ name: String(name), lastUsed: lastUsed ? new Date(lastUsed).getTime() : 0 });
    }
    drivers.sort((a, b) => b.lastUsed - a.lastUsed);
    return jsonOut_({ drivers: drivers });
  }
  return jsonOut_({ status: 'ok', message: 'Driver Log backend is running.' });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    let photoUrl = '';
    if (payload.odoPhotoDataUrl) {
      photoUrl = savePhoto_(payload.odoPhotoDataUrl, payload.driverName, payload.date);
    }

    const sheet = submissionsSheet_();
    sheet.appendRow([
      new Date(),
      payload.activity || '',
      payload.driverName || '',
      payload.vehicle || '',
      payload.date || '',
      payload.time || '',
      payload.odoKm || '',
      photoUrl,
      payload.pretrip || '',
      payload.fit || '',
      payload.sleep || '',
      payload.chkTyres || '',
      payload.chkLights || '',
      payload.chkWindscreen || '',
      payload.chkBrakes || '',
      payload.chkFluids || '',
      payload.chkFireAid || '',
      payload.seatbeltDriver || '',
      payload.seatbeltPax || '',
      payload.failedItems || '',
      payload.safeOperate || '',
      payload.incident || '',
      payload.fatigue || ''
    ]);

    upsertDriver_(payload.driverName);

    return jsonOut_({ status: 'ok', photoUrl: photoUrl });
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err) });
  }
}

function upsertDriver_(name) {
  if (!name) return;
  const sheet = driversSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(name).trim().toLowerCase()) {
      sheet.getRange(i + 1, 2).setValue(new Date());
      return;
    }
  }
  sheet.appendRow([name, new Date()]);
}

function savePhoto_(dataUrl, driverName, dateStr) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
  if (!match) return '';
  const mimeType = match[1];
  const base64 = match[2];
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const bytes = Utilities.base64Decode(base64);
  const safeDriver = (driverName || 'driver').replace(/[^a-zA-Z0-9]+/g, '-');
  const fileName = `${dateStr || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd')}_${safeDriver}_${new Date().getTime()}.${ext}`;
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = getOrCreatePhotoFolder_();
  const file = folder.createFile(blob);
  return file.getUrl();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
