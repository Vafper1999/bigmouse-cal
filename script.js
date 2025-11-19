// ---- Data ----
const DATA = {
  mice: [
    ["3XS", 8.00, 7.00],
    ["2XS", 11.00, 10.00],
    ["XS", 13.00, 11.00],
    ["S", 18.00, 15.00],
    ["M", 23.00, 21.00],
    ["L", 28.00, 26.00],
    ["XL", 34.00, 31.00],
    ["2XL", 38.00, 35.00],
    ["3XL", 42.00, 40.00],
  ],
  rat: [
    ["S", 35.00, 33.00],
    ["M1", 40.00, 38.00],
    ["M2", 45.00, 43.00],
    ["M3", 50.00, 48.00],
    ["L1", 55.00, 53.00],
    ["L2", 60.00, 58.00],
    ["XL", 65.00, 63.00],
    ["2XL", 70.00, 68.00],
    ["3XL", 75.00, 73.00],
    ["4XL", 85.00, 83.00],
    ["5XL", 95.00, 93.00],
    ["JB", 100.00, 98.00],
  ]
};

// ---- Helpers ----
const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString("th-TH", {minimumFractionDigits:(n%1?2:0), maximumFractionDigits:2});
const getSelectedAnimals = () => Array.from(document.querySelectorAll('input[name="animal"]:checked')).map(i=>i.value);
const animalLabel = key => key === 'mice' ? 'Mice' : 'Rat';
let qtyInputs = [];

function getDiscount(sub){
  const type = $('#promoType')?.value || 'none';
  const raw = parseFloat($('#promoValue')?.value || '0') || 0;
  let d = 0;
  if(type==='baht') d = Math.max(0, Math.min(raw, sub));
  else if(type==='percent') d = Math.max(0, Math.min(100, raw))*sub/100;
  return d;
}

// ---- Build Table ----
function buildTable(){
  const animals = getSelectedAnimals();
  const ptype = document.querySelector('input[name="ptype"]:checked').value;
  const priceIdx = ptype==='retail'?1:2;
  qtyInputs=[];

  if(animals.length===0){
    $("#tableWrap").innerHTML='<div class="hint">โปรดเลือกอย่างน้อย 1 ประเภท (Mice/Rat)</div>';
    return;
  }

  let html='';
  animals.forEach(animal=>{
    const rows=DATA[animal].map(([size,ret,whl])=>{
      const unit=priceIdx===1?ret:whl;
      return `
        <tr>
          <td>${size}</td>
          <td class="muted">${fmt(unit)}</td>
          <td><input type="number" min="0" step="1" data-animal="${animal}" data-type="fresh" data-size="${size}" data-unit="${unit}" class="qty" value="0"></td>
          <td><input type="number" min="0" step="1" data-animal="${animal}" data-type="frozen" data-size="${size}" data-unit="${unit}" class="qty" value="0"></td>
          <td class="line" data-animal="${animal}" data-size="${size}">0</td>
        </tr>`;
    }).join("");
    html += `
      <div class="head" style="margin-top:6px"><h2>${animalLabel(animal)}</h2></div>
      <table><thead><tr>
        <th>ไซส์</th><th>ราคา</th><th>แช่ (ตัว)</th><th>เป็น (ตัว)</th><th>รวม</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  });

  $("#tableWrap").innerHTML=html;
  qtyInputs=Array.from(document.querySelectorAll(".qty"));
  qtyInputs.forEach(i=> i.addEventListener("input", recalc));
  recalc();
}

// ---- Recalc ----
function recalc(){
  const shipMethod = $("#shipMethod").value;
  const shipCostEl = $("#shipCost");
  if (shipMethod === "รับเอง"){ shipCostEl.value = 0; shipCostEl.disabled = true; }
  else { shipCostEl.disabled = false; }

  // กันเคสผู้ใช้ลบค่าออกจนว่างเปล่า -> ให้เป็น 0 อัตโนมัติ
  if (!$("#shipCost").value) $("#shipCost").value = 0;

  let sub = 0;
  const animals = getSelectedAnimals();
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const qf = parseInt(f?.value||0,10)||0;
      const qz = parseInt(z?.value||0,10)||0;
      const unit = parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      const line = (qf+qz)*unit;
      sub+=line;
      const cell=document.querySelector(`.line[data-animal="${a}"][data-size="${size}"]`);
      if(cell) cell.textContent=fmt(line);
    });
  });

  const discount=getDiscount(sub);
  const ship=parseFloat($("#shipCost").value||0);
  const grand=sub-discount+ship;
  $("#subTotal").textContent=fmt(sub);
  $("#promoTotal").textContent=fmt(discount);
  $("#shipTotal").textContent=fmt(ship);
  $("#grandTotal").textContent=fmt(grand);
  buildMessage(sub,ship,discount);
}

// ---- Build Message ----
function buildMessage(sub, ship, discount){
  const prefix=$("#msgPrefix").value.trim();
  const suffixTpl=$("#msgSuffix").value.trim();
  const shipMethod=$("#shipMethod").value;
  const ptype=document.querySelector('input[name="ptype"]:checked').value;
  const pLabel=ptype==='retail'?'ปลีก':'ส่ง';
  const animals=getSelectedAnimals();
  const header=`${prefix} (${pLabel}) ${animals.map(animalLabel).join(' + ')}`;
  const body=[];
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const unit=parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      const qf=parseInt(f?.value||0,10)||0;
      const qz=parseInt(z?.value||0,10)||0;
      if(qf) body.push(`[${animalLabel(a)}] ${size} (แช่) ${qf} ตัว ราคา ${fmt(qf*unit)} บาท`);
      if(qz) body.push(`[${animalLabel(a)}] ${size} (เป็น) ${qz} ตัว ราคา ${fmt(qz*unit)} บาท`);
    });
  });
  if(discount>0) body.push(`ส่วนลด ${fmt(discount)} บาท`);
  if(ship>0 && shipMethod!=="รับเอง") body.push(`ขนส่ง ${shipMethod} ${fmt(ship)} บาท`);
  const totalText=suffixTpl.replace("{TOTAL}",fmt(sub-discount+ship));
  $("#messageBox").textContent=`${header}\n${body.join("\n")}\n\n${totalText}`.trim();
}

// ---- Receipt Modal ----
function openReceipt(){
  $("#billContent").innerHTML=buildReceiptHTML();
  $("#billModal").classList.add("open");
}
function closeReceipt(){ $("#billModal").classList.remove("open"); }
async function copyReceipt(){ await navigator.clipboard.writeText($("#billContent").innerText); }

function buildReceiptHTML(){
  const now=new Date();
  const d=now.toLocaleDateString('th-TH');
  const t=now.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  let html=`<div class="meta">วันที่ ${d} ${t}</div><table><thead><tr><th>รายการ</th><th>ยอด</th></tr></thead><tbody>`;
  let sub=0;
  const animals=getSelectedAnimals();
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const unit=parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      const qf=parseInt(f?.value||0,10)||0;
      const qz=parseInt(z?.value||0,10)||0;
      if(qf){const line=qf*unit;sub+=line;html+=`<tr><td>[${animalLabel(a)}] ${size} (แช่) × ${qf}</td><td>${fmt(line)}</td></tr>`;}
      if(qz){const line=qz*unit;sub+=line;html+=`<tr><td>[${animalLabel(a)}] ${size} (เป็น) × ${qz}</td><td>${fmt(line)}</td></tr>`;}
    });
  });
  const discount=getDiscount(sub);
  const ship=parseFloat($("#shipCost").value||0);
  const shipMethod=$("#shipMethod").value;
  const grand=sub-discount+ship;
  html+=`</tbody><tfoot>
  <tr><td>รวมค่าสินค้า</td><td>${fmt(sub)}</td></tr>
  ${discount>0?`<tr><td>ส่วนลด</td><td>-${fmt(discount)}</td></tr>`:''}
  ${ship>0 && shipMethod!=="รับเอง"?`<tr><td>ค่าส่ง (${shipMethod})</td><td>${fmt(ship)}</td></tr>`:''}
  <tr><td class="grand">รวมทั้งสิ้น</td><td class="grand">${fmt(grand)}</td></tr>
  </tfoot></table>`;
  return html;
}

// ---- Send message directly to LINE OA ----
async function sendToLine(userId, message) {
  const token = "F0icKxhm22AU5+8RfX44U9Dyfy3r4uZzCcDDJy/tIT2ZK8CuqKPU91uyuqqMZku1vAll59x5gRFddvk2mKtS6J4XRp8thtP8B8xgmraOo1nuHP4z8AzjgoVVY0PeRetjGHiR6eOUCulIUGJh2GifdQdB04t89/1O/w1cDnyilFU=";
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }]
      })
    });
    if (res.ok) {
      alert("✅ ส่งข้อความเข้า LINE OA สำเร็จแล้ว!");
    } else {
      const err = await res.text();
      alert("❌ ส่งข้อความไม่สำเร็จ: " + err);
    }
  } catch (e) {
    if (e.message.includes('Failed to fetch')) {
      alert("⚠️ เบราว์เซอร์บล็อกการเชื่อมต่อ (CORS) — ควรรันผ่าน server/host เช่น Netlify, Vercel หรือ localhost แทนการเปิดไฟล์ตรงๆ");
    } else {
      alert("⚠️ เกิดข้อผิดพลาดระหว่างการเชื่อมต่อ: " + e.message);
    }
  }
}

// ---- Events ----
function wireEvents(){
  document.querySelectorAll('input[name="animal"]').forEach(cb=>cb.addEventListener('change',buildTable));
  document.querySelectorAll('input[name="ptype"]').forEach(r=>r.addEventListener('change',buildTable));
  $("#shipMethod").addEventListener('change',recalc);
  $("#shipCost").addEventListener('input',recalc);
  $("#msgPrefix").addEventListener('input',recalc);
  $("#msgSuffix").addEventListener('input',recalc);
  $("#promoType").addEventListener('change',recalc);
  $("#promoValue").addEventListener('input',recalc);
  $("#copyBtn").addEventListener('click',async()=>{
    await navigator.clipboard.writeText($("#messageBox").textContent);
    $("#copyHint").textContent="คัดลอกแล้ว ✓";
    setTimeout(()=>$("#copyHint").textContent="—",1500);
  });
  $("#showReceiptBtn").addEventListener('click',openReceipt);
  $("#billClose").addEventListener('click',closeReceipt);
  $("#billDone").addEventListener('click',closeReceipt);
  $("#billCopy").addEventListener('click',copyReceipt);
  document.querySelector('#billModal .modal-backdrop').addEventListener('click',closeReceipt);

  // ส่งข้อความเข้า LINE OA
  const sendBtn = document.getElementById('sendLineBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const msg = document.getElementById('messageBox')?.textContent?.trim();
      if (!msg) { alert('ยังไม่มีข้อความสำหรับส่ง!'); return; }
      const userId = prompt('กรอก userId ของลูกค้า (รูปแบบ: Uxxxxxxxxxxxxxxxxxxxxxxxxxxxx)');
      if (!userId) return;
      await sendToLine(userId, msg);
    });
  }
}

// ---- Init after DOM ready ----
document.addEventListener('DOMContentLoaded', () => {
  buildTable();
  wireEvents();
});