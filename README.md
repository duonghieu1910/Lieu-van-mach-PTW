# Máy tính liều thuốc truyền tĩnh mạch (ICU)

App web 1 file (`index.html`), không cần server/backend, chạy hoàn toàn trên trình duyệt.

## Chức năng
- Chọn thuốc trong danh mục có sẵn (Noradrenalin, Adrenalin, Dopamin, Dobutamin, Vasopressin,
  Nitroglycerin, Nicardipin, Milrinone, Amiodarone, Esmolol, Diltiazem, Fentanyl, Midazolam,
  Propofol, Insulin) hoặc chọn **"Tùy chỉnh"** cho thuốc khác.
- Nhập: hàm lượng mỗi ống, số ống pha, tổng thể tích bơm (mặc định 50ml), tốc độ bơm (ml/h),
  cân nặng (nếu thuốc tính theo kg).
- App tự quy đổi ra liều theo đơn vị chuẩn (mcg/kg/phút, mcg/kg/giờ, mg/giờ, UI/giờ...) và hiển
  thị thêm bảng quy đổi sang các đơn vị khác.
- Chế độ ngược: nhập liều mong muốn → app tính tốc độ (ml/h) cần cài trên bơm tiêm điện.

Toàn bộ khoảng liều tham khảo hiển thị trong app chỉ mang tính tham khảo chung, **không thay
thế phác đồ của bệnh viện hay nhận định lâm sàng**.

## Cách đưa lên GitHub và host miễn phí bằng GitHub Pages

1. Tạo repository mới trên GitHub (ví dụ tên `vanmach-calc`), để **Public**.
2. Trong repo, bấm **Add file → Upload files**, kéo thả file `index.html` (và `README.md`) vào,
   rồi **Commit changes**.
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
git add index.html README.md
git commit -m "Add vasoactive dose calculator"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/vanmach-calc.git
git push -u origin main
```
Sau đó bật GitHub Pages như bước 3–5 ở trên.

## Chỉnh sửa sau này
Mở file `index.html` bằng bất kỳ trình soạn thảo text nào (Notepad, VS Code...), phần khai báo
danh mục thuốc nằm ở đầu thẻ `<script>`, trong mảng `DRUGS` — có thể sửa hàm lượng mặc định,
thêm/bớt thuốc, hoặc chỉnh khoảng liều tham khảo tại đó.
