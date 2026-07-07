# CRM — AI-Powered CSV Importer

An intelligent CSV-to-CRM pipeline that accepts **any** valid CSV layout (Facebook Leads, Google Ads Exports, Real Estate CRMs, manually-crafted spreadsheets, etc.) and maps the columns into the standardised ** CRM format** using AI.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?logo=next.js) ![Express](https://img.shields.io/badge/Express-4-green?logo=express) ![AI](https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI-blue)

---

## ✨ Features

| Area | Highlights |
|------|-----------|
| **Upload** | Drag-&-drop + file picker, 10 MB limit, instant validation |
| **Preview** | Virtualized Table (`react-window`) for large datasets |
| **AI Extraction** | Batch processing, SSE streaming progress, auto OpenRouter key support, retry with exponential back-off |
| **Database** | SQLite (`crm.db`) auto-initialized to persist all imported leads |
| **Results** | Virtualized CRM table, summary stats, colour-coded status badges, CSV + JSON export |
| **Design** | Dark-mode glassmorphism, mesh-gradient background, micro-animations |
| **Resilience** | Smart heuristic fallback parser when no API key is configured |
| **DevOps** | Docker Compose, Vercel & Render configs, Jest Unit Tests included |

---

## 🏗️ Project Structure

```
csv_importer/
├── backend/
│   ├── server.js              # Express API (parse / import / import-stream)
│   ├── services/
│   │   └── aiService.js       # Gemini / OpenAI + fallback mapper
│   ├── .env                   # API keys & port
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js
│   │   │   ├── page.js        # 4-step wizard (Upload → Preview → Import → Results)
│   │   │   └── globals.css    # Full design-system
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── StepIndicator.js
│   │   │   ├── FileUpload.js
│   │   │   ├── DataPreview.js
│   │   │   ├── ProgressIndicator.js
│   │   │   └── ImportResult.js
│   │   └── lib/
│   │       └── api.js         # Fetch wrappers (SSE + standard)
│   ├── .env.local
│   ├── next.config.mjs
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. Clone the repository

```bash
git clone <repo-url>
cd csv_importer
```

### 2. Set up the Backend

```bash
cd backend
npm install
```

Open `backend/.env` and add at least one AI key (both are optional — the app falls back to a smart heuristic parser):

```env
PORT=5000
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

Start the backend:

```bash
npm run dev
```

The API will be available at **http://localhost:5000**.

### 3. Set up the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check & AI mode status |
| `POST` | `/api/parse` | Upload CSV (multipart), returns raw rows |
| `POST` | `/api/import` | Sync import — returns all CRM records at once |
| `POST` | `/api/import-stream` | SSE streaming import — batch-by-batch progress |

---

## 🤖 AI Prompt Engineering

The system prompt instructs the LLM to:

1. Map any column naming convention to the 15 CRM fields.
2. Enforce strict enum values for `crm_status` and `data_source`.
3. Consolidate extra emails / phones into `crm_note`.
4. Clean and split country codes from phone numbers.
5. Return a well-formed JSON object — no markdown wrapping.
6. Leave fields blank when data is genuinely missing rather than hallucinating.

When **no API key** is configured, a rule-based heuristic mapper handles the extraction using keyword matching on column names.

---

## 📋 CRM Fields

| Field | Description |
|-------|-------------|
| `created_at` | Lead creation date |
| `name` | Full name |
| `email` | Primary email |
| `country_code` | Phone country code |
| `mobile_without_country_code` | Phone digits only |
| `company` | Company name |
| `city` | City |
| `state` | State / Province |
| `country` | Country |
| `lead_owner` | Assigned owner |
| `crm_status` | `GOOD_LEAD_FOLLOW_UP` · `DID_NOT_CONNECT` · `BAD_LEAD` · `SALE_DONE` |
| `crm_note` | Remarks, extra contacts, unmapped data |
| `data_source` | `leads_on_demand` · `meridian_tower` · `eden_park` · `varah_swamy` · `sarjapur_plots` |
| `possession_time` | Property possession timeline |
| `description` | Additional info |

---

## 🧪 Sample CSV Files That Work

- Facebook Lead Exports
- Google Ads Lead Form Exports
- HubSpot / Zoho CRM Exports
- Real Estate lead sheets
- Manually created spreadsheets with arbitrary columns

---

## 🏆 Bonus Features Implemented

- ✅ Drag & Drop upload
- ✅ Real-time progress indicator (SSE streaming)
- ✅ Retry mechanism with exponential back-off
- ✅ Dark mode
- ✅ Responsive design
- ✅ CSV + JSON download
- ✅ Clean folder structure
- ✅ Smart fallback parser (works without API keys)

---

## 📄 License

MIT
