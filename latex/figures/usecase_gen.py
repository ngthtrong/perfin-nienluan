#!/usr/bin/env python3
"""Generator for PERFIN UML use case diagrams (.drawio XML).

Produces one overall/system use case diagram plus one detailed use case
diagram per functional requirement (FR-01..FR-12). All diagrams share the
project color convention (see figures/README.md) and use only straight /
orthogonal, non-crossing connector lines per the lecturer's requirement:
  - blue   : user / UI / interaction
  - green  : deterministic data / algorithm use cases (backend authoritative)
  - purple : LLM / parser / probabilistic components (outside trust boundary)
  - yellow : state store / queue / decision / infrastructure
  - dashed border : services outside the system trust boundary

Coordinates are assigned explicitly so association fans never cross:
association/include/extend lines all leave one shared point on the base and
spread to targets stacked top-to-bottom, which cannot cross each other.

Run from latex/figures/:  python3 usecase_gen.py
Writes into drawio/  (basenames 14-* .. 26-*).
"""
import html
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DRAWIO_DIR = os.path.join(HERE, "drawio")

# fill, stroke, font
COLORS = {
    "blue":   ("#EAF2FB", "#3E6E9E", "#1E3A52"),
    "green":  ("#E6F4EA", "#2E7D46", "#1B4429"),
    "purple": ("#F0EAF9", "#7C5CBF", "#3A2A5F"),
    "yellow": ("#FBF3D9", "#B08900", "#5A4700"),
    "gray":   ("#EEF1F4", "#6B7A89", "#2C3440"),
    "red":    ("#FCEDED", "#C97A7A", "#5A2A2A"),
}
STROKE = {k: v[1] for k, v in COLORS.items()}


def esc(s):
    return html.escape(str(s), quote=True)


def _cell(cid, value, style, x, y, w, h):
    return (
        f'        <mxCell id="{esc(cid)}" value="{esc(value)}" style="{style}" '
        f'vertex="1" parent="1">\n'
        f'          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n'
        f'        </mxCell>'
    )


def actor(cid, label, x, y, color="blue", dashed=False):
    fill, stroke, font = COLORS[color]
    d = "dashed=1;" if dashed else ""
    style = (
        f"shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;"
        f"html=1;outlineConnect=0;{d}fillColor={fill};strokeColor={stroke};"
        f"fontColor={font};fontSize=12;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, 46, 90)


def usecase(cid, label, x, y, w=300, h=64, color="green", dashed=False):
    fill, stroke, font = COLORS[color]
    d = "dashed=1;" if dashed else ""
    style = (
        f"ellipse;whiteSpace=wrap;html=1;{d}fillColor={fill};strokeColor={stroke};"
        f"fontColor={font};fontSize=12;"
    )
    return _cell(cid, label, style, x, y, w, h)


def boundary(cid, label, x, y, w, h):
    style = (
        "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=center;"
        "fontStyle=1;fontSize=14;fillColor=none;strokeColor=#5B7290;"
        "fontColor=#22303F;spacingTop=6;dashed=0;"
    )
    return _cell(cid, label, style, x, y, w, h)


def note(cid, label, x, y, w, h, align="left"):
    style = (
        f"text;html=1;align={align};verticalAlign=middle;fontSize=11;"
        f"fontColor=#5A6A78;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, w, h)


def title(cid, label, x, y, w, h):
    style = (
        "text;html=1;align=left;verticalAlign=middle;fontSize=15;"
        "fontColor=#22303F;fontStyle=1;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, w, h)


def subtitle(cid, label, x, y, w, h):
    style = (
        "text;html=1;align=left;verticalAlign=middle;fontSize=11;"
        "fontColor=#5A6A78;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, w, h)


def _edge(cid, src, tgt, style, label="", exit_xy=None, entry_xy=None):
    pts = ""
    if exit_xy is not None:
        pts += f"exitX={exit_xy[0]};exitY={exit_xy[1]};exitDx=0;exitDy=0;"
    if entry_xy is not None:
        pts += f"entryX={entry_xy[0]};entryY={entry_xy[1]};entryDx=0;entryDy=0;"
    full = style + pts
    return (
        f'        <mxCell id="{esc(cid)}" value="{esc(label)}" style="{full}" '
        f'edge="1" parent="1" source="{esc(src)}" target="{esc(tgt)}">\n'
        f'          <mxGeometry relative="1" as="geometry" />\n'
        f'        </mxCell>'
    )


def assoc(cid, src, tgt, label="", exit_xy=None, entry_xy=None, color="#5B7290"):
    # UML association: straight line, no arrowhead, not curved.
    style = (
        f"edgeStyle=none;curved=0;rounded=0;html=1;endArrow=none;"
        f"strokeColor={color};fontColor=#3D4B5A;fontSize=10;"
        f"labelBackgroundColor=#FFFFFF;"
    )
    return _edge(cid, src, tgt, style, label, exit_xy, entry_xy)


def rel(cid, src, tgt, kind, exit_xy=None, entry_xy=None, ortho=False,
        color="#7C5CBF"):
    # <<include>>/<<extend>>: dashed open-arrow, straight (default) so a fan
    # from one shared base point cannot cross.
    label = f"&lt;&lt;{kind}&gt;&gt;"
    es = "orthogonalEdgeStyle" if ortho else "none"
    style = (
        f"edgeStyle={es};curved=0;rounded=0;html=1;dashed=1;endArrow=open;"
        f"endFill=0;strokeColor={color};fontColor={color};fontSize=10;"
        f"fontStyle=2;labelBackgroundColor=#FFFFFF;"
    )
    return _edge(cid, src, tgt, style, label, exit_xy, entry_xy)


def build(diagram_id, name, w, h, cells):
    body = "\n".join(cells)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="26.0.0">
  <diagram id="{diagram_id}" name="{esc(name)}">
    <mxGraphModel dx="900" dy="700" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{w}" pageHeight="{h}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

{body}

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""


def write(basename, xml):
    path = os.path.join(DRAWIO_DIR, basename + ".drawio")
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml)
    print("wrote", path)


# --------------------------------------------------------------------------
# 14 - Overall / system use case diagram
# --------------------------------------------------------------------------
def diagram_overview():
    W, H = 1160, 1460
    cells = []
    cells.append(title("t", "Sơ đồ use case tổng thể hệ thống PERFIN",
                        40, 20, 760, 26))
    cells.append(subtitle(
        "st",
        "Biên hệ thống là API và dịch vụ nghiệp vụ PERFIN; người dùng thao "
        "tác qua ứng dụng di động (REST/JSON). Dịch vụ AI ngoài và worker "
        "nền là tác nhân phụ.",
        40, 46, 1000, 34))

    bx, by, bw, bh = 420, 96, 470, 1250
    cells.append(boundary("bnd",
                          "Hệ thống PERFIN\n(API + dịch vụ nghiệp vụ)",
                          bx, by, bw, bh))

    # Use cases grouped by actor affinity so association fans never cross.
    # (AI-related at top, user-only in middle, worker-related at bottom.)
    ux = 470
    uw = 300
    row0 = 150
    step = 96
    uc = [
        ("uc1", "FR-01 · Nhập giao dịch bằng văn bản tự nhiên", "purple"),
        ("uc2", "FR-02 · Nhập giao dịch bằng ảnh và giọng nói", "purple"),
        ("uc8", "FR-08 · Sinh insight có căn cứ và persona", "purple"),
        ("uc3", "FR-03 · Clarification và giao dịch chờ xác nhận", "yellow"),
        ("uc4", "FR-04 · Phân loại và học từ phản hồi", "green"),
        ("uc5", "FR-05 · Quản lý giao dịch, ví và danh mục", "green"),
        ("uc6", "FR-06 · Chuyển ví và dòng tiền đặc biệt", "green"),
        ("uc9", "FR-09 · Ngân sách, đề xuất và dự báo", "green"),
        ("uc10", "FR-10 · Mục tiêu tài chính và mô phỏng what-if", "green"),
        ("uc7", "FR-07 · Phân tích dữ liệu tài chính", "green"),
        ("uc11", "FR-11 · Khoản định kỳ và tác vụ chủ động", "green"),
        ("uc12", "FR-12 · Xuất dữ liệu và dọn tệp hết hạn", "green"),
    ]
    ys = {}
    for i, (cid, label, color) in enumerate(uc):
        y = row0 + i * step
        ys[cid] = y
        cells.append(usecase(cid, label, ux, y, uw, 66, color))

    # Actors
    user_y = 620
    cells.append(actor("aUser", "Người dùng", 120, user_y, "blue"))
    ai_y = 210
    cells.append(actor("aAI", "Dịch vụ AI ngoài\n(LLM · OCR · STT)",
                        980, ai_y, "purple", dashed=True))
    wk_y = 1120
    cells.append(actor("aWk", "Worker nền", 980, wk_y, "yellow"))
    adm_y = 1360
    cells.append(actor("aAdm", "Quản trị viên phát triển",
                       660, adm_y, "gray", dashed=True))

    # User associates with all 12 (fan from left, no crossings)
    for i, (cid, _, _) in enumerate(uc):
        cells.append(assoc(f"eu{i}", "aUser", cid,
                           exit_xy=(1, 0.5), entry_xy=(0, 0.5)))
    # AI -> FR-01, FR-02, FR-08 (top three rows -> no crossing)
    for cid in ("uc1", "uc2", "uc8"):
        cells.append(assoc(f"eai_{cid}", "aAI", cid,
                           exit_xy=(0, 0.5), entry_xy=(1, 0.5),
                           color="#7C5CBF"))
    # Worker -> FR-07, FR-11, FR-12 (bottom three rows -> no crossing)
    for cid in ("uc7", "uc11", "uc12"):
        cells.append(assoc(f"ewk_{cid}", "aWk", cid,
                           exit_xy=(0, 0.5), entry_xy=(1, 0.5),
                           color="#B08900"))
    # Dev admin: config association to system boundary bottom edge
    cells.append(assoc("eadm", "aAdm", "bnd", "cấu hình provider / migration",
                       exit_xy=(0.5, 0), entry_xy=(0.6, 1), color="#9AA7B4"))

    # Legend
    ly = 1400
    cells.append(note("lg", "Tím: liên quan LLM/OCR/STT · "
                      "Vàng: trạng thái/hạ tầng · Xanh lá: giải thuật xác "
                      "định · Viền nét đứt: ngoài biên tin cậy.",
                      40, ly, 1080, 30))

    return build("14-usecase-overview", "Use case overview", W, H, cells)


# --------------------------------------------------------------------------
# Per-FR detailed use case diagrams (template)
# --------------------------------------------------------------------------
# Each spec:
#   basename, diagram_id, num  -> file identity
#   title, subtitle           -> heading text
#   main  = (label, color)    -> central use case (colored as in overview)
#   subs  = [(label, color, kind)]  kind in {"include","extend"}
#   sec   = [ {name, color, dashed, targets:[sub-index or "main"]} ]
#           secondary actors on the right; targets index into subs (0-based)
#           or the literal "main".

FR_SPECS = [
    dict(
        basename="15-usecase-fr01", did="15-usecase-fr01", num="FR-01",
        title="FR-01 · Nhập giao dịch bằng văn bản tự nhiên",
        sub="Người dùng gửi câu chat/endpoint phân tích; LLM hoặc parser cục "
            "bộ chỉ đề xuất đối số, backend áp quy tắc sổ cái và chỉ ghi sau "
            "bản xem trước.",
        main=("Nhập giao dịch bằng văn bản tự nhiên", "purple"),
        subs=[
            ("Trích xuất trường bằng LLM structured output / parser cục bộ",
             "purple", "include"),
            ("Chuẩn hóa tiền và ngày", "green", "include"),
            ("Ánh xạ danh mục và ví trong phạm vi hồ sơ", "green", "include"),
            ("Tạo bản xem trước và pending_id (FR-03)", "yellow", "include"),
            ("Chuyển sang clarification khi thiếu/mơ hồ trường", "yellow",
             "extend"),
            ("Trích xuất và commit batch tất-cả-hoặc-không", "green",
             "extend"),
            ("Từ chối ngày tương lai / tham chiếu ngoài phạm vi", "red",
             "extend"),
        ],
        sec=[dict(name="Dịch vụ AI ngoài\n(LLM / parser)", color="purple",
                  dashed=True, targets=[0])],
    ),
    dict(
        basename="16-usecase-fr02", did="16-usecase-fr02", num="FR-02",
        title="FR-02 · Nhập giao dịch bằng ảnh và giọng nói",
        sub="Ảnh hóa đơn hoặc âm thanh tiếng Việt được chuyển thành văn bản "
            "kiểm tra được rồi tái sử dụng pipeline FR-01; chưa đối soát tổng "
            "hóa đơn.",
        main=("Nhập giao dịch bằng ảnh và giọng nói", "purple"),
        subs=[
            ("Kiểm tra loại tệp và kích thước (≤ 10 MB)", "green", "include"),
            ("Gọi OCR / STT lấy raw text và transcript", "purple", "include"),
            ("Hiển thị và cho sửa transcript / raw text", "blue", "include"),
            ("Trích xuất trường và tái dùng pipeline FR-01", "green",
             "include"),
            ("Chọn lưu tổng hóa đơn hoặc từng mặt hàng", "green", "extend"),
            ("Từ chối tệp sai loại / quá cỡ / upload lỗi", "red", "extend"),
            ("Sinh lỗi thật khi provider không trả văn bản", "red", "extend"),
        ],
        sec=[dict(name="Dịch vụ AI ngoài\n(OCR / STT)", color="purple",
                  dashed=True, targets=[1])],
    ),
    dict(
        basename="17-usecase-fr03", did="17-usecase-fr03", num="FR-03",
        title="FR-03 · Clarification và giao dịch chờ xác nhận",
        sub="Thu thập trường thiếu qua nhiều lượt và ngăn ghi dữ liệu suy "
            "đoán; state và pending nằm trong KV store với TTL 5 phút.",
        main=("Quản lý giao dịch chờ xác nhận", "yellow"),
        subs=[
            ("Lưu state / pending có TTL 5 phút", "yellow", "include"),
            ("Bổ sung trường thiếu (merge và validation lại)", "green",
             "include"),
            ("Sửa bản xem trước (lấy–cập nhật–đặt có kiểm soát)", "green",
             "include"),
            ("Xác nhận bằng claim nguyên tử một lần", "green", "include"),
            ("Hủy và xóa state", "yellow", "extend"),
            ("Từ chối pending hết hạn / sai ID / đã claim", "red", "extend"),
        ],
        sec=[],
    ),
    dict(
        basename="18-usecase-fr04", did="18-usecase-fr04", num="FR-04",
        title="FR-04 · Phân loại danh mục và học từ phản hồi",
        sub="Chọn danh mục có thể giải thích, thích nghi với sửa sai cá nhân "
            "nhưng không học từ tín hiệu không chắc chắn.",
        main=("Phân loại danh mục giao dịch", "green"),
        subs=[
            ("Chuẩn hóa chuỗi (bỏ dấu, hạ chữ, gộp khoảng trắng)", "green",
             "include"),
            ("So khớp exact → alias exact → fuzzy", "green", "include"),
            ("Áp ngưỡng 0,90 / 0,82 và margin ≥ 0,08", "green", "include"),
            ("Dùng correction gần input làm few-shot context", "purple",
             "extend"),
            ("Ghi cặp cũ–đúng best-effort sau commit", "green", "extend"),
            ("Fallback \"Khác\" khi mơ hồ / xung đột", "yellow", "extend"),
        ],
        sec=[dict(name="Dịch vụ AI ngoài\n(LLM few-shot)", color="purple",
                  dashed=True, targets=[3])],
    ),
    dict(
        basename="19-usecase-fr05", did="19-usecase-fr05", num="FR-05",
        title="FR-05 · Quản lý giao dịch, ví và danh mục",
        sub="Duy trì sổ cái có thể sửa, soft delete, khôi phục và truy vấn "
            "mà không làm sai số dư.",
        main=("Quản lý giao dịch, ví và danh mục", "green"),
        subs=[
            ("Validation miền dữ liệu và tham chiếu hồ sơ", "green",
             "include"),
            ("Cập nhật số dư nguyên tử trong một transaction", "green",
             "include"),
            ("Soft delete và khôi phục áp tác động đúng một lần", "green",
             "include"),
            ("Lọc theo kỳ / loại / danh mục / ví và phân trang", "blue",
             "extend"),
            ("Cho phép số dư ví âm sau chi", "green", "extend"),
            ("Đổi danh mục không đổi số dư", "green", "extend"),
        ],
        sec=[],
    ),
    dict(
        basename="20-usecase-fr06", did="20-usecase-fr06", num="FR-06",
        title="FR-06 · Chuyển ví và dòng tiền đặc biệt",
        sub="Ghi transfer và dòng tiền đầu tư mà không tạo debit/credit dở "
            "dang; không kiểm tra đủ số dư, ví nguồn được phép âm.",
        main=("Chuyển ví nguyên tử", "green"),
        subs=[
            ("Khóa hai ví theo thứ tự cố định", "green", "include"),
            ("Debit nguồn, credit đích, ghi wallet_transfers (một transaction)",
             "green", "include"),
            ("Giữ bất biến tổng thay đổi bằng 0", "green", "include"),
            ("Ghi lãi/lỗ đầu tư cho ví investment/savings", "green", "extend"),
            ("Từ chối hai ví trùng / thiếu / ngoài hồ sơ", "red", "extend"),
            ("Rollback cả ba hiệu ứng khi lỗi giữa bước", "red", "extend"),
        ],
        sec=[],
    ),
    dict(
        basename="21-usecase-fr07", did="21-usecase-fr07", num="FR-07",
        title="FR-07 · Phân tích dữ liệu tài chính",
        sub="Biến lịch sử giao dịch thành dữ kiện định lượng bằng giải thuật "
            "xác định; chạy khi mở báo cáo hoặc worker quét định kỳ.",
        main=("Phân tích dữ liệu tài chính", "green"),
        subs=[
            ("Tính trend (slope, R² ≥ 0,5, tăng ≥ 10%)", "green", "include"),
            ("Phát hiện anomaly phía chi (z ≥ 2,5 / IQR)", "green",
             "include"),
            ("Tính runway 14 ngày lịch", "green", "include"),
            ("Khai thác recurring (cửa sổ 90 ngày)", "green", "include"),
            ("Tính tương quan dương r ≥ 0,6", "green", "include"),
            ("Ghi degraded_components và trả null khi thiếu dữ liệu",
             "yellow", "extend"),
        ],
        sec=[dict(name="Worker nền", color="yellow", dashed=False,
                  targets=["main"])],
    ),
    dict(
        basename="22-usecase-fr08", did="22-usecase-fr08", num="FR-08",
        title="FR-08 · Insight có căn cứ và persona",
        sub="Diễn giải facts FR-07 bằng ngôn ngữ dễ hiểu mà không giao phép "
            "tính cho LLM; response luôn kèm facts để đối chiếu.",
        main=("Sinh insight có căn cứ và persona", "purple"),
        subs=[
            ("Lấy facts xác định từ FR-07", "green", "include"),
            ("Tạo lời khuyên tổng quan bằng quy tắc xác định", "green",
             "include"),
            ("Diễn giải theo persona (chỉ đổi cách nói)", "purple",
             "include"),
            ("Trả kèm facts, provider và metadata", "green", "include"),
            ("Template fallback khi LLM không khả dụng", "yellow", "extend"),
            ("Grounding checker số liệu (thiết kế đích)", "purple", "extend"),
        ],
        sec=[dict(name="Dịch vụ AI ngoài\n(LLM narrator)", color="purple",
                  dashed=True, targets=[2])],
    ),
    dict(
        basename="23-usecase-fr09", did="23-usecase-fr09", num="FR-09",
        title="FR-09 · Ngân sách, đề xuất và dự báo",
        sub="Theo dõi hạn mức, dự báo nguy cơ vượt và đề xuất dựa trên lịch "
            "sử thay vì để LLM tự chọn số; chỉ áp dụng khi xác nhận.",
        main=("Quản lý ngân sách và dự báo", "green"),
        subs=[
            ("CRUD ngân sách có validation category / kỳ / limit", "green",
             "include"),
            ("Tính progress và forecast (spent/elapsed × days)", "green",
             "include"),
            ("Đề xuất category_average / 50-30-20 / hybrid", "green",
             "include"),
            ("Cảnh báo khi dưới 3 tháng dữ liệu", "yellow", "extend"),
            ("Áp dụng theo lô nguyên tử khi confirmed=true", "green",
             "extend"),
            ("Fallback trung bình khi thiếu income", "yellow", "extend"),
        ],
        sec=[],
    ),
    dict(
        basename="24-usecase-fr10", did="24-usecase-fr10", num="FR-10",
        title="FR-10 · Mục tiêu tài chính và mô phỏng what-if",
        sub="Tính mức góp, thời gian hoàn thành và kịch bản bằng hàm xác "
            "định; endpoint plan không ghi DB, cấp token ký 15 phút.",
        main=("Lập kế hoạch mục tiêu tài chính", "green"),
        subs=[
            ("Tính mức góp và thời gian (saving / purchase)", "green",
             "include"),
            ("Mô phỏng niên kim trả nợ theo tháng", "green", "include"),
            ("Cấp token ký theo payload (hạn 15 phút)", "yellow", "include"),
            ("Mô phỏng what-if không ghi DB", "green", "extend"),
            ("Cờ negative amortization khi trả không đủ lãi", "red",
             "extend"),
            ("Chỉ lưu khi token còn hạn và fingerprint khớp", "yellow",
             "extend"),
        ],
        sec=[],
    ),
    dict(
        basename="25-usecase-fr11", did="25-usecase-fr11", num="FR-11",
        title="FR-11 · Khoản định kỳ và tác vụ chủ động",
        sub="Quản lý lịch chi lặp, ghi thanh toán nhất quán và tạo nhắc / "
            "insight không trùng khi retry.",
        main=("Quản lý khoản định kỳ và tác vụ nền", "green"),
        subs=[
            ("Tính ngày đến hạn theo chu kỳ và kẹp cuối tháng", "green",
             "include"),
            ("Thanh toán nguyên tử (expense + trừ ví + payment + next_due)",
             "green", "include"),
            ("Scheduler upsert lịch, retry ≤ 3 lần backoff", "yellow",
             "include"),
            ("Dedup theo event key / fingerprint và unique index", "yellow",
             "extend"),
            ("Gợi ý recurring mining", "green", "extend"),
            ("Ví sau payment được phép âm", "green", "extend"),
        ],
        sec=[dict(name="Worker nền", color="yellow", dashed=False,
                  targets=[2])],
    ),
    dict(
        basename="26-usecase-fr12", did="26-usecase-fr12", num="FR-12",
        title="FR-12 · Xuất dữ liệu, lịch sử tệp và dọn dẹp",
        sub="Cho người dùng lấy dữ liệu theo bộ lọc, theo dõi tệp đã tạo và "
            "dọn tệp hết hạn; luồng nhãn PDF hiện tạo HTML.",
        main=("Xuất dữ liệu và quản lý tệp", "green"),
        subs=[
            ("Xuất CSV UTF-8 có BOM, escape ký tự đặc biệt", "green",
             "include"),
            ("Lưu export_history với TTL mặc định 7 ngày", "yellow",
             "include"),
            ("Lọc theo hồ sơ / format / khoảng ngày", "green", "include"),
            ("Luồng nhãn \"PDF\" trả .html / text/html", "yellow", "extend"),
            ("Worker dọn tệp quá hạn, giữ metadata", "yellow", "extend"),
            ("Từ chối khi không có dữ liệu phù hợp", "red", "extend"),
        ],
        sec=[dict(name="Worker nền", color="yellow", dashed=False,
                  targets=[4])],
    ),
]


def diagram_fr(spec):
    # Layout constants.
    PAGE_W = 1240
    TITLE_H = 120
    A_X = 60            # primary actor x
    MAIN_X, MAIN_W, MAIN_H = 250, 340, 104
    SUB_X, SUB_W, SUB_H = 740, 400, 74
    SEC_X = 1150        # secondary actor x
    GAP = 30
    SUB_Y0 = TITLE_H + 20

    subs = spec["subs"]
    n = len(subs)
    col_bottom = SUB_Y0 + n * SUB_H + (n - 1) * GAP
    cy = (SUB_Y0 + col_bottom) / 2.0

    cells = []
    cells.append(title("t", spec["title"], 40, 20, PAGE_W - 80, 26))
    cells.append(subtitle("st", spec["sub"], 40, 50, PAGE_W - 80, 50))

    # Boundary around use cases.
    bnd_x = MAIN_X - 40
    bnd_y = SUB_Y0 - 40
    bnd_w = (SUB_X + SUB_W) - bnd_x + 40
    bnd_h = (col_bottom - bnd_y) + 40
    cells.append(boundary("bnd", "Hệ thống PERFIN", bnd_x, bnd_y,
                          bnd_w, bnd_h))

    # Main use case (vertically centered against the sub column).
    main_label, main_color = spec["main"]
    main_y = int(cy - MAIN_H / 2)
    cells.append(usecase("main", main_label, MAIN_X, main_y,
                         MAIN_W, MAIN_H, main_color))

    # Sub use cases stacked.
    sub_ids = []
    for i, (label, color, kind) in enumerate(subs):
        sid = f"s{i}"
        sub_ids.append(sid)
        y = SUB_Y0 + i * (SUB_H + GAP)
        cells.append(usecase(sid, label, SUB_X, y, SUB_W, SUB_H, color))

    # Primary actor (Người dùng), centered against main UC.
    a_y = int(cy - 45)
    cells.append(actor("aUser", "Người dùng", A_X, a_y, "blue"))
    cells.append(assoc("eUser", "aUser", "main",
                       exit_xy=(1, 0.5), entry_xy=(0, 0.5)))

    # include / extend fans from a shared point on main's right edge.
    for i, (label, color, kind) in enumerate(subs):
        sid = sub_ids[i]
        c = STROKE["purple"] if kind == "include" else STROKE["yellow"]
        if kind == "include":
            cells.append(rel(f"r{i}", "main", sid, "include",
                             exit_xy=(1, 0.5), entry_xy=(0, 0.5), color=c))
        else:
            cells.append(rel(f"r{i}", sid, "main", "extend",
                             exit_xy=(0, 0.5), entry_xy=(1, 0.5), color=c))

    # Secondary actors on the right, connecting to their target sub-UCs.
    for k, sa in enumerate(spec["sec"]):
        aid = f"aSec{k}"
        tgts = sa["targets"]
        # place actor at the vertical center of its targets
        tys = []
        for t in tgts:
            if t == "main":
                tys.append(cy)
            else:
                tys.append(SUB_Y0 + t * (SUB_H + GAP) + SUB_H / 2)
        sec_cy = sum(tys) / len(tys)
        cells.append(actor(aid, sa["name"], SEC_X, int(sec_cy - 45),
                           sa["color"], dashed=sa["dashed"]))
        for t in tgts:
            tgt = "main" if t == "main" else sub_ids[t]
            entry = (1, 0.5)
            cells.append(assoc(f"eSec{k}_{t}", aid, tgt,
                               exit_xy=(0, 0.5), entry_xy=entry,
                               color=STROKE[sa["color"]]))

    # Legend.
    ly = col_bottom + 30
    cells.append(note(
        "lg",
        "Nét đứt mở &lt;&lt;include&gt;&gt;: bước bắt buộc · "
        "&lt;&lt;extend&gt;&gt;: nhánh tùy chọn/ngoại lệ · "
        "Tím: LLM/parser · Xanh lá: giải thuật xác định · "
        "Vàng: trạng thái/hạ tầng · Đỏ: từ chối/rollback · "
        "Viền nét đứt: tác nhân ngoài biên tin cậy.",
        40, ly, PAGE_W - 80, 46))

    page_h = int(ly + 60)
    return build(spec["did"], spec["num"] + " use case", PAGE_W, page_h, cells)


def write_all():
    write("14-usecase-overview", diagram_overview())
    for spec in FR_SPECS:
        write(spec["basename"], diagram_fr(spec))


if __name__ == "__main__":
    write_all()
