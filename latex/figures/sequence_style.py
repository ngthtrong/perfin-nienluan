#!/usr/bin/env python3
"""Normalize seqlayout output for the PERFIN LaTeX report.

Run the bundled drawio-skill ``seqlayout.py`` first, then this script.  The
post-process is idempotent: files already carrying ``reportStyled=1`` are
left unchanged until seqlayout regenerates them.
"""

from __future__ import annotations

import math
import os
import xml.etree.ElementTree as ET


HERE = os.path.dirname(os.path.abspath(__file__))
DRAWIO = os.path.join(HERE, "drawio")

COLORS = {
    "blue": ("#EEF2F7", "#5B7290", "#22303F"),
    "green": ("#E6F4EA", "#2E7D46", "#1B4429"),
    "purple": ("#F0EAF9", "#7C5CBF", "#3A2A5F"),
    "yellow": ("#FBF3D9", "#B08900", "#5A4700"),
}

SPECS = {
    "08-text-sequence": {
        "title": "Text Transaction Entry Sequence",
        "subtitle": "The LLM only proposes a typed candidate; the database transaction starts after user confirmation.",
        "participants": {
            "user": "blue",
            "app": "blue",
            "route": "blue",
            "ai": "purple",
            "provider": "purple",
            "pending": "yellow",
            "db": "green",
        },
        "external": {"provider"},
    },
    "11-insight-sequence": {
        "title": "Grounded Insight Generation Sequence",
        "subtitle": "Analytics computes facts first; the persona and LLM only adjust the wording.",
        "participants": {
            "user": "blue",
            "screen": "blue",
            "route": "blue",
            "analytics": "green",
            "db": "green",
            "cache": "yellow",
            "persona": "purple",
            "llm": "purple",
        },
        "external": {"llm"},
    },
    "13-worker-sequence": {
        "title": "Proactive Job and Deduplication Sequence",
        "subtitle": "The queue coordinates retries; a unique event key makes message persistence idempotent.",
        "participants": {
            "scheduler": "yellow",
            "redis": "yellow",
            "worker": "blue",
            "db": "green",
            "analytics": "green",
            "narrator": "purple",
            "chat": "blue",
            "app": "blue",
        },
        "external": {"narrator"},
    },
}


def set_style(style: str, **props: str) -> str:
    tokens = [t for t in style.split(";") if t]
    keys = set(props)
    tokens = [t for t in tokens if t.split("=", 1)[0] not in keys]
    tokens.extend(f"{key}={value}" for key, value in props.items())
    return ";".join(tokens) + ";"


def round10(value: float) -> int:
    return int(math.ceil(value / 10.0) * 10)


def transform_y(value: float, scale: float = 0.74) -> float:
    return 95.0 + (value - 40.0) * scale


def add_heading(root: ET.Element, spec: dict, width: int) -> None:
    title = ET.Element(
        "mxCell",
        {
            "id": "report-title",
            "value": spec["title"],
            "style": (
                "text;html=1;align=left;verticalAlign=middle;fontSize=18;"
                "fontStyle=1;fontColor=#22303F;"
            ),
            "vertex": "1",
            "parent": "1",
        },
    )
    ET.SubElement(
        title,
        "mxGeometry",
        {"x": "40", "y": "14", "width": str(max(600, width - 80)), "height": "28", "as": "geometry"},
    )
    subtitle = ET.Element(
        "mxCell",
        {
            "id": "report-subtitle",
            "value": spec["subtitle"],
            "style": (
                "text;html=1;align=left;verticalAlign=middle;fontSize=12;"
                "fontColor=#5A6A78;whiteSpace=wrap;"
            ),
            "vertex": "1",
            "parent": "1",
        },
    )
    ET.SubElement(
        subtitle,
        "mxGeometry",
        {"x": "40", "y": "44", "width": str(max(600, width - 80)), "height": "30", "as": "geometry"},
    )
    root.insert(2, title)
    root.insert(3, subtitle)


def style_one(base: str, spec: dict) -> None:
    path = os.path.join(DRAWIO, base + ".drawio")
    tree = ET.parse(path)
    model = tree.getroot().find(".//mxGraphModel")
    if model is None:
        raise RuntimeError(f"{path}: missing mxGraphModel")
    if model.get("reportStyled") == "1":
        print("already styled", path)
        return
    root = model.find("root")
    if root is None:
        raise RuntimeError(f"{path}: missing root")

    participants = spec["participants"]
    max_x = 0.0
    max_y = 0.0

    for mx in root.iter("mxCell"):
        cid = mx.get("id", "")
        style = mx.get("style", "")
        geom = mx.find("mxGeometry")

        if cid in participants:
            fill, stroke, font = COLORS[participants[cid]]
            value = mx.get("value", "")
            if not value.startswith("<b>"):
                mx.set("value", f"<b>{value}</b>")
            props = {
                "fillColor": fill,
                "strokeColor": stroke,
                "fontColor": font,
                "fontSize": "13",
                "strokeWidth": "1.2",
                "size": "44",
            }
            if cid in spec["external"]:
                props["dashed"] = "1"
            mx.set("style", set_style(style, **props))
            if geom is not None:
                old_y = float(geom.get("y", "40"))
                old_h = float(geom.get("height", "0"))
                geom.set("y", f"{transform_y(old_y):g}")
                geom.set("height", f"{old_h * 0.74:g}")

        elif mx.get("edge") == "1":
            edge_props = {
                "fontSize": "12",
                "labelBackgroundColor": "#FFFFFF",
                "fontColor": "#3D4B5A",
                "strokeWidth": "1.15",
            }
            if "strokeColor=#999999" in style:
                edge_props["strokeColor"] = "#9AA7B4"
                edge_props["fontColor"] = "#6B7A89"
            else:
                edge_props["strokeColor"] = "#5B7290"
            mx.set("style", set_style(style, **edge_props))

        elif cid.startswith("note"):
            mx.set(
                "style",
                set_style(
                    style,
                    fillColor="#FBF3D9",
                    strokeColor="#B08900",
                    fontColor="#5A4700",
                    fontSize="12",
                    strokeWidth="1.1",
                ),
            )
            if geom is not None:
                old_y = float(geom.get("y", "40"))
                geom.set("y", f"{transform_y(old_y):g}")
                geom.set("height", "46")

        elif mx.get("vertex") == "1" and mx.get("parent") in participants:
            # Activation bar coordinates are relative to the lifeline.
            if geom is not None:
                old_y = float(geom.get("y", "0"))
                old_h = float(geom.get("height", "0"))
                geom.set("y", f"{old_y * 0.74:g}")
                geom.set("height", f"{old_h * 0.74:g}")

        if geom is not None:
            for point in geom.findall(".//mxPoint"):
                if point.get("y") is not None:
                    point.set("y", f"{transform_y(float(point.get('y'))):g}")

    # Determine the page from participant lifelines and notes after scaling.
    for mx in root.findall("mxCell"):
        if mx.get("vertex") != "1":
            continue
        geom = mx.find("mxGeometry")
        if geom is None:
            continue
        x = float(geom.get("x", "0"))
        y = float(geom.get("y", "0"))
        w = float(geom.get("width", "0"))
        h = float(geom.get("height", "0"))
        max_x = max(max_x, x + w)
        max_y = max(max_y, y + h)

    page_w = round10(max_x + 40)
    page_h = round10(max_y + 35)
    add_heading(root, spec, page_w)
    model.set("page", "1")
    model.set("pageWidth", str(page_w))
    model.set("pageHeight", str(page_h))
    model.set("reportStyled", "1")
    model.set("grid", "1")
    model.set("gridSize", "10")
    tree.write(path, encoding="utf-8", xml_declaration=True)
    print("styled", path, f"({page_w}x{page_h})")


def main() -> None:
    for base, spec in SPECS.items():
        style_one(base, spec)


if __name__ == "__main__":
    main()
