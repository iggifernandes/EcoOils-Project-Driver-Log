// VERSION: 2.2.1
// EcoOils Mentari — Driver's Log & Pre-Use Checklist backend
// Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste the
// /exec URL into CONFIG.APPS_SCRIPT_URL in index.html.

const SUBMISSIONS_SHEET_NAME = 'Submissions';
const DRIVERS_SHEET_NAME = 'Drivers';
const PROFILES_SHEET_NAME = 'Driver Profiles';
const PHOTO_ROOT_FOLDER_NAME = 'Driver Log - Odometer Photos';
const PROFILE_PHOTO_FOLDER_NAME = 'Driver Profile Photos';
const INDUCTION_SHEET_NAME = 'Driver Induction';
const INDUCTION_PASS_MARK = 12;   // of 15 (80%)
const INDUCTION_VALID_MONTHS = 12;

// Two admin tiers, both logging in the same way — a one-time code emailed
// to their own address, never a stored/typed password (per the standing
// "PIN/passwords only via email reset" rule):
//  - FULL_ADMIN_EMAILS: everything — register new drivers, edit any
//    existing driver, set a PIN directly.
//  - LIMITED_ADMIN_EMAILS (e.g. Tino, the coordinator): first-time driver
//    registration only. Cannot edit an already-registered driver's details
//    and cannot set a PIN for anyone — a PIN is only ever set by the
//    driver themselves, via their own "forgot PIN" reset (emailed to their
//    own registered address, handled separately below).
const FULL_ADMIN_EMAILS = ['Ignatius.Ambrosio@ecooils.com.my'];
const LIMITED_ADMIN_EMAILS = ['vsinaga67@gmail.com']; // Tino — confirm/replace with the address he should log in with
const ALL_ADMIN_EMAILS = FULL_ADMIN_EMAILS.concat(LIMITED_ADMIN_EMAILS);
const LOGIN_CODE_TTL_SECONDS = 600;      // 10 minutes
const SESSION_TOKEN_TTL_SECONDS = 7200;  // 2 hours

// Admin "stay signed in" — a long-lived remember token kept on the admin's
// own device (CacheService caps out at 6 hours, so this is stored in its own
// sheet instead). Right after a normal email-code login, an admin can set
// their own PIN; this both saves the PIN (a fallback for logging in on a
// new/different device without waiting for an emailed code) and remembers
// the current device for ADMIN_REMEMBER_DAYS, after which it silently
// re-logs in with no prompt. Only the PIN's hash and the remember token's
// hash are ever stored — never the PIN or token themselves.
const ADMIN_AUTH_SHEET_NAME = 'Admin Auth';
const ADMIN_REMEMBER_DAYS = 30;

// Project site reference point, used only to flag odometer photos taken
// implausibly far away (possible GPS spoofing or a genuinely wrong reading).
// TODO: set these to the actual Sei Mangkei site coordinates (drop a pin on
// Google Maps at the site, right-click it, and copy the lat/lng shown).
const PROJECT_SITE_LAT = 0;
const PROJECT_SITE_LNG = 0;
const GEOFENCE_RADIUS_KM = 5;

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
    'Incident/Near-Miss', 'Fatigue Level (1-5)',
    'Odometer Photo Latitude', 'Odometer Photo Longitude', 'Odometer Photo Map Link',
    'Odometer Photo Clock Offset (min)', 'Odometer Location Status',
    'Distance from Site (km)', 'Location Flag'
  ]);
}

function driversSheet_() {
  return getOrCreateSheet_(DRIVERS_SHEET_NAME, ['Name', 'Last Used']);
}

function profilesSheet_() {
  return getOrCreateSheet_(PROFILES_SHEET_NAME, [
    'Full Name', 'Phone', 'Email', 'Assigned Vehicle', 'Licence No', 'Licence Expiry', 'Company',
    'Emergency Contact Name', 'Emergency Contact Phone', 'Photo URL', 'Last Updated', 'PIN Hash'
  ]);
}

function adminAuthSheet_() {
  return getOrCreateSheet_(ADMIN_AUTH_SHEET_NAME, [
    'Email', 'PIN Hash', 'Remember Token Hash', 'Remember Expires', 'Last Updated'
  ]);
}

function findAdminAuthRow_(email) {
  const sheet = adminAuthSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
      return { sheet: sheet, rowIndex: i + 1, row: data[i] };
    }
  }
  return { sheet: sheet, rowIndex: -1, row: null };
}

function isFullAdminEmail_(email) {
  return FULL_ADMIN_EMAILS.map(e => e.toLowerCase()).indexOf(String(email || '').toLowerCase()) !== -1;
}

function isAllowedAdminEmail_(email) {
  return ALL_ADMIN_EMAILS.map(e => e.toLowerCase()).indexOf(String(email || '').toLowerCase()) !== -1;
}

function hashPin_(pin) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin));
  return bytes.map(b => ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0')).join('');
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
  if (action === 'driverInductionVerify') return handleInductionVerify_(e.parameter.code);
  if (action === 'driverInductionStatus') return handleInductionStatus_(e.parameter.name);
  return jsonOut_({ status: 'ok', message: 'Driver Log backend is running.', version: '1.10.0' });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'submit';

    if (action === 'requestCode') return handleRequestCode_(payload);
    if (action === 'verifyCode') return handleVerifyCode_(payload);
    if (action === 'setAdminPin') return handleSetAdminPin_(payload);
    if (action === 'adminRememberLogin') return handleAdminRememberLogin_(payload);
    if (action === 'adminPinLogin') return handleAdminPinLogin_(payload);
    if (action === 'listDriverProfiles') return handleListProfiles_(payload);
    if (action === 'saveDriverProfile') return handleSaveProfile_(payload);
    if (action === 'getOwnProfile') return handleGetOwnProfile_(payload);
    if (action === 'updateOwnProfile') return handleUpdateOwnProfile_(payload);
    if (action === 'verifyDriverPin') return handleVerifyDriverPin_(payload);
    if (action === 'requestDriverPinReset') return handleRequestDriverPinReset_(payload);
    if (action === 'verifyDriverPinReset') return handleVerifyDriverPinReset_(payload);
    if (action === 'deleteDriverProfile') return handleDeleteDriverProfile_(payload);
    if (action === 'getDashboardData') return handleGetDashboardData_(payload);
    if (action === 'driverInduction') return handleInductionSubmit_(payload);
    if (action === 'listDriverInductions') return handleInductionList_(payload);
    if (action === 'signoffDriverInduction') return handleInductionSignoff_(payload);

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

    const lat = payload.odoLat || '';
    const lng = payload.odoLng || '';
    // Clickable "View on map" link next to the raw coordinates. Entered as a
    // formula string — Apps Script's appendRow parses a leading "=" as a
    // real Sheets formula, not literal text.
    const mapLink = (lat !== '' && lng !== '')
      ? '=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '","View on map")'
      : '';

    // How far the phone's own clock (at the moment the photo was taken) was
    // from the server's real clock — flags a tampered device clock, since
    // the burned-in stamp on the photo uses the phone's clock, not this one.
    let clockOffsetMin = '';
    if (payload.capturedAtClient) {
      const clientTime = new Date(payload.capturedAtClient);
      if (!isNaN(clientTime.getTime())) {
        clockOffsetMin = Math.round((new Date().getTime() - clientTime.getTime()) / 60000);
      }
    }

    // Why coordinates are blank, when they are: denied by the driver, no GPS
    // on the device, timed out, or simply granted (coordinates present).
    const locStatus = payload.odoLocStatus || (lat !== '' ? 'granted' : '');

    // Flag entries taken implausibly far from the project site (possible GPS
    // spoofing, or just a genuinely wrong reading) — only once the site's
    // real coordinates are filled in above.
    let distanceKm = '';
    let locationFlag = '';
    if (lat !== '' && lng !== '' && (PROJECT_SITE_LAT || PROJECT_SITE_LNG)) {
      distanceKm = Math.round(haversineKm_(Number(lat), Number(lng), PROJECT_SITE_LAT, PROJECT_SITE_LNG) * 10) / 10;
      locationFlag = distanceKm > GEOFENCE_RADIUS_KM ? 'FAR FROM SITE' : '';
    }

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
      payload.fatigue || '',
      lat,
      lng,
      mapLink,
      clockOffsetMin,
      locStatus,
      distanceKm,
      locationFlag
    ]);

    upsertDriver_(payload.driverName);

    return jsonOut_({ status: 'ok', photoUrl: photoUrl });
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err) });
  }
}

function haversineKm_(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  if (!isAllowedAdminEmail_(email)) {
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
  if (!isAllowedAdminEmail_(email)) {
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
  return jsonOut_({ status: 'ok', token: token, isFullAdmin: isFullAdminEmail_(email) });
}

function requireAdmin_(token) {
  const email = CacheService.getScriptCache().get('token_' + String(token || ''));
  if (!email) throw new Error('Session expired. Please log in again.');
  return email;
}

// Sets the admin's own PIN right after a normal email-code login, and
// remembers the current device for ADMIN_REMEMBER_DAYS (silent re-login,
// no email code or PIN prompt needed until it expires).
function handleSetAdminPin_(payload) {
  let email;
  try {
    email = requireAdmin_(payload.token);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err.message || err) });
  }
  const pin = String(payload.pin || '').trim();
  if (!/^[0-9]{4,6}$/.test(pin)) {
    return jsonOut_({ status: 'error', message: 'PIN must be 4 to 6 digits.' });
  }
  const rememberToken = Utilities.getUuid() + Utilities.getUuid();
  const rememberExpires = new Date(Date.now() + ADMIN_REMEMBER_DAYS * 24 * 60 * 60 * 1000);
  const rowValues = [
    email,
    hashPin_(pin),
    hashPin_(rememberToken),
    Utilities.formatDate(rememberExpires, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
    Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
  ];
  const found = findAdminAuthRow_(email);
  if (found.rowIndex > 0) {
    found.sheet.getRange(found.rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    found.sheet.appendRow(rowValues);
  }
  return jsonOut_({ status: 'ok', rememberToken: rememberToken, isFullAdmin: isFullAdminEmail_(email) });
}

// Silent re-login for a remembered device: the browser sends back the long-
// lived remember token it stored (never the PIN), and gets a fresh normal
// session token with no email code and no prompt shown to the admin.
function handleAdminRememberLogin_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const rememberToken = String(payload.rememberToken || '').trim();
  if (!isAllowedAdminEmail_(email) || !rememberToken) {
    return jsonOut_({ status: 'error', message: 'Not authorized.' });
  }
  const found = findAdminAuthRow_(email);
  if (found.rowIndex < 0) return jsonOut_({ status: 'error', message: 'Not remembered.' });
  const rememberTokenHash = found.row[2];
  const rememberExpiresStr = found.row[3];
  const expires = rememberExpiresStr ? new Date(rememberExpiresStr) : null;
  if (!expires || isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
    return jsonOut_({ status: 'error', message: 'Remembered device expired.' });
  }
  if (!rememberTokenHash || hashPin_(rememberToken) !== rememberTokenHash) {
    return jsonOut_({ status: 'error', message: 'Not authorized.' });
  }
  // Roll the remember window forward another ADMIN_REMEMBER_DAYS on each use.
  const newExpires = new Date(Date.now() + ADMIN_REMEMBER_DAYS * 24 * 60 * 60 * 1000);
  found.sheet.getRange(found.rowIndex, 4).setValue(Utilities.formatDate(newExpires, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'));
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('token_' + token, email, SESSION_TOKEN_TTL_SECONDS);
  return jsonOut_({ status: 'ok', token: token, isFullAdmin: isFullAdminEmail_(email) });
}

// Fallback login on a new/different device: email + the PIN set above,
// instead of waiting for an emailed code. Also remembers this new device.
function handleAdminPinLogin_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const pin = String(payload.pin || '').trim();
  if (!isAllowedAdminEmail_(email)) {
    return jsonOut_({ status: 'error', message: 'Not authorized.' });
  }
  const found = findAdminAuthRow_(email);
  if (found.rowIndex < 0) return jsonOut_({ status: 'error', message: 'No PIN set for this email yet.' });
  const pinHash = found.row[1];
  if (!pinHash || hashPin_(pin) !== pinHash) {
    return jsonOut_({ status: 'error', message: 'Wrong PIN.' });
  }
  const rememberToken = Utilities.getUuid() + Utilities.getUuid();
  const rememberExpires = new Date(Date.now() + ADMIN_REMEMBER_DAYS * 24 * 60 * 60 * 1000);
  found.sheet.getRange(found.rowIndex, 3, 1, 2).setValues([[
    hashPin_(rememberToken),
    Utilities.formatDate(rememberExpires, TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
  ]]);
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('token_' + token, email, SESSION_TOKEN_TTL_SECONDS);
  return jsonOut_({ status: 'ok', token: token, rememberToken: rememberToken, isFullAdmin: isFullAdminEmail_(email) });
}

function handleListProfiles_(payload) {
  let adminEmail;
  try {
    adminEmail = requireAdmin_(payload.token);
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
      photoUrl: data[i][9],
      hasPin: !!data[i][11]
    });
  }
  rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return jsonOut_({ status: 'ok', profiles: rows, isFullAdmin: isFullAdminEmail_(adminEmail) });
}

function handleSaveProfile_(payload) {
  let adminEmail;
  try {
    adminEmail = requireAdmin_(payload.token);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err.message || err) });
  }
  const isFullAdmin = isFullAdminEmail_(adminEmail);

  const name = String(payload.name || '').trim();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });

  const sheet = profilesSheet_();
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === name.toLowerCase()) { rowIndex = i + 1; break; }
  }

  // A limited-admin login (e.g. Tino) may only register a brand-new driver —
  // never edit an already-registered one, and never set a PIN. PINs are set
  // only by the driver themselves via their own reset flow.
  if (!isFullAdmin && rowIndex > 0) {
    return jsonOut_({ status: 'error', message: 'This login can only register new drivers. Editing an existing driver needs the main admin.' });
  }
  if (!isFullAdmin && payload.pin) {
    return jsonOut_({ status: 'error', message: 'PINs can only be set by the driver themselves, via their own PIN reset.' });
  }

  let photoUrl = payload.existingPhotoUrl || '';
  if (payload.photoDataUrl) {
    photoUrl = saveProfilePhoto_(payload.photoDataUrl, name);
  }

  // PIN: only touched when the admin typed a new one. Leaving it blank keeps
  // whatever was already set (or stays unset, for a brand-new profile).
  let pinHash = rowIndex > 0 ? (data[rowIndex - 1][11] || '') : '';
  if (payload.pin) {
    if (!/^[0-9]{4,6}$/.test(String(payload.pin))) {
      return jsonOut_({ status: 'error', message: 'PIN must be 4 to 6 digits.' });
    }
    pinHash = hashPin_(payload.pin);
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
    new Date(),
    pinHash
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
    },
    hasPin: !!row[11]
  });
}

/* ============== DRIVER PIN (identity check, no admin login) ==============
   A 4-6 digit PIN per driver, set by the admin (saveDriverProfile, already
   OTP-gated) and otherwise changeable only via a code emailed to that
   driver's own registered email — never typed in by the person resetting
   it, so it can't be redirected to someone else's inbox. Until the admin
   sets a PIN for a name, that name works exactly as before (no gate). */

function handleVerifyDriverPin_(payload) {
  const name = String(payload.name || '').trim();
  const pin = String(payload.pin || '').trim();
  if (!name || !pin) return jsonOut_({ status: 'error', message: 'Name and PIN are required.' });
  const found = findProfileRow_(name);
  if (!found) return jsonOut_({ status: 'not_found' });
  const storedHash = found.row[11] || '';
  if (!storedHash) return jsonOut_({ status: 'no_pin' });
  if (hashPin_(pin) !== storedHash) return jsonOut_({ status: 'error', message: 'Wrong PIN.' });
  return jsonOut_({ status: 'ok' });
}

function handleRequestDriverPinReset_(payload) {
  const name = String(payload.name || '').trim();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });
  const found = findProfileRow_(name);
  if (!found) return jsonOut_({ status: 'not_found' });
  const email = String(found.row[2] || '').trim();
  if (!email) {
    return jsonOut_({ status: 'error', message: 'No email on file for this driver — ask your HSSE admin to reset your PIN.' });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  CacheService.getScriptCache().put('pincode_' + name.toLowerCase(), code, LOGIN_CODE_TTL_SECONDS);
  MailApp.sendEmail({
    to: email,
    subject: 'Driver Log — your PIN reset code',
    body: 'Your one-time PIN reset code is: ' + code +
      '\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.'
  });
  return jsonOut_({ status: 'ok' });
}

function handleVerifyDriverPinReset_(payload) {
  const name = String(payload.name || '').trim();
  const code = String(payload.code || '').trim();
  const newPin = String(payload.newPin || '').trim();
  if (!name || !code || !/^[0-9]{4,6}$/.test(newPin)) {
    return jsonOut_({ status: 'error', message: 'A 4 to 6 digit PIN and a valid code are required.' });
  }
  const found = findProfileRow_(name);
  if (!found) return jsonOut_({ status: 'not_found' });
  const cache = CacheService.getScriptCache();
  const key = 'pincode_' + name.toLowerCase();
  const cached = cache.get(key);
  if (!cached || cached !== code) return jsonOut_({ status: 'error', message: 'Invalid or expired code.' });
  cache.remove(key);
  found.sheet.getRange(found.rowIndex, 12).setValue(hashPin_(newPin));
  found.sheet.getRange(found.rowIndex, 11).setValue(new Date());
  return jsonOut_({ status: 'ok' });
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

/* ============== DELETE DRIVER (full admin only) ==============
   Removes the profile row and the matching Drivers-picker row, so the
   driver stops appearing in the app. Past Submissions rows are never
   touched — the safety log stays intact for anyone who was logged while
   the driver was active. */

function handleDeleteDriverProfile_(payload) {
  let adminEmail;
  try {
    adminEmail = requireAdmin_(payload.token);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err.message || err) });
  }
  if (!isFullAdminEmail_(adminEmail)) {
    return jsonOut_({ status: 'error', message: 'Only the main admin can delete a driver.' });
  }
  const name = String(payload.name || '').trim();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });

  const found = findProfileRow_(name);
  if (!found) return jsonOut_({ status: 'not_found' });
  found.sheet.deleteRow(found.rowIndex);

  const driversSheetObj = driversSheet_();
  const driversData = driversSheetObj.getDataRange().getValues();
  for (let i = 1; i < driversData.length; i++) {
    if (String(driversData[i][0]).trim().toLowerCase() === name.toLowerCase()) {
      driversSheetObj.deleteRow(i + 1);
      break;
    }
  }

  return jsonOut_({ status: 'ok' });
}

/* ============== ADMIN DASHBOARD (full admin only) ==============
   Monthly km driven and work hours per driver, computed automatically by
   pairing each day's Start-of-Shift and End-of-Day odometer/timestamp —
   never from the manually-typed "Time" field, since the server's own
   auto-timestamp (recorded the instant each entry was submitted) can't be
   edited by the driver. Also a count of safety/fraud flags for the month,
   and a list of every odometer photo link for the month. */

function handleGetDashboardData_(payload) {
  let adminEmail;
  try {
    adminEmail = requireAdmin_(payload.token);
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err.message || err) });
  }
  if (!isFullAdminEmail_(adminEmail)) {
    return jsonOut_({ status: 'error', message: 'The dashboard is limited to the main admin.' });
  }

  const month = String(payload.month || Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM'));
  const sheet = submissionsSheet_();
  const data = sheet.getDataRange().getValues();

  const driverDateMap = {};   // { name: { 'yyyy-MM-dd': { start:{odo,ts}, end:{odo,ts} } } }
  const photoEntries = [];
  const flagCounts = { farFromSite: 0, clockMismatch: 0, incidents: 0, failedItems: 0 };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Sheets silently converts a "2026-11-04"-looking string into a real
    // Date cell on append, so row[4] can come back as a Date object, not a
    // string — format it back to yyyy-MM-dd first, or the month filter
    // below never matches anything and the dashboard looks permanently empty.
    const rawDate = row[4];
    const dateStr = (rawDate instanceof Date && !isNaN(rawDate.getTime()))
      ? Utilities.formatDate(rawDate, TIMEZONE, 'yyyy-MM-dd')
      : String(rawDate || '');
    if (dateStr.indexOf(month) !== 0) continue; // only rows in the requested month

    const name = String(row[2] || '').trim();
    if (!name) continue;
    const activity = String(row[1] || '');
    const odo = row[6];
    const photoUrl = row[7];
    const autoTs = row[0];
    const clockOffset = row[26];
    const locFlag = row[29];
    const incident = row[21];
    const failedItems = row[19];

    if (locFlag) flagCounts.farFromSite++;
    if (clockOffset !== '' && !isNaN(Number(clockOffset)) && Math.abs(Number(clockOffset)) > 15) flagCounts.clockMismatch++;
    if (incident) flagCounts.incidents++;
    if (failedItems) flagCounts.failedItems++;

    if (photoUrl) {
      photoEntries.push({
        name: name, date: dateStr, activity: activity,
        photoUrl: photoUrl, mapLink: row[25] || '', timestamp: autoTs
      });
    }

    if (activity === 'start' || activity === 'end') {
      if (!driverDateMap[name]) driverDateMap[name] = {};
      if (!driverDateMap[name][dateStr]) driverDateMap[name][dateStr] = {};
      driverDateMap[name][dateStr][activity] = { odo: odo, ts: autoTs };
    }
  }

  const driverSummaries = [];
  Object.keys(driverDateMap).forEach(function (name) {
    let totalKm = 0, totalHours = 0, daysCounted = 0;
    const dates = driverDateMap[name];
    Object.keys(dates).forEach(function (dateStr) {
      const pair = dates[dateStr];
      if (pair.start && pair.end) {
        const startOdo = Number(pair.start.odo);
        const endOdo = Number(pair.end.odo);
        if (!isNaN(startOdo) && !isNaN(endOdo) && endOdo >= startOdo) {
          totalKm += (endOdo - startOdo);
        }
        const startTs = new Date(pair.start.ts);
        const endTs = new Date(pair.end.ts);
        if (!isNaN(startTs.getTime()) && !isNaN(endTs.getTime()) && endTs.getTime() > startTs.getTime()) {
          totalHours += (endTs.getTime() - startTs.getTime()) / (1000 * 60 * 60);
        }
        daysCounted++;
      }
    });
    driverSummaries.push({
      name: name,
      totalKm: Math.round(totalKm * 10) / 10,
      totalHours: Math.round(totalHours * 10) / 10,
      daysWithCompleteLog: daysCounted
    });
  });
  driverSummaries.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  photoEntries.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  return jsonOut_({
    status: 'ok',
    month: month,
    drivers: driverSummaries,
    flagCounts: flagCounts,
    photoEntries: photoEntries
  });
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

/* ============== ONE-TIME: add the new location columns to an existing
   Submissions sheet (run manually from the Apps Script editor) ============== */
// getOrCreateSheet_() only writes headers the first time a sheet is created,
// so your live Submissions sheet still has its original header row. This
// just appends whichever of the new header labels are missing at the end of
// row 1 — existing rows and columns are untouched. Safe to re-run.
function addLocationColumns_() {
  const sheet = getOrCreateSheet_(SUBMISSIONS_SHEET_NAME, []);
  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  const wanted = ['Odometer Photo Latitude', 'Odometer Photo Longitude', 'Odometer Photo Map Link'];
  const missing = wanted.filter(h => headerRow.indexOf(h) === -1);
  if (missing.length === 0) { Logger.log('Location columns already present.'); return; }
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  Logger.log('Added columns: ' + missing.join(', '));
}

/* ============== ONE-TIME: add the new fraud-check columns to an existing
   Submissions sheet (run manually from the Apps Script editor) ============== */
// Same pattern as addLocationColumns_ above, for the clock-offset,
// location-status, distance-from-site and location-flag columns. Safe to
// re-run, and safe to run whether or not you've already run
// addLocationColumns_.
function addSecurityColumns_() {
  const sheet = getOrCreateSheet_(SUBMISSIONS_SHEET_NAME, []);
  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  const wanted = [
    'Odometer Photo Clock Offset (min)', 'Odometer Location Status',
    'Distance from Site (km)', 'Location Flag'
  ];
  const missing = wanted.filter(h => headerRow.indexOf(h) === -1);
  if (missing.length === 0) { Logger.log('Security columns already present.'); return; }
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  Logger.log('Added columns: ' + missing.join(', '));
}

/* ============== ONE-TIME: add the PIN Hash column to an existing Driver
   Profiles sheet (run manually from the Apps Script editor) ============== */
function addPinColumn_() {
  const sheet = getOrCreateSheet_(PROFILES_SHEET_NAME, []);
  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  if (headerRow.indexOf('PIN Hash') !== -1) { Logger.log('PIN Hash column already present.'); return; }
  sheet.getRange(1, lastCol + 1).setValue('PIN Hash');
  Logger.log('Added column: PIN Hash');
}

/* ============== ONE-TIME SEED (run manually from the Apps Script editor) ============== */
// Not reachable from the web app — there is no HTTP action for this. Open
// this script in the Apps Script editor, select "seedDriverProfiles_" in the
// function dropdown, and click Run once. Safe to re-run: it updates existing
// rows by name instead of duplicating them. Fill in anything left blank
// (licence no/expiry, company) later via the admin panel.
function seedDriverProfiles_() {
  const drivers = [
    { name: 'Valentino T Sinaga', phone: '085834331486', email: 'vsinaga67@gmail.com', vehicle: 'BK 7769 DQ (Hiace)' },
    { name: 'Suryadi', phone: '081263701100', email: 'Suryadi.adi210179@gmail.com', vehicle: 'BK 1411 ADG (Reborn)' },
    { name: 'Reza Prayuda', phone: '081377220573', email: 'rezaprayuda1705@gmail.com', vehicle: 'BK 1503 AEG (Reborn)' },
    { name: 'Bintang Patih Pamungkas', phone: '082166931731', email: 'bintangpatih9@gmail.com', vehicle: 'BK 1185 AGR (Reborn)' }
  ];

  const sheet = profilesSheet_();
  const data = sheet.getDataRange().getValues();

  drivers.forEach(function (d) {
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === d.name.toLowerCase()) { rowIndex = i + 1; break; }
    }
    const existing = rowIndex > 0 ? data[rowIndex - 1] : null;
    const rowValues = [
      d.name,
      d.phone,
      d.email,
      d.vehicle,
      existing ? existing[4] : '', // Licence No — fill in later
      existing ? existing[5] : '', // Licence Expiry — fill in later
      existing ? existing[6] : '', // Company — fill in later
      existing ? existing[7] : '', // Emergency Contact Name — left for driver self-service
      existing ? existing[8] : '', // Emergency Contact Phone — left for driver self-service
      existing ? existing[9] : '', // Photo URL — left for driver self-service
      new Date()
    ];
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    upsertDriver_(d.name);
  });

  Logger.log('Seeded ' + drivers.length + ' driver profiles.');
}

/* ============== DRIVER INDUCTION (pass-through / commuter drivers) ==============
   Public: driverInduction (submit result), driverInductionVerify (QR page),
   driverInductionStatus (Driver Log banner).
   Admin (same email one-time-code login as driver profiles): list + officer
   sign-off. A driver is "ready" only when passed AND signed off AND not expired. */

const IND_HEADERS = [
  'Timestamp', 'Cert No', 'Verify Code', 'Name', 'Company', 'Phone', 'Licence No', 'Licence Type',
  'Licence Expiry', 'ID Last 4', 'Vehicle Plate', 'Language', 'Attempt', 'Score', 'Out Of', 'Result',
  'Valid Until', 'Sign-off', 'Signed By', 'Signed At', 'SIM Sighted', 'Vehicle Checked', 'Route Briefed',
  'Officer Notes', 'Client ID'
];
const IND_COL = {}; IND_HEADERS.forEach(function (h, i) { IND_COL[h] = i; });

function inductionSheet_() { return getOrCreateSheet_(INDUCTION_SHEET_NAME, IND_HEADERS); }

function indDate_(d) { return d ? Utilities.formatDate(new Date(d), TIMEZONE, 'yyyy-MM-dd') : ''; }

function handleInductionSubmit_(p) {
  const name = String(p.name || '').trim().slice(0, 80);
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });
  const score = Number(p.score), outOf = Number(p.outOf) || 15;
  if (!(score >= 0 && score <= outOf)) return jsonOut_({ status: 'error', message: 'Invalid score.' });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sheet = inductionSheet_();
    const data = sheet.getDataRange().getValues();
    const clientId = String(p.clientId || '').slice(0, 40);
    let attempt = 1;
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (clientId && r[IND_COL['Client ID']] === clientId) {   // retry of an upload already saved
        return jsonOut_({ status: 'ok', certNo: r[1], code: r[2], result: r[IND_COL['Result']], validUntil: indDate_(r[IND_COL['Valid Until']]), duplicate: true });
      }
      if (String(r[IND_COL['Name']]).trim().toLowerCase() === name.toLowerCase() &&
          String(r[IND_COL['Licence No']]).trim().toLowerCase() === String(p.licenceNo || '').trim().toLowerCase()) attempt++;
    }
    const pass = score >= INDUCTION_PASS_MARK;
    const now = new Date();
    let certNo = '', code = '', valid = '';
    if (pass) {
      const day = Utilities.formatDate(now, TIMEZONE, 'yyMMdd');
      let n = 1; for (let i = 1; i < data.length; i++) if (String(data[i][1]).indexOf('DRV-IND-' + day) === 0) n++;
      certNo = 'DRV-IND-' + day + '-' + ('00' + n).slice(-3);
      const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      do { code = ''; for (let k = 0; k < 8; k++) code += alpha.charAt(Math.floor(Math.random() * alpha.length)); }
      while (data.some(function (r) { return r[2] === code; }));
      const v = new Date(now); v.setMonth(v.getMonth() + INDUCTION_VALID_MONTHS);
      valid = indDate_(v);
    }
    const row = [
      now, certNo, code, name, String(p.company || '').slice(0, 80), String(p.phone || '').slice(0, 20),
      String(p.licenceNo || '').slice(0, 30), String(p.licenceType || '').slice(0, 10), String(p.licenceExpiry || '').slice(0, 10),
      String(p.idLast4 || '').slice(0, 4), String(p.plate || '').slice(0, 20), String(p.lang || '').slice(0, 3),
      attempt, score, outOf, pass ? 'PASS' : 'FAIL', valid, pass ? 'Pending' : '', '', '', '', '', '', '', clientId
    ];
    const target = sheet.getLastRow() + 1;
    [IND_COL['Phone'], IND_COL['Licence No'], IND_COL['ID Last 4']].forEach(function (c) { sheet.getRange(target, c + 1).setNumberFormat('@'); });
    sheet.getRange(target, 1, 1, row.length).setValues([row]);
    return jsonOut_({ status: 'ok', certNo: certNo, code: code, result: pass ? 'PASS' : 'FAIL', validUntil: valid, attempt: attempt });
  } finally { lock.releaseLock(); }
}

function handleInductionVerify_(code) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return jsonOut_({ status: 'error', message: 'No code.' });
  const data = inductionSheet_().getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).toUpperCase() === code) {
      const r = data[i], valid = indDate_(r[IND_COL['Valid Until']]);
      return jsonOut_({
        status: 'ok', certNo: r[1], name: r[IND_COL['Name']], company: r[IND_COL['Company']],
        date: indDate_(r[0]), validUntil: valid, signoff: r[IND_COL['Sign-off']],
        expired: !!valid && valid < indDate_(new Date())
      });
    }
  }
  return jsonOut_({ status: 'not_found' });
}

// Latest PASS for a name -> ready / pending signoff / expired / none (used by the Driver Log banner).
function handleInductionStatus_(name) {
  name = String(name || '').trim().toLowerCase();
  if (!name) return jsonOut_({ status: 'error', message: 'Name is required.' });
  const data = inductionSheet_().getDataRange().getValues();
  let best = null;
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[IND_COL['Name']]).trim().toLowerCase() !== name || r[IND_COL['Result']] !== 'PASS') continue;
    if (!best || new Date(r[0]) > new Date(best[0])) best = r;
  }
  if (!best) return jsonOut_({ status: 'ok', state: 'none' });
  const valid = indDate_(best[IND_COL['Valid Until']]), today = indDate_(new Date());
  const signed = best[IND_COL['Sign-off']] === 'Signed';
  let state = 'ready';
  if (valid && valid < today) state = 'expired';
  else if (!signed) state = 'pending';
  const days = valid ? Math.round((new Date(valid) - new Date(today)) / 86400000) : null;
  return jsonOut_({ status: 'ok', state: state, validUntil: valid, daysLeft: days });
}

function handleInductionList_(p) {
  try { requireAdmin_(p.token); } catch (err) { return jsonOut_({ status: 'error', message: String(err.message || err) }); }
  const data = inductionSheet_().getDataRange().getValues(), out = [];
  for (let i = data.length - 1; i >= 1 && out.length < 150; i--) {
    const r = data[i];
    if (r[IND_COL['Result']] !== 'PASS') continue;
    out.push({
      code: r[2], certNo: r[1], name: r[IND_COL['Name']], company: r[IND_COL['Company']], phone: r[IND_COL['Phone']],
      licenceNo: r[IND_COL['Licence No']], licenceType: r[IND_COL['Licence Type']], licenceExpiry: r[IND_COL['Licence Expiry']],
      plate: r[IND_COL['Vehicle Plate']], date: indDate_(r[0]), score: r[IND_COL['Score']], outOf: r[IND_COL['Out Of']],
      validUntil: indDate_(r[IND_COL['Valid Until']]), signoff: r[IND_COL['Sign-off']], signedBy: r[IND_COL['Signed By']]
    });
  }
  return jsonOut_({ status: 'ok', rows: out });
}

function handleInductionSignoff_(p) {
  let email;
  try { email = requireAdmin_(p.token); } catch (err) { return jsonOut_({ status: 'error', message: String(err.message || err) }); }
  if (!(p.sim === true && p.vehicle === true && p.route === true)) {
    return jsonOut_({ status: 'error', message: 'All three checks must be ticked.' });
  }
  const code = String(p.code || '').trim().toUpperCase();
  const sheet = inductionSheet_(), data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).toUpperCase() === code) {
      const row = i + 1;
      sheet.getRange(row, IND_COL['Sign-off'] + 1, 1, 7).setValues([[
        'Signed', email, new Date(), 'Yes', 'Yes', 'Yes', String(p.notes || '').slice(0, 200)
      ]]);
      return jsonOut_({ status: 'ok' });
    }
  }
  return jsonOut_({ status: 'not_found' });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
