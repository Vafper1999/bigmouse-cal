// ⚠️ ใช้ URL เดิมได้เลยครับ
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJ2tw3avSP6v1480WAMKL93HSulENpExuKnTY_GQP7_kMBbx4xBegojg8FgR0SXnmRgQ/exec';

const MICE_SIZES = ['3XS','2XS','XS','S','M','L','XL','2XL','3XL'];
const RAT_SIZES  = ['S','M1','M2','M3','L1','L2','XL','2XL','3XL','4XL','5XL','JB'];
const $ = (sel) => document.querySelector(sel);

function renderStockTables(rows) {
  const miceBody = $('#stock-table-mice tbody');
  const ratBody  = $('#stock-table-rat tbody');
  if (!miceBody || !ratBody) return;
  miceBody.innerHTML = ''; ratBody.innerHTML = '';

  const addEmptyRow = (tbody, msg) => { tbody.innerHTML = `<tr><td colspan="2" class="hint" style="text-align:center">${msg}</td></tr>`; };

  if (!Array.isArray(rows) || rows.length === 0) {
    addEmptyRow(miceBody, 'ไม่พบข้อมูล'); addEmptyRow(ratBody, 'ไม่พบข้อมูล'); return;
  }

  const sorted = [...rows].sort((a, b) => {
    const animalA = (a.animal || '').toLowerCase();
    const animalB = (b.animal || '').toLowerCase();
    if (animalA !== animalB) return animalA === 'mice' ? -1 : 1;
    if (animalA === 'mice') return MICE_SIZES.indexOf(a.size) - MICE_SIZES.indexOf(b.size);
    return RAT_SIZES.indexOf(a.size) - RAT_SIZES.indexOf(b.size);
  });

  let m=0, r=0;
  sorted.forEach(row => {
    const animal = (row.animal||'').toLowerCase();
    const stockVal = parseInt(row.stock);
    let style = (isNaN(stockVal)||stockVal<=0) ? 'color:red;font-weight:bold;' : (stockVal<5?'color:orange;':'');
    
    const tr = `<tr><td>${row.size}</td><td style="${style}">${row.stock}</td></tr>`;
    if(animal==='mice'){ miceBody.innerHTML+=tr; m++; }
    else if(animal==='rat'){ ratBody.innerHTML+=tr; r++; }
  });
  if(m===0) addEmptyRow(miceBody, 'No Data');
  if(r===0) addEmptyRow(ratBody, 'No Data');
}

async function loadStockTable() {
  try {
    if($('#stock-table-mice tbody').children.length === 0) $('#stock-table-mice tbody').innerHTML = '<tr><td colspan="2" class="hint">...</td></tr>';
    const res = await fetch(`${SCRIPT_URL}?action=getStock`);
    const data = await res.json();
    renderStockTables(data);
  } catch (err) { console.error(err); }
}

async function submitStockUpdate() {
  const date = $('#upd-date').value;
  const animal = $('#upd-animal').value;
  const size = $('#upd-size').value;
  const qty = parseInt($('#upd-qty').value);

  if (!date || !animal || !size || !qty) return alert('กรอกข้อมูลไม่ครบ');

  const btn = $('#btn-submit');
  btn.disabled = true;
  btn.innerText = '⏳...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      // ตัด type ออก เหลือแค่นี้
      body: JSON.stringify({ 
        action: 'updateStock', 
        date: date, 
        animal: animal, 
        size: size, 
        qty: qty 
      })
    });
    
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch (e) { throw new Error(text); }
    
    if (result.status === 'success' || result.ok === true) {
      alert('✅ เติมสต็อกเรียบร้อย!');
      $('#upd-qty').value = ''; 
      await loadStockTable(); 
    } else {
      throw new Error(result.message || "Unknown error");
    }

  } catch (e) {
    alert('❌ Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'บันทึกการเติมสต็อก';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  $('#upd-date').value = new Date().toISOString().split('T')[0];
  $('#upd-animal').addEventListener('change', (e) => {
    const sizes = e.target.value === 'Mice' ? MICE_SIZES : RAT_SIZES;
    $('#upd-size').innerHTML = sizes.map(s => `<option value="${s}">${s}</option>`).join('');
  });
  $('#btn-submit').addEventListener('click', submitStockUpdate);
  loadStockTable();
});