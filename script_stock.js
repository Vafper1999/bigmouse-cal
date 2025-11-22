// URL Web App ของ Google Apps Script (เช็คว่าเป็น URL ล่าสุดจากการ Deploy)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJ2tw3avSP6v1480WAMKL93HSulENpExuKnTY_GQP7_kMBbx4xBegojg8FgR0SXnmRgQ/exec';

// รายการไซส์
const MICE_SIZES = ['3XS','2XS','XS','S','M','L','XL','2XL','3XL'];
const RAT_SIZES  = ['S','M1','M2','M3','L1','L2','XL','2XL','3XL','4XL','5XL','JB'];

const $ = (sel) => document.querySelector(sel);

// 1. Render ตาราง
function renderStockTables(rows) {
  const miceBody = $('#stock-table-mice tbody');
  const ratBody  = $('#stock-table-rat tbody');
  
  if (!miceBody || !ratBody) return;

  miceBody.innerHTML = '';
  ratBody.innerHTML = '';

  const addEmptyRow = (tbody, msg) => {
    tbody.innerHTML = `<tr><td colspan="2" class="hint" style="text-align:center">${msg}</td></tr>`;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    addEmptyRow(miceBody, 'ไม่พบข้อมูล');
    addEmptyRow(ratBody, 'ไม่พบข้อมูล');
    return;
  }

  // เรียงลำดับ
  const sorted = [...rows].sort((a, b) => {
    const animalA = (a.animal || '').toLowerCase();
    const animalB = (b.animal || '').toLowerCase();
    if (animalA !== animalB) return animalA === 'mice' ? -1 : 1;
    if (animalA === 'mice') return MICE_SIZES.indexOf(a.size) - MICE_SIZES.indexOf(b.size);
    if (animalA === 'rat') return RAT_SIZES.indexOf(a.size) - RAT_SIZES.indexOf(b.size);
    return 0;
  });

  let miceCount = 0;
  let ratCount = 0;

  sorted.forEach(r => {
    const animal = (r.animal || '').toLowerCase();
    const stockVal = parseInt(r.stock);
    
    // ตกแต่งสีถ้าของหมด
    let colorStyle = '';
    if(isNaN(stockVal) || stockVal <= 0) colorStyle = 'color:red; font-weight:bold;';
    else if(stockVal < 5) colorStyle = 'color:orange;';

    const tr = `<tr>
      <td>${r.size || ''}</td>
      <td style="${colorStyle}">${r.stock ?? 0}</td>
    </tr>`;

    if (animal === 'mice') {
      miceBody.innerHTML += tr;
      miceCount++;
    } else if (animal === 'rat') {
      ratBody.innerHTML += tr;
      ratCount++;
    }
  });

  if(miceCount===0) addEmptyRow(miceBody, 'ไม่มีข้อมูล Mice');
  if(ratCount===0)  addEmptyRow(ratBody, 'ไม่มีข้อมูล Rat');
}

// 2. โหลดข้อมูล
async function loadStockTable() {
  try {
    $('#stock-table-mice tbody').innerHTML = '<tr><td colspan="2" class="hint">...</td></tr>';
    $('#stock-table-rat tbody').innerHTML  = '<tr><td colspan="2" class="hint">...</td></tr>';

    const res = await fetch(`${SCRIPT_URL}?action=getStock`);
    if (!res.ok) throw new Error('Network err');
    
    const data = await res.json();
    renderStockTables(data);
  } catch (err) {
    console.error(err);
    $('#stock-table-mice tbody').innerHTML = '<tr><td colspan="2" style="color:red">โหลดล้มเหลว</td></tr>';
    $('#stock-table-rat tbody').innerHTML  = '<tr><td colspan="2" style="color:red">โหลดล้มเหลว</td></tr>';
  }
}

// 3. อัปเดตสต็อก
async function submitStockUpdate() {
  const date   = $('#upd-date').value;
  const animal = $('#upd-animal').value;
  const size   = $('#upd-size').value;
  const qty    = $('#upd-qty').value;
  const action = $('#upd-action').value;

  if (!date || !animal || !size || !qty || parseInt(qty) <= 0) {
    alert('กรุณากรอกข้อมูลให้ครบ (วันที่, ไซส์, จำนวน)');
    return;
  }

  const btn = $('#btn-submit');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '⏳...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateStock',
        date: date,
        animal: animal,
        size: size,
        qty: parseInt(qty),
        type: action
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      $('#upd-qty').value = ''; // เคลียร์จำนวน แต่เก็บวันที่ไว้
      await loadStockTable();
      alert(`✅ บันทึกสำเร็จ! (ยอดเหลือ: ${result.newStock})`);
    } else {
      alert('❌ Error: ' + result.message);
    }
  } catch (err) {
    alert('❌ เชื่อมต่อไม่ได้');
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// 4. Events
function wireEvents() {
  $('#upd-animal').addEventListener('change', (e) => {
    const val = e.target.value;
    const sizeSel = $('#upd-size');
    sizeSel.innerHTML = '<option value="" disabled selected>-- เลือกไซส์ --</option>';
    
    const sizes = (val === 'Mice') ? MICE_SIZES : (val === 'Rat') ? RAT_SIZES : [];
    sizes.forEach(s => {
      sizeSel.innerHTML += `<option value="${s}">${s}</option>`;
    });
  });

  $('#btn-submit').addEventListener('click', submitStockUpdate);
}

// Start
window.addEventListener('DOMContentLoaded', () => {
  // Default Date = Today
  $('#upd-date').value = new Date().toISOString().split('T')[0];
  
  wireEvents();
  loadStockTable();
});