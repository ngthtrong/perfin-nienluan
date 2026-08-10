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
    """Landscape 2x2 overview with actors outside the system boundary."""
    W, H = 1600, 950
    cells = [
        title("t", "PERFIN Overall Use Case Diagram", 40, 18, 1000, 30),
        subtitle(
            "st",
            "Twelve observable goals are grouped by domain; parsing, validation, TTL and transaction details remain in flow tables and sequence diagrams.",
            40, 52, 1420, 34),
        boundary("bnd", "PERFIN System (API and Business Services)", 190, 100, 1210, 680),
    ]

    groups = [
        ("gA", "Group 1 · Input Capture and Understanding", "blue", 230, 145, [
            ("uc1", "FR-01 · Natural-Language Transactions", "purple"),
            ("uc2", "FR-02 · Image and Speech Transactions", "purple"),
            ("uc3", "FR-03 · Clarify and Confirm Pending Items", "yellow"),
            ("uc4", "FR-04 · Classify and Learn from Corrections", "green"),
        ]),
        ("gB", "Group 2 · Ledger Management", "green", 840, 145, [
            ("uc5", "FR-05 · Transactions, Wallets and Categories", "green"),
            ("uc6", "FR-06 · Transfers and Special Cash Flows", "green"),
        ]),
        ("gC", "Group 3 · Analytics, Insights and Planning", "green", 230, 470, [
            ("uc7", "FR-07 · Analyze Financial Data", "green"),
            ("uc8", "FR-08 · Generate Grounded Insights", "purple"),
            ("uc9", "FR-09 · Manage and Forecast Budgets", "green"),
            ("uc10", "FR-10 · Plan Goals and What-if Scenarios", "green"),
        ]),
        ("gD", "Group 4 · Proactive Operations and Output", "yellow", 840, 470, [
            ("uc11", "FR-11 · Recurring Bills and Proactive Jobs", "green"),
            ("uc12", "FR-12 · Export and Remove Expired Files", "green"),
        ]),
    ]

    positions = {}
    for gid, glabel, gcolor, gx, gy, rows in groups:
        gh = 270 if len(rows) == 4 else 190
        cells.append(group_box(gid, glabel, gx, gy, 520, gh, gcolor))
        for idx, (cid, label, color) in enumerate(rows):
            col, row = idx % 2, idx // 2
            ux, uy = gx + 25 + col * 245, gy + 55 + row * 95
            cells.append(usecase(cid, label, ux, uy, 225, 68, color))
            positions[cid] = (ux, uy, ux + 112, uy + 34, col, gx, gy)

    cells.append(actor("aAI", "External AI Services", 65, 155, "purple", True))
    cells.append(actor("aUser", "User", 65, 390, "blue"))
    cells.append(actor("aWorker", "Background Worker", 1470, 555, "yellow"))

    # At overview level, one association to a package means the actor
    # participates in every use case contained by that package. This removes
    # twelve stacked lines without changing the detailed FR ownership tables.
    cells.append(assoc("euA", "aUser", "gA", exit_xy=(1, 0.45), entry_xy=(0, 0.65), ortho=True, points=[(205, 320)]))
    cells.append(assoc("euC", "aUser", "gC", exit_xy=(1, 0.6), entry_xy=(0, 0.35), ortho=True, points=[(205, 565)]))
    cells.append(assoc("euB", "aUser", "gB", exit_xy=(1, 0.35), entry_xy=(0.5, 0), ortho=True, points=[(175, 110), (1100, 110)]))
    cells.append(assoc("euD", "aUser", "gD", exit_xy=(1, 0.7), entry_xy=(0.5, 1), ortho=True, points=[(175, 770), (1100, 770)]))
    cells.append(assoc("eaiA", "aAI", "gA", exit_xy=(1, 0.45), entry_xy=(0, 0.25), color=STROKE["purple"], ortho=True, points=[(180, 215)]))
    cells.append(assoc("eaiC", "aAI", "gC", exit_xy=(1, 0.6), entry_xy=(0, 0.2), color=STROKE["purple"], ortho=True, points=[(165, 525)]))
    cells.append(assoc("ewD", "aWorker", "gD", exit_xy=(0, 0.5), entry_xy=(1, 0.55), color=STROKE["yellow"], ortho=True, points=[(1430, 620)]))

    cells.extend(legend("lg", 190, 800, [
        ("blue", "User interaction"),
        ("green", "Deterministic-core goal"),
        ("purple", "AI-assisted goal / external AI actor"),
        ("yellow", "TTL state or background operation"),
    ], width=520, row_h=22))
    cells.append(note_box(
        "n1",
        "Actors appear once. A group-level association means participation in every contained use case; FR identifiers preserve traceability to Chapter 3.",
        760, 800, 640, 76))
    return build("14-usecase-overview", "Use case overview", W, H, cells)


# --------------------------------------------------------------------------
def write_all():
    write("14-usecase-overview", diagram_overview())


if __name__ == "__main__":
    write_all()
