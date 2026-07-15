/* =========================================================================
   TAB 3: GFR CALCULATOR + ANTIBIOTIC RENAL DOSING
   Data sources per drug are noted in each entry's `source` field — mainly
   FDA prescribing information (accessdata.fda.gov / DailyMed) and widely
   published critical-care renal dosing references. This is NOT sourced
   from Sanford Guide (proprietary, not accessible). Cross-check with
   hospital protocol / clinical pharmacist before applying, especially for
   drugs requiring level monitoring (vancomycin, aminoglycosides, colistin).
   ========================================================================= */

/* ---------------- GFR equations ---------------- */
function ksCockcroftGault(age, sex, weightKg, scrMgDl){
  if(!(age>0) || !(weightKg>0) || !(scrMgDl>0)) return NaN;
  let crcl = ((140-age)*weightKg)/(72*scrMgDl);
  if(sex==='F') crcl *= 0.85;
  return crcl;
}
function ksCkdEpi2021(age, sex, scrMgDl){
  if(!(age>0) || !(scrMgDl>0)) return NaN;
  const isF = sex==='F';
  const k = isF?0.7:0.9;
  const a = isF?-0.241:-0.302;
  const minTerm = Math.min(scrMgDl/k,1);
  const maxTerm = Math.max(scrMgDl/k,1);
  let egfr = 142*Math.pow(minTerm,a)*Math.pow(maxTerm,-1.200)*Math.pow(0.9938,age);
  if(isF) egfr *= 1.012;
  return egfr;
}
function ksIdealBodyWeight(heightCm, sex){
  if(!(heightCm>0)) return null;
  const heightIn = heightCm/2.54;
  const over5ft = heightIn-60;
  const base = sex==='F'?45.5:50;
  const ibw = base + 2.3*over5ft;
  return ibw>0 ? ibw : null;
}
function ksCkdStageLabel(egfr){
  if(!isFinite(egfr)) return '';
  if(egfr>=90) return 'G1 — bình thường/cao';
  if(egfr>=60) return 'G2 — giảm nhẹ';
  if(egfr>=45) return 'G3a — giảm nhẹ đến trung bình';
  if(egfr>=30) return 'G3b — giảm trung bình đến nặng';
  if(egfr>=15) return 'G4 — giảm nặng';
  return 'G5 — suy thận giai đoạn cuối';
}

/* ---------------- Colistin MIU calculator ----------------
   1 MIU (million international units) of colistimethate sodium (CMS)
   ≈ 30 mg colistin base activity (CBA) ≈ 80 mg CMS.
   (Some references use 33 mg CBA/MIU — minor variation between sources.)
   Loading dose: 4 mg/kg CBA, using the LOWER of ideal or actual body
   weight; may exceed 300 mg (no hard cap).
   Maintenance dose: looked up from the CrCl band table below (KS_DRUGS
   'colistin' entry), sourced from Sanford Guide 2022 Table 17A — no
   longer a continuous formula.
   ========================================================================= */
const KS_COLISTIN_MG_CBA_PER_MIU = 30;
const KS_COLISTIN_MG_CMS_PER_MIU = 80;

function ksColistinLoadingCBA(actualWeightKg, ibwKg){
  if(!(actualWeightKg>0)) return NaN;
  const w = (ibwKg && ibwKg>0) ? Math.min(actualWeightKg, ibwKg) : actualWeightKg;
  return 4*w;
}

/* ---------------- Antibiotic dataset ---------------- */
// bands: ordered high -> low; each has min (inclusive), max (exclusive, Infinity ok), label, dose
const KS_DRUGS = [
  {
    id:'vanco', group:'Glycopeptide', name:'Vancomycin',
    noTable:true,
    normalDose:'Liều nạp 25–30 mg/kg (cân nặng thực), sau đó duy trì 15–20 mg/kg mỗi 8–12 giờ nếu CrCl bình thường.',
    adjustedNote:'Sanford Guide (cũng như phần lớn y văn) KHÔNG đưa bảng liều cố định cho vancomycin — kéo dài khoảng cách liều khi CrCl giảm và BẮT BUỘC định lượng nồng độ đáy (mục tiêu 15–20 mg/L với nhiễm khuẩn nặng, hoặc theo AUC/MIC nếu đơn vị áp dụng) để chỉnh liều tiếp theo. Ước tính nhanh: tổng liều/ngày (mg) ≈ 15 × CrCl (ml/phút).',
    hd:'Không có liều cố định — định lượng nồng độ trước lọc máu để quyết định liều bổ sung sau lọc. Lưu ý: màng lọc HD thế hệ mới có thể làm tăng đáng kể độ thanh thải vancomycin so với màng cũ — cần định lượng lại nếu đổi loại màng lọc (Sanford Guide 2022).',
    crrt:'Liều nạp như bình thường, duy trì thường 15–20 mg/kg mỗi 24–48 giờ tùy tốc độ dịch thải — bắt buộc định lượng nồng độ.',
    pd:'Có thể dùng liều duy nhất 15–30 mg/kg mỗi 5–7 ngày kèm định lượng, hoặc theo phác đồ nội trú tại chỗ.',
    caution:'Nguy cơ độc thận tăng khi phối hợp piperacillin-tazobactam hoặc thuốc độc thận khác. Không được dùng liều cố định trong suy thận nặng/lọc máu nếu không có định lượng.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A (xác nhận không có bảng liều cố định) + tài liệu đồng thuận liều vancomycin 2020 (ASHP/IDSA/PIDS/SIDP).'
  },
  {
    id:'pip-taz', group:'Beta-lactam', name:'Piperacillin-Tazobactam (Tazocin/Zosyn)',
    normalDose:'Liều Pseudomonas/ICU điển hình: 4,5g mỗi 6 giờ.',
    bands:[
      {min:40, max:Infinity, label:'CrCl > 40', dose:'4,5g mỗi 6 giờ (không chỉnh liều)'},
      {min:20, max:40, label:'CrCl 20 – 40', dose:'3,375g mỗi 6 giờ'},
      {min:0, max:20, label:'CrCl < 20', dose:'2,25g mỗi 6 giờ'},
    ],
    hd:'2,25g mỗi 6 giờ + bổ sung 0,75g SAU mỗi buổi lọc máu.',
    crrt:'Nếu MIC ≤16: 3,375g truyền trong 30 phút mỗi 6 giờ. Nếu MIC 16–64: 4,5g truyền kéo dài 4 giờ mỗi 8 giờ.',
    pd:'2,25g mỗi 8 giờ.',
    caution:'Phối hợp với vancomycin làm tăng nguy cơ tổn thương thận cấp.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A (liều "Pseudomonas dose").'
  },
  {
    id:'mero', group:'Beta-lactam', name:'Meropenem',
    normalDose:'1g mỗi 8 giờ (liều ICU điển hình/Pseudomonas).',
    bands:[
      {min:50, max:Infinity, label:'CrCl > 50', dose:'1g mỗi 8 giờ (không chỉnh liều)'},
      {min:25, max:50, label:'CrCl 25 – 50', dose:'1g mỗi 12 giờ'},
      {min:10, max:25, label:'CrCl 10 – 25', dose:'500mg mỗi 12 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'500mg mỗi 24 giờ'},
    ],
    hd:'500mg mỗi 24 giờ — dùng liều SAU buổi lọc máu (dose ngày lọc máu).',
    crrt:'1g mỗi 12 giờ.',
    pd:'Chưa có dữ liệu chính thức trong Sanford Guide — hội chẩn Dược lâm sàng.',
    caution:'Không giảm liều đơn xuống dưới mức khuyến cáo vì có thể làm giảm hiệu quả diệt khuẩn.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'imipenem', group:'Beta-lactam', name:'Imipenem-Cilastatin',
    normalDose:'500mg mỗi 6 giờ HOẶC 1g mỗi 8 giờ; với vi khuẩn nhạy cảm trung gian: 1g mỗi 6 giờ.',
    bands:[
      {min:60, max:90, label:'CrCl 60 – <90', dose:'400–500mg mỗi 6 giờ (nhạy cảm trung gian: 750mg mỗi 8 giờ)'},
      {min:30, max:60, label:'CrCl 30 – <60', dose:'300mg mỗi 6 giờ HOẶC 500mg mỗi 8 giờ (nhạy cảm trung gian: 500mg mỗi 6 giờ)'},
      {min:15, max:30, label:'CrCl 15 – <30', dose:'200mg mỗi 6 giờ HOẶC 500mg mỗi 12 giờ (nhạy cảm trung gian: 500mg mỗi 12 giờ)'},
      {min:0, max:15, label:'CrCl < 15', dose:'Không có dữ liệu chính thức ở mức này — cân nhắc TRÁNH DÙNG do nguy cơ co giật, hội chẩn Dược lâm sàng nếu bắt buộc dùng'},
    ],
    hd:'200mg mỗi 6 giờ hoặc 500mg mỗi 12 giờ — dùng SAU buổi lọc máu (nhạy cảm trung gian: 500mg mỗi 12 giờ, cũng dùng sau lọc máu).',
    crrt:'0,5 – 1g mỗi 12 giờ.',
    pd:'125 – 250mg mỗi 12 giờ.',
    caution:'NGUY CƠ CO GIẬT tăng rõ rệt khi tích lũy thuốc trong suy thận không chỉnh liều đúng, đặc biệt ở liều cao/bệnh lý thần kinh trung ương nền — thận trọng hơn meropenem. Đây là lý do trước đây app chưa đưa thuốc này vào khi chưa có nguồn đủ tin cậy.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'cefepime', group:'Beta-lactam', name:'Cefepime',
    normalDose:'2g mỗi 8 giờ (nhiễm khuẩn nặng/ICU).',
    bands:[
      {min:60, max:Infinity, label:'CrCl > 60', dose:'2g mỗi 8–12 giờ (gần như không chỉnh liều)'},
      {min:30, max:60, label:'CrCl 30 – 60', dose:'2g mỗi 12 giờ'},
      {min:11, max:30, label:'CrCl 11 – 29', dose:'2g mỗi 24 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'1g mỗi 24 giờ'},
    ],
    hd:'1g mỗi 24 giờ + bổ sung thêm 1g SAU mỗi buổi lọc máu.',
    crrt:'2g mỗi 12–24 giờ.',
    pd:'1 – 2g mỗi 48 giờ.',
    caution:'Độc tính thần kinh (co giật, bệnh não, giảm ý thức) có thể xảy ra khi tích lũy thuốc trong suy thận không chỉnh liều đúng — đặc biệt cần lưu ý ở bệnh nhân cao tuổi/suy thận.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'ceftaz', group:'Beta-lactam', name:'Ceftazidime',
    normalDose:'2g mỗi 8 giờ (liều ICU điển hình/Pseudomonas).',
    bands:[
      {min:50, max:90, label:'CrCl > 50 – 90', dose:'2g mỗi 8–12 giờ'},
      {min:10, max:50, label:'CrCl 10 – 50', dose:'2g mỗi 12–24 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'2g mỗi 24–48 giờ'},
    ],
    hd:'2g mỗi 24–48 giờ + bổ sung thêm 1g SAU mỗi buổi lọc máu.',
    crrt:'1 – 2g mỗi 12–24 giờ (tùy tốc độ dịch thải).',
    pd:'Chưa có dữ liệu chính thức trong Sanford Guide — hội chẩn Dược lâm sàng.',
    caution:'',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'amp-sulb', group:'Beta-lactam', name:'Ampicillin-Sulbactam (Unasyn)',
    normalDose:'3g (2g ampicillin/1g sulbactam) mỗi 6 giờ.',
    bands:[
      {min:60, max:Infinity, label:'CrCl > 60', dose:'3g mỗi 6 giờ (không chỉnh liều)'},
      {min:30, max:60, label:'CrCl 30 – 60', dose:'3g mỗi 8 giờ'},
      {min:10, max:30, label:'CrCl 10 – <30', dose:'3g mỗi 12 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'3g mỗi 24 giờ'},
    ],
    hd:'3g mỗi 24 giờ — dùng SAU buổi lọc máu (dose ngày lọc máu).',
    crrt:'3g mỗi 12 giờ.',
    pd:'3g mỗi 24 giờ.',
    caution:'',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'aztreonam', group:'Beta-lactam', name:'Aztreonam',
    normalDose:'2g mỗi 8 giờ (nhiễm khuẩn nặng).',
    bands:[
      {min:50, max:90, label:'CrCl > 50 – 90', dose:'2g mỗi 8 giờ (không chỉnh liều)'},
      {min:10, max:50, label:'CrCl 10 – 50', dose:'1 – 1,5g mỗi 8 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'1 – 2g mỗi 24 giờ'},
    ],
    hd:'1 – 2g mỗi 24 giờ — dùng SAU buổi lọc máu (dose ngày lọc máu).',
    crrt:'1 – 1,5g mỗi 8 giờ.',
    pd:'500mg mỗi 8 giờ.',
    caution:'',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'cipro-iv', group:'Fluoroquinolone', name:'Ciprofloxacin (đường tĩnh mạch)',
    normalDose:'400mg mỗi 12 giờ.',
    bands:[
      {min:50, max:90, label:'CrCl > 50 – 90', dose:'400mg mỗi 12 giờ (không chỉnh liều)'},
      {min:10, max:50, label:'CrCl 10 – 50', dose:'400mg mỗi 24 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'400mg mỗi 24 giờ'},
    ],
    hd:'400mg mỗi 24 giờ — dùng SAU buổi lọc máu (dose ngày lọc máu).',
    crrt:'200 – 400mg mỗi 12 giờ.',
    pd:'400mg mỗi 24 giờ.',
    caution:'Nguy cơ tác dụng phụ thần kinh/gân cơ tăng khi dùng liều cao ở suy thận nặng.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'levo', group:'Fluoroquinolone', name:'Levofloxacin (phác đồ 750mg — nhiễm khuẩn nặng)',
    normalDose:'750mg mỗi 24 giờ.',
    bands:[
      {min:50, max:Infinity, label:'CrCl ≥ 50', dose:'750mg mỗi 24 giờ (không chỉnh liều)'},
      {min:20, max:50, label:'CrCl 20 – 49', dose:'750mg mỗi 48 giờ'},
      {min:0, max:20, label:'CrCl < 20', dose:'750mg × 1 liều, sau đó 500mg mỗi 48 giờ'},
    ],
    hd:'750mg × 1 liều, sau đó 500mg mỗi 48 giờ (giống phác đồ CrCl<20).',
    crrt:'750mg × 1 liều, sau đó 500mg mỗi 48 giờ.',
    pd:'750mg × 1 liều, sau đó 500mg mỗi 48 giờ.',
    caution:'Theo Sanford Guide, cả HD/CAPD/CRRT đều dùng chung phác đồ với CrCl<20 (750mg liều đầu, sau đó 500mg mỗi 48 giờ) — khác với một số nguồn khác từng ghi "không cần bổ sung liều sau lọc máu".',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'colistin', group:'Khác (đa kháng)', name:'Colistin (Colistimethate — tính theo MIU)',
    liveCalc:'colistin',
    normalDose:'Liều nạp = 4mg/kg CBA (colistin base activity), dùng cân nặng THẤP HƠN giữa cân nặng lý tưởng và cân nặng thực tế — liều nạp có thể vượt quá 300mg. Xem hộp "Liều tính theo MIU" bên dưới để có số cụ thể theo cân nặng đã nhập. Bắt đầu liều duy trì sau vài giờ (không dùng ngay sau liều nạp) — xác nhận thời điểm chính xác với Dược lâm sàng.',
    bands:[
      {min:90, max:Infinity, label:'CrCl > 90', dose:'180mg CBA mỗi 12 giờ (≈ 6,0 MIU/lần)'},
      {min:80, max:90, label:'CrCl 80 – <90', dose:'170mg CBA mỗi 12 giờ (≈ 5,7 MIU/lần)'},
      {min:70, max:80, label:'CrCl 70 – <80', dose:'150mg CBA mỗi 12 giờ (≈ 5,0 MIU/lần)'},
      {min:60, max:70, label:'CrCl 60 – <70', dose:'137,5mg CBA mỗi 12 giờ (≈ 4,6 MIU/lần)'},
      {min:50, max:60, label:'CrCl 50 – <60', dose:'122,5mg CBA mỗi 12 giờ (≈ 4,1 MIU/lần)'},
      {min:40, max:50, label:'CrCl 40 – <50', dose:'110mg CBA mỗi 12 giờ (≈ 3,7 MIU/lần)'},
      {min:30, max:40, label:'CrCl 30 – <40', dose:'97,5mg CBA mỗi 12 giờ (≈ 3,25 MIU/lần)'},
      {min:20, max:30, label:'CrCl 20 – <30', dose:'87,5mg CBA mỗi 12 giờ (≈ 2,9 MIU/lần)'},
      {min:10, max:20, label:'CrCl 10 – <20', dose:'80mg CBA mỗi 12 giờ (≈ 2,7 MIU/lần)'},
      {min:5, max:10, label:'CrCl 5 – <10', dose:'72,5mg CBA mỗi 12 giờ (≈ 2,4 MIU/lần)'},
      {min:0, max:5, label:'CrCl < 5 (không lọc máu)', dose:'65mg CBA mỗi 12 giờ (≈ 2,2 MIU/lần)'},
    ],
    hd:'Ngày KHÔNG lọc máu: 65mg CBA (≈ 2,2 MIU) mỗi 12 giờ. Ngày CÓ lọc máu: cộng thêm 40–50mg CBA (≈ 1,3–1,7 MIU) vào tổng liều ngày đó, dùng bổ sung này SAU buổi lọc (3–4 giờ), cùng lúc với liều thường kỳ kế tiếp sau khi kết thúc lọc máu.',
    crrt:'Cộng thêm 13mg CBA (≈ 0,43 MIU) cho mỗi giờ lọc CRRT (hoặc SLED) vào liều nền 65mg mỗi 12 giờ.',
    pd:'Chưa có dữ liệu chính thức trong Sanford Guide — hội chẩn Dược lâm sàng.',
    caution:'Cửa sổ điều trị hẹp — nguy cơ độc thận và độc thần kinh đáng kể. Quy đổi dùng trong app: 1 triệu đơn vị (MIU) ≈ 30mg CBA ≈ 80mg colistimethate natri (CMS). NHẦM LẪN giữa đơn vị MIU / mg CBA / mg CMS là nguyên nhân sai liều thường gặp trên lâm sàng — luôn ghi rõ đơn vị khi kê đơn và đối chiếu với nhãn lọ thuốc đang dùng tại đơn vị (số MIU/lọ có thể khác nhau giữa các hãng). Bảng liều duy trì lấy trực tiếp từ Sanford Guide 2022 (theo CrCl, không còn dùng công thức Garonzik liên tục như phiên bản trước của app).',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A (Polymyxins — Colistin).'
  },
  {
    id:'amikacin', group:'Aminoglycoside', name:'Amikacin (liều truyền thống chia nhiều lần/ngày — MDD)',
    normalDose:'7,5 mg/kg mỗi 12 giờ (IM/IV).',
    bands:[
      {min:50, max:90, label:'CrCl > 50 – 90', dose:'7,5mg/kg mỗi 12 giờ (không chỉnh liều)'},
      {min:10, max:50, label:'CrCl 10 – 50', dose:'7,5mg/kg mỗi 24 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'7,5mg/kg mỗi 48 giờ'},
    ],
    hd:'7,5mg/kg mỗi 48 giờ + bổ sung thêm 3,75mg/kg SAU mỗi buổi lọc máu.',
    crrt:'7,5mg/kg mỗi 24 giờ.',
    pd:'Viêm phúc mạc: 2mg/kg trong dịch lọc, 1 lần/ngày.',
    caution:'Bảng trên là liều truyền thống chia nhiều lần/ngày (MDD) theo Sanford Guide 2022. Nhiều ICU hiện dùng liều giãn cách một lần/ngày (extended-interval/ODD, kiểu Hartford nomogram — 15mg/kg mỗi 24 giờ nếu CrCl≥60, giãn dần theo CrCl) — Sanford trình bày nomogram ODD ở bảng riêng (Table 10C) không có trong phạm vi trích xuất này; nếu đơn vị dùng ODD, hội chẩn Dược lâm sàng để áp dụng đúng nomogram. BẮT BUỘC theo dõi nồng độ đỉnh/đáy khi dùng > 48–72 giờ hoặc có suy thận.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A (liều MDD truyền thống).'
  },
  {
    id:'gentamicin', group:'Aminoglycoside', name:'Gentamicin (liều truyền thống chia nhiều lần/ngày — MDD)',
    normalDose:'1,7 – 2,0 mg/kg mỗi 8 giờ (IM/IV).',
    bands:[
      {min:50, max:90, label:'CrCl > 50 – 90', dose:'1,7–2,0mg/kg mỗi 8 giờ (không chỉnh liều)'},
      {min:10, max:50, label:'CrCl 10 – 50', dose:'1,7–2,0mg/kg mỗi 12–24 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'1,7–2,0mg/kg mỗi 48 giờ'},
    ],
    hd:'1,7–2,0mg/kg mỗi 48 giờ + bổ sung thêm (khoảng 0,85–1,0mg/kg) SAU mỗi buổi lọc máu.',
    crrt:'1,7–2,0mg/kg mỗi 24 giờ.',
    pd:'Viêm phúc mạc: 0,6mg/kg trong dịch lọc, 1 lần/ngày.',
    caution:'Bảng trên là liều truyền thống chia nhiều lần/ngày (MDD) theo Sanford Guide 2022. Nhiều ICU hiện dùng liều giãn cách một lần/ngày (extended-interval/ODD kiểu Hartford nomogram — 5–7mg/kg mỗi 24 giờ nếu CrCl≥60, giãn dần theo CrCl) — Sanford trình bày nomogram ODD ở bảng riêng (Table 10C) không có trong phạm vi trích xuất này; nếu đơn vị dùng ODD, hội chẩn Dược lâm sàng để áp dụng đúng nomogram. BẮT BUỘC theo dõi nồng độ đỉnh/đáy khi dùng > 48–72 giờ hoặc có suy thận.',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A (liều MDD truyền thống).'
  },
  {
    id:'tmp-smx', group:'Khác', name:'Trimethoprim-Sulfamethoxazole (điều trị, tính theo TMP)',
    normalDose:'5 – 20 mg/kg/ngày (theo TMP), chia mỗi 6–12 giờ (liều điều trị nặng, vd. PCP).',
    bands:[
      {min:30, max:50, label:'CrCl 30 – 50', dose:'5–20mg/kg/ngày, chia mỗi 6–12 giờ (không chỉnh liều)'},
      {min:10, max:30, label:'CrCl 10 – 29', dose:'5–10mg/kg/ngày, chia mỗi 12 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'Sanford: KHÔNG khuyến cáo dùng; nếu bắt buộc dùng: 5–10mg/kg mỗi 24 giờ'},
    ],
    hd:'Sanford: KHÔNG khuyến cáo dùng; nếu bắt buộc dùng: 5–10mg/kg mỗi 24 giờ, dùng liều ngày lọc máu SAU buổi lọc.',
    crrt:'5mg/kg mỗi 8 giờ.',
    pd:'Sanford: KHÔNG khuyến cáo dùng; nếu bắt buộc dùng: 5–10mg/kg mỗi 24 giờ.',
    caution:'Theo dõi kali máu (tăng kali), creatinine giả tăng do ức chế bài tiết ống thận (không phản ánh giảm GFR thực sự).',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A (TMP/SMX — treatment).'
  },
  {
    id:'fluconazole', group:'Kháng nấm', name:'Fluconazole',
    normalDose:'100 – 400mg mỗi 24 giờ (uống/tĩnh mạch, tùy mức độ nhiễm nấm).',
    bands:[
      {min:50, max:90, label:'CrCl > 50 – 90', dose:'100–400mg mỗi 24 giờ (không chỉnh liều)'},
      {min:10, max:50, label:'CrCl 10 – 50', dose:'50–200mg mỗi 24 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'50–200mg mỗi 24 giờ'},
    ],
    hd:'Ngày KHÔNG lọc máu: 50–200mg mỗi 24 giờ. Ngày CÓ lọc máu: dùng liều đầy đủ 100–400mg SAU buổi lọc máu.',
    crrt:'200 – 400mg mỗi 24 giờ.',
    pd:'50 – 200mg mỗi 24 giờ.',
    caution:'',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17A.'
  },
  {
    id:'no-adjust', group:'Không cần chỉnh theo thận', name:'— Nhóm không cần chỉnh liều theo CrCl —',
    noTable:true, isGroup:true,
    normalDose:'Azithromycin, Doxycycline, Moxifloxacin, Ceftriaxone, Clindamycin, Linezolid, Metronidazole: dùng liều thông thường ở mọi mức CrCl (thải trừ chủ yếu qua gan/mật hoặc không tích lũy đáng kể ở suy thận).',
    adjustedNote:'Không cần chỉnh liều theo CrCl cho các thuốc này trong đa số trường hợp. Linezolid: Sanford ghi chú cân nhắc 300mg mỗi 12 giờ nếu eGFR<60 theo một số dữ liệu dược động học mới hơn (AAC 2019), dù liều chuẩn 600mg mỗi 12 giờ vẫn áp dụng ở hầu hết CrCl. Ceftriaxone cần thận trọng/giảm liều khi có SUY GAN kèm suy thận nặng. Metronidazole: cân nhắc giảm liều nếu suy thận rất nặng kèm bệnh não gan.',
    hd:'Không cần liều bổ sung cho hầu hết các thuốc trong nhóm này (Sanford: Linezolid dùng đủ liều, "cho 1 trong các liều ngày lọc máu SAU khi lọc xong"). Metronidazole bị loại bỏ một phần qua HD nhưng thường không cần bổ sung liều thường quy.',
    crrt:'Dùng liều bình thường.',
    pd:'Dùng liều bình thường.',
    caution:'Danh sách này chỉ mang tính tổng quát — vẫn cần xem xét từng trường hợp cụ thể (vd. bệnh não gan, tương tác thuốc).',
    source:'The Sanford Guide to Antimicrobial Therapy, 2022, Table 17B (No Dosage Adjustment) + Table 17A (Linezolid).'
  },
];

/* ---------------- DOM refs ---------------- */
const ksAge = document.getElementById('ksAge');
const ksSex = document.getElementById('ksSex');
const ksWeight = document.getElementById('ksWeight');
const ksHeight = document.getElementById('ksHeight');
const ksWeightMode = document.getElementById('ksWeightMode');
const ksWeightHint = document.getElementById('ksWeightHint');
const ksScr = document.getElementById('ksScr');
const ksScrUnit = document.getElementById('ksScrUnit');
const ksDialysis = document.getElementById('ksDialysis');

const ksCrClEl = document.getElementById('ksCrCl');
const ksWeightUsedNote = document.getElementById('ksWeightUsedNote');
const ksEgfrEl = document.getElementById('ksEgfr');
const ksCkdStage = document.getElementById('ksCkdStage');

const ksDrugSelect = document.getElementById('ksDrugSelect');
const ksCrClOverride = document.getElementById('ksCrClOverride');

const ksNormalTag = document.getElementById('ksNormalTag');
const ksNormalDose = document.getElementById('ksNormalDose');
const ksAdjustedBox = document.getElementById('ksAdjustedBox');
const ksAdjustedTag = document.getElementById('ksAdjustedTag');
const ksAdjustedDose = document.getElementById('ksAdjustedDose');

// Live colistin MIU calculator box — created here so no change to index.html
// is needed. Inserted right after the generic "liều theo CrCl" box; only
// shown when the selected drug declares liveCalc:'colistin'.
const ksColistinBox = document.createElement('div');
ksColistinBox.id = 'ksColistinLive';
ksColistinBox.className = 'headline-dose';
ksColistinBox.style.display = 'none';
ksColistinBox.style.borderColor = 'var(--amber)';
ksColistinBox.innerHTML = `
  <div class="tag">Liều Colistin tính theo MIU (dựa trên cân nặng &amp; CrCl đã nhập ở trên)</div>
  <div class="big" id="ksColistinLoading" style="font-size:1.1rem;">–</div>
  <div class="big" id="ksColistinMaint" style="font-size:1.1rem; margin-top:8px;">–</div>
  <div class="ref" id="ksColistinNote" style="margin-top:8px;"></div>
`;
ksAdjustedBox.insertAdjacentElement('afterend', ksColistinBox);
const ksColistinLoadingEl = ksColistinBox.querySelector('#ksColistinLoading');
const ksColistinMaintEl = ksColistinBox.querySelector('#ksColistinMaint');
const ksColistinNoteEl = ksColistinBox.querySelector('#ksColistinNote');
const ksBandTableBody = document.querySelector('#ksBandTable tbody');
const ksBandTable = document.getElementById('ksBandTable');

const ksDialysisNote = document.getElementById('ksDialysisNote');
const ksDialysisTag = document.getElementById('ksDialysisTag');
const ksDialysisText = document.getElementById('ksDialysisText');
const ksNoteTable = document.getElementById('ksNoteTable');
const ksSourceNote = document.getElementById('ksSourceNote');

let ksCrClAutoFilled = true; // whether the override field is still following the computed value

// populate drug select with optgroups
const ksGroupsEls = {};
KS_DRUGS.forEach(d=>{
  if(!ksGroupsEls[d.group]){
    ksGroupsEls[d.group] = document.createElement('optgroup');
    ksGroupsEls[d.group].label = d.group;
    ksDrugSelect.appendChild(ksGroupsEls[d.group]);
  }
  const opt = document.createElement('option');
  opt.value = d.id; opt.textContent = d.name;
  ksGroupsEls[d.group].appendChild(opt);
});

function ksCurrentDrug(){ return KS_DRUGS.find(d=>d.id===ksDrugSelect.value); }

function ksFmt(n, dp=1){
  if(!isFinite(n)) return '–';
  if(n===0) return '0';
  let s = n.toFixed(dp);
  if(s.includes('.')) s = s.replace(/0+$/,'').replace(/\.$/,'');
  return s;
}

function ksGetScrMgDl(){
  const v = parseFloat(ksScr.value) || 0;
  if(v<=0) return NaN;
  return ksScrUnit.value==='umol' ? v/88.4 : v;
}

function ksGetWeightUsed(){
  const actual = parseFloat(ksWeight.value) || 0;
  const height = parseFloat(ksHeight.value) || 0;
  const sex = ksSex.value;
  const ibw = height>0 ? ksIdealBodyWeight(height, sex) : null;
  const mode = ksWeightMode.value;

  if(mode==='actual' || !actual) return { weight:actual, label:'cân nặng thực tế', ibw };
  if(mode==='ideal'){
    if(ibw) return { weight:ibw, label:'cân nặng lý tưởng (Devine)', ibw };
    return { weight:actual, label:'cân nặng thực tế (chưa nhập chiều cao để tính lý tưởng)', ibw };
  }
  if(mode==='adjusted'){
    if(ibw){
      const adj = ibw + 0.4*(actual-ibw);
      return { weight:adj, label:'cân nặng hiệu chỉnh', ibw };
    }
    return { weight:actual, label:'cân nặng thực tế (chưa nhập chiều cao để tính hiệu chỉnh)', ibw };
  }
  // auto
  if(!ibw) return { weight:actual, label:'cân nặng thực tế (chưa nhập chiều cao)', ibw };
  if(actual<=ibw) return { weight:actual, label:'cân nặng thực tế (≤ lý tưởng)', ibw };
  const adj = ibw + 0.4*(actual-ibw);
  return { weight:adj, label:'cân nặng hiệu chỉnh (thực tế > lý tưởng)', ibw };
}

function ksComputeGFR(){
  const age = parseFloat(ksAge.value) || 0;
  const sex = ksSex.value;
  const scr = ksGetScrMgDl();
  const { weight, label, ibw } = ksGetWeightUsed();

  const crcl = ksCockcroftGault(age, sex, weight, scr);
  const egfr = ksCkdEpi2021(age, sex, scr);

  ksCrClEl.childNodes[0].nodeValue = isFinite(crcl) && crcl>0 ? ksFmt(crcl,1)+' ' : '– ';
  ksEgfrEl.childNodes[0].nodeValue = isFinite(egfr) && egfr>0 ? ksFmt(egfr,1)+' ' : '– ';
  ksCkdStage.textContent = isFinite(egfr) && egfr>0 ? 'Giai đoạn CKD: ' + ksCkdStageLabel(egfr) : '';

  if(isFinite(weight) && weight>0){
    let txt = `Tính theo ${label}: ${ksFmt(weight,1)}kg.`;
    if(ibw) txt += ` Cân nặng lý tưởng ước tính: ${ksFmt(ibw,1)}kg.`;
    ksWeightUsedNote.textContent = txt;
  } else {
    ksWeightUsedNote.textContent = 'Nhập tuổi, cân nặng và creatinine để tính CrCl.';
  }

  // keep the override field synced to the computed value unless the user
  // has manually edited it
  if(ksCrClAutoFilled){
    ksCrClOverride.value = isFinite(crcl) && crcl>0 ? Math.round(crcl*10)/10 : '';
  }
  return crcl;
}

function ksBuildBandTable(drug, crcl){
  ksBandTableBody.innerHTML = '';
  if(!drug.bands){
    ksBandTable.style.display = 'none';
    return;
  }
  ksBandTable.style.display = '';
  drug.bands.forEach(b=>{
    const tr = document.createElement('tr');
    const isCurrent = isFinite(crcl) && crcl>=b.min && crcl<b.max;
    tr.classList.toggle('current', isCurrent);
    tr.innerHTML = `<td class="band">${b.label}</td><td>${b.dose}</td>`;
    ksBandTableBody.appendChild(tr);
  });
}

function ksFindBandDose(drug, crcl){
  if(!drug.bands || !isFinite(crcl)) return null;
  return drug.bands.find(b=>crcl>=b.min && crcl<b.max) || null;
}

function ksOnDrugChange(){
  ksCompute();
}

function ksCompute(){
  const crclComputed = ksComputeGFR();
  const drug = ksCurrentDrug();
  if(!drug) return;

  const crcl = parseFloat(ksCrClOverride.value);
  const hasCrcl = isFinite(crcl) && crcl>=0;

  ksNormalTag.textContent = 'Liều bình thường · ' + drug.name;
  ksNormalDose.textContent = drug.normalDose;

  if(drug.noTable){
    ksAdjustedBox.style.display = 'block';
    ksAdjustedTag.textContent = 'Ghi chú điều chỉnh theo CrCl';
    ksAdjustedDose.textContent = drug.adjustedNote || '';
    ksBandTable.style.display = 'none';
  } else {
    const band = hasCrcl ? ksFindBandDose(drug, crcl) : null;
    ksAdjustedBox.style.display = 'block';
    ksAdjustedTag.textContent = hasCrcl ? `Liều đề xuất tại CrCl = ${ksFmt(crcl,1)} ml/phút` : 'Liều đề xuất theo CrCl';
    ksAdjustedDose.textContent = band ? band.dose : (hasCrcl ? 'Ngoài các băng đã liệt kê — kiểm tra lại giá trị CrCl.' : 'Nhập/kiểm tra CrCl ở trên để xem liều đề xuất.');
    ksBuildBandTable(drug, hasCrcl ? crcl : NaN);
  }

  // live colistin loading-dose calculator (weight-based, per Sanford Guide
  // formula) — maintenance dose now comes from the CrCl band table above,
  // which already shows the matching row highlighted.
  if(drug.liveCalc==='colistin'){
    ksColistinBox.style.display = 'block';
    const actualWeight = parseFloat(ksWeight.value) || 0;
    const { ibw } = ksGetWeightUsed();

    const loadingCBA = ksColistinLoadingCBA(actualWeight, ibw);
    const loadingMIU = isFinite(loadingCBA) ? loadingCBA/KS_COLISTIN_MG_CBA_PER_MIU : NaN;
    const weightNote = ibw ? `dùng cân nặng thấp hơn giữa thực tế (${ksFmt(actualWeight,1)}kg) và lý tưởng (${ksFmt(ibw,1)}kg)` : 'chưa nhập chiều cao nên tạm dùng cân nặng thực tế — nhập chiều cao ở phần tính GFR để chính xác hơn';
    ksColistinLoadingEl.textContent = actualWeight>0
      ? `Liều nạp: ${ksFmt(loadingMIU,2)} MIU (≈ ${ksFmt(loadingCBA,0)} mg CBA ≈ ${ksFmt(loadingCBA*KS_COLISTIN_MG_CMS_PER_MIU/KS_COLISTIN_MG_CBA_PER_MIU,0)} mg CMS), truyền 1 lần — ${weightNote}`
      : 'Nhập cân nặng ở phần "Tính mức lọc cầu thận" để tính liều nạp.';

    ksColistinMaintEl.textContent = 'Liều duy trì: xem bảng theo CrCl bên dưới (dòng khớp với CrCl hiện tại đã được tô sáng) — Sanford Guide tra liều duy trì trực tiếp theo CrCl, không dùng công thức liên tục.';

    ksColistinNoteEl.textContent = 'Công thức liều nạp (Sanford Guide 2022): 4mg/kg CBA × cân nặng thấp hơn giữa thực tế và lý tưởng; liều có thể vượt 300mg. Bắt đầu liều duy trì sau vài giờ, không dùng ngay sau liều nạp — xác nhận thời điểm chính xác với Dược lâm sàng. Quy đổi dùng ở đây: 1 MIU ≈ 30mg CBA ≈ 80mg CMS.';
  } else {
    ksColistinBox.style.display = 'none';
  }

  // dialysis note
  const dstate = ksDialysis.value;
  if(dstate==='none'){
    ksDialysisNote.style.display = 'none';
  } else {
    ksDialysisNote.style.display = 'block';
    const map = { hd:['Lọc máu ngắt quãng (HD)', drug.hd], crrt:['Lọc máu liên tục (CRRT)', drug.crrt], pd:['Thẩm phân phúc mạc (PD)', drug.pd] };
    const [tag, text] = map[dstate];
    ksDialysisTag.textContent = 'Ghi chú — ' + tag;
    ksDialysisText.textContent = text || 'Chưa có ghi chú cụ thể cho tình trạng này — hội chẩn Dược lâm sàng.';
  }

  // notes table: caution + source
  ksNoteTable.innerHTML = '';
  const rows = [];
  if(drug.caution) rows.push(['Lưu ý an toàn', drug.caution]);
  if(rows.length===0) rows.push(['Lưu ý an toàn', 'Không có lưu ý đặc biệt ngoài theo dõi lâm sàng thường quy.']);
  rows.forEach(([k,v])=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="k" style="width:35%;">${k}</td><td class="v" style="text-align:left; font-family:'IBM Plex Sans',sans-serif;">${v}</td>`;
    ksNoteTable.appendChild(tr);
  });
  ksSourceNote.textContent = 'Nguồn dữ liệu: ' + (drug.source || 'y văn công khai');
}

ksDrugSelect.addEventListener('change', ksOnDrugChange);
ksCrClOverride.addEventListener('input', ()=>{ ksCrClAutoFilled = false; ksCompute(); });
[ksAge, ksSex, ksWeight, ksHeight, ksWeightMode, ksScr, ksScrUnit, ksDialysis].forEach(el=>{
  el.addEventListener('input', ()=>{ ksCrClAutoFilled = true; ksCompute(); });
  el.addEventListener('change', ()=>{ ksCrClAutoFilled = true; ksCompute(); });
});

ksCompute();
