
3. Các trường hợp kiểm thử
   3.1.	Kiểm thử chức năng chủ homestay thêm phòng mới
   Bảng 9 Bảng kiểm tra chức năng chủ homestay thêm phòng mới
   Mã số	Mô tả	Dữ liệu kiểm thử	Các bước thực hiện	Kết quả mong đợi	Kết quả thực tế	Đánh giá
   TC_TPM_01	Kiểm thử chức năng khi chủ homestay thêm phòng mới với các trường thông tin hợp lệ.	Tên phòng: Phòng đôi VIP
   Sức chứa: 2
   Số giường: 1
   Giá ngày thường: 500.000
   Giá cuối tuần: 700.000
   Trạng thái: Còn trống	1. Đăng nhập vào trang quản lý.
4. Chọn homestay cần thêm phòng.
5. Chọn chức năng "Thêm phòng".
6. Nhập thông tin phòng mới.
7. Nhấn nút "Lưu".	Hiển thị thông báo "Thêm phòng thành công", phòng mới được thêm vào danh sách phòng của homestay.	Hiển thị thông báo "Thêm phòng thành công", phòng mới được thêm vào danh sách phòng của homestay.	Thành công
   TC_TPM_02	Kiểm thử chức năng khi chủ homestay thêm phòng mới với tên phòng bị trùng.	Tên phòng: Phòng đôi VIP
   Sức chứa: 3
   Số giường: 2
   Giá ngày thường: 600.000
   Giá cuối tuần: 800.000
   Trạng thái: Còn trống	1. Đăng nhập vào trang quản lý.
8. Chọn homestay cần thêm phòng.
9. Chọn chức năng "Thêm phòng".
10. Nhập thông tin phòng mới.
11. Nhấn nút "Lưu".	Hiển thị thông báo "Tên phòng đã tồn tại", không cho phép thêm phòng.	Hiển thị thông báo "Tên phòng đã tồn tại", không cho phép thêm phòng.	Thành công
    TC_TPM_03	Kiểm thử chức năng khi chủ homestay thêm phòng mới với sức chứa không hợp lệ (nhỏ hơn 0).	Tên phòng: Phòng đơn
    Sức chứa: -1
    Số giường: 1
    Giá ngày thường: 300.000
    Giá cuối tuần: 400.000
    Trạng thái: Còn trống	1. Đăng nhập vào trang quản lý.
12. Chọn homestay cần thêm phòng.
13. Chọn chức năng "Thêm phòng".
14. Nhập thông tin phòng mới.
15. Nhấn nút "Lưu".	Hiển thị thông báo "Sức chứa không hợp lệ", không cho phép thêm phòng.	Hiển thị thông báo "Sức chứa không hợp lệ", không cho phép thêm phòng.	Thành công
    …					
    3.2.	Kiểm thử chức năng khách hàng đặt phòng
    Bảng 10 Bảng kiểm tra chức năng khách hàng đặt phòng
    Mã số	Mô tả	Dữ liệu kiểm thử	Các bước thực hiện	Kết quả mong đợi	Kết quả thực tế	Đánh giá
    TC_DP_01	Kiểm thử chức năng đặt phòng thành công với thông tin hợp lệ.	Homestay: Homestay APhòng: Phòng đôi VIPNgày đến: 20/10/2023Ngày đi: 22/10/2023Số khách: 2Thông tin khách hàng: Họ tên, email, số điện thoại	1. Chọn homestay và phòng.
16. Chọn ngày đến và ngày đi.
17. Nhập số khách và thông tin khách hàng.
18. Nhấn nút "Đặt phòng".	Hiển thị thông báo "Đặt phòng thành công", gửi email xác nhận đặt phòng.	Hiển thị thông báo "Đặt phòng thành công", gửi email xác nhận đặt phòng.	Thành công
    TC_DP_02	Kiểm thử chức năng đặt phòng khi phòng đã được đặt trong khoảng thời gian đó.	Homestay: Homestay APhòng: Phòng đôi VIPNgày đến: 20/10/2023Ngày đi: 22/10/2023Số khách: 2Thông tin khách hàng: Họ tên, email, số điện thoại	1. Chọn homestay và phòng.
19. Chọn ngày đến và ngày đi (trùng với khoảng thời gian đã đặt).
20. Nhập số khách và thông tin khách hàng.
21. Nhấn nút "Đặt phòng".	Hiển thị thông báo "Phòng đã được đặt trong khoảng thời gian này", không cho phép đặt phòng.	Hiển thị thông báo "Phòng đã được đặt trong khoảng thời gian này", không cho phép đặt phòng.	Thành công
    TC_DP_03	Kiểm thử chức năng đặt phòng khi số khách vượt quá sức chứa của phòng.	Homestay: Homestay APhòng: Phòng đơnNgày đến: 20/10/2023Ngày đi: 22/10/2023Số khách: 2Thông tin khách hàng: Họ tên, email, số điện thoại	1. Chọn homestay và phòng.
22. Chọn ngày đến và ngày đi.
23. Nhập số khách (lớn hơn sức chứa của phòng).
24. Nhấn nút "Đặt phòng".	Hiển thị thông báo "Số khách vượt quá sức chứa của phòng", không cho phép đặt phòng.	Hiển thị thông báo "Số khách vượt quá sức chứa của phòng", không cho phép đặt phòng.	Thành công
    …
25. Đánh giá kết quả kiểm thử
    Bảng 11 Bảng tổng hợp kết quả kiểm thử
    STT	Phân loại	Chức năng	Số testcase	Kết quả
    1	Kiểm thử chức năng	Chủ homestay thêm phòng	7	7/7
    2		Khách hàng lên kế hoạch du lịch với AI	7	7/7
    3		Khách hàng đặt phòng	6	6/6
    4			
    5			
    6			
    7			
    8
