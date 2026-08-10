#!/usr/bin/env python3
"""Generate the normalized PERFIN diagrams 03--07, 09--10 and 12.

The report uses diagrams 01 and 02 as its visual baseline.  This generator
keeps the same restrained palette, typography and connector treatment while
laying each diagram out for the page orientation used by LaTeX.

Sequence diagrams 08, 11 and 13 are generated with the drawio-skill
``seqlayout.py`` helper from JSON specs, then normalized by
``sequence_style.py``.
"""

from __future__ import annotations

import html
import os
from urllib.parse import quote
from dataclasses import dataclass
from typing import Iterable, Sequence


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "drawio")
LOGO_DIR = os.path.join(HERE, "assets", "logos")


@dataclass(frozen=True)
class Color:
    fill: str
    stroke: str
    font: str


# Same semantic palette as diagrams 01 and 02.
COLORS = {
    "blue": Color("#EEF2F7", "#5B7290", "#22303F"),
    "green": Color("#E6F4EA", "#2E7D46", "#1B4429"),
    "purple": Color("#F0EAF9", "#7C5CBF", "#3A2A5F"),
    "yellow": Color("#FBF3D9", "#B08900", "#5A4700"),
    "red": Color("#FCEDED", "#C97A7A", "#5A2A2A"),
    "gray": Color("#EAEEF2", "#6B7A89", "#2C3440"),
    "orange": Color("#FDEBD7", "#C87A18", "#5A3512"),
}


def esc(value: object) -> str:
    return html.escape(str(value), quote=True).replace("\n", "&#xa;")


def style_join(*parts: str) -> str:
    return "".join(p if p.endswith(";") else p + ";" for p in parts if p)


def logo_data(name: str) -> str:
    with open(os.path.join(LOGO_DIR, f"{name}.svg"), encoding="utf-8") as fh:
        return "data:image/svg+xml," + quote(fh.read(), safe="")


def icon(
    cid: str,
    name: str,
    x: int,
    y: int,
    w: int,
    h: int,
    *,
    parent: str = "1",
    builtin: bool = False,
) -> str:
    image = name if builtin else logo_data(name)
    return cell(
        cid,
        "",
        style_join(
            "image",
            "aspect=fixed",
            "html=1",
            "strokeColor=none",
            "fillColor=none",
            f"image={image}",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def cell(
    cid: str,
    value: str,
    style: str,
    x: int,
    y: int,
    w: int,
    h: int,
    *,
    parent: str = "1",
) -> str:
    return (
        f'        <mxCell id="{esc(cid)}" value="{esc(value)}" '
        f'style="{style}" vertex="1" parent="{esc(parent)}">\n'
        f'          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" '
        f'as="geometry" />\n'
        f"        </mxCell>"
    )


def title(cid: str, value: str, x: int, y: int, w: int) -> str:
    return cell(
        cid,
        f"<b>{value}</b>",
        style_join(
            "text",
            "html=1",
            "align=left",
            "verticalAlign=middle",
            "fontSize=18",
            "fontColor=#22303F",
        ),
        x,
        y,
        w,
        28,
    )


def subtitle(cid: str, value: str, x: int, y: int, w: int) -> str:
    return cell(
        cid,
        value,
        style_join(
            "text",
            "html=1",
            "align=left",
            "verticalAlign=middle",
            "fontSize=12",
            "fontColor=#5A6A78",
            "whiteSpace=wrap",
        ),
        x,
        y,
        w,
        36,
    )


def box(
    cid: str,
    value: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "blue",
    *,
    dashed: bool = False,
    parent: str = "1",
    font_size: int = 13,
    bold: bool = False,
    align: str = "center",
) -> str:
    c = COLORS[color]
    label = f"<b>{value}</b>" if bold else value
    return cell(
        cid,
        label,
        style_join(
            "rounded=1",
            "arcSize=10",
            "whiteSpace=wrap",
            "html=1",
            "spacing=6",
            f"align={align}",
            "verticalAlign=middle",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            f"fontSize={font_size}",
            "strokeWidth=1.2",
            "dashed=1" if dashed else "",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def decision(
    cid: str,
    value: str,
    x: int,
    y: int,
    w: int = 150,
    h: int = 100,
    *,
    parent: str = "1",
) -> str:
    c = COLORS["yellow"]
    return cell(
        cid,
        value,
        style_join(
            "rhombus",
            "whiteSpace=wrap",
            "html=1",
            "spacing=5",
            "align=center",
            "verticalAlign=middle",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            "fontSize=13",
            "strokeWidth=1.2",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def terminal(
    cid: str,
    value: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "green",
    *,
    parent: str = "1",
) -> str:
    c = COLORS[color]
    return cell(
        cid,
        value,
        style_join(
            "ellipse",
            "whiteSpace=wrap",
            "html=1",
            "spacing=5",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            "fontSize=13",
            "strokeWidth=1.2",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def database(
    cid: str,
    value: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "green",
    *,
    parent: str = "1",
) -> str:
    c = COLORS[color]
    return cell(
        cid,
        value,
        style_join(
            "shape=cylinder3",
            "boundedLbl=1",
            "whiteSpace=wrap",
            "html=1",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            "fontSize=13",
            "strokeWidth=1.2",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def lane(
    cid: str,
    value: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "blue",
    *,
    dashed: bool = False,
    parent: str = "1",
    font_size: int = 14,
) -> str:
    c = COLORS[color]
    return cell(
        cid,
        value,
        style_join(
            "swimlane",
            "startSize=36",
            "horizontal=1",
            "container=1",
            "pointerEvents=0",
            "collapsible=0",
            "html=1",
            "rounded=0",
            f"fillColor={c.fill}",
            f"swimlaneFillColor=#FFFFFF",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            f"fontSize={font_size}",
            "fontStyle=1",
            "strokeWidth=1.2",
            "dashed=1" if dashed else "",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def card(
    cid: str,
    heading: str,
    lines: Sequence[str],
    x: int,
    y: int,
    w: int,
    h: int,
    color: str,
    *,
    parent: str = "1",
    font_size: int = 12,
) -> str:
    label = f"<b>{heading}</b>\n" + "\n".join(lines)
    c = COLORS[color]
    return cell(
        cid,
        label,
        style_join(
            "rounded=1",
            "arcSize=6",
            "whiteSpace=wrap",
            "html=1",
            "align=left",
            "verticalAlign=top",
            "spacingTop=7",
            "spacingLeft=9",
            "spacingRight=6",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            f"fontSize={font_size}",
            "strokeWidth=1.1",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def end_label(
    parent_edge: str,
    suffix: str,
    value: str,
    pos: float,
    *,
    color: str = "#3D4B5A",
    dy: int = -9,
) -> str:
    """Nhãn gắn ở một đầu cạnh (bội số UML, lực lượng ERD, role name).

    ``pos`` là toạ độ tương đối theo chiều dài cạnh: -1 là sát đầu nguồn,
    +1 là sát đầu đích.
    """
    style = style_join(
        "edgeLabel",
        "html=1",
        "align=center",
        "verticalAlign=middle",
        "resizable=0",
        "points=[]",
        "labelBackgroundColor=#FFFFFF",
        "fontSize=11",
        f"fontColor={color}",
    )
    return (
        f'        <mxCell id="{esc(parent_edge)}-{esc(suffix)}" '
        f'value="{esc(value)}" style="{style}" vertex="1" connectable="0" '
        f'parent="{esc(parent_edge)}">\n'
        f'          <mxGeometry x="{pos}" y="{dy}" relative="1" '
        f'as="geometry">\n'
        f'            <mxPoint as="offset" />\n'
        f"          </mxGeometry>\n"
        f"        </mxCell>"
    )


def edge(
    cid: str,
    source: str,
    target: str,
    label: str = "",
    *,
    color: str = "blue",
    dashed: bool = False,
    arrow: bool = True,
    exit_xy: tuple[float, float] | None = None,
    entry_xy: tuple[float, float] | None = None,
    points: Sequence[tuple[int, int]] | None = None,
    font_size: int = 11,
    end_arrow: str | None = None,
    start_arrow: str | None = None,
    start_fill: int = 1,
    src_label: str = "",
    tgt_label: str = "",
    src_pos: float = -0.78,
    tgt_pos: float = 0.78,
    label_dy: int = -9,
    label_offset: tuple[int, int] | None = None,
    label_pos: float = 0.0,
) -> str:
    c = COLORS[color]
    anchors = ""
    if exit_xy is not None:
        anchors += (
            f"exitX={exit_xy[0]};exitY={exit_xy[1]};exitDx=0;exitDy=0;"
        )
    if entry_xy is not None:
        anchors += (
            f"entryX={entry_xy[0]};entryY={entry_xy[1]};entryDx=0;entryDy=0;"
        )
    if end_arrow is not None:
        end_spec = f"endArrow={end_arrow};" + (
            "endFill=1;" if end_arrow not in ("none", "open", "openThin") else "endFill=0;"
        )
    else:
        end_spec = "endArrow=blockThin;endFill=1;" if arrow else "endArrow=none;"
    start_spec = ""
    if start_arrow is not None:
        start_spec = f"startArrow={start_arrow};startFill={start_fill};startSize=14;"
    style = style_join(
        "edgeStyle=orthogonalEdgeStyle",
        # rounded=0: đầu bài yêu cầu mũi tên liên kết là đường thẳng gấp khúc
        # vuông góc, không bo cung ở chỗ đổi hướng.
        "rounded=0",
        "curved=0",
        "orthogonalLoop=1",
        "jettySize=auto",
        "html=1",
        f"strokeColor={c.stroke}",
        f"fontColor={c.font}",
        f"fontSize={font_size}",
        "labelBackgroundColor=#FFFFFF",
        "strokeWidth=1.2",
        "dashed=1" if dashed else "",
        end_spec,
        start_spec,
        anchors,
    )
    if points:
        pts = "".join(f'<mxPoint x="{x}" y="{y}" />' for x, y in points)
        geometry = (
            '          <mxGeometry relative="1" as="geometry">\n'
            f'            <Array as="points">{pts}</Array>\n'
            "          </mxGeometry>"
        )
    else:
        geometry = '          <mxGeometry relative="1" as="geometry" />'
    # label_offset: đẩy nhãn ra khỏi thân cạnh bằng một edgeLabel con, dùng khi
    # nhãn dài chạy đè lên hộp lân cận nếu để mặc định giữa cạnh.
    edge_value = "" if (label and label_offset is not None) else label
    out = [
        f'        <mxCell id="{esc(cid)}" value="{esc(edge_value)}" '
        f'style="{style}" edge="1" parent="1" '
        f'source="{esc(source)}" target="{esc(target)}">\n'
        f"{geometry}\n"
        f"        </mxCell>"
    ]
    if label and label_offset is not None:
        lab_style = style_join(
            "edgeLabel",
            "html=1",
            "align=center",
            "verticalAlign=middle",
            "resizable=0",
            "points=[]",
            "labelBackgroundColor=#FFFFFF",
            f"fontSize={font_size}",
            f"fontColor={c.font}",
        )
        out.append(
            f'        <mxCell id="{esc(cid)}-ml" value="{esc(label)}" '
            f'style="{lab_style}" vertex="1" connectable="0" '
            f'parent="{esc(cid)}">\n'
            f'          <mxGeometry x="{label_pos}" relative="1" as="geometry">\n'
            f'            <mxPoint x="{label_offset[0]}" y="{label_offset[1]}" '
            f'as="offset" />\n'
            f"          </mxGeometry>\n"
            f"        </mxCell>"
        )
    if src_label:
        out.append(
            end_label(cid, "sl", src_label, src_pos, color=c.font, dy=label_dy)
        )
    if tgt_label:
        out.append(
            end_label(cid, "tl", tgt_label, tgt_pos, color=c.font, dy=label_dy)
        )
    return "\n".join(out)


def legend(
    cid: str,
    x: int,
    y: int,
    items: Sequence[tuple[str, str]],
    *,
    title_text: str = "Chú giải màu",
    width: int = 250,
    row_h: int = 22,
    swatch_w: int = 26,
) -> list[str]:
    """Khối chú giải: mỗi dòng là một ô màu kèm nghĩa của màu đó.

    ``items`` là danh sách ``(tên màu trong COLORS, nghĩa)``. Màu đang mang
    nghĩa nên bắt buộc phải có legend (yêu cầu của GVHD).
    """
    # Nghĩa của màu có thể dài hơn một dòng; tính chiều cao từng hàng theo số
    # dòng wrap thực tế để hàng sau không đè lên hàng trước hoặc lên tiêu đề.
    text_w = width - swatch_w - 30
    heights = [
        max(row_h, _wrapped_lines(meaning, text_w) * 15 + 8)
        for _, meaning in items
    ]
    tops: list[int] = []
    acc = 40
    for rh in heights:
        tops.append(acc)
        acc += rh
    h = acc + 8
    out = [
        cell(
            cid,
            title_text,
            style_join(
                "rounded=0",
                "whiteSpace=wrap",
                "html=1",
                "align=left",
                "verticalAlign=top",
                "spacingTop=6",
                "spacingLeft=9",
                "fillColor=#FFFFFF",
                "strokeColor=#9AA7B4",
                "fontColor=#3D4B5A",
                "fontSize=12",
                "fontStyle=1",
                "strokeWidth=1",
                "dashed=0",
            ),
            x,
            y,
            width,
            h,
        )
    ]
    for i, (color_name, meaning) in enumerate(items):
        c = COLORS[color_name]
        # Ô màu căn giữa theo chiều cao thực của hàng chữ tương ứng.
        ry = y + tops[i] + heights[i] // 2 - 7
        out.append(
            cell(
                f"{cid}-s{i}",
                "",
                style_join(
                    "rounded=0",
                    "html=1",
                    f"fillColor={c.fill}",
                    f"strokeColor={c.stroke}",
                    "strokeWidth=1.2",
                ),
                x + 9,
                ry,
                swatch_w,
                14,
            )
        )
        out.append(
            cell(
                f"{cid}-t{i}",
                meaning,
                style_join(
                    "text",
                    "html=1",
                    "align=left",
                    "verticalAlign=middle",
                    "fontSize=11",
                    "fontColor=#3D4B5A",
                    "whiteSpace=wrap",
                ),
                x + 9 + swatch_w + 7,
                y + tops[i],
                text_w,
                heights[i],
            )
        )
    return out


def _wrapped_lines(text: str, width_px: int, *, char_px: float = 6.05) -> int:
    """Số dòng ước lượng khi ``text`` được wrap trong ô rộng ``width_px``.

    draw.io wrap theo từ nên ước lượng bằng cách gom từ cho tới khi vượt bề
    rộng ô; dùng để tính chiều cao hàng chú giải thay vì giả định một dòng.
    """
    limit = max(1, int(width_px / char_px))
    lines, cur = 1, 0
    for word in text.split():
        need = len(word) if cur == 0 else cur + 1 + len(word)
        if need > limit and cur:
            lines += 1
            cur = len(word)
        else:
            cur = need
    return lines


def legend_line(
    cid: str,
    x: int,
    y: int,
    items: Sequence[tuple[str, str]],
    *,
    title_text: str = "Chú giải ký hiệu",
    width: int = 250,
    row_h: int = 24,
) -> list[str]:
    """Chú giải kiểu đường/ký hiệu: mỗi dòng là một đoạn mẫu kèm nghĩa."""
    # Nhãn dài sẽ wrap thành nhiều dòng nên chiều cao mỗi hàng phải tính theo
    # số dòng thực tế, nếu không hàng sau sẽ đè lên hàng trước và lên tiêu đề.
    text_w = width - 78
    heights = [
        max(row_h, _wrapped_lines(meaning, text_w) * 15 + 8)
        for _, meaning in items
    ]
    tops = []
    acc = 42
    for rh in heights:
        tops.append(acc)
        acc += rh
    h = acc + 8
    out = [
        cell(
            cid,
            title_text,
            style_join(
                "rounded=0",
                "whiteSpace=wrap",
                "html=1",
                "align=left",
                "verticalAlign=top",
                "spacingTop=6",
                "spacingLeft=9",
                "fillColor=#FFFFFF",
                "strokeColor=#9AA7B4",
                "fontColor=#3D4B5A",
                "fontSize=12",
                "fontStyle=1",
                "strokeWidth=1",
                "dashed=0",
            ),
            x,
            y,
            width,
            h,
        )
    ]
    for i, (style_spec, meaning) in enumerate(items):
        # Mẫu đường căn giữa theo chiều cao thực của hàng để luôn nằm ngang
        # hàng chữ tương ứng, kể cả khi chữ wrap hai dòng.
        ry = y + tops[i] + heights[i] // 2
        out.append(
            f'        <mxCell id="{esc(cid)}-l{i}" value="" '
            f'style="{style_spec}html=1;strokeWidth=1.4;strokeColor=#3D4B5A;" '
            f'edge="1" parent="1">\n'
            f'          <mxGeometry relative="1" as="geometry">\n'
            f'            <mxPoint x="{x + 12}" y="{ry}" as="sourcePoint" />\n'
            f'            <mxPoint x="{x + 60}" y="{ry}" as="targetPoint" />\n'
            f"          </mxGeometry>\n"
            f"        </mxCell>"
        )
        out.append(
            cell(
                f"{cid}-m{i}",
                meaning,
                style_join(
                    "text",
                    "html=1",
                    "align=left",
                    "verticalAlign=middle",
                    "fontSize=11",
                    "fontColor=#3D4B5A",
                    "whiteSpace=wrap",
                ),
                x + 68,
                y + tops[i],
                text_w,
                heights[i],
            )
        )
    return out


def erd_edge(
    cid: str,
    source: str,
    target: str,
    label: str,
    *,
    color: str = "green",
    src_card: str = "one",
    tgt_card: str = "many",
    dashed: bool = False,
    exit_xy: tuple[float, float] | None = None,
    entry_xy: tuple[float, float] | None = None,
    points: Sequence[tuple[int, int]] | None = None,
) -> str:
    """Cạnh ERD với ký hiệu chân chim (crow's foot) ở cả hai đầu.

    ``src_card``/``tgt_card`` nhận ``one``, ``many``, ``zero_one`` hoặc
    ``zero_many`` và được dịch sang shape ERx của draw.io, nhờ đó lực lượng
    quan hệ đọc được trực tiếp trên hình thay vì phải suy từ nhãn.
    """
    shapes = {
        "one": "ERone",
        "many": "ERmany",
        "zero_one": "ERzeroToOne",
        "zero_many": "ERzeroToMany",
    }
    c = COLORS[color]
    anchors = ""
    if exit_xy is not None:
        anchors += f"exitX={exit_xy[0]};exitY={exit_xy[1]};exitDx=0;exitDy=0;"
    if entry_xy is not None:
        anchors += f"entryX={entry_xy[0]};entryY={entry_xy[1]};entryDx=0;entryDy=0;"
    style = style_join(
        "edgeStyle=orthogonalEdgeStyle",
        "rounded=0",
        "curved=0",
        "orthogonalLoop=1",
        "jettySize=auto",
        "html=1",
        f"startArrow={shapes[src_card]}",
        "startFill=0",
        "startSize=14",
        f"endArrow={shapes[tgt_card]}",
        "endFill=0",
        "endSize=14",
        f"strokeColor={c.stroke}",
        f"fontColor={c.font}",
        "fontSize=13",
        "labelBackgroundColor=#FFFFFF",
        "strokeWidth=1.2",
        "dashed=1" if dashed else "",
        anchors,
    )
    if points:
        pts = "".join(f'<mxPoint x="{x}" y="{y}" />' for x, y in points)
        geometry = (
            '          <mxGeometry relative="1" as="geometry">\n'
            f'            <Array as="points">{pts}</Array>\n'
            "          </mxGeometry>"
        )
    else:
        geometry = '          <mxGeometry relative="1" as="geometry" />'
    return (
        f'        <mxCell id="{esc(cid)}" value="{esc(label)}" '
        f'style="{style}" edge="1" parent="1" '
        f'source="{esc(source)}" target="{esc(target)}">\n'
        f"{geometry}\n"
        f"        </mxCell>"
    )


def uml_node(
    cid: str,
    stereotype: str,
    name: str,
    detail: Sequence[str],
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "blue",
    *,
    dashed: bool = False,
    parent: str = "1",
) -> str:
    """Node triển khai UML: khối 3D kèm stereotype «device»/«execution environment»."""
    c = COLORS[color]
    lines = "\n".join(detail)
    label = f"«{stereotype}»\n<b>{name}</b>"
    if lines:
        label += "\n" + lines
    return cell(
        cid,
        label,
        style_join(
            "shape=cube",
            "boundedLbl=1",
            "backgroundOutline=1",
            "darkOpacity=0.05",
            "size=12",
            "whiteSpace=wrap",
            "html=1",
            "align=center",
            "verticalAlign=middle",
            "spacingLeft=8",
            "spacingTop=4",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            "fontSize=12",
            "strokeWidth=1.4",
            "dashed=1" if dashed else "",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def uml_artifact(
    cid: str,
    name: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "gray",
    *,
    parent: str = "1",
) -> str:
    """Artifact UML: hình tờ tài liệu gấp góc kèm stereotype «artifact»."""
    c = COLORS[color]
    return cell(
        cid,
        f"«artifact»\n{name}",
        style_join(
            "shape=note",
            "size=14",
            "whiteSpace=wrap",
            "html=1",
            "align=center",
            "verticalAlign=middle",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            "fontSize=11",
            "strokeWidth=1.2",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def note_box(
    cid: str,
    text: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "gray",
    *,
    parent: str = "1",
    font_size: int = 11,
) -> str:
    """Ghi chú giải thích đặt trong hình (không phải node nghiệp vụ)."""
    c = COLORS[color]
    return cell(
        cid,
        text,
        style_join(
            "rounded=0",
            "whiteSpace=wrap",
            "html=1",
            "align=left",
            "verticalAlign=top",
            "spacingTop=6",
            "spacingLeft=8",
            "spacingRight=6",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            f"fontSize={font_size}",
            "strokeWidth=1",
            "dashed=1",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def state(
    cid: str,
    name: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str = "blue",
    *,
    detail: str = "",
    parent: str = "1",
) -> str:
    """Trạng thái UML: hộp bo góc, tên trạng thái ở trên, do/entry ở dưới."""
    c = COLORS[color]
    label = f"<b>{name}</b>"
    if detail:
        label += f"\n{detail}"
    return cell(
        cid,
        label,
        style_join(
            "rounded=1",
            "arcSize=22",
            "whiteSpace=wrap",
            "html=1",
            "align=center",
            "verticalAlign=middle",
            "spacing=6",
            f"fillColor={c.fill}",
            f"strokeColor={c.stroke}",
            f"fontColor={c.font}",
            "fontSize=13",
            "strokeWidth=1.4",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def pseudostate(
    cid: str,
    x: int,
    y: int,
    *,
    kind: str = "initial",
    size: int = 30,
    parent: str = "1",
) -> str:
    """Pseudostate khởi tạo (đĩa đen) hoặc trạng thái kết thúc (vòng bao)."""
    if kind == "initial":
        style = style_join(
            "ellipse",
            "html=1",
            "fillColor=#2C3440",
            "strokeColor=#2C3440",
            "strokeWidth=1.4",
        )
    else:
        style = style_join(
            "ellipse",
            "shape=endState",
            "html=1",
            "fillColor=#2C3440",
            "strokeColor=#2C3440",
            "strokeWidth=1.6",
        )
    return cell(cid, "", style, x, y, size, size, parent=parent)


def build(did: str, name: str, width: int, height: int, cells: Iterable[str]) -> str:
    body = "\n".join(cells)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="30.4.1">
  <diagram id="{esc(did)}" name="{esc(name)}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1"
      tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1"
      pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""


def write(name: str, xml: str) -> None:
    path = os.path.join(OUT, name + ".drawio")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(xml)
    print("wrote", path)


def diagram_03() -> str:
    c: list[str] = [
        title("t", "Sơ đồ triển khai nguyên mẫu PERFIN", 40, 16, 1040),
        subtitle(
            "st",
            "Node ghi đầy đủ stereotype UML; mọi communication path đều ghi "
            "giao thức và cổng. Dịch vụ AI đám mây nằm ngoài biên triển khai "
            "và chỉ trả dữ liệu trung gian.",
            40,
            46,
            1180,
        ),
        # Hai khung đặt ở y=150, node trong khung bắt đầu từ y tương đối 70 nên
        # dải y=186..220 là hành lang trống ngay dưới băng tiêu đề: nhãn giao
        # thức của các cạnh đi ra khỏi khung nằm ở đây, không đè lên tiêu đề.
        lane(
            "demo",
            "«execution environment» Môi trường demo / thực nghiệm",
            300, 150, 860, 600, "blue",
        ),
        lane(
            "cloud",
            "Ngoài biên triển khai · dịch vụ AI đám mây",
            1200, 150, 300, 600, "purple", dashed=True,
        ),
        uml_node(
            "mobile", "device", "Thiết bị người dùng",
            ["«artifact» PERFIN Mobile", "React Native · Expo"],
            40, 330, 210, 110, "blue",
        ),
        uml_node(
            "api", "execution environment", "Node.js · Express",
            ["«artifact» perfin-api"],
            40, 70, 230, 92, "blue", parent="demo",
        ),
        uml_node(
            "worker", "execution environment", "Node.js · BullMQ",
            ["«artifact» perfin-worker"],
            40, 260, 230, 92, "blue", parent="demo",
        ),
        database("redis", "«device» Redis 7.4\nstate · cache · queue", 400, 70, 190, 96, "yellow", parent="demo"),
        database("postgres", "«device» PostgreSQL\nnguồn dữ liệu chuẩn", 400, 260, 190, 96, "green", parent="demo"),
        uml_node(
            "localai", "execution environment", "Python cục bộ",
            ["«artifact» PaddleOCR", "«artifact» PhoWhisper"],
            650, 165, 190, 104, "purple", parent="demo",
        ),
        uml_node(
            "fs", "device", "Ổ đĩa máy chủ demo", [],
            640, 370, 200, 90, "yellow", parent="demo",
        ),
        uml_artifact(
            "exports", "exports/*.csv · backups/*.sql",
            640, 480, 200, 70, "yellow", parent="demo",
        ),
        uml_node(
            "gemini", "device", "Gemini API",
            ["function calling · narration"],
            35, 70, 230, 104, "purple", dashed=True, parent="cloud",
        ),
        uml_node(
            "google", "device", "Google Vision / Speech",
            ["OCR · STT đám mây"],
            35, 300, 230, 104, "purple", dashed=True, parent="cloud",
        ),
        icon("mobile-react", "react", 52, 346, 30, 30),
        icon("mobile-expo", "expo", 88, 346, 30, 30),
        icon("api-node", "nodejs", 50, 82, 28, 28, parent="demo"),
        icon("api-express", "express", 84, 82, 28, 28, parent="demo"),
        icon("worker-bull", "img/lib/azure2/integration/Event_Grid_Topics.svg", 50, 274, 30, 30, parent="demo", builtin=True),
        icon("redis-mark", "img/lib/azure2/databases/Cache_Redis.svg", 412, 90, 42, 34, parent="demo", builtin=True),
        icon("postgres-mark", "img/lib/azure2/databases/Azure_Database_PostgreSQL_Server.svg", 414, 278, 34, 46, parent="demo", builtin=True),
        icon("gemini-mark", "gemini", 48, 84, 30, 30, parent="cloud"),
        # Mỗi communication path ghi rõ giao thức và cổng theo yêu cầu của GVHD.
        # Toạ độ waypoint là toạ độ tuyệt đối trên trang: api/worker nằm ở
        # x 340..570, redis/postgres ở x 700..890, localai ở x 950..1140.
        edge(
            "e1", "mobile", "api", "HTTPS / JSON",
            exit_xy=(1, 0.5), entry_xy=(0, 0.5), font_size=10,
            points=[(320, 385), (320, 266)], label_pos=-0.35,
            label_offset=(0, -10),
        ),
        edge(
            "e2", "api", "redis", "RESP · TCP 6379", color="yellow",
            exit_xy=(1, 0.35), entry_xy=(0, 0.5), font_size=10,
            label_offset=(0, -10),
        ),
        # api→postgres đi vòng bên phải cụm database; worker→redis dùng
        # hành lang giữa application và database để hai cạnh không cắt nhau.
        edge(
            "e3", "api", "postgres", "SQL · TCP 5432", color="green",
            exit_xy=(0.8, 0), entry_xy=(1, 0.25),
            points=[(524, 190), (920, 190), (920, 434)], font_size=10,
            label_offset=(20, 12),
        ),
        edge(
            "e4", "api", "worker", "BullMQ job · RESP TCP 6379", color="yellow",
            exit_xy=(0.15, 1), entry_xy=(0.15, 0), font_size=10,
            label_offset=(-4, 0),
        ),
        edge(
            "e5", "worker", "redis", "RESP · TCP 6379", color="yellow",
            exit_xy=(1, 0.25), entry_xy=(0, 0.85),
            points=[(635, 433), (635, 302)], font_size=10,
            label_offset=(-26, 0),
        ),
        edge(
            "e6", "worker", "postgres", "SQL · TCP 5432", color="green",
            exit_xy=(1, 0.65), entry_xy=(0, 0.65), font_size=10,
            label_offset=(0, -10),
        ),
        edge(
            "e7", "worker", "fs", "POSIX file I/O", color="yellow",
            exit_xy=(0.8, 1), entry_xy=(0, 0.3),
            points=[(524, 547)], font_size=10, label_pos=-0.2,
            label_offset=(0, -10),
        ),
        # e8/e9/e10 đều ra khỏi mặt trên của api nhưng theo ba hành lang ngang
        # khác nhau (y=202 trong khung, y=126 và y=100 ngoài khung) và thứ tự
        # cột x tăng dần nên không cắt nhau.
        edge(
            "e8", "api", "localai", "stdio · child_process", color="purple",
            exit_xy=(0.9, 0), entry_xy=(0.5, 0),
            points=[(547, 202), (1045, 202)], font_size=10,
            label_pos=-0.66,
        ),
        edge(
            "e9", "api", "gemini", "HTTPS/REST", color="purple", dashed=True,
            exit_xy=(0.55, 0), entry_xy=(0, 0.5),
            points=[(466, 100), (1210, 100), (1210, 272)], font_size=10,
        ),
        edge(
            "e10", "api", "google", "HTTPS/REST", color="purple", dashed=True,
            exit_xy=(0.7, 0), entry_xy=(0, 0.5),
            points=[(501, 126), (1190, 126), (1190, 502)], font_size=10,
        ),
        edge(
            "dep1", "fs", "exports", "«deploy»", color="yellow", dashed=True,
            arrow=False, exit_xy=(0.5, 1), entry_xy=(0.5, 0), font_size=10,
            label_offset=(0, 0),
        ),
        *legend(
            "lg",
            30,
            446,
            [
                ("blue", "Tiến trình ứng dụng trong biên"),
                ("green", "Lưu trữ bền vững, dữ liệu chuẩn"),
                ("yellow", "Lưu trữ tạm, hàng đợi, tệp đĩa"),
                ("purple", "Thành phần AI (nét đứt: ngoài biên)"),
            ],
            width=260,
        ),
        *legend_line(
            "lgl",
            30,
            650,
            [
                (
                    "endArrow=blockThin;endFill=1;html=1;rounded=0;",
                    "Communication path + giao thức",
                ),
                (
                    "endArrow=blockThin;endFill=1;dashed=1;html=1;rounded=0;",
                    "Phụ thuộc ra dịch vụ ngoài biên",
                ),
                (
                    "endArrow=none;dashed=1;html=1;rounded=0;",
                    "«deploy»: artifact trên node",
                ),
            ],
            title_text="Chú giải ký hiệu",
            width=260,
        ),
    ]
    return build("03-deployment", "Deployment", 1560, 830, c)


def diagram_04() -> str:
    c: list[str] = [
        title("t", "UML Domain Class Model by Business Aggregate", 40, 16, 1080),
        subtitle(
            "st",
            "The model keeps only ownership and lifecycle relationships needed "
            "to explain the domain. Detailed foreign keys are shown separately "
            "in the physical ERD.",
            40,
            46,
            1320,
        ),
        card(
            "user",
            "User",
            [
                "+ id: int",
                "+ userKey: string",
                "+ payday: int",
                "+ personalizationConsent: bool",
            ],
            610,
            105,
            280,
            115,
            "blue",
            font_size=13,
        ),
        lane("profile", "Profile and Personalization", 20, 285, 350, 680, "purple"),
        lane("ledger", "Ledger", 390, 285, 350, 680, "green"),
        lane("planning", "Planning and Recurring", 760, 285, 350, 680, "yellow"),
        lane("conversation", "Conversation and Feedback", 1130, 285, 350, 680, "blue"),
        card("trait", "UserTrait", ["+ id: int", "+ traitType: string", "+ traitValue: string"], 25, 65, 300, 105, "purple", parent="profile", font_size=13),
        card("personality", "AIPersonality", ["+ id: int", "+ key, name: string", "+ stylePrompt: text"], 25, 225, 300, 105, "purple", parent="profile", font_size=13),
        card("wallet", "Wallet", ["+ id: int", "+ name, type: string", "+ balance: decimal", "+ updateBalance(amount)"], 25, 65, 300, 120, "green", parent="ledger", font_size=13),
        card("transaction", "Transaction", ["+ id: int", "+ description: string", "+ amount: decimal", "+ type, source: string", "+ transactionDate: date", "+ softDelete() / restore()"], 25, 225, 300, 160, "green", parent="ledger", font_size=13),
        card("category", "Category", ["+ id: int", "+ name, type: string", "+ parentId: int"], 25, 445, 300, 105, "green", parent="ledger", font_size=13),
        card("budget", "Budget", ["+ id: int", "+ amountLimit: decimal", "+ month, year: int", "+ progress() / forecast()"], 25, 65, 300, 120, "yellow", parent="planning", font_size=13),
        card("goal", "FinancialGoal", ["+ id: int", "+ goalType: string", "+ target/currentAmount: decimal", "+ targetDate: date", "+ buildPlan() / assessProgress()"], 25, 225, 300, 145, "yellow", parent="planning", font_size=13),
        card("bill", "RecurringBill", ["+ id: int", "+ name, frequency: string", "+ amount: decimal", "+ nextDueDate: date", "+ pay() / pause()"], 25, 400, 300, 130, "yellow", parent="planning", font_size=13),
        card("payment", "RecurringPayment", ["+ id: int", "+ periodDueDate / paidDate", "+ amount: decimal", "+ status: string"], 25, 580, 300, 85, "yellow", parent="planning", font_size=13),
        card("chat", "ChatMessage", ["+ id: int", "+ role: string", "+ content: text", "+ metadata: json"], 25, 65, 300, 115, "blue", parent="conversation", font_size=13),
        card("feedback", "AIFeedback", ["+ id: int", "+ feedbackType: string", "+ aiResult: json", "+ correctedResult: json"], 25, 235, 300, 120, "purple", parent="conversation", font_size=13),
        # Four clear ownership lines fan out from User to the aggregate roots.
        edge(
            "own_trait", "user", "trait", "",
            color="purple", start_arrow="diamondThin", start_fill=1,
            end_arrow="openThin", exit_xy=(0.05, 1), entry_xy=(0.5, 0),
            src_label="1", tgt_label="0..*", points=[(624, 250), (195, 250)],
        ),
        edge(
            "own_wallet", "user", "wallet", "",
            color="green", start_arrow="diamondThin", start_fill=1,
            end_arrow="openThin", exit_xy=(0.38, 1), entry_xy=(0.5, 0),
            src_label="1", tgt_label="1..*", points=[(716, 260), (565, 260)],
        ),
        edge(
            "own_budget", "user", "budget", "",
            color="yellow", start_arrow="diamondThin", start_fill=1,
            end_arrow="openThin", exit_xy=(0.62, 1), entry_xy=(0.5, 0),
            src_label="1", tgt_label="0..*", points=[(784, 260), (935, 260)],
        ),
        edge(
            "own_chat", "user", "chat", "",
            color="blue", start_arrow="diamondThin", start_fill=1,
            end_arrow="openThin", exit_xy=(0.95, 1), entry_xy=(0.5, 0),
            src_label="1", tgt_label="0..*", points=[(876, 250), (1305, 250)],
        ),
        # A personality is selected by a user but has an independent lifecycle.
        edge(
            "u_p", "user", "personality", "activates",
            color="purple", start_arrow="diamondThin", start_fill=0,
            end_arrow="openThin", exit_xy=(0, 0.5), entry_xy=(0, 0.5),
            src_label="0..1", tgt_label="1",
            points=[(590, 162), (5, 162), (5, 562)],
        ),
        edge(
            "w_tx", "wallet", "transaction", "funds",
            color="green", end_arrow="openThin", exit_xy=(0.3, 1),
            entry_xy=(0.3, 0), src_label="1", tgt_label="0..*",
        ),
        edge(
            "cat_tx", "category", "transaction", "classifies",
            color="green", end_arrow="openThin", exit_xy=(0.72, 0),
            entry_xy=(0.72, 1), src_label="0..1", tgt_label="0..*",
        ),
        # Composition: RecurringPayment là lịch sử thuộc RecurringBill, nên hình
        # thoi đặc nằm ở đầu RecurringBill (source).
        edge(
            "b_h", "bill", "payment", "history",
            color="yellow", start_arrow="diamondThin", start_fill=1,
            end_arrow="openThin", exit_xy=(0.5, 1), entry_xy=(0.5, 0),
            src_label="1", tgt_label="0..*",
        ),
        *legend(
            "lg",
            20,
            995,
            [
                ("blue", "User and conversation"),
                ("green", "Deterministic ledger"),
                ("yellow", "Planning and recurring data"),
                ("purple", "Personalization and AI feedback"),
            ],
            title_text="Color Legend",
            width=300,
        ),
        *legend_line(
            "lgl",
            350,
            995,
            [
                (
                    "endArrow=diamondThin;endFill=1;endSize=14;html=1;rounded=0;",
                    "Composition: child lifecycle depends on parent",
                ),
                (
                    "endArrow=diamondThin;endFill=0;endSize=14;html=1;rounded=0;",
                    "Aggregation: child exists independently",
                ),
                (
                    "endArrow=openThin;endFill=0;endSize=12;html=1;rounded=0;",
                    "Directed association with navigability",
                ),
            ],
            title_text="UML Notation",
            width=500,
        ),
    ]
    return build("04-domain-class", "Domain class", 1500, 1170, c)


def diagram_05() -> str:
    """Physical ERD in a free-form layout with dedicated edge corridors."""
    c: list[str] = [
        title("t", "Physical Entity–Relationship Diagram", 40, 16, 1180),
        subtitle(
            "st",
            "Columns are grouped for readability; migrations 001–009 define "
            "complete types and constraints. The free-form layout assigns a "
            "separate corridor to each principal business FK. Repeated "
            "user_id/user_key ownership FKs remain declared inside table boxes "
            "instead of becoming long crossing edges.",
            40,
            46,
            1800,
        ),

        # Free-form placement: no swimlanes or enclosing containers. Closely
        # related tables sit near one another and the white space between rows
        # is reserved for orthogonal relationship corridors.
        card("users", "USERS", ["PK id · UK user_key", "username · payday", "FK active_personality_id", "personalization_consent"], 40, 140, 310, 105, "blue", font_size=14),
        card("backup", "BACKUP_CONFIG", ["PK id · FK user_id → users.id (1:1)", "auto_enabled · frequency", "keep_count"], 410, 140, 310, 92, "blue", font_size=14),
        card("categories", "CATEGORIES", ["PK id · FK user_id", "FK parent_id", "name · type · is_default"], 780, 140, 310, 92, "green", font_size=14),
        card("budgets", "BUDGETS", ["PK id · FK user/category", "amount_limit · month · year"], 1150, 140, 310, 80, "yellow", font_size=14),
        card("budget_history", "BUDGET_HISTORY", ["PK id · FK budget_id", "change_type", "old_value · new_value"], 1520, 140, 310, 92, "yellow", font_size=14),

        card("personalities", "AI_PERSONALITIES", ["PK id · UK key", "FK user_key", "name · style_prompt · is_default"], 40, 350, 310, 92, "purple", font_size=14),
        card("chat", "CHAT_MESSAGES", ["PK id · FK user_id", "FK personality_id", "role · content · metadata"], 410, 350, 310, 92, "blue", font_size=14),
        card("transactions", "TRANSACTIONS", ["PK id · FK user/category/wallet", "amount · type · source", "transaction_date · deleted_at", "ai_parsed"], 780, 350, 310, 108, "green", font_size=14),
        card("wallets", "WALLETS", ["PK id · FK user_id", "name · type", "balance · initial_balance"], 1150, 350, 310, 92, "green", font_size=14),
        card("goals", "FINANCIAL_GOALS", ["PK id · FK user/linked_wallet", "goal_type · status", "target/current_amount", "target_date"], 1520, 350, 310, 108, "yellow", font_size=14),

        card("traits", "USER_TRAITS", ["PK id · FK user_id", "trait_type · trait_value"], 40, 570, 310, 80, "purple", font_size=14),
        card("feedback", "AI_FEEDBACK_LOGS", ["PK id · FK user_id", "FK transaction_id", "feedback_type · original_text", "ai_result · corrected_result"], 410, 570, 310, 105, "purple", font_size=14),
        card("transfers", "WALLET_TRANSFERS", ["PK id · FK user_id", "FK from_wallet_id · to_wallet_id", "amount · transfer_type", "transaction_date"], 780, 570, 310, 108, "green", font_size=14),
        card("pnl", "INVESTMENT_PNL", ["PK id · FK user_id", "FK wallet_id", "amount · recorded_at"], 1150, 570, 310, 92, "green", font_size=14),
        card("exports", "EXPORT_HISTORY", ["PK id · FK user_id → users.id (N:1)", "export_type · file_path", "filters · expires_at"], 1520, 570, 310, 92, "blue", font_size=14),

        card("bills", "RECURRING_BILLS", ["PK id · FK user/category/wallet", "name · amount · frequency", "next_due_date"], 40, 790, 310, 92, "yellow", font_size=14),
        card("payments", "RECURRING_BILL_PAYMENTS", ["PK id · FK user/bill", "FK transaction/wallet", "period_due_date · status"], 410, 790, 310, 92, "yellow", font_size=14),
        card("dismissed", "RECURRING_SUGGESTIONS_DISMISSED", ["PK id · FK user_id → users.id (N:1)", "signature · dismissed_at"], 780, 790, 310, 80, "yellow", font_size=14),

        # Profile and conversation relations use three distinct corridors.
        erd_edge(
            "p_u", "personalities", "users", "active_for", color="purple",
            dashed=True, src_card="zero_one", tgt_card="zero_many",
            exit_xy=(0.5, 0), entry_xy=(0.5, 1),
        ),
        erd_edge(
            "p_c", "personalities", "chat", "styles", color="purple",
            dashed=True, src_card="zero_one", tgt_card="zero_many",
            exit_xy=(1, 0.55), entry_xy=(0, 0.55),
        ),
        erd_edge(
            "u_chat", "users", "chat", "writes", color="blue",
            src_card="one", tgt_card="zero_many",
            exit_xy=(0.85, 1), entry_xy=(0, 0.25),
            points=[(304, 305), (390, 305), (390, 373)],
        ),
        erd_edge(
            "u_backup", "users", "backup", "configuration", color="blue",
            src_card="one", tgt_card="zero_one",
            exit_xy=(0.80, 0), entry_xy=(0.50, 0),
            points=[(288, 112), (565, 112)],
        ),

        # Ledger and planning relations are short or use the empty band between
        # the second and third rows. No two edges share the same waypoint.
        erd_edge(
            "cat_tx", "categories", "transactions", "classifies",
            color="green", src_card="one", tgt_card="zero_many",
            exit_xy=(0.45, 1), entry_xy=(0.45, 0),
        ),
        erd_edge(
            "cat_bud", "categories", "budgets", "limits",
            color="green", src_card="one", tgt_card="zero_many",
            exit_xy=(1, 0.35), entry_xy=(0, 0.35),
        ),
        erd_edge(
            "bud_hist", "budgets", "budget_history", "audits",
            color="yellow", src_card="one", tgt_card="zero_many",
            exit_xy=(1, 0.65), entry_xy=(0, 0.65),
        ),
        erd_edge(
            "w_tx", "wallets", "transactions", "funds", color="green",
            src_card="one", tgt_card="zero_many",
            exit_xy=(0, 0.42), entry_xy=(1, 0.42),
        ),
        erd_edge(
            "w_goal", "wallets", "goals", "links", color="green",
            src_card="zero_one", tgt_card="zero_many",
            exit_xy=(1, 0.62), entry_xy=(0, 0.62),
        ),
        erd_edge(
            "w_pnl", "wallets", "pnl", "records_pnl", color="green",
            src_card="one", tgt_card="zero_many",
            exit_xy=(0.72, 1), entry_xy=(0.72, 0),
        ),
        erd_edge(
            "w_tf_from", "wallets", "transfers", "from_wallet", color="green",
            src_card="one", tgt_card="zero_many",
            exit_xy=(0.12, 1), entry_xy=(1, 0.30),
            points=[(1187, 505), (1118, 505), (1118, 602)],
        ),
        erd_edge(
            "w_tf_to", "wallets", "transfers", "to_wallet", color="green",
            src_card="one", tgt_card="zero_many",
            exit_xy=(0.34, 1), entry_xy=(1, 0.70),
            points=[(1255, 530), (1135, 530), (1135, 646), (1090, 646)],
        ),
        erd_edge(
            "tx_fb", "transactions", "feedback", "corrected_by",
            color="purple", dashed=True, src_card="zero_one",
            tgt_card="zero_many", exit_xy=(0.18, 1), entry_xy=(1, 0.5),
            points=[(836, 510), (740, 510), (740, 622)],
        ),
        erd_edge(
            "bill_pay", "bills", "payments", "history", color="yellow",
            src_card="zero_one", tgt_card="zero_many",
            exit_xy=(1, 0.5), entry_xy=(0, 0.5),
        ),

        note_box(
            "cardinality_note",
            "<b>Relationship cardinality</b>\n"
            "One bar = exactly one (1)\n"
            "Circle + bar = zero or one (0..1)\n"
            "Circle + crow's foot = zero or many (0..N)\n"
            "Dashed = nullable / loose reference",
            40,
            970,
            420,
            135,
            "gray",
            font_size=13,
        ),
        note_box(
            "scope_note",
            "Repeated ownership links to USERS are written in each table box "
            "instead of being drawn across the canvas. The two wallet-transfer "
            "roles use separate corridors; BACKUP_CONFIG is shown explicitly "
            "as the sole 1:1 relationship. Fill colors distinguish profile/"
            "operations, deterministic ledger, planning/recurring and "
            "LLM-related data.",
            500,
            970,
            1330,
            115,
            "gray",
            font_size=13,
        ),
    ]
    return build("05-physical-erd", "Physical ERD", 1880, 1150, c)
def diagram_06() -> str:
    c: list[str] = [
        title("t", "Ranh giới trách nhiệm của LLM", 40, 16, 900),
        subtitle(
            "st",
            "LLM chỉ chuyển đổi ngữ nghĩa và diễn giải facts; validation, side "
            "effect, phép tính và nguồn dữ liệu chuẩn luôn thuộc lõi xác định.",
            40,
            46,
            1160,
        ),
        box("input", "Đầu vào tự nhiên\ntext · OCR text · transcript", 40, 120, 190, 72, "blue"),
        box("pre", "Tiền xử lý xác định\nchuẩn hóa · giới hạn · nạp danh mục", 270, 120, 230, 72, "green"),
        decision("router", "Bộ định tuyến\nngữ nghĩa?", 540, 105, 150, 102),
        box("llmparse", "LLM function calling\nintent · entity · schema ứng viên", 730, 70, 220, 74, "purple", dashed=True),
        box("local", "Local parser / rules\nbaseline + fallback", 730, 170, 220, 70, "green"),
        box("typed", "Lệnh có kiểu\ntransaction · goal · query · export", 990, 120, 210, 72, "blue"),
        box("validate", "Kiểm tra schema và luật miền\namount · type · category · ownership", 1240, 120, 210, 72, "green"),
        decision("complete", "Đủ và\nkhông mơ hồ?", 1270, 255, 150, 100),
        box("clarify", "Hỏi làm rõ nhiều lượt\nstate có TTL", 1010, 270, 200, 70, "red"),
        box("preview", "Bản xem trước\nkhông có side effect", 1240, 405, 210, 70, "blue"),
        decision("confirm", "Người dùng\nxác nhận?", 1270, 520, 150, 100),
        box("edit", "Sửa / hủy\nkhông ghi dữ liệu", 1010, 535, 200, 70, "red"),
        box("service", "Dịch vụ nghiệp vụ xác định\nSQL transaction / rollback", 1010, 680, 210, 70, "green"),
        database("db", "PostgreSQL\nnguồn dữ liệu chuẩn", 760, 670, 190, 88, "green"),
        box("analytics", "SQL + giải thuật phân tích\nfacts và dự báo", 510, 680, 200, 70, "green"),
        box("facts", "Insight facts có cấu trúc\nnguồn sự thật định lượng", 270, 680, 200, 70, "blue"),
        box("narrator", "LLM narrator + persona\nchỉ diễn giải facts", 40, 670, 190, 82, "purple", dashed=True),
        box("explain", "Lời giải thích có căn cứ\nhoặc template fallback", 40, 780, 250, 64, "blue"),
        # Ràng buộc an toàn được tách thành hai note «constraint» đặt cạnh đúng
        # thành phần bị ràng buộc, thay cho một hộp ở giữa phải kéo hai đường
        # dài xuyên khung sang hai góc đối diện.
        note_box(
            "cst_parse",
            "«constraint»\nLLM chỉ sinh lệnh có kiểu để lõi xác định kiểm tra; "
            "không truy cập DB và không thực thi side effect.",
            440, 250, 240, 74, "red",
        ),
        note_box(
            "cst_narr",
            "«constraint»\nNarrator chỉ diễn giải facts đã tính sẵn; không tự "
            "tạo hoặc làm tròn lại số liệu.",
            40, 556, 220, 74, "red",
        ),
        edge("e1", "input", "pre", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "pre", "router", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "router", "llmparse", "ngữ cảnh phức tạp", color="purple", dashed=True, exit_xy=(1, 0.3), entry_xy=(0, 0.5)),
        edge("e4", "router", "local", "câu đơn giản / fallback", color="green", exit_xy=(1, 0.7), entry_xy=(0, 0.5)),
        edge("e5", "llmparse", "typed", "", color="purple", dashed=True, exit_xy=(1, 0.5), entry_xy=(0, 0.3)),
        edge("e6", "local", "typed", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.7)),
        edge("e7", "typed", "validate", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e8", "validate", "complete", "", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e9", "complete", "clarify", "Không", color="red", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        # Vòng quay lại được dành riêng một hành lang trống ở y=362 nên không
        # cắt qua bất kỳ node hay cạnh nào khác.
        edge("e10", "clarify", "input", "người dùng bổ sung thông tin", color="red", exit_xy=(0, 0.5), entry_xy=(0, 0.75), points=[(970, 362), (24, 362)]),
        edge("e11", "complete", "preview", "Có", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e12", "preview", "confirm", "", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e13", "confirm", "edit", "Sửa / hủy", color="red", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e14", "edit", "preview", "sửa draft", color="red", exit_xy=(0.5, 0), entry_xy=(0, 0.5), points=[(1110, 455)]),
        edge("e15", "confirm", "service", "Có", color="green", exit_xy=(0.5, 1), entry_xy=(1, 0.5), points=[(1345, 715)]),
        edge("e16", "service", "db", "COMMIT", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e17", "db", "analytics", "dữ liệu chuẩn", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e18", "analytics", "facts", "facts", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e19", "facts", "narrator", "", color="purple", dashed=True, exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e20", "narrator", "explain", "", color="blue", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        # Hai liên kết ràng buộc giờ chỉ dài vài chục pixel vì note đã đặt ngay
        # cạnh thành phần bị ràng buộc.
        edge("safe1", "cst_parse", "llmparse", "", color="red", dashed=True,
             arrow=False, exit_xy=(1, 0.3), entry_xy=(0, 0.9),
             points=[(710, 268)]),
        edge("safe2", "cst_narr", "narrator", "", color="red", dashed=True,
             arrow=False, exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        *legend(
            "lg",
            300,
            420,
            [
                ("blue", "Dữ liệu và trạng thái trung gian"),
                ("green", "Lõi xác định: kiểm tra, tính toán, ghi dữ liệu"),
                ("purple", "Thành phần LLM (viền nét đứt)"),
                ("yellow", "Điểm quyết định của luồng"),
                ("red", "Nhánh từ chối, hỏi lại và ràng buộc an toàn"),
            ],
            width=300,
        ),
    ]
    return build("06-llm-boundary", "LLM boundary", 1490, 890, c)


def diagram_07() -> str:
    c: list[str] = [
        title("t", "Máy trạng thái hội thoại và giao dịch chờ", 40, 16, 1050),
        subtitle(
            "st",
            "Clarification và pending dùng TTL; chỉ nhánh xác nhận mới được claim "
            "nguyên tử và tạo side effect.",
            40,
            46,
            1120,
        ),
        # Bảy trạng thái đúng theo thuật ngữ dùng trong phần lời: idle, parse,
        # collecting, preview, confirmed, cancelled, expired. Node là trạng
        # thái (không phải hành động), có pseudostate khởi tạo và trạng thái
        # kết thúc, mọi chuyển tiếp ghi theo cú pháp trigger [guard] / effect.
        #
        # Bố cục: hàng ngang trên là đường đi thuận (idle → parse → collecting
        # → preview), hàng dưới là các trạng thái kết thúc. Khoảng trống giữa
        # hai hộp liền kề luôn rộng 185px để nhãn chuyển tiếp nằm trọn trong
        # khoảng trống đó, không đè lên chữ trong hộp; nhãn nào dài thì ngắt
        # thành hai dòng thay vì kéo ngang qua hộp bên cạnh.
        pseudostate("init", 62, 285, kind="initial"),
        state(
            "idle", "idle", 120, 262, 165, 76, "blue",
            detail="entry / xóa ngữ cảnh cũ",
        ),
        state(
            "parse", "parse", 470, 250, 205, 100, "blue",
            detail="do / trích intent và slot\nfrom text · OCR · STT",
        ),
        state(
            "collecting", "collecting", 860, 250, 235, 100, "yellow",
            detail="do / hỏi slot còn thiếu\nkeep candidates (Redis TTL)",
        ),
        state(
            "preview", "preview", 1280, 250, 235, 100, "yellow",
            detail="entry / dựng bản xem trước\nkhông có side effect",
        ),
        state(
            "confirmed", "confirmed", 1280, 520, 235, 96, "green",
            detail="entry / claim nguyên tử\ndo / COMMIT giao dịch",
        ),
        state(
            "cancelled", "cancelled", 860, 520, 235, 86, "red",
            detail="entry / bỏ pending, không ghi DB",
        ),
        state(
            "expired", "expired", 430, 520, 250, 86, "red",
            detail="entry / xóa state trong Redis",
        ),
        pseudostate("final", 960, 800, kind="final", size=36),
        edge("t0", "init", "idle", "", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge(
            "t1", "idle", "parse", "tin nhắn người dùng\n/ mở phiên",
            exit_xy=(1, 0.5), entry_xy=(0, 0.5),
        ),
        edge(
            "t2", "parse", "collecting",
            "parsed [thiếu slot bắt buộc]\n/ hỏi slot kế tiếp",
            color="yellow", exit_xy=(1, 0.35), entry_xy=(0, 0.35),
        ),
        # Nhánh đủ slot đi vòng phía trên hàng trạng thái nên nhãn nằm ở dải
        # trống giữa phụ đề và hàng hộp, không chồng lên hộp nào.
        edge(
            "t3", "parse", "preview", "parsed [đủ slot] / dựng preview",
            color="yellow", exit_xy=(0.5, 0), entry_xy=(0.5, 0),
            points=[(572, 140), (1397, 140)],
        ),
        edge(
            "t4", "collecting", "collecting",
            "trả lời [vẫn còn slot thiếu]\n/ cập nhật slot",
            color="yellow", exit_xy=(0.3, 0), entry_xy=(0.7, 0),
            points=[(930, 216), (1024, 216)], label_offset=(0, -20),
        ),
        edge(
            "t5", "collecting", "preview", "trả lời [đủ slot]\n/ dựng preview",
            color="yellow", exit_xy=(1, 0.35), entry_xy=(0, 0.35),
        ),
        edge(
            "t6", "preview", "collecting", "sửa slot\n/ mở lại thu thập",
            color="blue", exit_xy=(0, 0.8), entry_xy=(1, 0.8),
        ),
        # Nhãn của các chuyển tiếp dọc được đẩy sang khoảng trống bên cạnh
        # (label_offset) vì giữa cạnh dọc là nơi hộp lân cận chiếm chỗ.
        edge(
            "t7", "preview", "confirmed",
            "xác nhận\n/ claim rồi COMMIT",
            color="green", exit_xy=(0.5, 1), entry_xy=(0.5, 0),
            label_offset=(-92, 0),
        ),
        edge(
            # Đi theo hành lang y=470 nằm giữa hai hàng hộp: nếu bám sát cạnh
            # phải như trước thì đoạn ngang sẽ chạy xuyên qua hộp confirmed.
            "t8", "preview", "cancelled", "hủy / xóa pending",
            color="red", exit_xy=(0.05, 1), entry_xy=(0.85, 0),
            points=[(1292, 470), (1060, 470)], label_offset=(0, -14),
        ),
        edge(
            "t9", "collecting", "expired", "after(TTL)\n/ dọn ngữ cảnh",
            color="red", exit_xy=(0.25, 1), entry_xy=(0.5, 0),
            points=[(918, 440), (555, 440)],
        ),
        edge(
            "t10", "collecting", "cancelled", "hủy\n/ dừng thu thập",
            color="red", exit_xy=(0.6, 1), entry_xy=(0.6, 0),
            label_offset=(74, 0),
        ),
        edge(
            "t11", "confirmed", "cancelled",
            "[COMMIT thất bại]\n/ ROLLBACK",
            color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 1),
            points=[(1397, 690), (977, 690)],
        ),
        edge(
            "t12", "confirmed", "final", "committed",
            color="green", exit_xy=(0.9, 1), entry_xy=(1, 0.5),
            points=[(1491, 818)],
        ),
        edge(
            "t13", "cancelled", "final", "", color="red",
            exit_xy=(0.25, 1), entry_xy=(0.5, 0),
            points=[(918, 760), (978, 760)],
        ),
        edge(
            "t14", "expired", "final", "", color="red",
            exit_xy=(0.5, 1), entry_xy=(0, 0.5),
            points=[(555, 818)],
        ),
        note_box(
            "syntax",
            "Cú pháp chuyển tiếp: trigger [guard] / effect. after(TTL) là "
            "trigger thời gian do Redis đặt hạn. Đĩa đen là pseudostate khởi "
            "tạo, vòng bao là trạng thái kết thúc phiên; yêu cầu mới bắt đầu "
            "một phiên idle khác.",
            40, 580, 330, 130, "gray",
        ),
        *legend(
            "lg",
            40,
            420,
            [
                ("blue", "Trạng thái chỉ đọc, chưa có dữ liệu chờ"),
                ("yellow", "Có state tạm trong Redis kèm TTL"),
                ("green", "Trạng thái duy nhất được ghi dữ liệu"),
                ("red", "Kết thúc không tạo hiệu ứng nào"),
            ],
            width=330,
        ),
    ]
    return build("07-conversation-state", "Conversation state", 1560, 880, c)


def diagram_09() -> str:
    c: list[str] = [
        title("t", "Luồng xử lý đầu vào đa phương thức", 40, 16, 1000),
        subtitle(
            "st",
            "OCR và STT chỉ tạo raw text có thể kiểm tra; sau bước xác nhận, cả "
            "hai nhánh hội tụ vào pipeline giao dịch dùng chung.",
            40,
            46,
            1200,
        ),
        terminal("start", "Người dùng chọn ảnh hoặc ghi âm", 40, 130, 210, 62, "orange"),
        box("upload", "Upload base64 / multipart\nkiểm tra loại · giới hạn 10 MB", 290, 120, 240, 76, "orange"),
        decision("type", "Loại đầu vào?", 570, 105, 150, 105),
        box("ocr", "OCR provider\nGoogle Vision / PaddleOCR", 760, 70, 230, 76, "purple", dashed=True),
        box("stt", "STT provider\nGoogle Speech / PhoWhisper", 760, 180, 230, 76, "purple", dashed=True),
        decision("text", "Có văn bản thật?", 1030, 105, 160, 110),
        box("fail", "HTTP 503\nkhông tạo dữ liệu giả", 1220, 80, 180, 70, "red"),
        terminal("failed", "Kết thúc lỗi\nkhông ghi dữ liệu", 1220, 190, 180, 62, "red"),
        box("raw", "Raw text + thông tin provider", 1010, 270, 210, 68, "orange"),
        box("voice", "Người dùng xác nhận /\nsửa transcript", 760, 370, 230, 70, "blue"),
        decision("receipt", "Hóa đơn\nnhiều dòng?", 1040, 360, 150, 100),
        box("items", "Chọn lưu tổng hoặc\ntừng mặt hàng", 1220, 375, 180, 70, "blue"),
        box("parser", "LLM / local parser\ntext → transaction schema", 890, 510, 250, 76, "purple"),
        box("normalize", "Chuẩn hóa amount · type · date · category\nđánh dấu source + original_text", 590, 510, 250, 76, "green"),
        box("pending", "Pending preview có TTL", 340, 520, 200, 62, "yellow"),
        decision("confirm", "Xác nhận?", 140, 500, 150, 100),
        box("sql", "SQL transaction\nlưu giao dịch · cập nhật ví", 40, 665, 230, 76, "green"),
        terminal("end", "Kết quả có thể kiểm tra lại", 350, 675, 220, 62, "green"),
        terminal("cancelled", "Đã hủy\nkhông ghi dữ liệu", 650, 675, 190, 62, "red"),
        edge("e1", "start", "upload", "", color="orange", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "upload", "type", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "type", "ocr", "Ảnh", color="purple", dashed=True, exit_xy=(1, 0.3), entry_xy=(0, 0.5)),
        edge("e4", "type", "stt", "Âm thanh", color="purple", dashed=True, exit_xy=(1, 0.7), entry_xy=(0, 0.5)),
        edge("e5", "ocr", "text", "", color="purple", dashed=True, exit_xy=(1, 0.5), entry_xy=(0, 0.3)),
        edge("e6", "stt", "text", "", color="purple", dashed=True, exit_xy=(1, 0.5), entry_xy=(0, 0.7)),
        edge("e7", "text", "fail", "Không", color="red", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e8", "text", "raw", "Có", color="orange", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e9", "raw", "voice", "Voice", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e10", "raw", "receipt", "Receipt", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e11", "receipt", "items", "Có", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e12", "receipt", "parser", "Không", color="purple", exit_xy=(0.5, 1), entry_xy=(1, 0.35)),
        edge("e13", "items", "parser", "", color="purple", exit_xy=(0.5, 1), entry_xy=(1, 0.65), points=[(1310, 550)]),
        edge("e14", "voice", "parser", "", color="purple", exit_xy=(0.5, 1), entry_xy=(0, 0.35), points=[(875, 475)]),
        edge("e15", "parser", "normalize", "", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e16", "normalize", "pending", "", color="yellow", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e17", "pending", "confirm", "", color="yellow", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e18", "confirm", "pending", "Sửa", color="blue", exit_xy=(0.7, 0), entry_xy=(0.3, 1), points=[(250, 470), (440, 470)]),
        edge("e19", "confirm", "sql", "Đồng ý", color="green", exit_xy=(0.35, 1), entry_xy=(0.5, 0)),
        edge("e20", "confirm", "cancelled", "Hủy", color="red", exit_xy=(0.65, 1), entry_xy=(0.5, 0), points=[(240, 640), (745, 640)]),
        edge("e21", "sql", "end", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e22", "fail", "failed", "", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        *legend(
            "lg",
            40,
            250,
            [
                ("orange", "Dữ liệu thô chưa kiểm chứng (ảnh, âm thanh, raw text)"),
                ("purple", "Thành phần AI ngoài: OCR, STT, LLM parser"),
                ("yellow", "Điểm quyết định và dữ liệu tạm có TTL"),
                ("blue", "Bước cần người dùng xem lại"),
                ("green", "Lõi xác định: chuẩn hóa, ghi dữ liệu, kết quả"),
                ("red", "Nhánh lỗi hoặc hủy, không ghi dữ liệu"),
            ],
            width=460,
        ),
    ]
    return build("09-multimodal-flow", "Multimodal flow", 1460, 820, c)


def diagram_10() -> str:
    c: list[str] = [
        title("t", "Luồng phản hồi và cá nhân hóa phân loại", 40, 16, 1040),
        subtitle(
            "st",
            "Mẫu sửa được truy hồi làm context; hệ thống không fine-tune và chỉ "
            "re-tag sau khi người dùng xác nhận kế hoạch có TTL.",
            40,
            46,
            1320,
        ),
        lane("retrieval", "1 · Correction retrieval", 30, 100, 1470, 145, "purple"),
        lane("confirmation", "2 · Xác nhận và ghi feedback", 30, 270, 1470, 145, "blue"),
        lane("retagging", "3 · Đề xuất danh mục và re-tag có kiểm soát", 30, 440, 1470, 300, "yellow"),
        terminal("start", "Giao dịch mới\ntext · OCR · voice", 20, 50, 170, 62, "orange", parent="retrieval"),
        box("load", "Nạp tối đa 200\nfeedback gần đây", 220, 45, 190, 72, "blue", parent="retrieval"),
        box("match", "Chuẩn hóa tiếng Việt\nLevenshtein · Dice · containment", 440, 40, 220, 82, "green", parent="retrieval"),
        box("rank", "Xếp hạng ví dụ tương tự\nngưỡng 0,35 · tối đa 5", 690, 40, 220, 82, "green", parent="retrieval"),
        box("parse", "LLM function calling\nhoặc local parser", 940, 45, 190, 72, "purple", parent="retrieval"),
        decision("strong", "Correction\nđủ mạnh?", 1190, 30, 165, 105, parent="retrieval"),
        box("override", "Ghi đè category ứng viên\nconfidence + match kind", 1190, 45, 220, 72, "green", parent="confirmation"),
        box("preview", "Bản xem trước\ncho người dùng", 930, 45, 210, 72, "blue", parent="confirmation"),
        decision("corrected", "Người dùng\nsửa kết quả AI?", 690, 30, 165, 105, parent="confirmation"),
        box("feedback", "Lưu ai_feedback_logs\nclassification / extraction", 410, 45, 220, 72, "blue", parent="confirmation"),
        box("save", "Lưu giao dịch\nđã xác nhận", 150, 45, 210, 72, "blue", parent="confirmation"),
        box("other_tx", "Lọc giao dịch thuộc\ndanh mục Khác", 30, 55, 200, 72, "blue", parent="retagging"),
        box("grouping", "Gom cụm mô tả\nsimilarity >= 0,90 · tối thiểu 3", 260, 50, 220, 82, "green", parent="retagging"),
        box("propose", "Đề xuất danh mục mới\nkèm evidence + confidence", 510, 55, 220, 72, "blue", parent="retagging"),
        decision("retag", "Xác nhận kế hoạch\nre-tag có TTL?", 770, 35, 175, 110, parent="retagging"),
        box("commit", "BEGIN · tạo / tái dùng category\nre-tag <= 200 · ghi feedback · COMMIT", 990, 45, 230, 90, "orange", parent="retagging"),
        box("reuse", "Mẫu sửa dùng cho\nlần nhập sau", 1260, 55, 180, 72, "green", parent="retagging"),
        terminal("end", "Kết thúc hoặc chờ thêm dữ liệu", 1170, 190, 260, 62, "green", parent="retagging"),
        edge("e1", "start", "load", "", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "load", "match", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "match", "rank", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e4", "rank", "parse", "", color="purple", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e5", "parse", "strong", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e6", "strong", "override", "Có", color="green", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e7", "override", "preview", "", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e8", "strong", "preview", "Không", exit_xy=(0, 0.5), entry_xy=(1, 0.25)),
        edge("e9", "preview", "corrected", "", color="yellow", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e10", "corrected", "feedback", "Có", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e11", "feedback", "save", "", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e12", "corrected", "save", "Không", exit_xy=(0.5, 1), entry_xy=(0.5, 1), points=[(800, 425), (285, 425)]),
        edge("e13", "save", "other_tx", "", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e14", "other_tx", "grouping", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e15", "grouping", "propose", "", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e16", "propose", "retag", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e17", "retag", "commit", "Đồng ý", color="orange", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e18", "commit", "reuse", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e19", "reuse", "end", "", color="green", exit_xy=(0.5, 1), entry_xy=(0.7, 0)),
        edge("e20", "retag", "end", "Hủy / hết hạn", color="red", exit_xy=(0.5, 1), entry_xy=(0, 0.5), points=[(888, 690), (1170, 690)]),
        *legend(
            "lg",
            30,
            762,
            [
                ("purple", "Bước có gọi LLM"),
                ("green", "Tính toán xác định trên dữ liệu đã có"),
                ("blue", "Trạng thái dữ liệu và tương tác người dùng"),
                ("orange", "Ghi dữ liệu trong một transaction"),
                ("red", "Nhánh hủy hoặc hết hạn, không ghi gì"),
            ],
            width=340,
        ),
        *legend(
            "lgz",
            410,
            762,
            [
                ("purple", "Zone 1 · truy hồi mẫu sửa"),
                ("blue", "Zone 2 · xác nhận và ghi feedback"),
                ("yellow", "Zone 3 · đề xuất danh mục và re-tag"),
            ],
            title_text="Chú giải màu vùng trách nhiệm",
            width=340,
        ),
    ]
    return build("10-feedback-flow", "Feedback flow", 1560, 930, c)


def diagram_12() -> str:
    c: list[str] = [
        title("t", "Luồng lập kế hoạch mục tiêu và mô phỏng what-if", 40, 16, 1120),
        subtitle(
            "st",
            "Mức góp, thời gian và cảnh báo được tính bằng công thức xác định; "
            "chỉ thao tác lưu cuối cùng mới ghi financial_goals.",
            40,
            46,
            1240,
        ),
        terminal("start", "Mục tiêu\nsaving · purchase · debt payoff", 40, 120, 210, 66, "orange"),
        box("validate", "Kiểm tra amount · date · rate · contribution", 290, 115, 250, 72, "green"),
        decision("valid", "Dữ liệu\nhợp lệ?", 580, 100, 150, 105),
        box("error", "Trả lỗi theo field\nhoặc hỏi làm rõ", 580, 255, 170, 70, "red"),
        terminal("invalid_end", "Không tạo kế hoạch\nkhông ghi dữ liệu", 570, 350, 190, 62, "red"),
        box("surplus", "Tính dòng tiền có thể phân bổ\ntừ lịch sử thu – chi", 780, 115, 230, 72, "green"),
        decision("type", "Loại mục tiêu?", 1050, 100, 160, 105),
        box("saving", "Saving / Purchase\nremaining = target − current\nmonths = ceil(remaining / contribution)", 1240, 70, 220, 96, "green"),
        box("debt", "Debt payoff\nmonthly rate = annual / 12\namortization theo từng tháng", 1240, 205, 220, 96, "green"),
        decision("interest", "Payment có bù\nlãi tháng đầu?", 1050, 255, 160, 105),
        box("warn", "Cảnh báo negative amortization\nhoặc horizon > 600 tháng", 780, 270, 230, 72, "red"),
        box("deadline", "Tính requiredMonthly · projectedDate\nonTrack · gap · shortfall", 780, 430, 260, 76, "green"),
        box("whatif", "Kịch bản what-if\nthêm khoản góp mỗi tháng", 500, 430, 230, 76, "green"),
        box("progress", "So actualPercent với expectedPercent\nđánh dấu behind schedule", 220, 430, 230, 76, "green"),
        box("plan", "Kế hoạch có công thức và cảnh báo", 40, 440, 160, 64, "blue"),
        decision("saveq", "Người dùng\nlưu mục tiêu?", 250, 590, 160, 105),
        database("goals", "financial_goals", 510, 600, 180, 82, "green"),
        terminal("end", "Kết quả", 800, 610, 160, 58, "green"),
        terminal("unsaved", "Kết quả chưa lưu\nhoặc quay lại sửa", 1040, 690, 200, 62, "red"),
        edge("e1", "start", "validate", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "validate", "valid", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "valid", "error", "Không", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e4", "error", "invalid_end", "", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e5", "valid", "surplus", "Có", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e6", "surplus", "type", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e7", "type", "saving", "Saving / Purchase", color="green", exit_xy=(1, 0.35), entry_xy=(0, 0.5)),
        edge("e8", "type", "debt", "Debt payoff", color="green", exit_xy=(1, 0.7), entry_xy=(0, 0.5)),
        edge("e9", "debt", "interest", "", color="yellow", exit_xy=(0, 0.65), entry_xy=(1, 0.5)),
        edge("e10", "interest", "warn", "Không", color="red", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e11", "saving", "deadline", "", color="green", exit_xy=(1, 0.5), entry_xy=(1, 0.3), points=[(1480, 120), (1480, 390), (1060, 390)]),
        edge("e12", "interest", "deadline", "Có", color="green", exit_xy=(0.35, 1), entry_xy=(1, 0.7)),
        edge("e13", "warn", "deadline", "tiếp tục với cảnh báo", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e14", "deadline", "whatif", "", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e15", "whatif", "progress", "", color="green", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e16", "progress", "plan", "", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e17", "plan", "saveq", "", color="yellow", exit_xy=(0.5, 1), entry_xy=(0, 0.5), points=[(120, 640)]),
        edge("e18", "saveq", "goals", "Có", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e19", "goals", "end", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e20", "saveq", "unsaved", "Không / sửa", color="red", exit_xy=(0.5, 1), entry_xy=(0, 0.5), points=[(330, 760), (1020, 760), (1020, 721)]),
        *legend(
            "lg",
            20,
            245,
            [
                ("orange", "Đầu vào của người dùng"),
                ("green", "Công thức xác định: phân bổ, amortization, dự báo"),
                ("yellow", "Điểm quyết định của luồng"),
                ("blue", "Kết quả kế hoạch chưa ghi dữ liệu"),
                ("red", "Cảnh báo và nhánh không ghi dữ liệu"),
            ],
            width=340,
        ),
    ]
    return build("12-goal-flow", "Goal flow", 1500, 790, c)


def write_all() -> None:
    write("03-deployment", diagram_03())
    write("04-domain-class", diagram_04())
    write("05-physical-erd", diagram_05())
    write("06-llm-boundary", diagram_06())
    write("07-conversation-state", diagram_07())
    write("09-multimodal-flow", diagram_09())
    write("10-feedback-flow", diagram_10())
    write("12-goal-flow", diagram_12())


if __name__ == "__main__":
    write_all()
