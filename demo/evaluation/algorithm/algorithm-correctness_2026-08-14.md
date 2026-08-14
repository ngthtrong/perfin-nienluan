# Algorithm correctness evidence

- Run: 2026-08-14T02:29:28.858Z
- Commit: `c18e160` · working tree dirty: yes
- Node.js: `v24.16.0` · timezone: `Asia/Ho_Chi_Minh`
- Fixture SHA-256: `034da9f98fe92df36bc91bbcbd3df1c46069c285e18fc77eed5bfa7ca516ff55`
- Passed: 8/8

| ID | Group | Objective | Status |
|---|---|---|---|
| ALG-01 | trend | OLS trend trả slope, R² và dự báo kế tiếp đúng với chuỗi tuyến tính. | **Pass** |
| ALG-02 | anomaly | Phát hiện điểm chi tiêu bất thường ở phía trên và giữ thứ tự theo giá trị. | **Pass** |
| ALG-03 | boundary | Ca biên không đủ mẫu trả về kết quả trung tính, không phát sinh lỗi. | **Pass** |
| ALG-04 | runway | Runway giữ ngày không chi tiêu trong mẫu số và tính ngày cạn tiền đúng. | **Pass** |
| ALG-05 | correlation | Pearson loại cặp cùng bằng 0 và báo đúng số quan sát hữu hiệu. | **Pass** |
| ALG-06 | aggregation | Tổng hợp chuỗi tháng giữ kỳ rỗng và bất biến theo thứ tự giao dịch. | **Pass** |
| ALG-07 | invariant | 1000 ca sinh ngẫu nhiên xác nhận ngân sách sau làm tròn không vượt trần. | **Pass** |
| ALG-08 | invariant | 1000 ca sinh ngẫu nhiên xác nhận tăng đóng góp không kéo dài kế hoạch. | **Pass** |

The cases cover ordinary, boundary, exception-sensitive and invariant behavior of deterministic algorithm modules. The classification benchmark is reported separately because it evaluates parser predictions over the labeled CSV snapshot.
