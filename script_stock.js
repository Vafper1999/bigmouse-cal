// URL ของ Google Apps Script Web App ที่ใช้ดึงสต็อก
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJ2tw3avSP6v1480WAMKL93HSulENpExuKnTY_GQP7_kMBbx4xBegojg8FgR0SXnmRgQ/exec';

/**
 * ช่วยเลือก element แบบสั้น ๆ
 * @param {string} sel
 * @returns {Element|null}
 */
function $(sel) {
  return document.querySelector(sel);
}

/**
 * วาดตารางสต็อก แยก Mice / Rat คนละตาราง
 * @param {Array} rows - [{animal, size, stock, total}, ...]
 */
function renderStockTables(rows) {
  const miceBody = document.querySelector('#stock-table-mice tbody');
  const ratBody  = document.querySelector('#stock-table-rat tbody');
  if (!miceBody || !ratBody) return;

  miceBody.innerHTML = '';
  ratBody.innerHTML = '';

  // ถ้าไม่มีข้อมูลเลย
  if (!Array.isArray(rows) || rows.length === 0) {
    const addEmptyRow = (tbody) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.textContent = 'ยังไม่มีข้อมูลสต็อก';
      td.className = 'hint';
      tr.appendChild(td);
      tbody.appendChild(tr);
    };
    addEmptyRow(miceBody);
    addEmptyRow(ratBody);
    return;
  }

  const miceOrder = ['3XS','2XS','XS','S','M','L','XL','2XL','3XL'];
  const ratOrder  = ['S','M1','M2','M3','L1','L2','XL','2XL','3XL','4XL','5XL','JB'];

  const sorted = [...rows].sort((a, b) => {
    const animalA = (a.animal || '').toLowerCase();
    const animalB = (b.animal || '').toLowerCase();

    if (animalA !== animalB) {
      if (animalA === 'mice') return -1;
      if (animalB === 'mice') return 1;
    }

    if (animalA === 'mice') {
      return miceOrder.indexOf(a.size) - miceOrder.indexOf(b.size);
    }
    if (animalA === 'rat') {
      return ratOrder.indexOf(a.size) - ratOrder.indexOf(b.size);
    }
    return 0;
  });

  let miceCount = 0;
  let ratCount = 0;

  sorted.forEach(r => {
    const animal = (r.animal || '').toLowerCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.size || ''}</td>
      <td>${r.stock ?? ''}</td>
    `;

    if (animal === 'mice') {
      miceBody.appendChild(tr);
      miceCount++;
    } else if (animal === 'rat') {
      ratBody.appendChild(tr);
      ratCount++;
    }
  });

  const addEmptyRowIfNeeded = (tbody, count) => {
    if (count === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.textContent = 'ยังไม่มีข้อมูลสต็อก';
      td.className = 'hint';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  };

  addEmptyRowIfNeeded(miceBody, miceCount);
  addEmptyRowIfNeeded(ratBody, ratCount);
}

/**
 * ดึงข้อมูลสต็อกจาก Apps Script
 */
async function loadStockTable() {
  try {
    const url = `${SCRIPT_URL}?action=getStock`;
    const res = await fetch(url, { method: 'GET', cache: 'no-cache' });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    renderStockTables(data);
  } catch (err) {
    console.error('loadStockTable error:', err);
  }
}

/**
 * ตอนนี้ไม่มี event อื่นให้ผูก
 */
function wireEvents() {
  // ไม่มี filter หรือฟอร์มแล้ว
}

window.addEventListener('DOMContentLoaded', () => {
  wireEvents();
  loadStockTable();
});