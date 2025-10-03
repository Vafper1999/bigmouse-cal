// ---- Data ----
const DATA = {
  mice: [
    ["3XS",  8.00,  7.00],
    ["2XS", 11.00, 10.00],
    ["XS",  13.00, 11.00],
    ["S",   18.00, 15.00],
    ["M",   23.00, 21.00],
    ["L",   28.00, 26.00],
    ["XL",  34.00, 31.00],
    ["2XL", 38.00, 35.00],
    ["3XL", 42.00, 40.00],
  ],
  rat: [
    ["S",   35.00, 33.00],
    ["M1",  40.00, 38.00],
    ["M2",  45.00, 43.00],
    ["M3",  50.00, 48.00],
    ["L1",  55.00, 53.00],
    ["L2",  60.00, 58.00],
    ["XL",  65.00, 63.00],
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
let qtyInputs = [];

function getDiscount(sub){
  const typeEl = document.querySelector('#promoType');
  const valEl  = document.querySelector('#promoValue');
  const type = typeEl ? typeEl.value : 'none';
  const raw  = valEl ? parseFloat(valEl.value || '0') : 0;
  let d = 0;
  if (type === 'baht') d = Math.max(0, Math.min(raw || 0, sub));
  else if (type === 'percent') d = Math.max(0, Math.min(100, raw || 0)) * sub / 100;
  return d;
}

function persist(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }
function readPersist(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch{ return fallback; }}

// ---- Build table by selection ----
function buildTable(){
  const animal = $("#animal").value;
  const ptype = document.querySelector('input[name="ptype"]:checked').value; // retail|wholesale
  const priceIdx = ptype === "retail" ? 1 : 2;
  qtyInputs = [];

  const savedQty = readPersist(`qty_${animal}_${ptype}`, {});

  const rows = DATA[animal].map(([size, retail, whole]) => {
    const unit = priceIdx===1 ? retail : whole;
    const q = savedQty[size] ?? 0;
    return `
      <tr>
        <th scope="row" style="width:110px">${size}</th>
        <td class="muted" style="width:120px">${fmt(unit)}</td>
        <td style="width:150px">
          <input type="number" min="0" step="1" inputmode="numeric"
                 data-size="${size}" data-unit="${unit}"
                 class="qty" value="${q}" style="width:110px">
        </td>
        <td class="line" data-size="${size}">0</td>
      </tr>
    `;
  }).join("");

  $("#tableWrap").innerHTML = `
    <table role="table" aria-label="ตารางจำนวนและราคารวม">
      <thead>
        <tr>
          <th>ไซส์</th>
          <th>ราคาต่อชิ้น</th>
          <th>จำนวน (ตัว)</th>
          <th>รวม (บาท)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  qtyInputs = Array.from(document.querySelectorAll(".qty"));
  qtyInputs.forEach(i=> i.addEventListener("input", ()=>{
    recalc();
    // save per size while typing
    const cache = Object.fromEntries(qtyInputs.map(x=>[x.dataset.size, parseInt(x.value||"0",10)]));
    persist(`qty_${animal}_${ptype}`, cache);
  }));

  recalc();
}

// ---- Recalc totals ----
function recalc(){
  // Shipping auto 0 when pickup
  const method = $("#shipMethod").value;
  const shipCostEl = $("#shipCost");
  if (method === "รับเอง"){ shipCostEl.value = 0; shipCostEl.disabled = true; }
  else { shipCostEl.disabled = false; }

  let sub = 0;
  qtyInputs.forEach(inp=>{
    const qty = Math.max(0, parseInt(inp.value||"0",10));
    const unit = parseFloat(inp.dataset.unit);
    const line = qty * unit;
    sub += line;
    document.querySelector(`.line[data-size="${inp.dataset.size}"]`).textContent = fmt(line);
  });

  const discount = getDiscount(sub);
  const ship = Math.max(0, parseFloat($("#shipCost").value||"0"));
  const grand = Math.max(0, sub - discount + ship);
  $("#subTotal").textContent = fmt(sub);
  const promoTotalEl = document.querySelector('#promoTotal');
  if (promoTotalEl) promoTotalEl.textContent = fmt(discount);
  $("#shipTotal").textContent = fmt(ship);
  $("#grandTotal").textContent = fmt(grand);

  buildMessage(sub, ship, discount);
}

// ---- Build message text ----
function buildMessage(sub, ship, discount){
  const prefix = $("#msgPrefix").value.trim();
  const suffixTpl = $("#msgSuffix").value.trim(); // has {TOTAL}
  const shipMethod = $("#shipMethod").value;
  const isPickup = shipMethod === "รับเอง";

  const ptype = document.querySelector('input[name="ptype"]:checked').value;
  const pLabel = ptype === "retail" ? "ปลีก" : "ส่ง";
  const animal = $("#animal").value === "mice" ? "Mice" : "Rat";
  const header = `${prefix} (${pLabel}) ${animal}`;

  const bodyLines = qtyInputs
    .map(inp=>{
      const qty = parseInt(inp.value||"0",10);
      if(!qty) return "";
      const size = inp.dataset.size;
      const unit = parseFloat(inp.dataset.unit);
      const line = qty * unit;
      return `${size} ${qty} ตัว ราคา ${fmt(line)} บาท`;
    })
    .filter(Boolean);

  if (discount > 0){
    bodyLines.push(`ส่วนลด ${fmt(discount)} บาท`);
  }
  if (ship > 0 && !isPickup){
    bodyLines.push(`ขนส่ง ${shipMethod} ${fmt(ship)} บาท`);
  }

  const totalText = suffixTpl.replace("{TOTAL}", fmt(sub - discount + ship));
  const message = `${header}\n${bodyLines.join("\n")}\n\n${totalText}`.trim();
  $("#messageBox").textContent = message;

  // persist user prefs
  persist("prefs", {
    animal: $("#animal").value, ptype,
    shipMethod, shipCost: $("#shipCost").value,
    msgPrefix: $("#msgPrefix").value, msgSuffix: $("#msgSuffix").value,
    promoType: document.querySelector('#promoType')?.value || 'none',
    promoValue: document.querySelector('#promoValue')?.value || '0'
  });
}

// ---- Init ----
function wireEvents(){
  $("#animal").addEventListener("change", buildTable);
  document.querySelectorAll('input[name="ptype"]').forEach(r=> r.addEventListener("change", buildTable));
  $("#shipMethod").addEventListener("change", recalc);
  $("#shipCost").addEventListener("input", recalc);
  $("#msgPrefix").addEventListener("input", recalc);
  $("#msgSuffix").addEventListener("input", recalc);
  const promoTypeEl = document.querySelector('#promoType');
  const promoValEl  = document.querySelector('#promoValue');
  if (promoTypeEl) promoTypeEl.addEventListener('change', recalc);
  if (promoValEl)  promoValEl.addEventListener('input', recalc);

  $("#copyBtn").addEventListener("click", async ()=>{
    const msg = $("#messageBox").textContent;
    try{
      await navigator.clipboard.writeText(msg);
      $("#copyHint").textContent = "คัดลอกแล้ว ✓";
      $("#copyHint").classList.add("ok");
      setTimeout(()=>{ $("#copyHint").textContent="—"; $("#copyHint").classList.remove("ok"); }, 1600);
    }catch{
      $("#copyHint").textContent = "กด Ctrl/Cmd + C เพื่อคัดลอก";
    }
  });
}

function restorePrefs(){
  const p = readPersist("prefs", null);
  if(!p) return;
  $("#animal").value = p.animal ?? "mice";
  const target = p.ptype === "wholesale" ? "#wholesale" : "#retail";
  document.querySelector(target).checked = true;
  $("#shipMethod").value = p.shipMethod ?? "Grab";
  $("#shipCost").value = p.shipCost ?? 0;
  $("#msgPrefix").value = p.msgPrefix ?? "ขออนุญาตแจ้งราคานะครับ";
  $("#msgSuffix").value = p.msgSuffix ?? "รวม {TOTAL} บาท ครับผม";
  if (document.querySelector('#promoType')){
    document.querySelector('#promoType').value = p.promoType ?? 'none';
  }
  if (document.querySelector('#promoValue')){
    document.querySelector('#promoValue').value = p.promoValue ?? '0';
  }
}

// Boot
restorePrefs();
wireEvents();
buildTable();