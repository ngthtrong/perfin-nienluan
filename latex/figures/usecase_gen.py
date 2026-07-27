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
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DRAWIO_DIR = os.path.join(HERE, "drawio")

# fill, stroke, font
COLORS = {
    "blue":   ("#EEF2F7", "#5B7290", "#22303F"),
    "green":  ("#E6F4EA", "#2E7D46", "#1B4429"),
    "purple": ("#F0EAF9", "#7C5CBF", "#3A2A5F"),
    "yellow": ("#FBF3D9", "#B08900", "#5A4700"),
    "gray":   ("#EAEEF2", "#6B7A89", "#2C3440"),
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
        f"fontColor={font};fontSize=17;fontStyle=1;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, 58, 104)


def usecase(cid, label, x, y, w=330, h=72, color="green", dashed=False):
    fill, stroke, font = COLORS[color]
    d = "dashed=1;" if dashed else ""
    style = (
        f"ellipse;whiteSpace=wrap;html=1;{d}fillColor={fill};strokeColor={stroke};"
        f"fontColor={font};fontSize=18;strokeWidth=1.2;spacing=6;"
    )
    return _cell(cid, label, style, x, y, w, h)


def boundary(cid, label, x, y, w, h):
    style = (
        "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=center;"
        "fontStyle=1;fontSize=18;fillColor=none;strokeColor=#5B7290;"
        "fontColor=#22303F;spacingTop=7;strokeWidth=1.2;dashed=0;"
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
        "text;html=1;align=left;verticalAlign=middle;fontSize=20;"
        "fontColor=#22303F;fontStyle=1;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, w, h)


def subtitle(cid, label, x, y, w, h):
    style = (
        "text;html=1;align=left;verticalAlign=middle;fontSize=11;"
        "fontColor=#5A6A78;whiteSpace=wrap;"
    )
    return _cell(cid, label, style, x, y, w, h)


def _edge(cid, src, tgt, style, label="", exit_xy=None, entry_xy=None,
          points=None, label_x=None, label_dy=0):
    pts = ""
    if exit_xy is not None:
        pts += f"exitX={exit_xy[0]};exitY={exit_xy[1]};exitDx=0;exitDy=0;"
    if entry_xy is not None:
        pts += f"entryX={entry_xy[0]};entryY={entry_xy[1]};entryDx=0;entryDy=0;"
    full = style + pts
    # Nhãn được neo vào một đoạn cụ thể của đường (label_x) để không dồn
    # thành chồng chữ ở gốc chùm tia.
    geo_attrs = 'relative="1" as="geometry"'
    if label_x is not None:
        geo_attrs = f'x="{label_x}" relative="1" as="geometry"'
    inner = ""
    if label_dy:
        inner += (
            f'            <mxPoint as="offset" x="0" y="{label_dy}" />\n'
        )
    if points:
        inner += '            <Array as="points">\n'
        for px, py in points:
            inner += f'              <mxPoint x="{px}" y="{py}" />\n'
        inner += "            </Array>\n"
    if inner:
        geo = (
            f"          <mxGeometry {geo_attrs}>\n{inner}"
            f"          </mxGeometry>\n"
        )
    else:
        geo = f"          <mxGeometry {geo_attrs} />\n"
    return (
        f'        <mxCell id="{esc(cid)}" value="{esc(label)}" style="{full}" '
        f'edge="1" parent="1" source="{esc(src)}" target="{esc(tgt)}">\n'
        f"{geo}"
        f'        </mxCell>'
    )


def assoc(cid, src, tgt, label="", exit_xy=None, entry_xy=None, color="#5B7290",
          points=None, ortho=False):
    # UML association: đường thẳng hoặc gấp khúc vuông góc, không bo cung,
    # không mũi tên.
    es = "orthogonalEdgeStyle" if ortho else "none"
    style = (
        f"edgeStyle={es};curved=0;rounded=0;html=1;endArrow=none;"
        f"strokeColor={color};fontColor=#3D4B5A;fontSize=14;strokeWidth=1.2;"
        f"labelBackgroundColor=#FFFFFF;"
    )
    return _edge(cid, src, tgt, style, label, exit_xy, entry_xy, points=points)


def rel(cid, src, tgt, kind, exit_xy=None, entry_xy=None, ortho=False,
        color="#7C5CBF", points=None, label_x=None, label_dy=0):
    # <<include>>/<<extend>>: nét đứt, mũi tên hở. Với <<extend>> hướng mũi
    # tên luôn đi từ use case mở rộng về use case cơ sở.
    label = f"&lt;&lt;{kind}&gt;&gt;"
    es = "orthogonalEdgeStyle" if ortho else "none"
    style = (
        f"edgeStyle={es};curved=0;rounded=0;html=1;dashed=1;endArrow=open;"
        f"endFill=0;strokeColor={color};fontColor={color};fontSize=13;strokeWidth=1.2;"
        f"fontStyle=2;labelBackgroundColor=#FFFFFF;"
    )
    return _edge(cid, src, tgt, style, label, exit_xy, entry_xy, points=points,
                 label_x=label_x, label_dy=label_dy)


def legend(cid, x, y, items, title_text="Chú giải màu", width=280, row_h=22,
           swatch_w=26):
    """Khối chú giải màu; màu đã mang nghĩa thì bắt buộc có legend."""
    h = 34 + len(items) * row_h + 8
    out = [_cell(
        cid, title_text,
        "rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;"
        "spacingTop=6;spacingLeft=9;fillColor=#FFFFFF;strokeColor=#9AA7B4;"
        "fontColor=#3D4B5A;fontSize=13;fontStyle=1;strokeWidth=1;dashed=0;",
        x, y, width, h)]
    for i, (color_name, meaning) in enumerate(items):
        fill, stroke, _ = COLORS[color_name]
        ry = y + 30 + i * row_h
        out.append(_cell(
            f"{cid}-s{i}", "",
            f"rounded=0;html=1;fillColor={fill};strokeColor={stroke};"
            "strokeWidth=1.2;",
            x + 9, ry, swatch_w, 14))
        out.append(_cell(
            f"{cid}-t{i}", meaning,
            "text;html=1;align=left;verticalAlign=middle;fontSize=12;"
            "fontColor=#3D4B5A;whiteSpace=wrap;",
            x + 9 + swatch_w + 7, ry - 4, width - swatch_w - 30, 22))
    return out


def legend_line(cid, x, y, items, title_text="Chú giải ký hiệu", width=280,
                row_h=26):
    """Chú giải kiểu đường: mỗi dòng là một đoạn mẫu kèm ý nghĩa."""
    h = 34 + len(items) * row_h + 8
    out = [_cell(
        cid, title_text,
        "rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;"
        "spacingTop=6;spacingLeft=9;fillColor=#FFFFFF;strokeColor=#9AA7B4;"
        "fontColor=#3D4B5A;fontSize=13;fontStyle=1;strokeWidth=1;dashed=0;",
        x, y, width, h)]
    for i, (style_spec, meaning) in enumerate(items):
        ry = y + 32 + i * row_h
        out.append(
            f'        <mxCell id="{esc(cid)}-l{i}" value="" '
            f'style="{style_spec}html=1;strokeWidth=1.4;" edge="1" parent="1">\n'
            f'          <mxGeometry relative="1" as="geometry">\n'
            f'            <mxPoint x="{x + 12}" y="{ry}" as="sourcePoint" />\n'
            f'            <mxPoint x="{x + 62}" y="{ry}" as="targetPoint" />\n'
            f"          </mxGeometry>\n"
            f"        </mxCell>")
        out.append(_cell(
            f"{cid}-t{i}", meaning,
            "text;html=1;align=left;verticalAlign=middle;fontSize=12;"
            "fontColor=#3D4B5A;whiteSpace=wrap;",
            x + 74, ry - row_h // 2 + 2, width - 86, row_h))
    return out


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
def group_box(cid, label, x, y, w, h, color="blue"):
    """Khung nhóm chức năng bên trong biên hệ thống."""
    fill, stroke, font = COLORS[color]
    style = (
        "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;"
        f"spacingLeft=12;spacingTop=6;fontStyle=1;fontSize=14;fillColor=none;"
        f"strokeColor={stroke};fontColor={font};strokeWidth=1;dashed=1;"
    )
    return _cell(cid, label, style, x, y, w, h)


def note_box(cid, label, x, y, w, h):
    style = (
        "rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;"
        "spacingTop=6;spacingLeft=9;spacingRight=8;fillColor=#F7F9FB;"
        "strokeColor=#9AA7B4;fontColor=#3D4B5A;fontSize=12;strokeWidth=1;"
        "dashed=1;"
    )
    return _cell(cid, label, style, x, y, w, h)


def diagram_overview():
    """Use case tổng thể: mỗi tác nhân xuất hiện đúng một lần.

    Bố cục dọc theo bốn nhóm chức năng. Association của cùng một tác nhân
    được gom vào một trục dọc rồi rẽ ngang vào từng use case (đường gấp khúc
    vuông góc), thay cho chùm tia toả từ một điểm. Các use case liên quan tới
    cùng một tác nhân phụ được đặt liền kề nên hai trục dọc bên phải không
    chồng khoảng y và không có cạnh nào cắt nhau.
    """
    W, H = 1260, 1360
    UC_X, UC_W, UC_H = 416, 608, 64
    STEP = 82
    HDR = 34                     # chiều cao dải tiêu đề của khung nhóm
    cells = []
    cells.append(title("t", "Sơ đồ use case tổng thể hệ thống PERFIN",
                       40, 18, 1000, 30))
    cells.append(subtitle(
        "st",
        "Mỗi tác nhân được vẽ đúng một ký hiệu duy nhất theo quy tắc UML. "
        "Use case được xếp theo bốn nhóm chức năng; chi tiết từng nhóm nằm ở "
        "các sơ đồ FR-01 đến FR-12.",
        40, 52, 1080, 34))

    groups = [
        ("gA", "Nhóm 1 · Thu nhận và hiểu đầu vào", "blue", [
            ("uc1", "FR-01 · Nhập giao dịch bằng văn bản tự nhiên", "purple"),
            ("uc2", "FR-02 · Nhập giao dịch bằng ảnh và giọng nói", "purple"),
            ("uc3", "FR-03 · Clarification và giao dịch chờ xác nhận",
             "yellow"),
            ("uc4", "FR-04 · Phân loại và học từ phản hồi", "green"),
        ]),
        ("gB", "Nhóm 2 · Quản lý sổ cái", "green", [
            ("uc5", "FR-05 · Quản lý giao dịch, ví và danh mục", "green"),
            ("uc6", "FR-06 · Chuyển ví và dòng tiền đặc biệt", "green"),
        ]),
        ("gC", "Nhóm 3 · Phân tích, insight và kế hoạch", "green", [
            ("uc8", "FR-08 · Sinh insight có căn cứ và persona", "purple"),
            ("uc7", "FR-07 · Phân tích dữ liệu tài chính", "green"),
            ("uc9", "FR-09 · Ngân sách, đề xuất và dự báo", "green"),
            ("uc10", "FR-10 · Mục tiêu tài chính và mô phỏng what-if",
             "green"),
        ]),
        ("gD", "Nhóm 4 · Vận hành chủ động và dữ liệu ra", "yellow", [
            ("uc11", "FR-11 · Khoản định kỳ và tác vụ chủ động", "green"),
            ("uc12", "FR-12 · Xuất dữ liệu và dọn tệp hết hạn", "green"),
        ]),
    ]

    # Tính toạ độ từng hàng và tâm dọc của mỗi use case.
    center = {}
    order = []
    y = 132
    for gid, glabel, gcolor, rows in groups:
        gh = len(rows) * STEP + HDR
        cells.append(group_box(gid, glabel, UC_X - 20, y, UC_W + 40, gh,
                               gcolor))
        for j, (cid, label, color) in enumerate(rows):
            ry = y + HDR - 4 + j * STEP
            cells.append(usecase(cid, label, UC_X, ry, UC_W, UC_H, color))
            center[cid] = ry + UC_H // 2
            order.append(cid)
        y += gh + 18
    bnd_bottom = y - 18 + 20

    cells.append(boundary("bnd", "Hệ thống PERFIN (API + dịch vụ nghiệp vụ)",
                          380, 100, 680, bnd_bottom - 100))

    # Tác nhân chính: một ký hiệu duy nhất, gom association vào trục x=356.
    all_ids = order
    user_cy = (center[all_ids[0]] + center[all_ids[-1]]) // 2
    cells.append(actor("aUser", "Người dùng", 70, user_cy - 52, "blue"))
    for i, cid in enumerate(all_ids):
        cells.append(assoc(f"eu{i}", "aUser", cid, exit_xy=(1, 0.5),
                           entry_xy=(0, 0.5), ortho=True,
                           points=[(356, center[cid])]))

    # Hai tác nhân phụ ở bên phải, mỗi tác nhân một trục dọc riêng. Các use
    # case đích được đặt liền kề nên hai trục không chồng khoảng y.
    secondary = [
        ("aAI", "Dịch vụ AI ngoài", "purple", True, 1084,
         ["uc1", "uc2", "uc8"]),
        ("aWorker", "Worker nền", "yellow", False, 1108,
         ["uc7", "uc11", "uc12"]),
    ]
    for aid, label, color, dashed, corridor, targets in secondary:
        cys = [center[t] for t in targets]
        cells.append(actor(aid, label, 1140,
                           (min(cys) + max(cys)) // 2 - 52, color, dashed))
        for t in targets:
            cells.append(assoc(f"e{aid}_{t}", aid, t, exit_xy=(0, 0.5),
                               entry_xy=(1, 0.5), color=STROKE[color],
                               ortho=True, points=[(corridor, center[t])]))

    cells.extend(legend("lg", 40, 132, [
        ("blue", "Tác nhân và tương tác người dùng"),
        ("green", "Use case xử lý xác định trong lõi"),
        ("purple", "Use case phụ thuộc thành phần LLM / AI"),
        ("yellow", "Use case do worker nền hoặc state store"),
    ], width=300))
    cells.extend(legend_line("lgl", 40, 306, [
        ("edgeStyle=none;endArrow=none;rounded=0;strokeColor=#5B7290;",
         "Association giữa tác nhân và use case"),
        ("edgeStyle=orthogonalEdgeStyle;endArrow=none;rounded=0;"
         "strokeColor=#B08900;",
         "Association gấp khúc vuông góc, dùng trục dọc chung cho cùng một "
         "tác nhân"),
        ("edgeStyle=none;endArrow=none;rounded=0;dashed=1;"
         "strokeColor=#7C5CBF;",
         "Nét đứt: tác nhân hoặc dịch vụ nằm ngoài biên hệ thống"),
    ], width=300, row_h=42))
    cells.append(note_box(
        "n1",
        "Cách đọc: mỗi tác nhân chỉ có một ký hiệu; đường nối rời tác nhân, "
        "đi vào trục dọc riêng của tác nhân đó rồi rẽ ngang vào từng use "
        "case. Nhờ vậy không có cạnh nào cắt nhau và không cần vẽ trùng tác "
        "nhân ở hai phía.",
        40, 520, 300, 132))
    cells.append(note_box(
        "n2",
        "Thứ tự use case trong mỗi nhóm được xếp sao cho các use case cùng "
        "tác nhân phụ nằm liền kề, nên hai trục dọc bên phải không chồng "
        "khoảng chiều dọc. Số hiệu FR vẫn giữ nguyên để tra cứu sang "
        "Chương 3.",
        40, 900, 300, 132))
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


def _ellipse_anchor(deg):
    """Điểm neo nằm đúng trên chu vi ellipse, trả về toạ độ tương đối.

    ``deg`` đo từ trục ngang phải, dương là hướng lên. Nhờ dùng nhiều góc
    khác nhau, các quan hệ include/extend không còn toả ra từ một điểm duy
    nhất trên use case cơ sở (chùm tia) mà phân bố quanh chu vi.
    """
    a = math.radians(deg)
    return (round(0.5 + 0.5 * math.cos(a), 4),
            round(0.5 - 0.5 * math.sin(a), 4))


def diagram_fr(spec):
    # Hằng số bố cục.
    PAGE_W = 1400
    TITLE_H = 92
    A_X = 56                          # tác nhân chính
    MAIN_X, MAIN_W, MAIN_H = 220, 350, 108
    SUB_X, SUB_W, SUB_H = 756, 430, 78
    SEC_X = 1256                      # tác nhân phụ
    COR_L, COR_R = 592, 728           # dải hành lang dọc giữa hai cột
    GAP = 14
    SUB_Y0 = TITLE_H + 18

    subs = spec["subs"]
    n = len(subs)
    col_bottom = SUB_Y0 + n * SUB_H + (n - 1) * GAP
    cy = (SUB_Y0 + col_bottom) / 2.0
    sub_cy = [SUB_Y0 + i * (SUB_H + GAP) + SUB_H / 2 for i in range(n)]

    cells = []
    cells.append(title("t", spec["title"], 40, 18, PAGE_W - 80, 30))
    cells.append(subtitle("st", spec["sub"], 40, 52, PAGE_W - 120, 32))

    # Biên hệ thống.
    bnd_x = MAIN_X - 40
    bnd_y = SUB_Y0 - 28
    bnd_w = (SUB_X + SUB_W) - bnd_x + 40
    bnd_h = (col_bottom - bnd_y) + 30
    cells.append(boundary("bnd", "Hệ thống PERFIN", bnd_x, bnd_y,
                          bnd_w, bnd_h))

    # Use case cơ sở, căn giữa theo cột use case con.
    main_label, main_color = spec["main"]
    main_y = int(cy - MAIN_H / 2)
    cells.append(usecase("main", main_label, MAIN_X, main_y,
                         MAIN_W, MAIN_H, main_color))

    # Cột use case con.
    sub_ids = []
    for i, (label, color, kind) in enumerate(subs):
        sid = f"s{i}"
        sub_ids.append(sid)
        cells.append(usecase(sid, label, SUB_X, int(sub_cy[i] - SUB_H / 2),
                             SUB_W, SUB_H, color))

    # Tác nhân chính.
    cells.append(actor("aUser", "Người dùng", A_X, int(cy - 52), "blue"))
    cells.append(assoc("eUser", "aUser", "main",
                       exit_xy=(1, 0.5), entry_xy=(0, 0.5)))

    # Hành lang dọc: use case con càng xa tâm càng dùng hành lang gần use case
    # cơ sở. Thứ tự lồng nhau này bảo đảm không có hai đoạn nào cắt nhau.
    rank = sorted(range(n), key=lambda i: -abs(sub_cy[i] - cy))
    corridor = {}
    span = (COR_R - COR_L) if n > 1 else 0
    for pos, i in enumerate(rank):
        corridor[i] = COR_L + (pos * span // max(n - 1, 1))

    # Góc neo trên chu vi ellipse, phân bố từ trên xuống dưới cùng thứ tự với
    # cột use case con nên các đường không đảo nhau.
    if n > 1:
        angles = [72.0 - i * (144.0 / (n - 1)) for i in range(n)]
    else:
        angles = [0.0]

    for i, (label, color, kind) in enumerate(subs):
        sid = sub_ids[i]
        anchor = _ellipse_anchor(angles[i])
        c = STROKE["purple"] if kind == "include" else STROKE["yellow"]
        cx = corridor[i]
        if kind == "include":
            # main -> sub: rẽ vào hành lang riêng rồi đi ngang vào use case con.
            cells.append(rel(
                f"r{i}", "main", sid, "include", ortho=True,
                exit_xy=anchor, entry_xy=(0, 0.5), color=c,
                points=[(cx, int(main_y + anchor[1] * MAIN_H)),
                        (cx, int(sub_cy[i]))],
                label_x=0.55, label_dy=-11))
        else:
            # Hướng <<extend>>: từ use case mở rộng về use case cơ sở.
            cells.append(rel(
                f"r{i}", sid, "main", "extend", ortho=True,
                exit_xy=(0, 0.5), entry_xy=anchor, color=c,
                points=[(cx, int(sub_cy[i])),
                        (cx, int(main_y + anchor[1] * MAIN_H))],
                label_x=-0.55, label_dy=-11))

    # Tác nhân phụ ở bên phải, mỗi tác nhân một hành lang dọc riêng.
    for k, sa in enumerate(spec["sec"]):
        aid = f"aSec{k}"
        tgts = sa["targets"]
        tys = [cy if t == "main" else sub_cy[t] for t in tgts]
        sec_cy = sum(tys) / len(tys)
        cells.append(actor(aid, sa["name"], SEC_X, int(sec_cy - 52),
                           sa["color"], dashed=sa["dashed"]))
        cx = SUB_X + SUB_W + 14 + k * 22
        for t in tgts:
            if t == "main":
                # Đi vòng phía trên biên để không cắt qua cột use case con.
                cells.append(assoc(
                    f"eSec{k}_main", aid, "main", exit_xy=(0.5, 0),
                    entry_xy=(0.5, 0), color=STROKE[sa["color"]], ortho=True,
                    points=[(SEC_X + 29, bnd_y - 22),
                            (MAIN_X + MAIN_W // 2, bnd_y - 22)]))
                continue
            pts = [(cx, int(sub_cy[t]))] if len(tgts) > 1 else None
            cells.append(assoc(
                f"eSec{k}_{t}", aid, sub_ids[t], exit_xy=(0, 0.5),
                entry_xy=(1, 0.5), color=STROKE[sa["color"]],
                ortho=len(tgts) > 1, points=pts))

    # Chú giải: chỉ liệt kê những màu thực sự xuất hiện trong hình này.
    meanings = [
        ("blue", "Tác nhân và tương tác người dùng"),
        ("green", "Bước xử lý xác định trong lõi hệ thống"),
        ("purple", "Bước phụ thuộc LLM hoặc dịch vụ AI ngoài"),
        ("yellow", "Trạng thái tạm, hàng đợi, worker nền"),
        ("red", "Nhánh từ chối hoặc lỗi có kiểm soát"),
    ]
    used = {main_color} | {c for _, c, _ in subs} | {s["color"] for s in spec["sec"]}
    lg_y = col_bottom + 46
    cells.extend(legend("lg", 40, lg_y,
                        [(c, m) for c, m in meanings if c in used],
                        width=396))
    cells.extend(legend_line("lgl", 468, lg_y, [
        ("edgeStyle=none;endArrow=none;rounded=0;strokeColor=#5B7290;",
         "Association giữa tác nhân và use case"),
        ("edgeStyle=orthogonalEdgeStyle;dashed=1;endArrow=open;endFill=0;"
         "rounded=0;strokeColor=#7C5CBF;",
         "&lt;&lt;include&gt;&gt;: mũi tên từ use case cơ sở tới bước bắt buộc"),
        ("edgeStyle=orthogonalEdgeStyle;dashed=1;endArrow=open;endFill=0;"
         "rounded=0;strokeColor=#B08900;",
         "&lt;&lt;extend&gt;&gt;: mũi tên từ use case mở rộng về use case cơ sở"),
    ], width=470, row_h=28))
    cells.append(note_box(
        "n1",
        "Cách đọc: mỗi quan hệ rời use case cơ sở tại một điểm riêng trên chu "
        "vi, đi theo hành lang dọc riêng rồi rẽ ngang vào use case con. Nhãn "
        "stereotype đặt trên đoạn ngang của chính đường đó nên không có chữ "
        "nào chồng lên nhau.",
        962, lg_y, 396, 120))

    page_h = int(lg_y + 152 + 28)
    return build(spec["did"], spec["num"] + " use case", PAGE_W, page_h, cells)


def write_all():
    write("14-usecase-overview", diagram_overview())
    for spec in FR_SPECS:
        write(spec["basename"], diagram_fr(spec))


if __name__ == "__main__":
    write_all()
