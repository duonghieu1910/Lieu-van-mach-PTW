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
   Loading dose: 5 mg/kg CBA, capped at 300 mg (Kaye/healio; drugs.com).
   Maintenance: total daily CBA (mg) = 2.5 × (1.5×CrCl + 30), split q12h
   (Garonzik et al., Antimicrob Agents Chemother 2011).
   ========================================================================= */
const KS_COLISTIN_MG_CBA_PER_MIU = 30;
const KS_COLISTIN_MG_CMS_PER_MIU = 80;

function ksColistinLoadingCBA(weightKg){
  if(!(weightKg>0)) return NaN;
  return Math.min(5*weightKg, 300);
}
function ksColistinDailyMaintenanceCBA(crcl){
  if(!isFinite(crcl) || crcl<0) return NaN;
  return 2.5*(1.5*crcl+30);
}

/* ---------------- Antibiotic dataset ---------------- */
// bands: ordered high -> low; each has min (inclusive), max (exclusive, Infinity ok), label, dose
const KS_DRUGS = [
  {
    id:'vanco', group:'Glycopeptide', name:'Vancomycin',
    noTable:true,
    normalDose:'Liều nạp 25–30 mg/kg (cân nặng thực), sau đó duy trì 15–20 mg/kg mỗi 8–12 giờ nếu CrCl bình thường.',
    adjustedNote:'Không dùng bảng liều cố định — kéo dài khoảng cách liều khi CrCl giảm và BẮT BUỘC định lượng nồng độ đáy (mục tiêu 15–20 mg/L với nhiễm khuẩn nặng) để chỉnh liều tiếp theo. Ước tính nhanh: tổng liều/ngày (mg) ≈ 15 × CrCl (ml/phút).',
    hd:'Không có liều cố định — định lượng nồng độ trước lọc máu để quyết định liều bổ sung sau lọc; nhiều phác đồ dùng liều nạp rồi định lượng lại.',
    crrt:'Liều nạp như bình thường, duy trì thường 15–20 mg/kg mỗi 24–48 giờ tùy tốc độ dịch thải — bắt buộc định lượng nồng độ.',
    pd:'Có thể dùng liều duy nhất 15–30 mg/kg mỗi 5–7 ngày kèm định lượng, hoặc theo phác đồ nội trú tại chỗ.',
    caution:'Nguy cơ độc thận tăng khi phối hợp piperacillin-tazobactam hoặc thuốc độc thận khác. Không được dùng liều cố định trong suy thận nặng/lọc máu nếu không có định lượng.',
    source:'FDA label (accessdata.fda.gov) + tài liệu đồng thuận liều vancomycin 2020 (ASHP/IDSA/PIDS/SIDP).'
  },
  {
    id:'pip-taz', group:'Beta-lactam', name:'Piperacillin-Tazobactam (Tazocin/Zosyn)',
    normalDose:'4,5g mỗi 6 giờ (liều ICU điển hình, nhiễm khuẩn nặng/viêm phổi bệnh viện).',
    bands:[
      {min:40, max:Infinity, label:'CrCl > 40', dose:'4,5g mỗi 6 giờ (không chỉnh liều)'},
      {min:20, max:40, label:'CrCl 20 – 40', dose:'2,25g mỗi 6 giờ (một số phác đồ truyền kéo dài dùng 3,375g mỗi 8 giờ)'},
      {min:0, max:20, label:'CrCl < 20', dose:'2,25g mỗi 8 giờ'},
    ],
    hd:'2,25g mỗi 8–12 giờ + bổ sung 0,75g SAU mỗi buổi lọc máu (lọc máu loại bỏ khoảng 30–40% liều).',
    crrt:'2,25 – 3,375g mỗi 6–8 giờ tùy tốc độ dịch thải và chức năng thận tồn dư — nên định lượng nồng độ nếu có thể.',
    pd:'Không cần chỉnh liều thêm ngoài mức CrCl<20.',
    caution:'Phối hợp với vancomycin làm tăng nguy cơ tổn thương thận cấp.',
    source:'FDA prescribing information (piperacillin-tazobactam), accessdata.fda.gov / DailyMed.'
  },
  {
    id:'mero', group:'Beta-lactam', name:'Meropenem',
    normalDose:'1g mỗi 8 giờ (liều ICU điển hình/Pseudomonas); 500mg mỗi 8 giờ cho nhiễm khuẩn nhẹ hơn.',
    bands:[
      {min:50, max:Infinity, label:'CrCl > 50', dose:'Liều bình thường mỗi 8 giờ (không chỉnh liều)'},
      {min:26, max:50, label:'CrCl 26 – 50', dose:'Giữ nguyên liều, giãn khoảng cách mỗi 12 giờ'},
      {min:10, max:26, label:'CrCl 10 – 25', dose:'Giảm nửa liều, mỗi 12 giờ'},
      {min:0, max:10, label:'CrCl < 10', dose:'Giảm nửa liều, mỗi 24 giờ'},
    ],
    hd:'Khoảng 50% liều bị loại bỏ qua lọc máu — dùng liều SAU buổi lọc máu, không dùng trước lọc. Cân nhắc định lượng nồng độ nếu có thể.',
    crrt:'Thường 500mg – 1g mỗi 8–12 giờ tùy tốc độ dịch thải — nên định lượng nồng độ, đặc biệt với vi khuẩn kháng thuốc.',
    pd:'Dữ liệu FDA còn hạn chế — cần hội chẩn Dược lâm sàng.',
    caution:'Không giảm liều đơn xuống dưới mức khuyến cáo vì có thể làm giảm hiệu quả diệt khuẩn.',
    source:'FDA prescribing information (meropenem), accessdata.fda.gov / DailyMed.'
  },
  {
    id:'cefepime', group:'Beta-lactam', name:'Cefepime',
    normalDose:'2g mỗi 12 giờ (nhiễm khuẩn trung bình–nặng); 2g mỗi 8 giờ nếu sốt giảm bạch cầu hạt/Pseudomonas nặng.',
    bands:[
      {min:60, max:Infinity, label:'CrCl > 60', dose:'2g mỗi 12 giờ (không chỉnh liều)'},
      {min:30, max:60, label:'CrCl 30 – 60', dose:'2g mỗi 24 giờ'},
      {min:11, max:30, label:'CrCl 11 – 29', dose:'1g mỗi 24 giờ'},
      {min:0, max:11, label:'CrCl < 11', dose:'500mg mỗi 24 giờ'},
    ],
    hd:'1g ngày đầu tiên, sau đó 500mg mỗi 24 giờ (1g mỗi 24 giờ nếu sốt giảm bạch cầu hạt) — dùng SAU buổi lọc máu.',
    crrt:'Thường 1 – 2g mỗi 12–24 giờ tùy tốc độ dịch thải — nên định lượng nồng độ nếu có thể.',
    pd:'2g mỗi 48 giờ.',
    caution:'Độc tính thần kinh (co giật, bệnh não, giảm ý thức) có thể xảy ra khi tích lũy thuốc trong suy thận không chỉnh liều đúng — đặc biệt cần lưu ý ở bệnh nhân cao tuổi/suy thận.',
    source:'FDA prescribing information (cefepime/Maxipime), accessdata.fda.gov / DailyMed.'
  },
  {
    id:'ceftaz', group:'Beta-lactam', name:'Ceftazidime',
    normalDose:'2g mỗi 8 giờ (liều ICU điển hình/Pseudomonas).',
    bands:[
      {min:50, max:Infinity, label:'CrCl > 50', dose:'2g mỗi 8 giờ (không chỉnh liều)'},
      {min:31, max:50, label:'CrCl 31 – 50', dose:'2g mỗi 12 giờ'},
      {min:16, max:31, label:'CrCl 16 – 30', dose:'2g mỗi 24 giờ'},
      {min:6, max:16, label:'CrCl 6 – 15', dose:'1g mỗi 24 giờ'},
      {min:0, max:6, label:'CrCl < 6', dose:'1g mỗi 48 giờ'},
    ],
    hd:'1g liều nạp, sau đó 1g SAU mỗi buổi lọc máu.',
    crrt:'Thường 1 – 2g mỗi 12 giờ tùy tốc độ dịch thải.',
    pd:'1g mỗi 24 giờ (hoặc theo nồng độ trong dịch lọc nếu viêm phúc mạc do CAPD).',
    caution:'',
    source:'Y văn công khai tổng hợp từ nhãn thuốc ceftazidime (mức tin cậy tương tự các beta-lactam khác ở trên).'
  },
  {
    id:'amp-sulb', group:'Beta-lactam', name:'Ampicillin-Sulbactam (Unasyn)',
    normalDose:'3g (2g ampicillin/1g sulbactam) mỗi 6 giờ.',
    bands:[
      {min:30, max:Infinity, label:'CrCl > 30', dose:'3g mỗi 6 giờ (không chỉnh liều)'},
      {min:15, max:30, label:'CrCl 15 – 29', dose:'3g mỗi 12 giờ'},
      {min:5, max:15, label:'CrCl 5 – 14', dose:'3g mỗi 24 giờ'},
      {min:0, max:5, label:'CrCl < 5', dose:'1,5g mỗi 24 giờ'},
    ],
    hd:'3g SAU mỗi buổi lọc máu.',
    crrt:'Thường 3g mỗi 8–12 giờ tùy tốc độ dịch thải.',
    pd:'Chưa có dữ liệu chính thức — cân nhắc như CrCl<5.',
    caution:'',
    source:'FDA prescribing information (ampicillin-sulbactam/Unasyn), accessdata.fda.gov.'
  },
  {
    id:'aztreonam', group:'Beta-lactam', name:'Aztreonam',
    normalDose:'2g mỗi 8 giờ (nhiễm khuẩn nặng).',
    bands:[
      {min:30, max:Infinity, label:'CrCl > 30', dose:'2g mỗi 8 giờ (không chỉnh liều)'},
      {min:10, max:30, label:'CrCl 10 – 30', dose:'Liều nạp 2g, sau đó giảm còn 1/2 liều thường dùng (1g mỗi 8 giờ)'},
      {min:0, max:10, label:'CrCl < 10', dose:'Liều nạp 2g, sau đó giảm còn 1/4 liều thường dùng (500mg mỗi 8 giờ)'},
    ],
    hd:'Liều nạp 2g, sau đó bổ sung 1/8 liều nạp (khoảng 250mg) SAU mỗi buổi lọc máu.',
    crrt:'Thường 1 – 2g mỗi 8–12 giờ tùy tốc độ dịch thải.',
    pd:'Tương tự CrCl<10.',
    caution:'',
    source:'FDA prescribing information (aztreonam), accessdata.fda.gov.'
  },
  {
    id:'cipro-iv', group:'Fluoroquinolone', name:'Ciprofloxacin (đường tĩnh mạch)',
    normalDose:'400mg mỗi 8–12 giờ.',
    bands:[
      {min:30, max:Infinity, label:'CrCl > 30', dose:'400mg mỗi 8–12 giờ (không chỉnh liều)'},
      {min:5, max:30, label:'CrCl 5 – 29', dose:'400mg mỗi 24 giờ'},
    ],
    hd:'400mg mỗi 24 giờ, dùng SAU buổi lọc máu.',
    crrt:'Thường 400mg mỗi 12 giờ.',
    pd:'400mg mỗi 24 giờ.',
    caution:'Nguy cơ tác dụng phụ thần kinh/gân cơ tăng khi dùng liều cao ở suy thận nặng.',
    source:'FDA prescribing information (ciprofloxacin) — băng liều IV suy ra từ bảng liều uống cùng nhãn thuốc, theo thực hành ICU phổ biến.'
  },
  {
    id:'levo', group:'Fluoroquinolone', name:'Levofloxacin (phác đồ 750mg — nhiễm khuẩn nặng)',
    normalDose:'750mg mỗi 24 giờ (bắt buộc liều nạp 750mg đầu tiên dù CrCl bao nhiêu).',
    bands:[
      {min:50, max:Infinity, label:'CrCl ≥ 50', dose:'750mg mỗi 24 giờ (không chỉnh liều)'},
      {min:20, max:50, label:'CrCl 20 – 49', dose:'750mg liều đầu, sau đó 750mg mỗi 48 giờ'},
      {min:0, max:20, label:'CrCl < 20', dose:'750mg liều đầu, sau đó 500mg mỗi 48 giờ'},
    ],
    hd:'750mg liều đầu, sau đó 500mg mỗi 48 giờ — không cần liều bổ sung sau lọc máu (chỉ loại bỏ ~24%).',
    crrt:'Thường 750mg mỗi 24–48 giờ tùy tốc độ dịch thải.',
    pd:'Tương tự CrCl<20.',
    caution:'Không được bỏ liều nạp 750mg đầu tiên dù chức năng thận thế nào.',
    source:'FDA prescribing information (levofloxacin), accessdata.fda.gov.'
  },
  {
    id:'colistin', group:'Khác (đa kháng)', name:'Colistin (Colistimethate — tính theo MIU)',
    liveCalc:'colistin',
    normalDose:'Liều nạp 5mg/kg CBA (≈ 0,17 MIU/kg), tối đa 300mg (≈ 10 MIU) × 1 lần, truyền trong 30–60 phút — dùng cho MỌI mức CrCl. Xem hộp "Liều tính theo MIU" bên dưới để có số cụ thể theo cân nặng đã nhập.',
    bands:[
      {min:80, max:Infinity, label:'CrCl ≥ 80', dose:'Duy trì 2,5 – 5mg/kg/ngày CBA (≈ 0,08 – 0,17 MIU/kg/ngày), chia 2–4 lần'},
      {min:50, max:80, label:'CrCl 50 – 79', dose:'Duy trì 2,5 – 3,8mg/kg/ngày CBA (≈ 0,08 – 0,13 MIU/kg/ngày), chia 2 lần'},
      {min:30, max:50, label:'CrCl 30 – 49', dose:'Duy trì ~2,5mg/kg/ngày CBA (≈ 0,08 MIU/kg/ngày), chia 2 lần'},
      {min:10, max:30, label:'CrCl 10 – 29', dose:'Duy trì ~1,5mg/kg/ngày CBA (≈ 0,05 MIU/kg/ngày), chia 1–2 lần'},
      {min:0, max:10, label:'CrCl < 10', dose:'~1,5mg/kg CBA mỗi 36 giờ (≈ 0,05 MIU/kg mỗi 36 giờ) — nên hội chẩn Dược lâm sàng'},
    ],
    hd:'Duy trì liều theo mức lọc còn lại + bổ sung khoảng 30% liều (tính bằng MIU) SAU mỗi buổi lọc máu (colistin bị loại bỏ đáng kể qua HD).',
    crrt:'Thường tính liều tương đương mức CrCl ≈ 50 ml/phút do CRRT thanh thải colistin đáng kể — nên hội chẩn Dược lâm sàng/vi sinh.',
    pd:'Dữ liệu hạn chế — nên hội chẩn Dược lâm sàng.',
    caution:'Cửa sổ điều trị hẹp — nguy cơ độc thận và độc thần kinh đáng kể. Quy đổi dùng trong app: 1 triệu đơn vị (MIU) ≈ 30mg CBA ≈ 80mg colistimethate natri (CMS) — một số tài liệu dùng 33mg CBA/MIU, chênh lệch nhỏ. NHẦM LẪN giữa đơn vị MIU / mg CBA / mg CMS là nguyên nhân sai liều thường gặp trên lâm sàng — luôn ghi rõ đơn vị khi kê đơn và đối chiếu với nhãn lọ thuốc đang dùng tại đơn vị (số MIU/lọ có thể khác nhau giữa các hãng). Số liệu chỉ là liều khởi đầu tham khảo — nên hội chẩn Dược lâm sàng/vi sinh khi có thể.',
    source:'Garonzik et al. Antimicrob Agents Chemother 2011 (công thức liều duy trì); Antimicrob Agents Chemother 2014 (PMC4249546, quy đổi 1 MIU ≈ 30mg CBA ≈ 80mg CMS); bảng liều lâm sàng công khai (UCLA/Nebraska Medicine ASP), DailyMed.'
  },
  {
    id:'amikacin', group:'Aminoglycoside', name:'Amikacin (liều giãn cách/extended-interval)',
    normalDose:'15 mg/kg mỗi 24 giờ nếu CrCl ≥ 60 ml/phút (dùng cân nặng hiệu chỉnh nếu béo phì).',
    bands:[
      {min:60, max:Infinity, label:'CrCl ≥ 60', dose:'15mg/kg mỗi 24 giờ'},
      {min:40, max:60, label:'CrCl 40 – 59', dose:'15mg/kg mỗi 36 giờ'},
      {min:20, max:40, label:'CrCl 20 – 39', dose:'15mg/kg mỗi 48 giờ'},
      {min:0, max:20, label:'CrCl < 20', dose:'Liều đơn theo cân nặng, các liều tiếp theo theo nồng độ đáy — hội chẩn Dược lâm sàng'},
    ],
    hd:'Liều theo cân nặng SAU buổi lọc máu, định lượng nồng độ để chỉnh liều tiếp theo.',
    crrt:'Thường 15mg/kg liều nạp, duy trì theo nồng độ đáy mỗi 24–48 giờ tùy tốc độ dịch thải.',
    pd:'Theo nồng độ, hội chẩn Dược lâm sàng.',
    caution:'BẮT BUỘC theo dõi nồng độ đỉnh/đáy khi dùng > 48–72 giờ hoặc có suy thận — nguy cơ độc thận, độc tai/tiền đình.',
    source:'Nguyên tắc liều giãn cách aminoglycoside kinh điển (Hartford nomogram và các y văn công khai liên quan).'
  },
  {
    id:'gentamicin', group:'Aminoglycoside', name:'Gentamicin (liều giãn cách/extended-interval)',
    normalDose:'5 – 7 mg/kg mỗi 24 giờ nếu CrCl ≥ 60 ml/phút (dùng cân nặng hiệu chỉnh nếu béo phì).',
    bands:[
      {min:60, max:Infinity, label:'CrCl ≥ 60', dose:'5–7mg/kg mỗi 24 giờ'},
      {min:40, max:60, label:'CrCl 40 – 59', dose:'5–7mg/kg mỗi 36 giờ'},
      {min:20, max:40, label:'CrCl 20 – 39', dose:'5–7mg/kg mỗi 48 giờ'},
      {min:0, max:20, label:'CrCl < 20', dose:'Liều đơn theo cân nặng, các liều tiếp theo theo nồng độ đáy — hội chẩn Dược lâm sàng'},
    ],
    hd:'Liều theo cân nặng SAU buổi lọc máu, định lượng nồng độ để chỉnh liều tiếp theo.',
    crrt:'Thường liều nạp theo cân nặng, duy trì theo nồng độ đáy mỗi 24–48 giờ tùy tốc độ dịch thải.',
    pd:'Theo nồng độ, hội chẩn Dược lâm sàng.',
    caution:'BẮT BUỘC theo dõi nồng độ đỉnh/đáy khi dùng > 48–72 giờ hoặc có suy thận — nguy cơ độc thận, độc tai/tiền đình.',
    source:'Nguyên tắc liều giãn cách aminoglycoside kinh điển (Hartford nomogram và các y văn công khai liên quan).'
  },
  {
    id:'tmp-smx', group:'Khác', name:'Trimethoprim-Sulfamethoxazole (điều trị, tính theo TMP)',
    normalDose:'15 – 20 mg/kg/ngày (theo TMP), chia 3–4 lần (liều điều trị nặng, vd. PCP).',
    bands:[
      {min:30, max:Infinity, label:'CrCl > 30', dose:'Liều bình thường (không chỉnh liều)'},
      {min:15, max:30, label:'CrCl 15 – 30', dose:'Giảm còn 50% liều bình thường'},
      {min:0, max:15, label:'CrCl < 15', dose:'Tránh dùng nếu có thể, hoặc dùng liều rất thấp có theo dõi sát — hội chẩn Dược lâm sàng'},
    ],
    hd:'Liều thông thường SAU mỗi buổi lọc máu (loại bỏ đáng kể qua HD) — hội chẩn Dược lâm sàng để định liều chính xác ở liều điều trị cao.',
    crrt:'Gần liều bình thường, theo dõi sát kali máu và creatinine.',
    pd:'Tránh dùng nếu có thể.',
    caution:'Theo dõi kali máu (tăng kali), creatinine giả tăng do ức chế bài tiết ống thận (không phản ánh giảm GFR thực sự).',
    source:'Y văn công khai (FDA label + hướng dẫn điều trị PCP) — mức tin cậy trung bình, nên đối chiếu thêm.'
  },
  {
    id:'fluconazole', group:'Kháng nấm', name:'Fluconazole',
    normalDose:'400 – 800mg liều nạp, sau đó 400mg mỗi 24 giờ (nhiễm nấm xâm lấn).',
    bands:[
      {min:50, max:Infinity, label:'CrCl > 50', dose:'Liều bình thường (không chỉnh liều)'},
      {min:0, max:50, label:'CrCl ≤ 50 (không lọc máu)', dose:'Giữ nguyên liều nạp, sau đó giảm 50% liều duy trì'},
    ],
    hd:'Liều bình thường (100%) SAU mỗi buổi lọc máu — lọc máu loại bỏ đáng kể fluconazole.',
    crrt:'Gần liều bình thường (400 – 800mg/ngày) do CRRT thanh thải đáng kể.',
    pd:'Giảm 50% liều duy trì như CrCl≤50.',
    caution:'',
    source:'FDA prescribing information (fluconazole), accessdata.fda.gov.'
  },
  {
    id:'no-adjust', group:'Không cần chỉnh theo thận', name:'— Nhóm không cần chỉnh liều theo CrCl —',
    noTable:true, isGroup:true,
    normalDose:'Azithromycin, Doxycycline, Moxifloxacin, Ceftriaxone, Clindamycin, Linezolid, Metronidazole: dùng liều thông thường ở mọi mức CrCl (thải trừ chủ yếu qua gan/mật hoặc không tích lũy đáng kể ở suy thận).',
    adjustedNote:'Không cần chỉnh liều theo CrCl cho các thuốc này trong đa số trường hợp. Ceftriaxone cần thận trọng/giảm liều khi có SUY GAN kèm suy thận nặng. Metronidazole: cân nhắc giảm liều nếu suy thận rất nặng kèm bệnh não gan.',
    hd:'Không cần liều bổ sung cho hầu hết các thuốc trong nhóm này; linezolid và metronidazole bị loại bỏ một phần qua HD nhưng thường không cần bổ sung liều thường quy.',
    crrt:'Dùng liều bình thường.',
    pd:'Dùng liều bình thường.',
    caution:'Danh sách này chỉ mang tính tổng quát — vẫn cần xem xét từng trường hợp cụ thể (vd. bệnh não gan, tương tác thuốc).',
    source:'Kiến thức dược lý kinh điển, đồng thuận rộng rãi trong y văn công khai.'
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

  // live colistin MIU calculator (weight + CrCl based, continuous formula —
  // more precise than the band table above, shown only for colistin)
  if(drug.liveCalc==='colistin'){
    ksColistinBox.style.display = 'block';
    const weight = parseFloat(ksWeight.value) || 0;

    const loadingCBA = ksColistinLoadingCBA(weight);
    const loadingMIU = isFinite(loadingCBA) ? loadingCBA/KS_COLISTIN_MG_CBA_PER_MIU : NaN;
    ksColistinLoadingEl.textContent = weight>0
      ? `Liều nạp: ${ksFmt(loadingMIU,2)} MIU (≈ ${ksFmt(loadingCBA,0)} mg CBA ≈ ${ksFmt(loadingCBA*KS_COLISTIN_MG_CMS_PER_MIU/KS_COLISTIN_MG_CBA_PER_MIU,0)} mg CMS), truyền 1 lần trong 30–60 phút`
      : 'Nhập cân nặng ở phần "Tính mức lọc cầu thận" để tính liều nạp.';

    const dailyCBA = hasCrcl ? ksColistinDailyMaintenanceCBA(crcl) : NaN;
    const dailyMIU = isFinite(dailyCBA) ? dailyCBA/KS_COLISTIN_MG_CBA_PER_MIU : NaN;
    const perDoseMIU = isFinite(dailyMIU) ? dailyMIU/2 : NaN;
    const perDoseCBA = isFinite(dailyCBA) ? dailyCBA/2 : NaN;
    ksColistinMaintEl.textContent = isFinite(perDoseMIU)
      ? `Liều duy trì: ${ksFmt(perDoseMIU,2)} MIU mỗi 12 giờ (≈ ${ksFmt(perDoseCBA,0)} mg CBA/lần) — tổng ${ksFmt(dailyMIU,2)} MIU/ngày (≈ ${ksFmt(dailyCBA,0)} mg CBA/ngày)`
      : 'Nhập/kiểm tra CrCl ở trên để tính liều duy trì.';

    ksColistinNoteEl.textContent = 'Công thức: liều nạp = 5mg/kg CBA (tối đa 300mg); liều duy trì = 2,5 × (1,5×CrCl + 30) mg CBA/ngày, chia 2 lần mỗi 12 giờ (Garonzik 2011). Quy đổi dùng ở đây: 1 MIU ≈ 30mg CBA ≈ 80mg CMS. Đây là công thức liên tục, chính xác hơn bảng theo băng CrCl bên dưới — nhưng vẫn chỉ là liều khởi đầu, nên hội chẩn Dược lâm sàng/vi sinh và đối chiếu số MIU/lọ của thuốc đang dùng tại đơn vị.';
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
