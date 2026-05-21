/**
 * RPM Fest — Google Apps Script
 * ==============================
 * Cómo desplegar:
 * 1. Ve a https://script.google.com/create
 * 2. Copia y pega este código
 * 3. Crea las hojas (sheets) con los nombres exactos:
 *    - config
 *    - activities
 *    - schedule
 *    - stats
 * 4. Desplegar → Nuevo despliegue → App web
 * 5. Ejecutar como: tú → Acceso: cualquiera
 * 6. Copia la URL del despliegue → pégala en admin/app.js (GS_URL)
 */

// ========== HOJAS DEL SHEET ==========
// Crea un Spreadsheet con estas pestañas (nombres exactos):
//
// config:
//   key       | value
//   ----------|-------------------------------
//   name      | RPM FEST
//   organizer | Diamond Squad Events
//   date      | Sábado 16 de Mayo · 10:00
//   location  | Circuito Internacional FK1
//   address   | Ctra. Comarcal, 602, 47465\nVillaverde de Medina, Valladolid
//   status    | finalizado
//   dressCode | Casual
//   badge     | DIAMOND SQUAD EVENTS
//   title     | RPM FEST
//   subtitle  | Sábado 16 de Mayo · 10:00 · Circuito FK1
//   ctaText   | EXPLORAR EVENTO
//   ctaLink   | #experiencias
//   ctaStatus | FINALIZADO
//   descShort | RPM Fest no es solo una concentración...
//   quote     | RPM Fest no es solo una concentración… es un festival del motor.
//
// activities:
//   icon | title                | description                          | tag
//   -----|----------------------|--------------------------------------|-------
//   🎤   | Escenario en Directo | Artistas en vivo durante toda la...  | MÚSICA
//   🚗   | Zona Expo            | Coches preparados, deportivos...     | EXPOSICIÓN
//   ...etc
//
// schedule:
//   time  | title               | description
//   ------|---------------------|----------------------------------------
//   10:00 | Apertura de Puertas | Comienza la fiesta...
//   ...etc
//
// stats:
//   number | label
//   -------|---------------
//   6+     | Actividades
//   ...etc

const SHEET_NAMES = ['config', 'activities', 'schedule', 'stats', 'sponsors'];

function doGet(e) {
  const tab = e.parameter.tab || 'config';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: `Sheet '${tab}' not found` }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  let result;
  if (tab === 'config') {
    result = {};
    data.forEach(row => {
      if (row[0]) result[row[0]] = row[1];
    });
  } else {
    const headers = data[0];
    result = data.slice(1).map(row => {
      const item = {};
      headers.forEach((h, i) => { item[h] = row[i]; });
      return item;
    }).filter(row => row[headers[0]]);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const tab = body.tab || 'config';
    const data = body.data;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: `Sheet '${tab}' not found` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (tab === 'config') {
      const keys = Object.keys(data);
      const rows = keys.map(k => [k, String(data[k])]);
      sheet.clear();
      sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    } else {
      const headers = Object.keys(data[0]);
      const rows = [headers, ...data.map(item => headers.map(h => item[h]))];
      sheet.clear();
      sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
