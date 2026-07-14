/* =========================================================================
   PART 2: TB DRUGS (first-line FDC weight-band + per-drug mg/kg calculator)
   Reference: WHO "Treatment of Tuberculosis: Guidelines"; WHO Consolidated
   Guidelines on Drug-Resistant TB Treatment (2019), Annex 2 weight-band
   dosing table. Reference ranges only — always cross-check local NTP/hospital
   protocol.
   ========================================================================= */

const TB_FDC_BANDS = [
  { label:'30 – 37 kg', min:30, max:37.999, tabs:2 },
  { label:'38 – 54 kg', min:38, max:54.999, tabs:3 },
  { label:'55 – 70 kg', min:55, max:70.999, tabs:4 },
  { label:'> 70 kg',    min:71, max:99999,  tabs:5 },
];
// Standard mg/kg used only for the "viên rời" (loose tablet) reference figures
// shown alongside the FDC table — computed from the patient's actual weight,
// not from the band table.
const TB_LOOSE_REF = {
  emb: { name:'Ethambutol (E) rời', mgKg:15, strengthMg:400 },
  pza: { name:'Pyrazinamide (Z) rời', mgKg:25, strengthMg:500 },
};

// form: 'tablet' | 'injection'
// doseMode: 'perKg' | 'fixed'
const TB_DRUGS = [
  // ---- Hàng 1 (dùng rời, không phải FDC) ----
  { id:'inh', group:'Hàng 1', name:'Isoniazid (H)', form:'tablet', doseMode:'perKg',
    doseMgKg:5, rangeText:'4 – 6 mg/kg/ngày', strengthMg:300, maxMgDay:300,
    note:'Liều tối đa khuyến cáo 300 mg/ngày dù cân nặng lớn. Viên phổ biến 300mg hoặc 100mg — chỉnh hàm lượng nếu dùng loại khác.' },
  { id:'rif', group:'Hàng 1', name:'Rifampicin (R)', form:'tablet', doseMode:'perKg',
    doseMgKg:10, rangeText:'8 – 12 mg/kg/ngày', strengthMg:300, maxMgDay:600,
    note:'Tối đa 600 mg/ngày. Viên/nang phổ biến 300mg hoặc 150mg.' },
  { id:'pza', group:'Hàng 1', name:'Pyrazinamide (Z)', form:'tablet', doseMode:'perKg',
    doseMgKg:25, rangeText:'20 – 30 mg/kg/ngày', strengthMg:500, maxMgDay:2000,
    note:'Người > 70kg có thể dùng đến khoảng 2000 mg/ngày theo bảng cân nặng WHO.' },
  { id:'emb', group:'Hàng 1', name:'Ethambutol (E)', form:'tablet', doseMode:'perKg',
    doseMgKg:15, rangeText:'15 – 20 mg/kg/ngày (có thể tới 25 mg/kg trong phác đồ lao kháng thuốc)', strengthMg:400, maxMgDay:1600,
    note:'Tối đa khoảng 1600 mg/ngày. Theo dõi thị lực và phân biệt màu định kỳ.' },
  { id:'sm', group:'Hàng 1', name:'Streptomycin (S) — tiêm bắp', form:'injection', doseMode:'perKg',
    doseMgKg:15, rangeText:'12 – 18 mg/kg/ngày', vialMg:1000, vialMl:3.5, maxMgDay:1000,
    note:'Tối đa 1g/ngày; cân nhắc giảm còn 750mg/ngày nếu bệnh nhân > 59 tuổi. Thể tích lọ minh họa — pha theo quy trình thực tế của khoa Dược.' },

  // ---- Hàng 2 / Lao kháng thuốc (theo bảng băng cân nặng WHO 2019) ----
  { id:'lfx', group:'Hàng 2 (kháng thuốc)', name:'Levofloxacin', form:'tablet', doseMode:'fixed',
    doseFixedMg:750, strengthMg:250,
    note:'WHO không quy định chặt theo mg/kg. Theo băng cân nặng: 30–45kg ≈750mg; 46–70kg ≈1000mg; >70kg ≈1000mg (viên 250mg). Chỉnh "liều cố định" theo băng cân nặng phù hợp.' },
  { id:'mfx', group:'Hàng 2 (kháng thuốc)', name:'Moxifloxacin', form:'tablet', doseMode:'fixed',
    doseFixedMg:400, strengthMg:400,
    note:'Liều chuẩn 400mg/ngày (1 viên). Liều cao 600–800mg/ngày dùng trong một số phác đồ ngắn hạn chuẩn hoá — chỉnh "liều cố định" nếu áp dụng.' },
  { id:'bdq', group:'Hàng 2 (kháng thuốc)', name:'Bedaquiline', form:'tablet', doseMode:'fixed',
    doseFixedMg:400, strengthMg:100,
    note:'Tấn công: 400mg (4 viên)/ngày × 2 tuần đầu. Duy trì: 200mg (2 viên), 3 lần/tuần (T2-T4-T6) × 22 tuần. Đổi "liều cố định" sang 200 để xem giai đoạn duy trì.' },
  { id:'lzd', group:'Hàng 2 (kháng thuốc)', name:'Linezolid', form:'tablet', doseMode:'fixed',
    doseFixedMg:600, strengthMg:600, maxMgDay:1200,
    note:'Thường 600mg × 1 lần/ngày. Theo dõi độc tính huyết học, thần kinh ngoại biên và thị thần kinh khi dùng kéo dài.' },
  { id:'cfz', group:'Hàng 2 (kháng thuốc)', name:'Clofazimine', form:'tablet', doseMode:'fixed',
    doseFixedMg:100, strengthMg:100,
    note:'Không hiệu chỉnh theo cân nặng trong bảng WHO. Một số phác đồ dùng liều nạp cao hơn trong 2–4 tuần đầu tùy hướng dẫn.' },
  { id:'cs', group:'Hàng 2 (kháng thuốc)', name:'Cycloserine (hoặc Terizidone)', form:'tablet', doseMode:'perKg',
    doseMgKg:12.5, rangeText:'10 – 15 mg/kg/ngày', strengthMg:250, maxMgDay:1000,
    note:'Theo dõi tác dụng phụ thần kinh/tâm thần; có thể cần chia liều trong ngày.' },
  { id:'dlm', group:'Hàng 2 (kháng thuốc)', name:'Delamanid', form:'tablet', doseMode:'fixed',
    doseFixedMg:200, strengthMg:50,
    note:'Chia 2 lần/ngày, mỗi lần 100mg (2 viên 50mg).' },
  { id:'amk', group:'Hàng 2 (kháng thuốc)', name:'Amikacin — tiêm', form:'injection', doseMode:'perKg',
    doseMgKg:17.5, rangeText:'15 – 20 mg/kg/ngày', vialMg:500, vialMl:2, maxMgDay:1000,
    note:'Có thể dùng cách ngày/3 lần mỗi tuần trong phác đồ dài để giảm độc tính tai — thận.' },
  { id:'eto', group:'Hàng 2 (kháng thuốc)', name:'Ethionamide (hoặc Prothionamide)', form:'tablet', doseMode:'perKg',
    doseMgKg:17.5, rangeText:'15 – 20 mg/kg/ngày', strengthMg:250, maxMgDay:1000,
    note:'Thường khởi đầu chia liều trong ngày, gộp 1 lần/ngày khi dung nạp tốt.' },
  { id:'pas', group:'Hàng 2 (kháng thuốc)', name:'PAS (Para-aminosalicylic acid)', form:'tablet', doseMode:'fixed',
    doseFixedMg:10000, strengthMg:4000,
    note:'Tổng liều tham khảo 8 – 12 g/ngày, chia 2 – 3 lần. "Hàm lượng mỗi viên" ở đây tính theo gói 4g — điều chỉnh nếu chế phẩm khác.' },
];

const tbWeightInput = document.getElementById('tbWeight');
const tbModeFDCBtn = document.getElementById('tbModeFDC');
const tbModeSingleBtn = document.getElementById('tbModeSingle');
const tbPanelFDC = document.getElementById('tbPanelFDC');
const tbPanelSingle = document.getElementById('tbPanelSingle');
const tbFdcTableBody = document.querySelector('#tbFdcTable tbody');
const tbFdcRhze = document.getElementById('tbFdcRhze');
const tbFdcRhz = document.getElementById('tbFdcRhz');
const tbFdcRh = document.getElementById('tbFdcRh');
const tbFdcNote = document.getElementById('tbFdcNote');
const tbFdcLooseTable = document.getElementById('tbFdcLooseTable');

const tbDrugSelect = document.getElementById('tbDrugSelect');
const tbPerKgField = document.getElementById('tbPerKgField');
const tbDoseMgKg = document.getElementById('tbDoseMgKg');
const tbRangeHint = document.getElementById('tbRangeHint');
const tbFixedField = document.getElementById('tbFixedField');
const tbDoseFixed = document.getElementById('tbDoseFixed');
const tbFixedHint = document.getElementById('tbFixedHint');
const tbTabletField = document.getElementById('tbTabletField');
const tbStrength = document.getElementById('tbStrength');
const tbVialFields = document.getElementById('tbVialFields');
const tbVialMg = document.getElementById('tbVialMg');
const tbVialMl = document.getElementById('tbVialMl');
const tbWeightWarn = document.getElementById('tbWeightWarn');

const tbHeadlineTag = document.getElementById('tbHeadlineTag');
const tbTotalMg = document.getElementById('tbTotalMg');
const tbMgKgEquiv = document.getElementById('tbMgKgEquiv');
const tbResultTable = document.getElementById('tbResultTable');
const tbDrugNote = document.getElementById('tbDrugNote');

let tbMode = 'fdc';

// build FDC table rows once
TB_FDC_BANDS.forEach(b=>{
  const tr = document.createElement('tr');
  tr.dataset.min = b.min; tr.dataset.max = b.max;
  tr.innerHTML = `<td class="band">${b.label}</td><td>${b.tabs} viên/ngày</td><td>${b.tabs} viên/ngày</td><td>${b.tabs} viên/ngày</td>`;
  tbFdcTableBody.appendChild(tr);
});

// build drug select with optgroups
const tbGroups = {};
TB_DRUGS.forEach(d=>{
  if(!tbGroups[d.group]){
    tbGroups[d.group] = document.createElement('optgroup');
    tbGroups[d.group].label = d.group;
    tbDrugSelect.appendChild(tbGroups[d.group]);
  }
  const opt = document.createElement('option');
  opt.value = d.id; opt.textContent = d.name;
  tbGroups[d.group].appendChild(opt);
});

function tbCurrentDrug(){ return TB_DRUGS.find(d=>d.id===tbDrugSelect.value); }

function tbOnDrugChange(){
  const d = tbCurrentDrug();
  const isPerKg = d.doseMode === 'perKg';
  tbPerKgField.style.display = isPerKg ? 'block' : 'none';
  tbFixedField.style.display = isPerKg ? 'none' : 'block';
  if(isPerKg){
    tbDoseMgKg.value = d.doseMgKg;
    tbRangeHint.textContent = 'Tham khảo WHO: ' + d.rangeText + (d.maxMgDay ? ` · tối đa ~${d.maxMgDay} mg/ngày` : '');
  } else {
    tbDoseFixed.value = d.doseFixedMg;
    tbFixedHint.textContent = 'Không tính theo cân nặng theo bảng WHO — có thể chỉnh nếu phác đồ khác.';
  }
  const isInjection = d.form === 'injection';
  tbTabletField.style.display = isInjection ? 'none' : 'block';
  tbVialFields.style.display = isInjection ? 'block' : 'none';
  if(isInjection){
    tbVialMg.value = d.vialMg; tbVialMl.value = d.vialMl;
  } else {
    tbStrength.value = d.strengthMg;
  }
  tbDrugNote.textContent = d.note;
  tbCompute();
}

function tbRoundHalf(n){ return Math.round(n*2)/2; }

function tbFmt(n, dp=2){
  if(!isFinite(n)) return '–';
  if(n===0) return '0';
  const abs = Math.abs(n);
  let d = dp;
  if(abs>=100) d=0; else if(abs>=10) d=1;
  let s = n.toFixed(d);
  // only strip trailing zeros that come after a decimal point — never
  // touch zeros that are part of the integer value (e.g. "600" must stay "600")
  if(s.includes('.')) s = s.replace(/0+$/,'').replace(/\.$/,'');
  return s;
}

function tbComputeFDC(){
  const w = parseFloat(tbWeightInput.value) || 0;
  let band = null;
  [...tbFdcTableBody.children].forEach(tr=>{
    const min = parseFloat(tr.dataset.min), max = parseFloat(tr.dataset.max);
    const isCurrent = w>0 && w>=min && w<=max;
    tr.classList.toggle('current', isCurrent);
    if(isCurrent) band = TB_FDC_BANDS.find(b=>b.min==min);
  });
  if(band){
    tbFdcRhze.textContent = band.tabs;
    tbFdcRhz.textContent = band.tabs;
    tbFdcRh.textContent = band.tabs;
    tbFdcNote.textContent = `Cân nặng ${w}kg thuộc băng ${band.label} → ${band.tabs} viên/ngày cho cả RHZE, RHZ (nếu dùng thay RHZE) và RH (duy trì).`;
  } else {
    tbFdcRhze.textContent = '–';
    tbFdcRhz.textContent = '–';
    tbFdcRh.textContent = '–';
    tbFdcNote.textContent = w>0 && w<30
      ? 'Cân nặng dưới 30kg — không dùng bảng FDC người lớn này, cần tính theo phác đồ nhi khoa / thuốc rời theo mg/kg.'
      : 'Nhập cân nặng bệnh nhân ở trên để xem kết quả.';
  }

  // loose E / Z tablets — computed from actual weight × standard mg/kg,
  // independent of the fixed weight-band table above
  tbFdcLooseTable.innerHTML = '';
  Object.values(TB_LOOSE_REF).forEach(ref=>{
    const totalMg = w>0 ? ref.mgKg*w : NaN;
    const tabs = isFinite(totalMg) ? tbRoundHalf(totalMg/ref.strengthMg) : NaN;
    const tr = document.createElement('tr');
    const label = `${ref.name} (viên ${ref.strengthMg}mg, ${ref.mgKg}mg/kg)`;
    const val = isFinite(tabs) ? `${tbFmt(tabs,1)} viên/ngày (${tbFmt(totalMg,0)} mg)` : '–';
    tr.innerHTML = `<td class="k">${label}</td><td class="v">${val}</td>`;
    tbFdcLooseTable.appendChild(tr);
  });
}

function tbComputeSingle(){
  const d = tbCurrentDrug();
  const w = parseFloat(tbWeightInput.value) || 0;
  const isPerKg = d.doseMode === 'perKg';
  tbWeightWarn.classList.toggle('show', isPerKg && !(w>0));

  let totalMg = NaN;
  if(isPerKg){
    const doseMgKg = parseFloat(tbDoseMgKg.value) || 0;
    if(w>0) totalMg = doseMgKg * w;
  } else {
    totalMg = parseFloat(tbDoseFixed.value) || 0;
  }
  let cappedNote = '';
  if(isFinite(totalMg) && d.maxMgDay && totalMg > d.maxMgDay){
    cappedNote = ` (vượt mốc tối đa tham khảo ${d.maxMgDay} mg/ngày — cân nhắc giới hạn liều)`;
  }

  tbHeadlineTag.textContent = 'Tổng liều/ngày · ' + d.name;
  tbTotalMg.childNodes[0].nodeValue = isFinite(totalMg) && totalMg>0 ? tbFmt(totalMg) + ' ' : '– ';

  if(isPerKg && w>0 && isFinite(totalMg)){
    tbMgKgEquiv.textContent = `= ${tbFmt(totalMg/w,2)} mg/kg/ngày${cappedNote}`;
  } else if(!isPerKg && w>0 && isFinite(totalMg)){
    tbMgKgEquiv.textContent = `≈ ${tbFmt(totalMg/w,2)} mg/kg/ngày ở cân nặng hiện tại${cappedNote}`;
  } else {
    tbMgKgEquiv.textContent = cappedNote ? cappedNote.trim() : '';
  }

  tbResultTable.innerHTML = '';
  if(d.form === 'injection'){
    const vialMg = parseFloat(tbVialMg.value) || 0;
    const vialMl = parseFloat(tbVialMl.value) || 0;
    const concMgMl = vialMl>0 ? vialMg/vialMl : 0;
    const ml = (isFinite(totalMg) && concMgMl>0) ? totalMg/concMgMl : NaN;
    const vials = (isFinite(totalMg) && vialMg>0) ? totalMg/vialMg : NaN;
    [
      ['Nồng độ dung dịch', isFinite(concMgMl)&&concMgMl>0 ? tbFmt(concMgMl,2)+' mg/ml' : '–'],
      ['Thể tích cần dùng', isFinite(ml) ? tbFmt(ml,2)+' ml/ngày' : '–'],
      ['Số lọ cần (làm tròn lên)', isFinite(vials) ? Math.ceil(vials-1e-9)+' lọ' : '–'],
    ].forEach(([k,v])=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="k">${k}</td><td class="v">${v}</td>`;
      tbResultTable.appendChild(tr);
    });
  } else {
    const strength = parseFloat(tbStrength.value) || 0;
    const exact = (isFinite(totalMg) && strength>0) ? totalMg/strength : NaN;
    const rounded = isFinite(exact) ? tbRoundHalf(exact) : NaN;
    const strLabel = strength>0 ? ` — viên hàm lượng ${tbFmt(strength,0)}mg` : '';
    [
      [`Số viên chính xác${strLabel}`, isFinite(exact) ? tbFmt(exact,2)+' viên/ngày' : '–'],
      [`Số viên làm tròn (0,5 viên)${strLabel}`, isFinite(rounded) ? tbFmt(rounded,1)+' viên/ngày' : '–'],
    ].forEach(([k,v])=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="k">${k}</td><td class="v">${v}</td>`;
      tbResultTable.appendChild(tr);
    });
  }
}

function tbCompute(){
  tbComputeFDC();
  tbComputeSingle();
}

tbModeFDCBtn.addEventListener('click', ()=>{
  tbMode='fdc';
  tbModeFDCBtn.classList.add('active'); tbModeSingleBtn.classList.remove('active');
  tbPanelFDC.style.display='block'; tbPanelSingle.style.display='none';
  tbCompute();
});
tbModeSingleBtn.addEventListener('click', ()=>{
  tbMode='single';
  tbModeSingleBtn.classList.add('active'); tbModeFDCBtn.classList.remove('active');
  tbPanelSingle.style.display='block'; tbPanelFDC.style.display='none';
  tbCompute();
});

tbDrugSelect.addEventListener('change', tbOnDrugChange);
[tbWeightInput, tbDoseMgKg, tbDoseFixed, tbStrength, tbVialMg, tbVialMl].forEach(el=>{
  el.addEventListener('input', tbCompute);
});

tbOnDrugChange();
