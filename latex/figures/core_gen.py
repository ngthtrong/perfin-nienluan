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
from dataclasses import dataclass
from typing import Iterable, Sequence


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "drawio")


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
            "fontSize=14",
            "fontStyle=1",
            "strokeWidth=1.2",
            "dashed=1" if dashed else "",
        ),
        x,
        y,
        w,
        h,
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
    style = style_join(
        "edgeStyle=orthogonalEdgeStyle",
        "rounded=1",
        "orthogonalLoop=1",
        "jettySize=auto",
        "html=1",
        f"strokeColor={c.stroke}",
        f"fontColor={c.font}",
        f"fontSize={font_size}",
        "labelBackgroundColor=#FFFFFF",
        "strokeWidth=1.2",
        "dashed=1" if dashed else "",
        "endArrow=blockThin" if arrow else "endArrow=none",
        "endFill=1" if arrow else "",
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
            "Các tiến trình ứng dụng nằm trong môi trường demo; dịch vụ AI đám "
            "mây nằm ngoài biên triển khai và chỉ trả dữ liệu trung gian.",
            40,
            46,
            1100,
        ),
        lane("demo", "Môi trường demo / thực nghiệm", 250, 105, 820, 540, "blue"),
        lane("cloud", "Dịch vụ AI đám mây", 1100, 105, 250, 540, "purple", dashed=True),
        box("mobile", "Thiết bị người dùng\nPERFIN Mobile", 40, 275, 170, 78, "blue", bold=True),
        box("api", "Node.js API\nExpress", 40, 70, 210, 76, "blue", parent="demo", bold=True),
        box("worker", "Node.js Worker\nBullMQ", 40, 250, 210, 76, "blue", parent="demo", bold=True),
        database("redis", "Redis\nstate · cache · queue", 360, 75, 190, 92, "yellow", parent="demo"),
        database("postgres", "PostgreSQL\nnguồn dữ liệu chuẩn", 360, 250, 190, 92, "green", parent="demo"),
        box("localai", "PaddleOCR / PhoWhisper\nPython subprocess cục bộ", 585, 170, 200, 86, "purple", parent="demo"),
        box("exports", "Thư mục export / backup", 585, 360, 200, 70, "yellow", parent="demo"),
        box("gemini", "Gemini API\nfunction calling · narration", 25, 85, 200, 86, "purple", dashed=True, parent="cloud"),
        box("google", "Google Vision / Speech\nOCR · STT cloud", 25, 270, 200, 86, "purple", dashed=True, parent="cloud"),
        edge("e1", "mobile", "api", "HTTPS / JSON", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "api", "redis", "state / cache", color="yellow", exit_xy=(1, 0.35), entry_xy=(0, 0.5)),
        edge("e3", "api", "postgres", "transaction / SQL", color="green", exit_xy=(1, 0.75), entry_xy=(0, 0.35), points=[(580, 220)]),
        edge("e4", "api", "worker", "enqueue job", color="yellow", exit_xy=(0.3, 1), entry_xy=(0.3, 0)),
        edge("e5", "worker", "redis", "queue / retry", color="yellow", exit_xy=(1, 0.25), entry_xy=(0, 0.75)),
        edge("e6", "worker", "postgres", "ghi tác vụ nền", color="green", exit_xy=(1, 0.65), entry_xy=(0, 0.75)),
        edge("e7", "worker", "exports", "export / cleanup", color="yellow", exit_xy=(1, 0.85), entry_xy=(0, 0.5)),
        edge("e8", "api", "localai", "", color="purple", exit_xy=(0.8, 0), entry_xy=(0, 0.5), points=[(500, 155), (810, 155), (810, 318)]),
        edge("e9", "api", "gemini", "", color="purple", dashed=True, exit_xy=(0.65, 0), entry_xy=(0, 0.5), points=[(470, 145), (1080, 145), (1080, 233)]),
        edge("e10", "api", "google", "", color="purple", dashed=True, exit_xy=(0.95, 0), entry_xy=(0, 0.5), points=[(500, 135), (1060, 135), (1060, 418)]),
    ]
    return build("03-deployment", "Deployment", 1390, 690, c)


def diagram_04() -> str:
    c: list[str] = [
        title("t", "Mô hình lớp miền theo aggregate nghiệp vụ", 40, 16, 1080),
        subtitle(
            "st",
            "Các aggregate dùng màu nhất quán với kiến trúc; ownership theo userId "
            "được lược khỏi cạnh để ưu tiên các quan hệ nghiệp vụ chính.",
            40,
            46,
            1250,
        ),
        lane("profile", "Hồ sơ & cá nhân hóa", 40, 100, 330, 750, "purple"),
        lane("ledger", "Sổ cái", 390, 100, 330, 750, "green"),
        lane("planning", "Kế hoạch & định kỳ", 740, 100, 330, 750, "yellow"),
        lane("conversation", "Hội thoại & phản hồi", 1090, 100, 330, 750, "blue"),
        card("user", "User", ["+ id: int", "+ userKey: string", "+ payday: int", "+ personalizationConsent: bool"], 20, 60, 290, 125, "blue", parent="profile", font_size=13),
        card("personality", "AIPersonality", ["+ id: int", "+ key, name: string", "+ stylePrompt: text"], 20, 225, 290, 110, "purple", parent="profile", font_size=13),
        card("trait", "UserTrait", ["+ id: int", "+ traitType: string", "+ traitValue: string"], 20, 375, 290, 105, "purple", parent="profile", font_size=13),
        card("wallet", "Wallet", ["+ id: int", "+ name, type: string", "+ balance: decimal", "+ updateBalance(amount)"], 20, 60, 290, 125, "green", parent="ledger", font_size=13),
        card("transaction", "Transaction", ["+ id: int", "+ description: string", "+ amount: decimal", "+ type, source: string", "+ transactionDate: date", "+ softDelete() / restore()"], 20, 225, 290, 165, "green", parent="ledger", font_size=13),
        card("category", "Category", ["+ id: int", "+ name, type: string", "+ parentId: int"], 20, 430, 290, 105, "green", parent="ledger", font_size=13),
        card("budget", "Budget", ["+ id: int", "+ amountLimit: decimal", "+ month, year: int", "+ progress() / forecast()"], 20, 60, 290, 125, "yellow", parent="planning", font_size=13),
        card("goal", "FinancialGoal", ["+ id: int", "+ goalType: string", "+ target/currentAmount: decimal", "+ targetDate: date", "+ buildPlan() / assessProgress()"], 20, 225, 290, 150, "yellow", parent="planning", font_size=13),
        card("bill", "RecurringBill", ["+ id: int", "+ name, frequency: string", "+ amount: decimal", "+ nextDueDate: date", "+ pay() / pause()"], 20, 415, 290, 140, "yellow", parent="planning", font_size=13),
        card("payment", "RecurringPayment", ["+ id: int", "+ periodDueDate / paidDate", "+ amount: decimal", "+ status: string"], 20, 595, 290, 120, "yellow", parent="planning", font_size=13),
        card("chat", "ChatMessage", ["+ id: int", "+ role: string", "+ content: text", "+ metadata: json"], 20, 60, 290, 120, "blue", parent="conversation", font_size=13),
        card("feedback", "AIFeedback", ["+ id: int", "+ feedbackType: string", "+ aiResult: json", "+ correctedResult: json"], 20, 220, 290, 125, "purple", parent="conversation", font_size=13),
        edge("u_p", "user", "personality", "activates 0..1", color="purple", exit_xy=(0.35, 1), entry_xy=(0.35, 0), arrow=False),
        edge("w_tx", "wallet", "transaction", "funds 0..*", color="green", exit_xy=(0.35, 1), entry_xy=(0.35, 0), arrow=False),
        edge("cat_tx", "category", "transaction", "classifies", color="green", exit_xy=(0.7, 0), entry_xy=(0.7, 1), arrow=False),
        edge("b_h", "bill", "payment", "history 0..*", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0), arrow=False),
        edge("p_c", "personality", "chat", "styles", color="purple", dashed=True, exit_xy=(1, 0.5), entry_xy=(0.5, 0), arrow=False, points=[(380, 380), (380, 90), (1255, 90)]),
        edge("f_tx", "feedback", "transaction", "corrects 0..1", color="purple", dashed=True, exit_xy=(0.2, 0), entry_xy=(1, 0.55), arrow=False, points=[(1168, 305), (730, 305), (730, 415)]),
        edge("w_g", "wallet", "goal", "links 0..1", color="green", exit_xy=(1, 0.7), entry_xy=(0, 0.4), arrow=False, points=[(730, 250), (730, 385)]),
    ]
    return build("04-domain-class", "Domain class", 1460, 890, c)


def diagram_05() -> str:
    c: list[str] = [
        title("t", "Sơ đồ quan hệ thực thể vật lý", 40, 16, 980),
        subtitle(
            "st",
            "Tên cột được rút gọn theo nhóm để giữ khả năng đọc; kiểu dữ liệu và "
            "constraint đầy đủ là chuỗi migration 001–008. Các cạnh thể hiện FK "
            "nghiệp vụ chính, còn user_id lặp lại biểu diễn phạm vi người dùng.",
            40,
            46,
            1430,
        ),
        lane("profile", "Hồ sơ & AI", 30, 105, 360, 745, "purple"),
        lane("ledger", "Sổ cái", 410, 105, 360, 745, "green"),
        lane("planning", "Kế hoạch", 790, 105, 360, 745, "yellow"),
        lane("ops", "Định kỳ & vận hành", 1170, 105, 360, 745, "blue"),
        card("users", "USERS", ["PK id · UK user_key", "username · payday", "FK active_personality_id", "personalization_consent"], 15, 50, 330, 105, "blue", parent="profile"),
        card("personalities", "AI_PERSONALITIES", ["PK id · UK key", "FK user_key", "name · style_prompt · is_default"], 15, 175, 330, 92, "purple", parent="profile"),
        card("traits", "USER_TRAITS", ["PK id · FK user_id", "trait_type · trait_value"], 15, 287, 330, 80, "purple", parent="profile"),
        card("chat", "CHAT_MESSAGES", ["PK id · FK user_id", "FK personality_id", "role · content · metadata"], 15, 387, 330, 92, "blue", parent="profile"),
        card("feedback", "AI_FEEDBACK_LOGS", ["PK id · FK user_id", "FK transaction_id", "feedback_type · original_text", "ai_result · corrected_result"], 15, 499, 330, 105, "purple", parent="profile"),
        card("categories", "CATEGORIES", ["PK id · FK user_id", "FK parent_id", "name · type · is_default"], 15, 50, 330, 92, "green", parent="ledger"),
        card("wallets", "WALLETS", ["PK id · FK user_id", "name · type", "balance · initial_balance"], 15, 162, 330, 92, "green", parent="ledger"),
        card("transactions", "TRANSACTIONS", ["PK id · FK user/category/wallet", "amount · type · source", "transaction_date · deleted_at", "ai_parsed"], 15, 274, 330, 108, "green", parent="ledger"),
        card("pnl", "INVESTMENT_PNL", ["PK id · FK user_id", "FK wallet_id", "amount · recorded_at"], 15, 402, 330, 92, "green", parent="ledger"),
        card("transfers", "WALLET_TRANSFERS", ["PK id · FK user_id", "FK from_wallet_id · to_wallet_id", "amount · transfer_type", "transaction_date"], 15, 514, 330, 108, "green", parent="ledger"),
        card("budgets", "BUDGETS", ["PK id · FK user/category", "amount_limit · month · year"], 15, 50, 330, 80, "yellow", parent="planning"),
        card("budget_history", "BUDGET_HISTORY", ["PK id · FK budget_id", "change_type", "old_value · new_value"], 15, 150, 330, 92, "yellow", parent="planning"),
        card("goals", "FINANCIAL_GOALS", ["PK id · FK user/linked_wallet", "goal_type · status", "target/current_amount", "target_date"], 15, 262, 330, 108, "yellow", parent="planning"),
        card("bills", "RECURRING_BILLS", ["PK id · FK user/category/wallet", "name · amount · frequency", "next_due_date"], 15, 50, 330, 92, "yellow", parent="ops"),
        card("payments", "RECURRING_BILL_PAYMENTS", ["PK id · FK user/bill", "FK transaction/wallet", "period_due_date · status"], 15, 162, 330, 92, "yellow", parent="ops"),
        card("dismissed", "RECURRING_SUGGESTIONS_DISMISSED", ["PK id · FK user_id", "signature · dismissed_at"], 15, 274, 330, 80, "yellow", parent="ops"),
        card("exports", "EXPORT_HISTORY", ["PK id · FK user_id", "export_type · file_path", "filters · expires_at"], 15, 374, 330, 92, "blue", parent="ops"),
        card("backup", "BACKUP_CONFIG", ["PK id · FK user_id", "auto_enabled · frequency", "keep_count"], 15, 486, 330, 92, "blue", parent="ops"),
        edge("p_u", "personalities", "users", "active_for", color="purple", dashed=True, exit_xy=(0.4, 0), entry_xy=(0.4, 1), arrow=False),
        edge("p_c", "personalities", "chat", "styles", color="purple", dashed=True, exit_xy=(0.7, 1), entry_xy=(0.7, 0), arrow=False),
        edge("cat_tx", "categories", "transactions", "classifies", color="green", exit_xy=(0, 0.45), entry_xy=(0, 0.45), arrow=False, points=[(415, 195), (415, 430)]),
        edge("w_tx", "wallets", "transactions", "funds", color="green", exit_xy=(0.65, 1), entry_xy=(0.75, 0), arrow=False),
        edge("cat_bud", "categories", "budgets", "limits", color="green", exit_xy=(1, 0.35), entry_xy=(0, 0.35), arrow=False),
        edge("bud_hist", "budgets", "budget_history", "audits", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0), arrow=False),
        edge("w_goal", "wallets", "goals", "links", color="green", exit_xy=(1, 0.6), entry_xy=(0, 0.6), arrow=False),
        edge("bill_pay", "bills", "payments", "history", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0), arrow=False),
    ]
    return build("05-physical-erd", "Physical ERD", 1560, 880, c)


def diagram_06() -> str:
    c: list[str] = [
        title("t", "Ranh giới trách nhiệm của LLM", 40, 16, 900),
        subtitle(
            "st",
            "LLM chỉ chuyển đổi ngữ nghĩa và diễn giải facts; validation, side "
            "effect, phép tính và nguồn dữ liệu chuẩn luôn thuộc lõi xác định.",
            40,
            46,
            1260,
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
        box("safety", "Ràng buộc an toàn\nLLM không ghi DB trực tiếp · không tự tạo số liệu", 590, 455, 320, 70, "red", font_size=12),
        edge("e1", "input", "pre", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "pre", "router", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "router", "llmparse", "ngữ cảnh phức tạp", color="purple", dashed=True, exit_xy=(1, 0.3), entry_xy=(0, 0.5)),
        edge("e4", "router", "local", "câu đơn giản / fallback", color="green", exit_xy=(1, 0.7), entry_xy=(0, 0.5)),
        edge("e5", "llmparse", "typed", "", color="purple", dashed=True, exit_xy=(1, 0.5), entry_xy=(0, 0.3)),
        edge("e6", "local", "typed", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.7)),
        edge("e7", "typed", "validate", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e8", "validate", "complete", "", color="yellow", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e9", "complete", "clarify", "Không", color="red", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e10", "clarify", "input", "bổ sung", color="red", exit_xy=(0, 0.5), entry_xy=(0.5, 1), points=[(970, 370), (20, 370), (20, 210)]),
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
        edge("safe1", "safety", "llmparse", "", color="red", dashed=True, arrow=False, exit_xy=(0.35, 0), entry_xy=(0.5, 1)),
        edge("safe2", "safety", "narrator", "", color="red", dashed=True, arrow=False, exit_xy=(0, 0.7), entry_xy=(1, 0.2), points=[(560, 600), (250, 600)]),
    ]
    return build("06-llm-boundary", "LLM boundary", 1490, 870, c)


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
        terminal("idle", "Rỗi / sẵn sàng", 40, 330, 150, 58, "blue"),
        box("parse", "Phân tích ý định\nvà trường dữ liệu", 240, 320, 190, 76, "blue"),
        decision("enough", "Đủ dữ liệu?", 480, 305, 150, 105),
        box("clarify", "Hỏi làm rõ", 480, 485, 150, 62, "red"),
        decision("kind", "Loại yêu cầu?", 690, 305, 150, 105),
        box("facts", "Tính facts và\ntrả lời truy vấn", 900, 170, 190, 74, "green"),
        box("pending", "Lưu pending có TTL\nvà hiển thị bản xem trước", 900, 320, 230, 76, "yellow"),
        decision("action", "Hành động\nngười dùng?", 1180, 305, 150, 105),
        box("update", "Cập nhật draft\nvà validation lại", 1150, 485, 210, 70, "blue"),
        box("commit", "Claim + COMMIT\nnguyên tử", 900, 610, 210, 70, "green"),
        decision("ok", "Commit\nthành công?", 650, 595, 150, 105),
        box("rollback", "ROLLBACK\nkhông tạo hiệu ứng dở dang", 420, 610, 190, 70, "red"),
        terminal("done", "Xóa pending / kết thúc", 160, 615, 200, 62, "green"),
        edge("e1", "idle", "parse", "", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "parse", "enough", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "enough", "clarify", "Không", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e4", "clarify", "parse", "bổ sung", color="red", exit_xy=(0, 0.5), entry_xy=(0.5, 1), points=[(220, 515), (220, 410)]),
        edge("e5", "enough", "kind", "Có", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e6", "kind", "facts", "chỉ đọc", color="green", exit_xy=(0.65, 0), entry_xy=(0, 0.5)),
        edge("e7", "facts", "done", "", color="green", exit_xy=(0, 0.5), entry_xy=(0.25, 0), points=[(850, 205), (210, 205), (210, 595)]),
        edge("e8", "kind", "pending", "thay đổi dữ liệu", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e9", "pending", "action", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e10", "action", "update", "sửa", exit_xy=(0.65, 1), entry_xy=(0.75, 0)),
        edge("e11", "update", "pending", "", exit_xy=(0, 0.35), entry_xy=(1, 0.75)),
        edge("e12", "action", "commit", "xác nhận", color="green", exit_xy=(0, 0.7), entry_xy=(1, 0.5), points=[(1120, 450), (1120, 645)]),
        edge("e13", "action", "done", "hủy / hết TTL", color="red", exit_xy=(1, 0.5), entry_xy=(0.5, 1), points=[(1380, 360), (1380, 735), (260, 735)]),
        edge("e14", "commit", "ok", "", color="yellow", exit_xy=(0, 0.5), entry_xy=(1, 0.5)),
        edge("e15", "ok", "done", "Có", color="green", exit_xy=(0.35, 1), entry_xy=(0.75, 1), points=[(700, 735), (310, 735)]),
        edge("e16", "ok", "rollback", "Không", color="red", exit_xy=(0, 0.7), entry_xy=(1, 0.5)),
        edge("e17", "rollback", "done", "", color="red", exit_xy=(0, 0.5), entry_xy=(1, 0.7)),
        edge("e18", "done", "idle", "yêu cầu mới", exit_xy=(0, 0.5), entry_xy=(0.5, 1), points=[(20, 645), (20, 420)]),
    ]
    return build("07-conversation-state", "Conversation state", 1410, 770, c)


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
        edge("e20", "confirm", "end", "Hủy", color="red", exit_xy=(0.65, 1), entry_xy=(0.2, 0), points=[(220, 640), (395, 640)]),
        edge("e21", "sql", "end", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e22", "fail", "end", "thử lại", color="red", exit_xy=(1, 0.5), entry_xy=(0.8, 1), points=[(1430, 115), (1430, 790), (525, 790)]),
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
    ]
    return build("10-feedback-flow", "Feedback flow", 1560, 790, c)


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
        edge("e1", "start", "validate", "", color="green", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e2", "validate", "valid", "", color="yellow", exit_xy=(1, 0.5), entry_xy=(0, 0.5)),
        edge("e3", "valid", "error", "Không", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 0)),
        edge("e4", "error", "end", "", color="red", exit_xy=(0, 0.5), entry_xy=(0.5, 1), points=[(20, 290), (20, 740), (880, 740)]),
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
        edge("e20", "saveq", "end", "Không / sửa", color="red", exit_xy=(0.5, 1), entry_xy=(0.5, 1), points=[(330, 730), (880, 730)]),
    ]
    return build("12-goal-flow", "Goal flow", 1500, 770, c)


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
