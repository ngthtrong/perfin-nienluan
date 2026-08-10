#!/usr/bin/env python3
"""Generate the PERFIN system-context and runtime-architecture diagrams.

Technology marks are embedded as data URIs so the Draw.io sources and every
export remain self-contained and render without a network connection.
"""

from __future__ import annotations

import os
from urllib.parse import quote

from core_gen import (
    COLORS,
    box,
    build,
    cell,
    database,
    edge,
    lane,
    style_join,
    subtitle,
    title,
    write,
)


HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_DIR = os.path.join(HERE, "assets", "logos")


def logo_data(name: str) -> str:
    with open(os.path.join(LOGO_DIR, f"{name}.svg"), encoding="utf-8") as fh:
        return "data:image/svg+xml," + quote(fh.read(), safe="")


def icon(
    cid: str,
    name: str,
    x: int,
    y: int,
    w: int,
    h: int | None = None,
    *,
    parent: str = "1",
) -> str:
    h = w if h is None else h
    return cell(
        cid,
        "",
        style_join(
            "image",
            "imageAspect=0",
            "aspect=fixed",
            "html=1",
            "strokeColor=none",
            "fillColor=none",
            f"image={logo_data(name)}",
        ),
        x,
        y,
        w,
        h,
        parent=parent,
    )


def builtin_icon(cid: str, image_path: str, x: int, y: int, w: int, h: int) -> str:
    return cell(
        cid,
        "",
        style_join(
            "shape=image",
            "aspect=fixed",
            "html=1",
            "strokeColor=none",
            "fillColor=none",
            f"image={image_path}",
        ),
        x,
        y,
        w,
        h,
    )


def tech_card(cid: str, heading: str, detail: str, x: int, y: int, w: int, h: int) -> str:
    background = box(cid, "", x, y, w, h, "blue")
    label = cell(
        f"{cid}-label",
        f"<b>{heading}</b>\n{detail}",
        style_join(
            "text", "html=1", "whiteSpace=wrap", "align=center",
            "verticalAlign=middle", "fontSize=14", "fontColor=#22303F",
            "strokeColor=none", "fillColor=none", "connectable=0",
        ),
        x + 122,
        y,
        w - 132,
        h,
    )
    return background + "\n" + label


def diagram_01() -> str:
    cells = [
        title("title", "PERFIN System Context and Scope", 40, 20, 720),
        subtitle(
            "subtitle",
            "The deterministic core owns validation, calculations and data writes; external AI services only return intermediate results.",
            40,
            52,
            1100,
        ),
        box("user", "<b>User</b>\nenter data · review · confirm · view insights", 40, 300, 230, 80, "gray", font_size=14),
        box("mobile", "<b>PERFIN Client</b>\nforms · chat · media · previews", 370, 140, 300, 82, "blue", font_size=14),
        lane("perfin", "PERFIN trusted system boundary", 350, 280, 340, 220, "blue"),
        box("api", "<b>API and business services</b>\nvalidation · transactions · analytics", 30, 55, 280, 72, "blue", parent="perfin", font_size=14),
        database("pg", "<b>PostgreSQL</b>\nauthoritative business data", 30, 130, 130, 78, "green", parent="perfin"),
        database("redis", "<b>Redis / memory KV</b>\nTTL state · cache · queue", 180, 130, 130, 78, "yellow", parent="perfin"),
        box("providers", "<b>External AI services</b>\nGemini · OCR · STT\ntyped candidates / raw text only", 800, 310, 300, 110, "purple", dashed=True, font_size=14),
        box("out", "<b>Outside project scope</b>\nOpen Banking · shared wallets · production authentication", 420, 590, 440, 74, "red", dashed=True, font_size=13),
        edge("e1", "user", "mobile", "actions / results", exit_xy=(1, 0.5), entry_xy=(0, 0.5), start_arrow="blockThin"),
        edge("e2", "mobile", "api", "HTTPS · JSON request / response", exit_xy=(0.5, 1), entry_xy=(0.5, 0), start_arrow="blockThin", label_offset=(160, -18)),
        edge("e3", "api", "providers", "provider request / intermediate result", color="purple", dashed=True, exit_xy=(1, 0.5), entry_xy=(0, 0.5), start_arrow="blockThin"),
        edge("e4", "perfin", "out", "explicitly excluded", color="red", dashed=True, arrow=False, exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
    ]
    return build("01-system-context", "System context", 1180, 720, cells)


def diagram_02() -> str:
    cells = [
        title("title", "PERFIN Runtime Architecture", 40, 20, 720),
        subtitle(
            "subtitle",
            "Requests enter through one Express API; deterministic services own facts and writes, while AI providers only assist semantic conversion and narration.",
            40,
            52,
            1400,
        ),
        tech_card("client", "React Native / Expo", "mobile and web UI · API client", 620, 100, 320, 86),
        icon("react-logo", "react", 642, 119, 44),
        icon("expo-logo", "expo", 697, 119, 44),
        tech_card("api", "Node.js / Express API", "routing · upload · input validation", 620, 230, 320, 86),
        icon("node-logo", "nodejs", 642, 249, 44),
        icon("express-logo", "express", 697, 249, 44),
        box("conv", "<b>Conversation Service</b>\nclarification · preview · atomic claim", 80, 390, 300, 82, "blue", font_size=14),
        box("core", "<b>Core Services</b>\ntransactions · recurring · export", 500, 390, 300, 82, "blue", font_size=14),
        box("analytics", "<b>Analytics · Budget · Goal</b>\ndeterministic facts and plans", 920, 390, 300, 82, "green", font_size=14),
        box("worker", "<b>BullMQ Worker</b>\nschedule · retry · deduplicate", 1300, 390, 240, 82, "yellow", font_size=14),
        box("ai", "<b>AI Orchestrator</b>\ntyped candidates · grounded narration", 80, 570, 300, 82, "purple", font_size=14),
        database("pg", "<b>PostgreSQL</b>\nsystem of record", 590, 560, 210, 100, "green"),
        builtin_icon("pg-logo", "img/lib/azure2/databases/Azure_Database_PostgreSQL_Server.svg", 615, 580, 44, 52),
        database("redis", "<b>Redis / KV</b>\npending · cache · queue", 1010, 560, 210, 100, "yellow"),
        builtin_icon("redis-logo", "img/lib/azure2/databases/Cache_Redis.svg", 1035, 584, 52, 42),
        box("providers", "<b>Gemini · OCR · STT providers</b>\nreplaceable external adapters", 80, 740, 300, 82, "purple", dashed=True, font_size=14),
        icon("gemini-logo", "gemini", 105, 758, 44),
        edge("e1", "client", "api", "HTTPS request / response", exit_xy=(0.5, 1), entry_xy=(0.5, 0), start_arrow="blockThin"),
        edge("e2", "api", "conv", "chat / media", exit_xy=(0.15, 1), entry_xy=(0.5, 0), start_arrow="blockThin", points=[(668, 350), (230, 350)]),
        edge("e3", "api", "core", "CRUD / commands", exit_xy=(0.4, 1), entry_xy=(0.5, 0), start_arrow="blockThin", points=[(748, 350), (650, 350)]),
        edge("e4", "api", "analytics", "reports / planning", exit_xy=(0.65, 1), entry_xy=(0.5, 0), start_arrow="blockThin", points=[(828, 350), (1070, 350)]),
        edge("e5", "conv", "ai", "parse request / typed candidate", color="purple", exit_xy=(0.5, 1), entry_xy=(0.5, 0), start_arrow="blockThin"),
        edge("e6", "ai", "providers", "adapter request / provider result", color="purple", dashed=True, exit_xy=(0.5, 1), entry_xy=(0.5, 0), start_arrow="blockThin"),
        edge("e7", "conv", "redis", "pending / clarification · TTL", color="yellow", exit_xy=(1, 0.8), entry_xy=(0.5, 1), start_arrow="blockThin", points=[(420, 456), (420, 700), (1115, 700)]),
        edge("e8", "core", "pg", "validated SQL transaction / query", color="green", exit_xy=(0.5, 1), entry_xy=(0.5, 0), start_arrow="blockThin"),
        edge("e9", "analytics", "pg", "series query / structured data", color="green", exit_xy=(0, 0.7), entry_xy=(1, 0.35), start_arrow="blockThin", points=[(810, 448), (810, 595)], label_offset=(0, -12)),
        edge("e10", "core", "redis", "cache invalidation / enqueue", color="yellow", exit_xy=(0.75, 1), entry_xy=(0, 0.7), points=[(725, 520), (970, 520), (970, 630)], label_offset=(0, -12)),
        edge("e11", "redis", "worker", "scheduled jobs / retry state", color="yellow", exit_xy=(1, 0.4), entry_xy=(0.5, 1), start_arrow="blockThin", points=[(1260, 600), (1420, 600)]),
        edge("e12", "worker", "core", "invoke domain handlers", color="blue", exit_xy=(0, 0.6), entry_xy=(1, 0.75), points=[(1260, 510), (850, 510), (850, 452)], label_offset=(0, -12)),
    ]
    return build("02-runtime-architecture", "Runtime architecture", 1600, 880, cells)


def main() -> None:
    write("01-system-context", diagram_01())
    write("02-runtime-architecture", diagram_02())


if __name__ == "__main__":
    main()
