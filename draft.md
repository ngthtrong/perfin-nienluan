Đánh giá tổng quan
Đây là một báo cáo chất lượng cao, vượt mặt bằng chung của niên luận cơ sở ngành. Điểm nổi bật nhất là sự trung thực họcuật: báo cáo phân biệt rõ "đã hiện thực / đã đo / mục tiêu / thiết kế đích / ngoài phạm vi" (Bảng 1) và tuân thủ quy ước đó xuyên suốt. Đây là thứ hiếm gặp — phần lớn báo cáo sinh viên hay biến kỳ vọng thành kết quả, còn báo cáo này chủ động chống lại điều đó.

Đối chiếu với guideline giảng viên
Cấu trúc chương mục: Khớp gần như tuyệt đối với Guideline-report.md. Có đủ Cover → Abstract → TOC (4 cấp) → Danh mục bảng/hình → Từ viết tắt → Ch1 (Đặt vấn đề + Mục tiêu) → Ch2 (Cơ sở lý thuyết) → Ch3 (SRS + Thiết kế + Kiểm thử) → Ch4 (Kết luận) → References (IEEE) → Appendices. Đánh số outline 3.1.2.1 chuẩn.

Lưu ý 1 — trọng tâm dữ liệu & giải thuật (thay vì app đầy đủ chức năng): Đáp ứng rất tốt. Ch2 trình bày ~15 công thức toán (Levenshtein, Dice, hồi quy OLS + R², z-score/IQR, Pearson, runway, amortization niên kim, budget 50/30/20). chapter2.tex chính là điểm mạnh học thuật. Bảng 9 còn phân nhóm chức năng theo "vai trò trong niên luận", đặt CRUD/dashboard xuống hàng phụ — đúng tinh thần niên luận cơ sở.

Lưu ý 2 — lý luận lựa chọn công nghệ: Đáp ứng tốt qua Bảng 6 (mỗi công nghệ có "lý do phù hợp" + "phương án thay thế"). Ví dụ PostgreSQL vs NoSQL, BullMQ vs cron, Redis không làm nguồn sự thật.

Lưu ý 3 — sơ đồ dùng mũi tên thẳng, không cong, không chồng chéo: Báo cáo có ý thức xử lý điều này. chapter3.tex:363 và dòng 369 giải thích rõ kỹ thuật "lặp hộp User làm neo" để tránh đường chéo/cong. Đây là điểm tôi chưa kiểm chứng được bằng mắt — cần bạn mở 13 file trong latex_vn/figures/rendered/ xác nhận thực tế mũi tên đã thẳng.

Điểm mạnh cụ thể
Giải thuật được đặc tả ở mức có thể kiểm thử — mỗi công thức kèm điều kiện biên (mẫu số = 0, s = 0, IQR = 0, B ≤ 0). Đây là chất lượng kỹ thuật thật.
Ranh giới LLM rõ ràng (Bảng 5, Hình 6) — luận điểm trung tâm "LM không phải nguồn chân lý cho phép tính" được bảo vệ nhất quán từ abstract đến kết luận.
Truy vết FR → công thức → test case (TC-FRxx-yy) theo tinh thần IEEE 830.
Kết quả trình bày đúng phạm vi — Bảng 17 tách bạch "đã đo" (100/100 test, 5.265 dòng import) khỏi "chưa công bố" (accuracy Gemini/OCR/STT, p50/p95, UAT).
Điểm cần cải thiện

1. Đóng góp học thuật cốt lõi chưa được đo (quan trọng nhất). Toàn bộ chỉ số đánh giá AI/giải thuật quan trọng đều ở trạng thái "chưa công bố": accuracy trích xuất, macro-F1 phân loại, CER/WER, numeric faithfulness, ablation LLM-vs-parser. Với niên luận trọng tâm giải thuật, việc "31/31 strict pass" trên tập hard-coded không thay được benchmark trên tập gán nhãn độc lập. Báo cáo tự thừa nhận điều này (rất trung thực), nhưng khi bảo vệ, hội đồng nhiều khả năng sẽ hỏi thẳng: "Vậy giải thuật của em chính xác bao nhiêu?" — và hiện chưa có câu trả lời định lượng. Đây là việc cần ưu tiên làm trước khi nộp.
2. Chương 2 nặng công thức nhưng thiếu trích dẫn nền tảng. Levenshtein, Dice, z-score, Pearson, OLS, amortization đều là kỹ thuật kinh điển nhưng trình bày như kiến thức hiển nhiên. Chỉ có 12 tài liệu tham khảo, trong đó Tukey (IQR) là trích dẫn thống kê duy nhất. Nên bổ sung nguồn cho ít nhất Levenshtein và hồi quy tuyến tính để phần "cơ sở lý thuyết" đúng nghĩa.
3. Mục 2.7 "Nghiên cứu liên quan" quá mỏng. Chỉ ~2 đoạn, phân loại 3 nhóm hệ thống nhưng không nêu tên sản phẩm/nghiên cứu cụ thể (Money Lover, MISA, Mint, hay paper về NLP tài chính). Phần related work yếu là điểm dễ bị trừ.
4. Một số tuyên bố "đã đo" vẫn mong manh. "23/23 smoke test" với 2 ảnh + 1 file M4A là smoke test khả dụng, không phải bằng chứng chất lượng — báo cáo có nói rõ, nhưng con số 23/23 và 100/100 dễ bị hiểu nhầm nếu người đọc lướt qua.
5. Chi tiết kỹ thuật: Cover page dùng ảnh trỏ tới ../../archive/latex/images/ — cần xác nhận đường dẫn còn đúng sau khi tái cấu trúc sang latex_vn/. Ngoài ra guideline yêu cầu font Times New Roman/Arial, nhưng LaTeX đang dùng report class mặc định (Computer Modern) — nếu giảng viên chấm cả format thì cần đổi sang font đúng quy định.

Kết luận
Báo cáo này giỏi ở tư duy kỹ thuật và trung thực học thuật, nhưng chưa "đóng" được vòng thực nghiệm cho chính đóng góp cốt lõi của nó. Nghịch lý là: sự trung thực (thừa nhận chưa đo accuracy) vừa là điểm cộng lớn về đạo đức nghiên cứu, vừa là lỗ hổng lớn nhất về mặt kết quả.

Ưu tiên nếu còn thời gian trước khi nộp:

Chạy được ít nhất 1 trong 3 thí nghiệm ở mục 3.3.2.3 (khả thi nhất: fedback before/after hoặc ablation parser-vs-LLM trên ~50-100 câu gán nhãn).
Bổ sung related work có tên cụ thể + trích dẫn nền tảng cho các công thức.
Xác minh 13 sơ đồ đã dùng mũi tên thẳng (lưu ý 3 của giảng viên).
Bạn muốn tôi đi sâu vào phần nào — ví dụ soạn phần related work, hay dựng script chạy thí nghiệm ablation/feedback để lấp khoảng trống "chưa đo"?
