#!/usr/bin/env python3
"""Generate readable PERFIN report diagrams as editable Draw.io XML and SVG.

The generator deliberately uses only straight or orthogonal connectors.  The SVG
files are the deterministic render source used to build the vector PDFs inserted
in the report; the Draw.io files remain available for manual refinement.
"""

from __future__ import annotations

import argparse
import html
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


PALETTE = {
    "user": ("#dae8fc", "#6c8ebf"),
    "app": ("#d9eaf7", "#4f81bd"),
    "core": ("#d5e8d4", "#82b366"),
    "ai": ("#e1d5e7", "#9673a6"),
    "data": ("#fff2cc", "#d6b656"),
    "state": ("#ffe6cc", "#d79b00"),
    "external": ("#f5f5f5", "#666666"),
    "warning": ("#f8cecc", "#b85450"),
}

ROLE_LABELS = {
    "user": "Người dùng",
    "app": "Giao diện/API",
    "core": "Lõi xác định",
    "ai": "Lớp ngôn ngữ/AI",
    "data": "Dữ liệu/trạng thái",
    "state": "Điểm quyết định",
    "external": "Dịch vụ ngoài",
    "warning": "Lỗi/giới hạn",
}


@dataclass
class Node:
    id: str
    label: str
    x: int
    y: int
    w: int
    h: int
    role: str = "core"
    shape: str = "rect"
    font: int = 21
    align: str = "center"


@dataclass
class Edge:
    source: str
    target: str
    label: str = ""
    source_side: str = "bottom"
    target_side: str = "top"
    points: list[tuple[int, int]] = field(default_factory=list)
    dashed: bool = False
    bidirectional: bool = False


@dataclass
class Diagram:
    name: str
    title: str
    width: int
    height: int
    nodes: list[Node]
    edges: list[Edge]
    note: str = "Mũi tên liền: luồng chính; mũi tên nét đứt: phản hồi hoặc luồng thay thế."


def n(node_id, label, x, y, w, h, role="core", shape="rect", font=21, align="center"):
    return Node(node_id, label, x, y, w, h, role, shape, font, align)


def e(source, target, label="", source_side="bottom", target_side="top", points=None,
      dashed=False, bidirectional=False):
    return Edge(source, target, label, source_side, target_side, points or [], dashed, bidirectional)


def port(node: Node, side: str) -> tuple[float, float]:
    return {
        "top": (node.x + node.w / 2, node.y),
        "bottom": (node.x + node.w / 2, node.y + node.h),
        "left": (node.x, node.y + node.h / 2),
        "right": (node.x + node.w, node.y + node.h / 2),
    }[side]


def side_fraction(side: str) -> tuple[float, float]:
    return {
        "top": (0.5, 0), "bottom": (0.5, 1),
        "left": (0, 0.5), "right": (1, 0.5),
    }[side]


def orthogonal_points(edge: Edge, nodes: dict[str, Node]) -> list[tuple[float, float]]:
    start = port(nodes[edge.source], edge.source_side)
    end = port(nodes[edge.target], edge.target_side)
    if edge.points:
        return [start, *edge.points, end]
    if abs(start[0] - end[0]) < 2 or abs(start[1] - end[1]) < 2:
        return [start, end]
    if edge.source_side in ("left", "right"):
        mid_x = (start[0] + end[0]) / 2
        return [start, (mid_x, start[1]), (mid_x, end[1]), end]
    mid_y = (start[1] + end[1]) / 2
    return [start, (start[0], mid_y), (end[0], mid_y), end]


def domain_model() -> Diagram:
    """Group related domain objects so the model stays legible on one page."""
    centres = [230, 675, 1125, 1570]
    nodes = []
    for index, centre in enumerate(centres, start=1):
        nodes.append(n(f"domain-user-{index}", "User [cùng một thực thể]\nuser_key • persona • consent",
                       centre - 180, 90, 360, 80, "user", font=17))
    nodes.extend([
        n("ledger", "SỔ CÁI\nWallet 1 — * Transaction\nCategory 1 — * Transaction\namount > 0 • soft delete • balance", 35, 270, 390, 245, "data", font=19),
        n("planning", "LẬP KẾ HOẠCH\nBudget theo category/tháng\nFinancialGoal: saving/debt/purchase\nhistory • feasibility • what-if", 480, 270, 390, 245, "state", font=19),
        n("recurring-domain", "ĐỊNH KỲ\nRecurringBill 1 — * Payment\nPayment tham chiếu Transaction\nnext_due • cadence • dedup", 930, 270, 390, 245, "state", font=19),
        n("conversation", "HỘI THOẠI & PHẢN HỒI\nChatMessage • AIPersonality\nFeedback tham chiếu Transaction\noriginal → corrected • provenance", 1375, 270, 390, 245, "ai", font=18),
        n("domain-service", "ANALYTICS / BUDGET / GOAL SERVICES\nĐọc aggregate → tính facts/kế hoạch bằng hàm xác định; không sở hữu dữ liệu miền",
          210, 710, 1380, 105, "core", font=21),
        n("domain-note", "Bốn hộp User là cùng một thực thể được lặp để giữ các quan hệ sở hữu thẳng, không giao cắt.",
          430, 840, 940, 45, "external", font=15),
    ])
    for index, centre in enumerate(centres, start=1):
        nodes.append(n(f"service-port-{index}", "", centre, 710, 1, 1, "external", "point", font=1))
    aggregate_ids = ["ledger", "planning", "recurring-domain", "conversation"]
    edges = []
    for index, aggregate in enumerate(aggregate_ids, start=1):
        edges.append(e(f"domain-user-{index}", aggregate, "1 → *"))
        edges.append(e(aggregate, f"service-port-{index}", "facts", dashed=True))
    return Diagram(
        "04-domain-class", "Mô hình miền theo aggregate nghiệp vụ", 1800, 950,
        nodes, edges,
        note="Quan hệ sở hữu và luồng đọc facts dùng đoạn thẳng; chi tiết PK/FK nằm ở ERD vật lý.",
    )


def physical_erd() -> Diagram:
    """Render the physical schema as four independent modules.

    The four ``users`` boxes are deliberate aliases of the same physical table.
    Repeating the anchor avoids the unreadable user-key fan-out that made the old
    ERD look like a spider web.  Cross-module foreign keys remain written inside
    the child table, so no relationship is hidden merely to make the figure tidy.
    """
    return Diagram(
        "05-physical-erd", "ERD vật lý theo migration runtime (18 bảng)", 2050, 1280,
        [
            # Ledger module.
            n("u-ledger", "users [THAM CHIẾU]\nPK id • UQ user_key", 40, 90, 440, 90, "user"),
            n("wallets", "wallets\nPK id • FK user_id → users.user_key\nUQ (user_id, name) • balance", 40, 250, 440, 120, "data", font=18),
            n("transfers", "wallet_transfers\nPK id • FK user_id\nFK from_wallet_id / to_wallet_id", 40, 500, 210, 135, "data", font=17),
            n("pnl", "investment_pnl\nPK id • FK user_id\nFK wallet_id • amount ±", 270, 500, 210, 135, "data", font=17),
            # Transaction module.
            n("u-tx", "users [THAM CHIẾU]\nPK id • UQ user_key", 535, 90, 440, 90, "user"),
            n("categories", "categories\nPK id • FK user_id → users.user_key\nFK parent_id → categories.id\nUQ (user_id, type, name)", 535, 250, 440, 145, "data", font=18),
            n("transactions", "transactions\nPK id • FK user_id / category_id / wallet_id\nCHECK amount > 0 • deleted_at\nsource • ai_parsed", 535, 500, 440, 155, "data", font=18),
            n("feedback", "ai_feedback_logs\nPK id • FK user_id / transaction_id\noriginal → corrected • is_anonymized", 535, 760, 440, 130, "ai", font=18),
            # Planning and recurring module.
            n("u-plan", "users [THAM CHIẾU]\nPK id • UQ user_key", 1030, 90, 440, 90, "user"),
            n("budgets", "budgets\nPK id • FK user_id / category_id\nUQ user + category + month + year", 1030, 250, 205, 140, "data", font=16),
            n("history", "budget_history\nPK id • FK budget_id\nold_value → new_value", 1030, 500, 205, 125, "data", font=16),
            n("recurring", "recurring_bills\nPK id • FK user/category/wallet\namount > 0 • next_due_date", 1260, 250, 210, 140, "state", font=16),
            n("payments", "recurring_bill_payments\nPK id • FK user_id / bill_id\nFK transaction_id / wallet_id\nperiod_due_date", 1260, 500, 210, 150, "state", font=14),
            n("dismissed", "recurring_suggestions_\ndismissed\nPK id • FK user_id\nUQ user + signature", 1260, 790, 210, 135, "state", font=14),
            # Personalisation and operations module.
            n("u-ops", "users [THAM CHIẾU]\nPK id • UQ user_key", 1525, 90, 485, 90, "user"),
            n("personas", "ai_personalities\nPK id • FK user_key\nUQ key", 1525, 250, 225, 120, "ai", font=16),
            n("traits", "user_traits\nPK id • FK user_id\nUQ user + trait_type", 1780, 250, 230, 120, "ai", font=16),
            n("goals", "financial_goals\nPK id • FK user_id\nFK linked_wallet_id\ntarget_amount > 0", 1525, 500, 225, 135, "state", font=15),
            n("chat", "chat_messages\nPK id • FK user_id\nFK personality_id\nrole CHECK", 1780, 500, 230, 135, "ai", font=15),
            n("exports", "export_history\nPK id • FK user_id\nexport_type / status CHECK", 1525, 760, 225, 125, "data", font=16),
            n("backup", "backup_config\nPK id • FK + UQ user_id\nfrequency CHECK", 1780, 760, 230, 125, "data", font=16),
            n("erd-note", "Quy ước: bốn hộp users là cùng một bảng được lặp làm neo bố cục.\nFK chéo mô-đun (wallet/category/personality) được ghi trong bảng con để loại bỏ đường nối chồng chéo.",
              350, 1040, 1350, 90, "external", font=18),
        ],
        [
            e("u-ledger", "wallets", "user_id → user_key"),
            e("wallets", "transfers", "from/to wallet", "bottom", "top", [(260, 430), (145, 430)]),
            e("wallets", "pnl", "wallet_id", "bottom", "top", [(260, 455), (375, 455)]),
            e("u-tx", "categories", "user_id → user_key"),
            e("categories", "transactions", "category_id"),
            e("transactions", "feedback", "transaction_id"),
            e("u-plan", "budgets", "", "bottom", "top", [(1250, 215), (1132, 215)]),
            e("budgets", "history", "budget_id"),
            e("u-plan", "recurring", "", "bottom", "top", [(1250, 215), (1365, 215)]),
            e("recurring", "payments", "bill_id"),
            e("u-ops", "personas", "", "bottom", "top", [(1768, 215), (1638, 215)]),
            e("u-ops", "traits", "", "bottom", "top", [(1768, 215), (1895, 215)]),
        ],
        note="PK/UQ/CHECK nằm trong hộp; mũi tên vuông góc biểu diễn FK chính, không dùng đường cong.",
    )


def conversation_state() -> Diagram:
    """Clarification/pending states with one main axis and two terminal branches."""
    return Diagram(
        "07-conversation-state", "Máy trạng thái clarification và giao dịch chờ", 1800, 900,
        [
            n("idle", "IDLE\nchưa có intent", 60, 360, 240, 100, "external", "ellipse"),
            n("parse", "PARSE\ntạo draft", 370, 360, 240, 100, "ai"),
            n("check", "Đủ trường?", 700, 350, 240, 120, "state", "diamond"),
            n("collect", "COLLECTING\nawaiting + candidates", 670, 90, 300, 105, "state"),
            n("preview", "PREVIEW\npending TTL 5 phút", 1050, 350, 300, 115, "app"),
            n("confirmed", "CONFIRMED\nclaim một lần → commit", 1430, 355, 300, 105, "core"),
            n("cancel", "CANCELLED\nkhông ghi dữ liệu", 1050, 650, 300, 100, "warning"),
            n("expired", "EXPIRED\nTTL hết hạn", 400, 650, 300, 100, "warning"),
        ],
        [
            e("idle", "parse", "", "right", "left"),
            e("parse", "check", "draft", "right", "left"),
            e("check", "collect", "thiếu / bổ sung", "top", "bottom", bidirectional=True),
            e("check", "preview", "đủ", "right", "left"),
            e("preview", "confirmed", "", "right", "left"),
            e("preview", "cancel", "hủy"),
            e("preview", "expired", "hết TTL", "left", "top",
              [(1000, 408), (1000, 580), (550, 580)]),
        ],
        note="CONFIRMED/CANCELLED/EXPIRED là trạng thái kết thúc; yêu cầu mới khởi tạo một phiên IDLE khác.",
    )


def specs() -> list[Diagram]:
    return [
        Diagram(
            "01-system-context", "Sơ đồ ngữ cảnh và phạm vi hệ thống PERFIN", 1500, 900,
            [
                n("user", "NGƯỜI DÙNG\nnhập liệu • xác nhận • xem insight", 70, 330, 300, 120, "user"),
                n("mobile", "ỨNG DỤNG DI ĐỘNG\nform • chat • media • preview", 470, 160, 420, 110, "app"),
                n("perfin", "BIÊN HỆ THỐNG PERFIN\nAPI + service nghiệp vụ\nPostgreSQL + Redis\nAnalytics/Budget/Goal Planner", 470, 330, 420, 250, "core", font=22),
                n("providers", "DỊCH VỤ NGOÀI\nLLM • OCR • STT\nchỉ trả draft/raw text", 1050, 260, 330, 150, "external"),
                n("out", "NGOÀI PHẠM VI NIÊN LUẬN\nOpen Banking • shared wallet • auth production", 480, 675, 520, 100, "warning"),
            ],
            [
                e("user", "mobile", "thao tác / kết quả", "right", "left"),
                e("mobile", "perfin", "REST / JSON"),
                e("perfin", "providers", "tool call / media", "right", "left"),
                e("providers", "perfin", "draft / raw text", "bottom", "right", [(1215, 510), (930, 510)], dashed=True),
            ],
        ),
        Diagram(
            "02-runtime-architecture", "Kiến trúc vận hành của PERFIN", 1600, 1000,
            [
                n("mobile", "React Native / Expo\nUI + API client", 600, 80, 400, 90, "app"),
                n("api", "Express API\nroute • upload • validation", 600, 230, 400, 90, "app"),
                n("chat", "Conversation Service\nclarification • preview • confirm", 110, 410, 400, 120, "core"),
                n("core", "Core Services\ntransaction • recurring • export", 600, 410, 400, 120, "core"),
                n("worker", "BullMQ Worker\nschedule • retry • dedup", 1090, 410, 400, 120, "state"),
                n("ai", "AI Orchestrator\ntyped draft • narration", 110, 650, 400, 115, "ai"),
                n("pg", "PostgreSQL\nnguồn dữ liệu chuẩn", 600, 650, 400, 115, "data", "cylinder"),
                n("redis", "Redis / KV\npending • cache • queue", 1090, 650, 400, 115, "data", "cylinder"),
                n("providers", "LLM / OCR / STT\nprovider có thể thay thế", 110, 835, 400, 90, "external"),
                n("engines", "Analytics • Budget • Goal\nhàm xác định, kiểm thử độc lập", 600, 835, 400, 90, "core"),
            ],
            [
                e("mobile", "api", "HTTPS"),
                e("api", "chat", "chat/media", "bottom", "top", [(800, 365), (310, 365)]),
                e("api", "core", "CRUD/query"),
                e("api", "worker", "trạng thái job", "bottom", "top", [(800, 365), (1290, 365)]),
                e("chat", "ai", "draft có kiểu"),
                e("chat", "redis", "TTL state", "right", "left", [(550, 590), (1050, 590)]),
                e("core", "pg", "transaction / SQL"),
                e("worker", "redis", "queue / fingerprint"),
                e("ai", "providers", "adapter"),
                e("core", "engines", "dữ liệu chuẩn"),
                e("engines", "pg", "facts", "top", "bottom", dashed=True),
            ],
        ),
        Diagram(
            "03-deployment", "Sơ đồ triển khai nguyên mẫu", 1600, 950,
            [
                n("device", "THIẾT BỊ / TRÌNH DUYỆT\nExpo app hoặc web build", 70, 205, 350, 120, "app"),
                n("api", "TIẾN TRÌNH API\nNode.js + Express\nport 3000", 530, 190, 350, 150, "core"),
                n("worker", "TIẾN TRÌNH WORKER\nBullMQ handlers\nkhởi chạy riêng", 530, 600, 350, 150, "state"),
                n("pg", "POSTGRESQL\n18 bảng vật lý", 1040, 120, 350, 130, "data", "cylinder"),
                n("redis", "REDIS\nstate • cache • queue", 1040, 350, 350, 130, "data", "cylinder"),
                n("provider", "PROVIDER NGOÀI\nGemini / OCR / STT", 70, 600, 350, 130, "external"),
                n("limit", "Docker Compose hiện chỉ hỗ trợ Redis; đây không phải cụm HA/production.", 430, 820, 740, 55, "warning", font=17),
            ],
            [
                e("device", "api", "HTTPS", "right", "left"),
                e("api", "pg", "SQL", "right", "left"),
                e("api", "redis", "KV/cache", "bottom", "top", [(705, 390), (1215, 390)]),
                e("api", "provider", "TLS API", "bottom", "top", [(705, 500), (245, 500)]),
                e("worker", "pg", "query/write", "bottom", "right", [(705, 780), (1510, 780), (1510, 185)]),
                e("worker", "redis", "BullMQ", "right", "left", [(960, 675), (960, 415)]),
            ],
        ),
        domain_model(),
        physical_erd(),
        Diagram(
            "06-llm-boundary", "Ranh giới trách nhiệm của LLM", 1600, 950,
            [
                n("input", "Đầu vào tự nhiên\ntext • ảnh • giọng nói", 80, 130, 330, 110, "user"),
                n("llm", "LLM / parser\nhiểu ý định • điền tham số", 80, 365, 330, 130, "ai"),
                n("draft", "Typed draft\nschema + provenance", 520, 365, 330, 130, "app"),
                n("validate", "Validation + preview\nngười dùng xác nhận", 960, 365, 360, 130, "core"),
                n("service", "Core service\ntransaction • query", 960, 620, 360, 120, "core"),
                n("db", "PostgreSQL\nnguồn sự thật", 1370, 620, 200, 120, "data", "cylinder"),
                n("facts", "Analytics Engine\nSQL → facts có cấu trúc", 520, 620, 330, 120, "core"),
                n("narrator", "Narrator LLM/template\nchỉ diễn đạt facts", 80, 620, 330, 120, "ai"),
                n("guard", "THIẾT KẾ ĐÍCH\nnumeric grounding checker", 80, 810, 330, 80, "warning", font=18),
            ],
            [
                e("input", "llm", "ngôn ngữ / media"),
                e("llm", "draft", "tool call", "right", "left"),
                e("draft", "validate", "đối số có kiểu", "right", "left"),
                e("validate", "service", "sau xác nhận"),
                e("service", "db", "SQL", "right", "left", bidirectional=True),
                e("service", "facts", "dữ liệu chuẩn", "left", "right"),
                e("facts", "narrator", "facts", "left", "right"),
                e("narrator", "guard", "response", "bottom", "top", dashed=True),
            ],
            note="Không có đường nối trực tiếp từ LLM tới PostgreSQL; mọi thay đổi đi qua validation, preview và service.",
        ),
        conversation_state(),
        flow_diagram_text_sequence(),
        Diagram(
            "09-multimodal-flow", "Luồng xử lý đầu vào đa phương thức", 1700, 1000,
            [
                n("text", "VĂN BẢN\ncâu tự nhiên", 80, 100, 300, 95, "user"),
                n("voice", "GIỌNG NÓI\naudio ≤ 10 MB", 700, 100, 300, 95, "user"),
                n("image", "ẢNH HÓA ĐƠN\nimage ≤ 10 MB", 1320, 100, 300, 95, "user"),
                n("stt", "STT adapter\nraw transcript", 700, 270, 300, 105, "external"),
                n("ocr", "OCR adapter\nraw text / items", 1320, 270, 300, 105, "external"),
                n("confirm_text", "Xác nhận transcript", 700, 440, 300, 90, "app"),
                n("choice", "Chọn tổng / mặt hàng\nchưa tự đối soát tổng", 1320, 430, 300, 110, "warning"),
                n("pipeline", "PIPELINE TEXT CHUNG\nparser/LLM → typed draft", 600, 620, 500, 115, "ai"),
                n("validate", "Validation + clarification", 600, 800, 500, 95, "core"),
                n("preview", "Preview → xác nhận → DB", 1200, 800, 390, 95, "core"),
                n("error", "Provider lỗi\ntrả 503 / nhập tay\nkhông tạo mock", 80, 430, 300, 120, "warning"),
            ],
            [
                e("text", "pipeline", "text", "bottom", "left", [(230, 230), (450, 230), (450, 680), (560, 680)]),
                e("voice", "stt"), e("stt", "confirm_text"),
                e("confirm_text", "pipeline", "transcript", "bottom", "top", [(850, 570), (850, 580)]),
                e("image", "ocr"), e("ocr", "choice"),
                e("choice", "pipeline", "raw text/items", "bottom", "right", [(1470, 680), (1140, 680)]),
                e("pipeline", "validate"),
                e("validate", "preview", "đủ trường", "right", "left"),
            ],
        ),
        Diagram(
            "10-feedback-flow", "Phân loại an toàn và vòng phản hồi", 1650, 1000,
            [
                n("input", "Mô tả giao dịch\n+ loại thu/chi", 80, 330, 300, 105, "user"),
                n("normalize", "Chuẩn hóa chuỗi\nbỏ dấu • token hóa", 480, 330, 300, 105, "core"),
                n("correction", "Correction retrieval\nexact/fuzzy lịch sử", 880, 120, 330, 105, "ai"),
                n("matcher", "Matcher\nexact → alias → fuzzy", 880, 330, 330, 105, "core"),
                n("safe", "Đạt ngưỡng\nvà margin?", 1320, 320, 240, 125, "state", "diamond"),
                n("category", "Danh mục + confidence\nmatch_kind + provenance", 1260, 570, 350, 105, "data"),
                n("fallback", "Khác / hỏi người dùng\nkhông tự chọn khi mơ hồ", 830, 570, 350, 105, "warning"),
                n("store", "Feedback log\noriginal → corrected", 830, 760, 350, 105, "data", "cylinder"),
                n("edit", "Người dùng sửa category\nchỉ học sau commit", 1260, 760, 350, 105, "user"),
            ],
            [
                e("input", "normalize", "text", "right", "left"),
                e("normalize", "correction", "truy vấn", "right", "left", [(820, 382), (820, 172)]),
                e("correction", "matcher", "ứng viên / trọng số"),
                e("normalize", "matcher", "", "right", "left"),
                e("matcher", "safe", "top-2", "right", "left"),
                e("safe", "category", "có"),
                e("safe", "fallback", "không", "left", "top", [(1280, 480), (1005, 480)]),
                e("category", "edit", "nếu sửa"),
                e("edit", "store", "", "left", "right"),
                e("store", "correction", "", "top", "top", [(1005, 710), (1630, 710), (1630, 70), (1045, 70)], dashed=True),
            ],
        ),
        insight_sequence(),
        Diagram(
            "12-goal-flow", "Luồng lập kế hoạch mục tiêu và what-if", 1700, 1000,
            [
                n("input", "Mục tiêu tự nhiên/form\ntarget • date • contribution • rate", 80, 110, 430, 115, "user"),
                n("extract", "Typed parameters\nLLM chỉ trích xuất", 635, 110, 430, 115, "ai"),
                n("validate", "Validation\ntype • miền số • ngày", 1190, 110, 430, 115, "core"),
                n("branch", "Loại mục tiêu?", 735, 320, 230, 125, "state", "diamond"),
                n("saving", "Saving/Purchase Planner\nR=T−C • ceil(R/M)\ndeadline + shortfall", 250, 540, 430, 150, "core"),
                n("debt", "Debt Planner\nannuity + monthly simulation\nnegative amortization", 1020, 540, 430, 150, "core"),
                n("facts", "PLAN FACTS\nfeasibility • gap • date • warnings", 635, 760, 430, 115, "data"),
                n("whatif", "WHAT-IF\nM' = M + extra\nkhông sửa plan gốc", 130, 790, 360, 105, "state"),
                n("confirm", "Preview token / pending\nXác nhận → lưu goal", 1190, 780, 400, 105, "app"),
            ],
            [
                e("input", "extract", "text/form", "right", "left"),
                e("extract", "validate", "tham số", "right", "left"),
                e("validate", "branch", "hợp lệ", "bottom", "top", [(1405, 275), (850, 275)]),
                e("branch", "saving", "saving/purchase", "left", "top", [(700, 382), (465, 382)]),
                e("branch", "debt", "debt_payoff", "right", "top", [(1000, 382), (1235, 382)]),
                e("saving", "facts", "kết quả", "right", "left", [(720, 615), (720, 817)]),
                e("debt", "facts", "kết quả", "left", "right", [(980, 615), (980, 817)]),
                e("facts", "confirm", "plan + warning", "right", "left"),
                e("facts", "whatif", "chạy lại", "left", "right", dashed=True),
            ],
        ),
        worker_sequence(),
    ]


def sequence_diagram(name: str, title: str, participants: list[tuple[str, str, str]],
                     messages: list[tuple[int, int, str, bool]]) -> Diagram:
    width = max(1600, 220 + 270 * len(participants))
    height = 260 + 72 * len(messages)
    xs = [120 + i * ((width - 240) / max(1, len(participants) - 1)) for i in range(len(participants))]
    nodes = [n(pid, label, int(x - 105), 80, 210, 70, role, "participant", font=18)
             for x, (pid, label, role) in zip(xs, participants)]
    for index, x in enumerate(xs):
        nodes.append(n(f"life-{index}", "", int(x), 150, 1, height - 235,
                       "external", "lifeline", font=1))
    edges = []
    for idx, (src_i, dst_i, label, dashed) in enumerate(messages):
        y = 210 + idx * 72
        src = f"msg-{idx}-source"
        dst = f"msg-{idx}-target"
        nodes.append(n(src, "", int(xs[src_i]), y, 1, 1, "external", "point", font=1))
        nodes.append(n(dst, "", int(xs[dst_i]), y, 1, 1, "external", "point", font=1))
        source_side = "right" if src_i < dst_i else "left"
        target_side = "left" if src_i < dst_i else "right"
        edges.append(e(src, dst, label, source_side, target_side, dashed=dashed))
    return Diagram(name, title, width, height, nodes, edges,
                   note="Trục thời gian đi từ trên xuống; mọi message dùng đoạn thẳng ngang, response dùng nét đứt.")


def flow_diagram_text_sequence() -> Diagram:
    return sequence_diagram(
        "08-text-sequence", "Sơ đồ tuần tự nhập giao dịch bằng văn bản",
        [("user", "Người dùng", "user"), ("app", "Mobile App", "app"),
         ("chat", "Chat Service", "core"), ("ai", "AI/Parser", "ai"),
         ("kv", "Redis/KV", "data"), ("db", "PostgreSQL", "data")],
        [(0, 1, "1. Gửi câu giao dịch", False), (1, 2, "2. POST /chat/message", False),
         (2, 3, "3. Parse với schema + corrections", False), (3, 2, "4. Typed draft", True),
         (2, 4, "5. Lưu clarification/pending TTL", False), (2, 1, "6. Preview hoặc câu hỏi", True),
         (0, 1, "7. Sửa / xác nhận", False), (1, 2, "8. pending_id + payload", False),
         (2, 4, "9. Atomic claim", False), (4, 2, "10. Draft đúng ID", True),
         (2, 5, "11. BEGIN → insert + update balance → COMMIT", False),
         (5, 2, "12. Giao dịch đã lưu", True), (2, 1, "13. Kết quả + số dư", True),
         (1, 0, "14. Hiển thị thành công", True)],
    )


def insight_sequence() -> Diagram:
    return sequence_diagram(
        "11-insight-sequence", "Sơ đồ tuần tự sinh insight có căn cứ",
        [("user", "Người dùng", "user"), ("api", "Report API", "app"),
         ("model", "SQL Model", "data"), ("engine", "Analytics Engine", "core"),
         ("narrator", "Narrator", "ai"), ("guard", "Grounding đích", "warning")],
        [(0, 1, "1. Yêu cầu insight", False), (1, 2, "2. Truy vấn theo kỳ/user", False),
         (2, 1, "3. Chuỗi dữ liệu chuẩn", True), (1, 3, "4. Tính trend/anomaly/runway/...", False),
         (3, 1, "5. facts + method + sample count", True), (1, 4, "6. Narrate(facts, persona)", False),
         (4, 1, "7. message", True), (1, 5, "8. So số/đơn vị với facts", False),
         (5, 1, "9. pass/fallback (thiết kế đích)", True),
         (1, 0, "10. message + facts + degraded_components", True)],
    )


def worker_sequence() -> Diagram:
    return sequence_diagram(
        "13-worker-sequence", "Sơ đồ tuần tự tác vụ chủ động và chống trùng",
        [("scheduler", "Scheduler", "state"), ("redis", "Redis/BullMQ", "data"),
         ("worker", "Worker", "core"), ("engine", "Handler/Analytics", "core"),
         ("db", "PostgreSQL", "data")],
        [(0, 1, "1. Upsert repeatable job", False), (1, 2, "2. job_id + payload", False),
         (2, 4, "3. Lấy đúng user scope", False), (4, 2, "4. dữ liệu", True),
         (2, 3, "5. Tính facts / tạo nội dung", False), (3, 2, "6. result + fingerprint", True),
         (2, 4, "7. INSERT event_key UNIQUE", False), (4, 2, "8. inserted / duplicate", True),
         (2, 1, "9. complete hoặc retry cùng fingerprint", False),
         (1, 0, "10. trạng thái job", True)],
    )


def svg_text(lines: list[str], x: float, y: float, font: int, anchor="middle",
             bold_first=True, line_height=None) -> str:
    line_height = line_height or int(font * 1.28)
    out = [f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="DejaVu Sans, Arial, sans-serif" '
           f'font-size="{font}" fill="#1f2937">']
    for i, line in enumerate(lines):
        weight = "700" if bold_first and i == 0 else "400"
        dx = 0
        out.append(f'<tspan x="{x}" dy="{0 if i == 0 else line_height}" font-weight="{weight}">{html.escape(line)}</tspan>')
    out.append("</text>")
    return "".join(out)


def label_position(points: list[tuple[float, float]]) -> tuple[float, float]:
    segments = []
    for a, b in zip(points, points[1:]):
        length = abs(a[0] - b[0]) + abs(a[1] - b[1])
        segments.append((length, a, b))
    _, a, b = max(segments, key=lambda item: item[0])
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8)


def render_svg(diagram: Diagram, output: Path) -> None:
    node_map = {node.id: node for node in diagram.nodes}
    roles = []
    for node in diagram.nodes:
        if node.shape not in ("point", "lifeline") and node.role not in roles:
            roles.append(node.role)
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{diagram.width}" height="{diagram.height}" '
        f'viewBox="0 0 {diagram.width} {diagram.height}">',
        '<defs><marker id="arrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">'
        '<path d="M0,0 L12,4 L0,8 z" fill="#374151"/></marker>'
        '<marker id="arrow-start" markerWidth="12" markerHeight="8" refX="2" refY="4" orient="auto" markerUnits="strokeWidth">'
        '<path d="M12,0 L0,4 L12,8 z" fill="#374151"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        f'<text x="{diagram.width/2}" y="42" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" '
        f'font-size="30" font-weight="700" fill="#0b4f6c">{html.escape(diagram.title)}</text>',
    ]
    # Edges are rendered first so boxes remain opaque and labels do not cross nodes.
    for edge in diagram.edges:
        points = orthogonal_points(edge, node_map)
        pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
        dash = ' stroke-dasharray="10 7"' if edge.dashed else ""
        marker_start = ' marker-start="url(#arrow-start)"' if edge.bidirectional else ""
        parts.append(f'<polyline points="{pts}" fill="none" stroke="#374151" stroke-width="3" '
                     f'stroke-linejoin="miter" stroke-linecap="square" marker-end="url(#arrow)"{marker_start}{dash}/>')
        if edge.label:
            lx, ly = label_position(points)
            label_width = max(90, min(430, len(edge.label) * 11 + 24))
            parts.append(f'<rect x="{lx-label_width/2:.1f}" y="{ly-21:.1f}" width="{label_width}" height="30" '
                         'rx="0" fill="#ffffff" opacity="0.96"/>')
            parts.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" '
                         f'font-family="DejaVu Sans, Arial, sans-serif" font-size="20" fill="#374151">'
                         f'{html.escape(edge.label)}</text>')
    for node in diagram.nodes:
        fill, stroke = PALETTE[node.role]
        if node.shape == "point":
            continue
        if node.shape == "lifeline":
            parts.append(f'<line x1="{node.x}" y1="{node.y}" x2="{node.x}" y2="{node.y+node.h}" '
                         'stroke="#9ca3af" stroke-width="2" stroke-dasharray="8 7"/>')
            continue
        if node.shape == "ellipse":
            parts.append(f'<ellipse cx="{node.x+node.w/2}" cy="{node.y+node.h/2}" rx="{node.w/2}" ry="{node.h/2}" '
                         f'fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
        elif node.shape == "diamond":
            pts = [(node.x+node.w/2, node.y), (node.x+node.w, node.y+node.h/2),
                   (node.x+node.w/2, node.y+node.h), (node.x, node.y+node.h/2)]
            parts.append('<polygon points="{}" fill="{}" stroke="{}" stroke-width="3"/>'.format(
                " ".join(f"{x},{y}" for x, y in pts), fill, stroke))
        elif node.shape == "cylinder":
            parts.append(f'<path d="M {node.x} {node.y+16} C {node.x} {node.y-4}, {node.x+node.w} {node.y-4}, '
                         f'{node.x+node.w} {node.y+16} L {node.x+node.w} {node.y+node.h-16} '
                         f'C {node.x+node.w} {node.y+node.h+4}, {node.x} {node.y+node.h+4}, {node.x} {node.y+node.h-16} Z" '
                         f'fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
            parts.append(f'<ellipse cx="{node.x+node.w/2}" cy="{node.y+16}" rx="{node.w/2}" ry="16" '
                         f'fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
        else:
            parts.append(f'<rect x="{node.x}" y="{node.y}" width="{node.w}" height="{node.h}" '
                         f'fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
        lines = node.label.split("\n")
        line_height = int(node.font * 1.25)
        total = (len(lines) - 1) * line_height
        text_y = node.y + node.h / 2 - total / 2 + node.font * 0.34
        anchor = "middle" if node.align == "center" else "start"
        text_x = node.x + node.w / 2 if anchor == "middle" else node.x + 14
        parts.append(svg_text(lines, text_x, text_y, node.font, anchor, True, line_height))
    # A compact, consistent legend; cap at six entries to preserve whitespace.
    legend_roles = roles[:6]
    item_w = diagram.width / max(1, len(legend_roles))
    legend_y = diagram.height - 38
    for i, role in enumerate(legend_roles):
        fill, stroke = PALETTE[role]
        x = 20 + i * item_w
        parts.append(f'<rect x="{x}" y="{legend_y-18}" width="26" height="16" fill="{fill}" stroke="{stroke}"/>')
        parts.append(f'<text x="{x+34}" y="{legend_y-5}" font-family="DejaVu Sans, Arial, sans-serif" '
                     f'font-size="14" fill="#374151">{html.escape(ROLE_LABELS[role])}</text>')
    parts.append(f'<text x="{diagram.width/2}" y="{diagram.height-8}" text-anchor="middle" '
                 f'font-family="DejaVu Sans, Arial, sans-serif" font-size="13" fill="#6b7280">'
                 f'{html.escape(diagram.note)}</text>')
    parts.append("</svg>")
    output.write_text("\n".join(parts), encoding="utf-8")


def render_drawio(diagram: Diagram, output: Path) -> None:
    mxfile = ET.Element("mxfile", {"host": "drawio", "version": "30.3.11"})
    page = ET.SubElement(mxfile, "diagram", {"id": diagram.name, "name": "Page-1"})
    model = ET.SubElement(page, "mxGraphModel", {
        "grid": "1", "gridSize": "10", "guides": "1", "tooltips": "1",
        "connect": "1", "arrows": "1", "fold": "1", "page": "1",
        "pageScale": "1", "pageWidth": str(diagram.width), "pageHeight": str(diagram.height),
        "math": "0", "shadow": "0",
    })
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})
    for node in diagram.nodes:
        fill, stroke = PALETTE[node.role]
        shape = "rounded=0"
        if node.shape == "ellipse":
            shape = "ellipse"
        elif node.shape == "diamond":
            shape = "rhombus"
        elif node.shape == "cylinder":
            shape = "shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=15"
        elif node.shape == "lifeline":
            shape = "shape=line;direction=south;dashed=1;dashPattern=8 7;opacity=45"
        elif node.shape == "point":
            shape = "shape=point;opacity=0;fillOpacity=0;strokeOpacity=0"
        style = (f"{shape};whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
                 f"strokeWidth=2;fontSize={node.font};fontFamily=Arial;align={node.align};")
        cell = ET.SubElement(root, "mxCell", {
            "id": node.id, "value": node.label, "style": style,
            "vertex": "1", "parent": "1",
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(node.x), "y": str(node.y), "width": str(node.w), "height": str(node.h),
            "as": "geometry",
        })
    node_map = {node.id: node for node in diagram.nodes}
    for idx, edge in enumerate(diagram.edges, start=1):
        sx, sy = side_fraction(edge.source_side)
        tx, ty = side_fraction(edge.target_side)
        style = ("edgeStyle=orthogonalEdgeStyle;curved=0;rounded=0;orthogonalLoop=1;jettySize=auto;"
                 "html=1;strokeWidth=2;endArrow=block;endSize=9;labelBackgroundColor=#ffffff;"
                 f"fontSize=20;exitX={sx};exitY={sy};entryX={tx};entryY={ty};")
        if edge.dashed:
            style += "dashed=1;dashPattern=8 6;"
        if edge.bidirectional:
            style += "startArrow=block;startSize=9;"
        cell = ET.SubElement(root, "mxCell", {
            "id": f"edge-{idx}", "value": edge.label, "style": style,
            "edge": "1", "parent": "1", "source": edge.source, "target": edge.target,
        })
        geom = ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        if edge.points:
            array = ET.SubElement(geom, "Array", {"as": "points"})
            for x, y in edge.points:
                ET.SubElement(array, "mxPoint", {"x": str(x), "y": str(y)})
    ET.indent(mxfile, space="  ")
    output.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(
        mxfile, encoding="unicode", short_empty_elements=True), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parents[1] / "figures")
    args = parser.parse_args()
    drawio_dir = args.output / "drawio"
    rendered_dir = args.output / "rendered"
    drawio_dir.mkdir(parents=True, exist_ok=True)
    rendered_dir.mkdir(parents=True, exist_ok=True)
    mutool = shutil.which("mutool")
    for diagram in specs():
        drawio_path = drawio_dir / f"{diagram.name}.drawio"
        svg_path = rendered_dir / f"{diagram.name}.svg"
        pdf_path = rendered_dir / f"{diagram.name}.pdf"
        png_path = rendered_dir / f"{diagram.name}.png"
        render_drawio(diagram, drawio_path)
        render_svg(diagram, svg_path)
        if mutool:
            subprocess.run([mutool, "convert", "-o", str(pdf_path), str(svg_path)], check=True)
            subprocess.run(
                [mutool, "draw", "-q", "-r", "110", "-o", str(png_path), str(pdf_path)],
                check=True,
            )
        print(diagram.name)
    if not mutool:
        print("warning: mutool not found; generated editable Draw.io and SVG only")


if __name__ == "__main__":
    main()
