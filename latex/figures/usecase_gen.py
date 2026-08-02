#!/usr/bin/env python3
"""Generator for the PERFIN overall UML use case diagram (.drawio XML).

The report intentionally keeps one system-level use case diagram. Detailed
FR behavior is documented with normal/sub/alternate-flow tables. The diagram
shares the project color convention (see figures/README.md) and uses only straight /
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
Writes ``drawio/14-usecase-overview.drawio``.
"""
import html
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


def legend(cid, x, y, items, title_text="Color Legend", width=280, row_h=22,
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


def legend_line(cid, x, y, items, title_text="Notation Legend", width=280,
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
    """Overall use case: each actor is drawn exactly once.

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
    cells.append(title("t", "PERFIN Overall Use Case Diagram",
                       40, 18, 1000, 30))
    cells.append(subtitle(
        "st",
        "Each actor appears once. The twelve observable goals are grouped by "
        "domain; detailed behavior is specified with flow tables in Chapter 3.",
        40, 52, 1080, 34))

    groups = [
        ("gA", "Group 1 · Input Capture and Understanding", "blue", [
            ("uc1", "FR-01 · Enter Transactions from Natural-Language Text", "purple"),
            ("uc2", "FR-02 · Enter Transactions from Images and Speech", "purple"),
            ("uc3", "FR-03 · Clarify and Confirm Pending Transactions",
             "yellow"),
            ("uc4", "FR-04 · Classify and Learn from Corrections", "green"),
        ]),
        ("gB", "Group 2 · Ledger Management", "green", [
            ("uc5", "FR-05 · Manage Transactions, Wallets and Categories", "green"),
            ("uc6", "FR-06 · Transfer Funds and Record Special Cash Flows", "green"),
        ]),
        ("gC", "Group 3 · Analytics, Insights and Planning", "green", [
            ("uc8", "FR-08 · Generate Grounded Insights", "purple"),
            ("uc7", "FR-07 · Analyze Financial Data", "green"),
            ("uc9", "FR-09 · Manage and Forecast Budgets", "green"),
            ("uc10", "FR-10 · Plan Goals and Run What-if Scenarios",
             "green"),
        ]),
        ("gD", "Group 4 · Proactive Operations and Data Output", "yellow", [
            ("uc11", "FR-11 · Manage Recurring Bills and Proactive Jobs", "green"),
            ("uc12", "FR-12 · Export Data and Remove Expired Files", "green"),
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

    cells.append(boundary("bnd", "PERFIN System (API and Business Services)",
                          380, 100, 680, bnd_bottom - 100))

    # Tác nhân chính: một ký hiệu duy nhất, gom association vào trục x=356.
    all_ids = order
    user_cy = (center[all_ids[0]] + center[all_ids[-1]]) // 2
    cells.append(actor("aUser", "User", 70, user_cy - 52, "blue"))
    for i, cid in enumerate(all_ids):
        cells.append(assoc(f"eu{i}", "aUser", cid, exit_xy=(1, 0.5),
                           entry_xy=(0, 0.5), ortho=True,
                           points=[(356, center[cid])]))

    # Hai tác nhân phụ ở bên phải, mỗi tác nhân một trục dọc riêng. Các use
    # case đích được đặt liền kề nên hai trục không chồng khoảng y.
    secondary = [
        ("aAI", "External AI Services", "purple", True, 1084,
         ["uc1", "uc2", "uc8"]),
        ("aWorker", "Background Worker", "yellow", False, 1108,
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
        ("blue", "User actor and interaction"),
        ("green", "Deterministic-core use case"),
        ("purple", "Use case assisted by an external AI service"),
        ("yellow", "Use case involving state or a background worker"),
    ], width=300))
    cells.extend(legend_line("lgl", 40, 306, [
        ("edgeStyle=none;endArrow=none;rounded=0;strokeColor=#5B7290;",
         "Actor-to-use-case association"),
        ("edgeStyle=orthogonalEdgeStyle;endArrow=none;rounded=0;"
         "strokeColor=#B08900;",
         "Orthogonal association using one corridor per actor"),
        ("edgeStyle=none;endArrow=none;rounded=0;dashed=1;"
         "strokeColor=#7C5CBF;",
         "Dashed actor: service outside the system boundary"),
    ], width=300, row_h=42))
    cells.append(note_box(
        "n1",
        "How to read: each actor appears once. Its associations use a dedicated "
        "vertical corridor and branch horizontally to the related use cases, "
        "which avoids crossing connectors.",
        40, 520, 300, 132))
    cells.append(note_box(
        "n2",
        "FR identifiers are preserved for traceability to Chapter 3. Parser, "
        "validation, TTL and transaction steps are intentionally documented "
        "in sequence diagrams and flow tables instead of as use cases.",
        40, 900, 300, 132))
    return build("14-usecase-overview", "Use case overview", W, H, cells)


# --------------------------------------------------------------------------
def write_all():
    write("14-usecase-overview", diagram_overview())


if __name__ == "__main__":
    write_all()
