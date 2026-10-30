// VERSION: 1.4.0
// EcoOils Mentari — Driver's Log & Pre-Use Checklist backend
// Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste the
// /exec URL into CONFIG.APPS_SCRIPT_URL in index.html.

const SUBMISSIONS_SHEET_NAME = 'Submissions';
const DRIVERS_SHEET_NAME = 'Drivers';
const PROFILES_SHEET_NAME = 'Driver Profiles';
const PHOTO_ROOT_FOLDER_NAME = 'Driver Log - Odometer Photos';
const PROFILE_PHOTO_FOLDER_NAME = 'Driver Profile Photos';

// Only this address can manage driver profiles. There is no stored
// password/PIN anywhere in this script or the Sheet — access is granted
// only via a one-time code emailed to this address (MailApp), per the
// "PIN/passwords only via email reset" standard.
const ADMIN_EMAIL = 'Ignatius.Ambrosio@ecooils.com.my';
const LOGIN_CODE_TTL_SECONDS = 600;      // 10 minutes
const SESSION_TOKEN_TTL_SECONDS = 7200;  // 2 hours

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

const TIMEZONE = 'Asia/Jakarta'; // Sei Mangkei, North Sumatra

function submissionsSheet_() {
  return getOrCreateSheet_(SUBMISSIONS_SHEET_NAME, [
    'Submission Timestamp (Auto)', 'Activity', 'Driver Name', 'Vehicle', 'Date', 'Time (Entered by Driver)',
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

function profilesSheet_() {
  return getOrCreateSheet_(PROFILES_SHEET_NAME, [
    'Full Name', 'Phone', 'Email', 'Assigned Vehicle', 'Licence No', 'Licence Expiry', 'Company',
    'Emergency Contact Name', 'Emergency Contact Phone', 'Photo URL', 'Last Updated'
  ]);
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

function getOrCreateProfilePhotoFolder_() {
  const it = DriveApp.getFoldersByName(PROFILE_PHOTO_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(PROFILE_PHOTO_FOLDER_NAME);
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
    const action = payload.action || 'submit';

    if (action === 'requestCode') return handleRequestCode_(payload);
    if (action === 'verifyCode') return handleVerifyCode_(payload);
    if (action === 'listDriverProfiles') return handleListProfiles_(payload);
    if (action === 'saveDriverProfile') return handleSaveProfile_(payload);
    if (action === 'getOwnProfile') return handleGetOwnProfile_(payload);
    if (action === 'updateOwnProfile') return handleUpdateOwnProfile_(payload);

    return handleSubmission_(payload);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err) });
  }
}

function handleSubmission_(payload) {
  try {
    let photoUrl = '';
    if (payload.odoPhotoDataUrl) {
      photoUrl = savePhoto_(payload.odoPhotoDataUrl, payload.driverName, payload.date);
    }

    // Server-side timestamp — always recorded automatically at the moment
    // the Sheet receives the submission, regardless of the "Time" value the
    // driver typed in. Formatted explicitly in the project's local timezone
    // so it reads correctly no matter what locale the Sheet itself is set to.
    const autoTimestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

    const sheet = submissionsSheet_();
    sheet.appendRow([
      autoTimestamp,
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

/* ============== DRIVER PROFILES ADMIN (email one-time-code login) ============== */

function handleRequestCode_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) {
    // Don't confirm/deny which emails are valid.
    return jsonOut_({ status: 'error', message: 'Not authorized.' });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  CacheService.getScriptCache().put('code_' + email, code, LOGIN_CODE_TTL_SECONDS);
  MailApp.sendEmail({
    to: email,
    subject: 'Driver Log — your admin login code',
    body: 'Your one-time login code is: ' + code +
      '\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.'
  });
  return jsonOut_({ status: 'ok' });
}

function handleVerifyCode_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const code = String(payload.code || '').trim();
  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return jsonOut_({ status: 'error', message: 'Not authorized.' });
  }
  const cache = CacheService.getScriptCache();
  const cached = cache.get('code_' + email);
  if (!cached || cached !== code) {
    return jsonOut_({ status: 'error', message: 'Invalid or expired code.' });
  }
  const token = Utilities.getUuid();
  cache.put('token_' + token, email, SESSION_TOKEN_TTL_SECONDS);
  cache.remove('code_' + email);
  return jsonOut_({ status: 'ok', token: token });
}

function requireAdmin_(token) {
  const email = CacheService.getScriptCache().get('token_' + String(token || ''));
  if (!email) throw new Error('Session expired. Please log in again.');
  return email;
}

function handleListProfiles_(payload) {
  try {
    requireAdmin_(payload.token);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err.message || err) });
  }
  const sheet = profilesSheet_();
  const data = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const expiry = data[i][5];
    rows.push({
      name: data[i][0],
      phone: data[i][1],
      email: data[i][2],
      vehicle: data[i][3],
      licenceNo: data[i][4],
      licenceExpiry: expiry ? Utilities.formatDate(new Date(expiry), TIMEZONE, 'yyyy-MM-dd') : '',
      company: data[i][6],
      emergencyName: data[i][7],
      emergencyPhone: data[i][8],
      photoUrl: data[i][9]
    });
  }
  rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return jsonOut_({ status: 'ok', profiles: rows });
}

function handleSaveProfile_(payload) {
  try {
    requireAdmin_(payload.token);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err.message || err) });
  }
  const name = String(payload.name || '').trim();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });

  let photoUrl = payload.existingPhotoUrl || '';
  if (payload.photoDataUrl) {
    photoUrl = saveProfilePhoto_(payload.photoDataUrl, name);
  }

  const sheet = profilesSheet_();
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === name.toLowerCase()) { rowIndex = i + 1; break; }
  }
  const rowValues = [
    name,
    payload.phone || '',
    payload.email || '',
    payload.vehicle || '',
    payload.licenceNo || '',
    payload.licenceExpiry || '',
    payload.company || '',
    payload.emergencyName || '',
    payload.emergencyPhone || '',
    photoUrl,
    new Date()
  ];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  // Keep the recency-sorted driver picker (Drivers sheet) in sync so a
  // newly-added profile shows up there immediately.
  upsertDriver_(name);

  return jsonOut_({ status: 'ok', photoUrl: photoUrl });
}

/* ============== DRIVER SELF-SERVICE (no admin login) ============== */
// Intentionally open: the admin creates the base profile row first, and a
// driver can only fill in their OWN photo and emergency contact by typing
// their own name — nothing else on the row is editable this way, and a
// name with no existing profile is refused rather than silently created.

function findProfileRow_(name) {
  const sheet = profilesSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(name).trim().toLowerCase()) {
      return { sheet: sheet, rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

function handleGetOwnProfile_(payload) {
  const name = String(payload.name || '').trim();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });
  const found = findProfileRow_(name);
  if (!found) return jsonOut_({ status: 'not_found' });
  const row = found.row;
  return jsonOut_({
    status: 'ok',
    profile: {
      emergencyName: row[7],
      emergencyPhone: row[8],
      photoUrl: row[9]
    }
  });
}

function handleUpdateOwnProfile_(payload) {
  const name = String(payload.name || '').trim();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });
  const found = findProfileRow_(name);
  if (!found) return jsonOut_({ status: 'not_found' });

  let photoUrl = found.row[9] || '';
  if (payload.photoDataUrl) {
    photoUrl = saveProfilePhoto_(payload.photoDataUrl, name);
  }

  const sheet = found.sheet;
  sheet.getRange(found.rowIndex, 8).setValue(payload.emergencyName || found.row[7] || '');  // Emergency Contact Name
  sheet.getRange(found.rowIndex, 9).setValue(payload.emergencyPhone || found.row[8] || ''); // Emergency Contact Phone
  sheet.getRange(found.rowIndex, 10).setValue(photoUrl);                                    // Photo URL
  sheet.getRange(found.rowIndex, 11).setValue(new Date());                                  // Last Updated

  return jsonOut_({ status: 'ok', photoUrl: photoUrl });
}

function saveProfilePhoto_(dataUrl, name) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
  if (!match) return '';
  const mimeType = match[1];
  const base64 = match[2];
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const bytes = Utilities.base64Decode(base64);
  const safeName = (name || 'driver').replace(/[^a-zA-Z0-9]+/g, '-');
  const blob = Utilities.newBlob(bytes, mimeType, safeName + '_' + new Date().getTime() + '.' + ext);
  const folder = getOrCreateProfilePhotoFolder_();
  const file = folder.createFile(blob);
  // Needs to render as an <img> in the admin panel, so make it viewable by link.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
