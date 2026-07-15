# PERFIN Architecture & Flow Diagrams

> **Generated:** 2026-07-11  
> **Project:** PERFIN - AI-Powered Personal Finance Management  
> **Student:** Nguyễn Thanh Trọng (B2305615)

---

## Overview

This directory contains Draw.io diagrams illustrating the PERFIN system architecture and special flows that demonstrate the role of LLM (Large Language Model) in the application.

---

## ✅ Completed Diagrams

### 1. **System Architecture** (`01_System_Architecture.drawio`)
**Purpose:** Overall system architecture showing:
- Mobile Client Layer (React Native + Expo)
- API Gateway Layer (Express.js with JWT & rate limiting)
- Core Business Services
- **AI Orchestrator Layer** (LLM Core - the brain of the system)
- **Analytics Engine** (AI Brain for insights)
- External AI Services (Gemini, Vision, Speech-to-Text)
- Data & Cache Layer (PostgreSQL + Redis)
- Background Workers (BullMQ)

**Key Highlights:**
- Shows how LLM is integrated throughout the system, not just as a chatbot wrapper
- Illustrates the separation between deterministic calculations (Analytics Engine) and LLM narration
- Demonstrates multi-layered caching strategy with Redis

---

### 2. **Flow 1: Text Input → Transaction** (`02_Flow01_Text_Input.drawio`)
**Purpose:** Demonstrates natural language transaction input via text chat

**Process:**
1. User types: "ăn sáng 30k Momo"
2. ChatScreen → API call → chat.routes.js
3. AI Service → Gemini API (NLP entity extraction)
4. Parse JSON: description, amount, category, wallet, date
5. Category matcher (3-tier matching)
6. Create pending transaction (Redis/Memory)
7. Display preview card
8. User confirms → Save to PostgreSQL

**LLM Role:**
- Entity extraction from natural language
- Multi-language support (Vietnamese, English, mixed)
- Currency shortcuts understanding (30k = 30,000đ)
- Multi-transaction parsing
- Context-aware categorization

---

### 3. **Flow 2: Voice Input → Transaction** (`03_Flow02_Voice_Input.drawio`)
**Purpose:** Voice-based transaction input with Speech-to-Text

**Process:**
1. User presses mic → record audio
2. Upload to POST /api/speech
3. STT Processing:
   - **PhoWhisper (offline):** Vietnamese model, FFmpeg conversion
   - **Google Speech-to-Text (cloud):** Alternative provider
4. Raw transcript → AI parseFromMedia() with voice-specific prompt
5. Filter filler words (ừ, à, hả)
6. Extract entities → Auto-send to chat flow (Flow 1)

**LLM Role:**
- Parse speech patterns (different from written text)
- Handle corrections and hesitations in speech
- Context understanding from spoken language

---

### 4. **Flow 3: Image → OCR → Transaction** (`04_Flow03_Image_OCR.drawio`)
**Purpose:** Receipt/bill image processing with OCR

**Process:**
1. User captures/selects image
2. Upload to POST /api/ocr
3. OCR Processing:
   - **PaddleOCR (offline):** Vietnamese support, image preprocessing
   - **Google Cloud Vision:** Alternative
4. Raw text → AI parseFromMedia() with receipt-specific prompt
5. LLM understands structure: line items vs total
6. Return multi-transaction preview or single total
7. User chooses: split items or keep as one

**LLM Role:**
- Understand receipt structure and layout
- Extract line items intelligently
- Categorize each item separately
- Handle various receipt formats (supermarket, restaurant, bank transfer)

---

### 5. **Flow 4: Auto-Categorization + Feedback Loop** (`05_Flow04_Auto_Categorization.drawio`)
**Purpose:** Context-aware categorization with user learning

**Process:**
1. New transaction → LLM suggests category (context-aware)
   - Example: "grab đi bệnh viện" → Y tế (not Di chuyển)
2. Category Matcher: exact → substring → alias → "Khác"
3. Preview with suggestion
4. User accepts or edits
5. **Feedback Loop:**
   - Log correction to ai_feedback_logs
   - Build pattern: user's categorization preferences
   - Use as few-shot context for next parse
6. **Category Discovery (Advanced):**
   - Detect recurring patterns in "Khác"
   - Suggest new categories
   - Re-tag old transactions

**LLM Role:**
- Context understanding (not keyword matching)
- Learn from user corrections (personalized)
- Discover hidden patterns
- Suggest new categories proactively

---

### 6. **Flow 7: AI-Powered Insights & Reports** (`06_Flow07_AI_Insights.drawio`)
**Purpose:** The CORE VALUE of LLM - turning data into actionable insights

**Architecture:**
```
User Request → Analytics Engine (Math) → Facts (JSON) → LLM Narrator + Persona → Personalized Insight
```

**Analytics Engine (Deterministic):**
- **Trend Detection:** Linear regression on spending patterns
- **Anomaly Detection:** Z-score on daily spending
- **Cashflow Runway:** Days until money runs out
- **Subscription Miner:** Find hidden recurring costs
- **Day-of-Week Patterns:** Behavioral analysis
- **Cross-Category Correlation:** Pearson correlation between categories

**LLM Narrator:**
- Receives accurate facts (no hallucination on numbers)
- Applies active persona (Chuyên gia, Bà mẹ, Bạn thân, Huấn luyện viên)
- Same data → 4 different experiences

**Example Output:**
- **Huấn luyện viên:** "Ăn uống tăng 15%/tháng. Đặt mục tiêu giảm 20% bằng nấu ăn 3 buổi/tuần."
- **Bà mẹ:** "Con ơi! Tháng này ăn ngoài nhiều thế! Cứ đà này cạn túi ngay!"
- **Bạn thân:** "Ê, mày ăn nhiều hén 😅 Hay tự nấu vài bữa tiết kiệm không?"

**Why This Matters:**
- This is NOT "chatbot wrapping SQL"
- AI sees patterns humans miss
- Personalization creates behavioral change
- Academic value: combines statistics + psychology + LLM

---

### 7. **Flow 16 (NEW): Financial Goal Planning** (`07_Flow16_Goal_Planning.drawio`)
**Purpose:** AI-guided goal planning with what-if scenarios

**Process:**
1. User: "Mình muốn tiết kiệm 300 triệu mua nhà trong 5 năm"
2. Intent recognition: goal_create, type: saving, target: 300tr, timeframe: 5 years
3. **Goal Planner Engine (Math):**
   - Calculate cashflow surplus: 4.2tr/month
   - Goal requires: 5tr/month
   - Gap: -800k/month → Not feasible!
4. **What-If Scenarios:**
   - Cut 20% entertainment → 5tr ✅
   - Extend to 6 years → 4.17tr ✅
   - Side income +1tr → 5.2tr ✅
5. **LLM Narrator:** Turn math into motivational roadmap (persona-based)
6. **Progress Tracking:** Monthly checks with AI encouragement

**Use Cases:**
- Saving goals (house, car, travel)
- Debt payoff (with interest calculation)
- Investment targets

**Academic Value:**
- Finance math + behavioral psychology + LLM
- Interactive what-if (not static advice)
- Behavioral nudge through persona

---

## 📋 Remaining Diagrams (To Be Created)

### 8. **Flow 5: Proactive Budget Alerts**
- Trigger: After expense transaction
- Check budget: 70% / 90% / 100% thresholds
- Format via Persona Engine
- Inject into chat

### 9. **Flow 6: Recurring Bill Reminders**
- Trigger: Daily cron or chat open
- Check upcoming bills (within 3 days)
- Check wallet balance
- Remind with context: "Ví chỉ còn 1.8tr, cần chuyển thêm 700k"

### 10. **Flow 12-15: Clarification Flows**
- Multi-turn conversation state (Redis-backed)
- Clarification when missing info
- Clarification when ambiguous bill name
- Intent override, cancel, edit-loop

### 11. **Flow 17 (NEW): Cashflow Runway Alert**
- Auto-trigger after transactions
- Calculate: days until money runs out
- Compare with payday
- Proactive warning

### 12. **Flow 18 (NEW): Subscription Discovery**
- Cron monthly
- Mine recurring small transactions
- Aggregate and contextualize
- "512k/tháng ≈ 1 tuần tiền ăn"

### 13. **Flow 19 (NEW): Monthly Auto Report**
- Cron end-of-month
- Analytics Engine full run
- LLM writes comprehensive report (persona)
- Inject into chat + optional PDF export

---

## 🎨 How to Open and Edit

1. **Online:** Go to https://app.diagrams.net/
2. **Upload:** File → Open → Select `.drawio` file
3. **Edit:** Use the GUI to modify shapes, connections, text
4. **Export:** File → Export as → PNG/SVG/PDF for inclusion in LaTeX report

**Note:** Flows 6 and 7 have been simplified to avoid XML parsing errors. The complex swimlane arrows were causing issues in Draw.io, so these diagrams now use a cleaner, more maintainable structure while preserving all key information.

---

## 📊 Integration with LaTeX Report

These diagrams should be exported as PNG/PDF and included in:

**Chapter 3 (Kết quả ứng dụng):**
- Section 3.2: Kiến trúc hệ thống → Use `01_System_Architecture.drawio`
- Section 3.3: Các luồng xử lý đặc biệt → Use Flow diagrams 02-07

**Key Figures to Include:**
1. Overall architecture (emphasize AI layers)
2. Flow 1 (most common use case)
3. Flow 4 (shows learning capability)
4. Flow 7 (shows core value of LLM)
5. Flow 16 (shows advanced planning)

---

## 🔑 Key Messages for Report

When describing these diagrams in your report, emphasize:

1. **LLM is not a wrapper** - It's integrated throughout the system
2. **Separation of concerns** - Math/stats are deterministic, LLM does narration
3. **Personalization** - Same data → different experiences (behavioral psychology)
4. **Learning** - Feedback loops make the system smarter over time
5. **Proactive** - AI initiates insights, not just responds to queries
6. **Multi-modal** - Text, voice, image inputs all converge to structured data

---

## 📁 File Naming Convention

- `01_System_Architecture.drawio` - Overall system
- `02_Flow01_*.drawio` - Individual flows (numbered by importance)
- Use descriptive suffixes: `Text_Input`, `Voice_Input`, `Image_OCR`, etc.

---

**Next Steps:**
1. Export diagrams to PNG (300 DPI for print quality)
2. Create remaining flow diagrams (8-13 above)
3. Write LaTeX captions explaining each diagram
4. Cross-reference with code in `demo/backend/`

---

*These diagrams visualize the architecture described in `resource/PROPOSAL_Backend_v2.md` and flows from `resource/FlowSpecial.md` & `resource/PROPOSAL_SpecialFlows_v2.md`*
