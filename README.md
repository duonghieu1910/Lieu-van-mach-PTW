# Máy tính liều thuốc truyền tĩnh mạch & thuốc lao (ICU)

App web tĩnh, không cần server/backend, chạy hoàn toàn trên trình duyệt. Gồm 5 file, đặt
**cùng một thư mục**:

```
index.html    ← khung trang, chỉ chứa HTML (không có CSS/JS bên trong)
style.css     ← toàn bộ giao diện
app.js        ← chuyển tab (Vận mạch / Thuốc lao)
vanmach.js    ← toàn bộ logic tab "Thuốc vận mạch"
lao.js        ← toàn bộ logic tab "Thuốc lao"
```

`index.html` gọi các file còn lại bằng `<link>` và `<script src="...">`, nên khi sửa giao diện
hay logic của một tab, **chỉ cần thay đúng 1 file nhỏ**, không phải upload lại `index.html`.

## Chức năng

**Tab Thuốc vận mạch:** chọn thuốc → nhập hàm lượng ống, số ống pha, thể tích bơm, tốc độ ml/h,
cân nặng (nếu cần) → ra liều chuẩn + bảng quy đổi đơn vị. Có chế độ ngược: nhập liều mong muốn →
tính tốc độ ml/h cần cài.

**Tab Thuốc lao:** hai cách tính, dùng chung ô cân nặng —
- *Viên phối hợp (FDC) — Lao hàng 1*: tra theo băng cân nặng chuẩn WHO ra số viên RHZE, RHZ
  (không Ethambutol) và RH; kèm bảng viên rời Ethambutol/Pyrazinamide tính theo mg/kg thực tế.
- *Từng thuốc — Hàng 1 & Hàng 2*: chọn thuốc lao hàng 1 (dùng rời) hoặc hàng 2 (lao kháng
  thuốc), liều chuẩn (mg/kg hoặc liều cố định) và hàm lượng viên đều chỉnh được, ra số viên/ngày
  (ghi rõ hàm lượng đã tính) hoặc số ml/số lọ với thuốc tiêm.

Toàn bộ khoảng liều tham khảo chỉ mang tính tổng quát, **không thay thế phác đồ của bệnh viện
hay nhận định lâm sàng**.

## Cách đưa lên GitHub và host miễn phí bằng GitHub Pages

1. Tạo repository mới trên GitHub (ví dụ tên `vanmach-calc`), để **Public**.
2. Trong repo, bấm **Add file → Upload files**, kéo thả **cả 5 file** (`index.html`, `style.css`,
   `app.js`, `vanmach.js`, `lao.js`, và `README.md` nếu muốn) vào **cùng một cấp thư mục gốc**
   (không bỏ vào thư mục con), rồi **Commit changes**.
3. Vào tab **Settings → Pages** (mục "Code and automation" ở menu bên trái).
4. Ở mục **Build and deployment → Source**, chọn **Deploy from a branch**.
5. Ở mục **Branch**, chọn `main` (hoặc `master`) và thư mục `/ (root)`, bấm **Save**.
6. Đợi khoảng 1 phút, GitHub sẽ cấp một địa chỉ dạng:
   `https://<ten-tai-khoan>.github.io/vanmach-calc/`
   Mở địa chỉ này trên điện thoại/máy tính là dùng được ngay, có thể lưu ra màn hình chính
   (Add to Home Screen) để dùng như một app.

### Cách khác (dùng Git từ máy tính, nếu quen dùng dòng lệnh)
```bash
git init
git add index.html style.css app.js vanmach.js lao.js README.md
git commit -m "Add vasoactive + TB dose calculator"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/vanmach-calc.git
git push -u origin main
```
Sau đó bật GitHub Pages như bước 3–5 ở trên.

## Sửa/thêm sau này mà không cần upload lại toàn bộ

Vì logic đã tách theo file, khi cần chỉnh sửa chỉ cần thay đúng file liên quan:

- **Sửa giao diện, màu sắc, bố cục** → chỉ cần thay `style.css`.
- **Sửa/thêm thuốc, công thức tính ở tab Vận mạch** → chỉ cần thay `vanmach.js`. Danh mục thuốc
  nằm trong mảng `DRUGS` ở đầu file.
- **Sửa/thêm thuốc, công thức tính ở tab Thuốc lao** → chỉ cần thay `lao.js`. Danh mục thuốc nằm
  trong mảng `TB_DRUGS`, bảng băng cân nặng FDC nằm trong `TB_FDC_BANDS`.
- **Thêm một tab hoàn toàn mới (vd. "Thuốc kháng sinh", "Điện giải"...)** → tạo thêm 1 file
  `<tenkhac>.js` chứa toàn bộ logic tab đó, thêm 1 nút bấm + 1 khối `<div>` tương ứng vào
  `index.html` (chỉ vài dòng), và thêm 1 dòng `<script src="tenkhac.js"></script>` ở cuối
  `index.html`. Khi đó chỉ cần upload/commit file mới + phần nhỏ vừa thêm vào `index.html`,
  không phải dán lại toàn bộ nội dung cũ.

**Cách sửa trên GitHub mà không cần tải file về máy:** mở file cần sửa trong repo trên GitHub
→ bấm biểu tượng cây bút (Edit this file) ở góc phải → sửa/dán đoạn code mới → **Commit
changes**. GitHub Pages sẽ tự cập nhật sau khoảng 1 phút, không cần làm lại bước Settings → Pages.

