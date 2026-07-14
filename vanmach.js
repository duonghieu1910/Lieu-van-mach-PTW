/* =========================================================================
   PART 1: VASOACTIVE / INFUSION CALCULATOR (ml/h <-> mcg/kg/min etc.)
   ========================================================================= */
const DRUGS = [
  { id:'noradrenalin', name:'Noradrenalin (Norepinephrine)', ampUnit:'mg', ampDefault:4, standard:'mcgKgMin',
    ref:'Tham khảo: 0,01 – 3 mcg/kg/phút (liều cao hơn tùy đáp ứng lâm sàng).', weightRequired:true },
  { id:'adrenalin', name:'Adrenalin (Epinephrine)', ampUnit:'mg', ampDefault:1, standard:'mcgKgMin',
    ref:'Tham khảo: 0,01 – 1 mcg/kg/phút.', weightRequired:true },
  { id:'dopamin', name:'Dopamin', ampUnit:'mg', ampDefault:200, standard:'mcgKgMin',
    ref:'Tham khảo: 2 – 20 mcg/kg/phút.', weightRequired:true },
  { id:'dobutamin', name:'Dobutamin', ampUnit:'mg', ampDefault:250, standard:'mcgKgMin',
    ref:'Tham khảo: 2 – 20 mcg/kg/phút.', weightRequired:true },
  { id:'vasopressin', name:'Vasopressin', ampUnit:'UI', ampDefault:20, standard:'UIHour',
    ref:'Thường dùng liều cố định, không chỉnh theo cân nặng. Tham khảo: 0,01 – 0,04 UI/phút (≈ 0,6 – 2,4 UI/giờ).', weightRequired:false },
  { id:'nitroglycerin', name:'Nitroglycerin (Nitromint/Lenitral)', ampUnit:'mg', ampDefault:25, standard:'mcgMin',
    ref:'Thường không tính theo cân nặng. Tham khảo: 5 – 200 mcg/phút.', weightRequired:false },
  { id:'nicardipin', name:'Nicardipin (Loxen)', ampUnit:'mg', ampDefault:10, standard:'mgHour',
    ref:'Thường không tính theo cân nặng. Tham khảo: 5 – 15 mg/giờ.', weightRequired:false },
  { id:'milrinone', name:'Milrinone', ampUnit:'mg', ampDefault:10, standard:'mcgKgMin',
    ref:'Tham khảo duy trì: 0,25 – 0,75 mcg/kg/phút (chưa gồm liều nạp).', weightRequired:true },
  { id:'amiodarone', name:'Amiodarone (Cordarone) – duy trì', ampUnit:'mg', ampDefault:150, standard:'mgHour',
    ref:'Tham khảo duy trì: 30 – 60 mg/giờ ban đầu, giảm dần theo phác đồ (chưa gồm liều nạp).', weightRequired:false },
  { id:'esmolol', name:'Esmolol', ampUnit:'mg', ampDefault:100, standard:'mcgKgMin',
    ref:'Tham khảo duy trì: 25 – 300 mcg/kg/phút (chưa gồm liều nạp).', weightRequired:true },
  { id:'diltiazem', name:'Diltiazem', ampUnit:'mg', ampDefault:25, standard:'mgHour',
    ref:'Tham khảo duy trì: 5 – 15 mg/giờ (chưa gồm liều nạp).', weightRequired:false },
  { id:'fentanyl', name:'Fentanyl (giảm đau/an thần liên tục)', ampUnit:'mg', ampDefault:0.5, standard:'mcgKgHour',
    ref:'Tham khảo: 0,5 – 2 mcg/kg/giờ. Ống thường ghi 500 mcg/10ml = 0,5 mg.', weightRequired:true },
  { id:'midazolam', name:'Midazolam (an thần liên tục)', ampUnit:'mg', ampDefault:15, standard:'mcgKgMin',
    ref:'Tham khảo: khoảng 0,3 – 1,7 mcg/kg/phút (≈ 0,02 – 0,1 mg/kg/giờ), chỉnh theo mục tiêu an thần.', weightRequired:true },
  { id:'propofol', name:'Propofol (an thần)', ampUnit:'mg', ampDefault:200, standard:'mgKgHour',
    ref:'Tham khảo: 0,3 – 4 mg/kg/giờ tùy mục tiêu an thần.', weightRequired:true },
  { id:'insulin', name:'Insulin nhanh (Actrapid) truyền TM', ampUnit:'UI', ampDefault:50, standard:'UIHour',
    ref:'Không tính theo cân nặng. Thường bắt đầu 1 – 6 UI/giờ, chỉnh theo đường huyết theo phác đồ.', weightRequired:false },
  { id:'custom', name:'— Tùy chỉnh / thuốc khác —', ampUnit:'mg', ampDefault:1, standard:'mcgKgMin',
    ref:'Nhập thông số theo hướng dẫn/phác đồ của đơn vị.', weightRequired:false, isCustom:true },
];

const UNIT_LABELS = {
  mcgKgMin:'mcg/kg/phút', mcgKgHour:'mcg/kg/giờ',
  mcgMin:'mcg/phút', mcgHour:'mcg/giờ',
  mgMin:'mg/phút', mgHour:'mg/giờ',
  mgKgMin:'mg/kg/phút', mgKgHour:'mg/kg/giờ',
  UIMin:'UI/phút', UIHour:'UI/giờ'
};

const MASS_KEYS_NO_WEIGHT = ['mcgMin','mcgHour','mgMin','mgHour'];
const MASS_KEYS_WEIGHT   = ['mcgKgMin','mcgKgHour','mgKgMin','mgKgHour'];
const UI_KEYS            = ['UIMin','UIHour'];

const drugSelect = document.getElementById('drugSelect');
const customUnitField = document.getElementById('customUnitField');
const customUnit = document.getElementById('customUnit');
const ampAmount = document.getElementById('ampAmount');
const ampUnitLabel = document.getElementById('ampUnitLabel');
const ampCount = document.getElementById('ampCount');
const dilVolume = document.getElementById('dilVolume');
const weightField = document.getElementById('weightField');
const weightInput = document.getElementById('weight');
const weightWarn = document.getElementById('weightWarn');
const rateField = document.getElementById('rateField');
const rateInput = document.getElementById('rate');
const desiredField = document.getElementById('desiredField');
const desiredValue = document.getElementById('desiredValue');
const desiredUnit = document.getElementById('desiredUnit');

const stripDrug = document.getElementById('stripDrug');
const stripConc = document.getElementById('stripConc');
const stripConcUnit = document.getElementById('stripConcUnit');
const stripRate = document.getElementById('stripRate');
const stripDose = document.getElementById('stripDose');
const stripDoseUnit = document.getElementById('stripDoseUnit');
const stripTime = document.getElementById('stripTime');

const headlineTag = document.getElementById('headlineTag');
const headlineValue = document.getElementById('headlineValue');
const headlineUnit = document.getElementById('headlineUnit');
const headlineRef = document.getElementById('headlineRef');
const convTable = document.getElementById('convTable');

const resultsPanelForward = document.getElementById('resultsPanelForward');
const resultsPanelReverse = document.getElementById('resultsPanelReverse');
const reverseRate = document.getElementById('reverseRate');
const reverseNote = document.getElementById('reverseNote');

const modeForwardBtn = document.getElementById('modeForward');
const modeReverseBtn = document.getElementById('modeReverse');

let mode = 'forward';

DRUGS.forEach(d=>{
  const opt = document.createElement('option');
  opt.value = d.id; opt.textContent = d.name;
  drugSelect.appendChild(opt);
});

function currentDrug(){ return DRUGS.find(d=>d.id===drugSelect.value); }
function currentAmpUnit(){
  const d = currentDrug();
  return d.isCustom ? customUnit.value : d.ampUnit;
}
function applicableKeys(){
  const unit = currentAmpUnit();
  if(unit==='UI') return UI_KEYS;
  const hasWeight = parseFloat(weightInput.value) > 0;
  return hasWeight ? MASS_KEYS_NO_WEIGHT.concat(MASS_KEYS_WEIGHT) : MASS_KEYS_NO_WEIGHT;
}

function onDrugChange(){
  const d = currentDrug();
  customUnitField.style.display = d.isCustom ? 'block' : 'none';
  ampAmount.value = d.ampDefault;
  const unit = currentAmpUnit();
  ampUnitLabel.textContent = unit;
  weightWarn.classList.toggle('show', d.weightRequired && !(parseFloat(weightInput.value)>0));
  populateDesiredUnitOptions();
  compute();
}

function populateDesiredUnitOptions(){
  const keys = applicableKeysForCustomAware();
  desiredUnit.innerHTML = '';
  keys.forEach(k=>{
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = UNIT_LABELS[k];
    desiredUnit.appendChild(opt);
  });
  const d = currentDrug();
  if(keys.includes(d.standard)) desiredUnit.value = d.standard;
}
function applicableKeysForCustomAware(){
  const unit = currentAmpUnit();
  if(unit==='UI') return UI_KEYS;
  return MASS_KEYS_NO_WEIGHT.concat(MASS_KEYS_WEIGHT);
}

drugSelect.addEventListener('change', onDrugChange);
customUnit.addEventListener('change', onDrugChange);
[ampAmount, ampCount, dilVolume, weightInput, rateInput, desiredValue, desiredUnit].forEach(el=>{
  el.addEventListener('input', ()=>{
    weightWarn.classList.toggle('show', currentDrug().weightRequired && !(parseFloat(weightInput.value)>0));
    compute();
  });
});

modeForwardBtn.addEventListener('click', ()=>setMode('forward'));
modeReverseBtn.addEventListener('click', ()=>setMode('reverse'));

function setMode(m){
  mode = m;
  modeForwardBtn.classList.toggle('active', m==='forward');
  modeReverseBtn.classList.toggle('active', m==='reverse');
  rateField.style.display = m==='forward' ? 'block' : 'none';
  desiredField.style.display = m==='reverse' ? 'block' : 'none';
  resultsPanelForward.style.display = m==='forward' ? 'block' : 'none';
  resultsPanelReverse.style.display = m==='reverse' ? 'block' : 'none';
  if(m==='reverse') populateDesiredUnitOptions();
  compute();
}

function getConcentration(){
  const amount = parseFloat(ampAmount.value) || 0;
  const count = parseFloat(ampCount.value) || 0;
  const vol = parseFloat(dilVolume.value) || 0;
  const unit = currentAmpUnit();
  let totalBase;
  if(unit==='UI'){ totalBase = amount*count; }
  else { totalBase = amount*count*1000; }
  const conc = vol>0 ? totalBase/vol : 0;
  return { conc, baseUnit: unit==='UI' ? 'UI' : 'mcg' };
}

function basePerHourToKey(basePerHour, key, weight){
  switch(key){
    case 'mcgHour': return basePerHour;
    case 'mcgMin': return basePerHour/60;
    case 'mgHour': return basePerHour/1000;
    case 'mgMin': return basePerHour/1000/60;
    case 'mcgKgHour': return weight>0 ? basePerHour/weight : NaN;
    case 'mcgKgMin': return weight>0 ? basePerHour/weight/60 : NaN;
    case 'mgKgHour': return weight>0 ? basePerHour/1000/weight : NaN;
    case 'mgKgMin': return weight>0 ? basePerHour/1000/weight/60 : NaN;
    case 'UIHour': return basePerHour;
    case 'UIMin': return basePerHour/60;
  }
  return NaN;
}
function keyToBasePerHour(key, value, weight){
  switch(key){
    case 'mcgHour': return value;
    case 'mcgMin': return value*60;
    case 'mgHour': return value*1000;
    case 'mgMin': return value*1000*60;
    case 'mcgKgHour': return value*weight;
    case 'mcgKgMin': return value*weight*60;
    case 'mgKgHour': return value*1000*weight;
    case 'mgKgMin': return value*1000*weight*60;
    case 'UIHour': return value;
    case 'UIMin': return value*60;
  }
  return NaN;
}

function fmt(n, maxDp=4){
  if(!isFinite(n)) return '–';
  if(n===0) return '0';
  const abs = Math.abs(n);
  let dp = maxDp;
  if(abs>=100) dp=1; else if(abs>=10) dp=2; else if(abs>=1) dp=3;
  let s = n.toFixed(dp);
  if(s.includes('.')) s = s.replace(/0+$/,'').replace(/\.$/,'');
  return s || '0';
}

function compute(){
  const d = currentDrug();
  const { conc, baseUnit } = getConcentration();
  const weight = parseFloat(weightInput.value) || 0;
  const now = new Date();
  stripTime.textContent = now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  stripDrug.textContent = d.name;
  stripConc.childNodes[0].nodeValue = conc>0 ? fmt(conc,3) : '–';
  stripConcUnit.textContent = ' ' + baseUnit + '/ml';

  if(mode==='forward'){
    const rate = parseFloat(rateInput.value) || 0;
    stripRate.childNodes[0].nodeValue = rate>0 ? fmt(rate,2) : '–';
    const basePerHour = conc*rate;
    const keys = applicableKeys();

    const stdVal = basePerHourToKey(basePerHour, d.standard, weight);
    headlineTag.textContent = 'Liều chuẩn · ' + d.name;
    headlineValue.childNodes[0].nodeValue = isFinite(stdVal) ? fmt(stdVal) + ' ' : '– ';
    headlineUnit.textContent = UNIT_LABELS[d.standard];
    headlineRef.textContent = d.ref;

    stripDose.childNodes[0].nodeValue = isFinite(stdVal) ? fmt(stdVal) : '–';
    stripDoseUnit.textContent = ' ' + UNIT_LABELS[d.standard];

    convTable.innerHTML = '';
    keys.forEach(k=>{
      const v = basePerHourToKey(basePerHour, k, weight);
      const tr = document.createElement('tr');
      if(k===d.standard) tr.classList.add('highlight');
      tr.innerHTML = `<td class="k">${UNIT_LABELS[k]}</td><td class="v">${isFinite(v)?fmt(v):'–'}</td>`;
      convTable.appendChild(tr);
    });
  } else {
    stripRate.childNodes[0].nodeValue = '–';
    const key = desiredUnit.value;
    const val = parseFloat(desiredValue.value) || 0;
    const needsWeight = key.includes('Kg');
    let rate = NaN;
    if(conc>0 && val>0 && (!needsWeight || weight>0)){
      const basePerHour = keyToBasePerHour(key, val, weight);
      rate = basePerHour/conc;
    }
    reverseRate.textContent = isFinite(rate) && rate>0 ? fmt(rate,2) : '–';
    stripRate.childNodes[0].nodeValue = isFinite(rate) && rate>0 ? fmt(rate,2) : '–';
    stripDose.childNodes[0].nodeValue = val>0 ? fmt(val) : '–';
    stripDoseUnit.textContent = ' ' + UNIT_LABELS[key];

    if(needsWeight && !(weight>0)){
      reverseNote.textContent = 'Nhập cân nặng bệnh nhân để tính tốc độ theo đơn vị/kg.';
    } else if(conc<=0){
      reverseNote.textContent = 'Kiểm tra lại hàm lượng, số ống và thể tích pha.';
    } else {
      reverseNote.textContent = `Ứng với nồng độ hiện tại (${fmt(conc,3)} ${baseUnit}/ml), cần cài tốc độ trên để đạt liều ${fmt(val)} ${UNIT_LABELS[key]}.`;
    }
  }
}

onDrugChange();
setMode('forward');
