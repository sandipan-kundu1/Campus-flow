# 🎓 Campus Flow

**AI-powered campus assistant — an operating system for student life.**

Built for hackathons. Powered by Groq LLaMA 3.3, HuggingFace embeddings, ChromaDB, AWS DynamoDB & S3.

---

## Features

| Feature | Description |
|---|---|
| **Routine Understanding** | Upload timetables (PDF/JSON), view today's/weekly schedule, see next class |
| **Update Summarization** | Upload notices/circulars, auto-summarized by Groq AI |
| **Smart Scheduling** | Add/manage deadlines (assignments, exams, projects), AI study plan |
| **Instant Q&A** | RAG-powered chat — ask anything about your schedule, documents, or deadlines |

---

## Tech Stack

**Frontend:** React + Vite + Tailwind CSS + React Router + Axios  
**Backend:** FastAPI + Python 3.11 + Uvicorn  
**AI:** Groq API (`llama-3.3-70b-versatile`) + HuggingFace `sentence-transformers/all-MiniLM-L6-v2`  
**Storage:** AWS DynamoDB + AWS S3  
**Vector DB:** ChromaDB (local persistent)

---

## Project Structure

```
Campus-flow/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── chat.py          # POST /documents/upload, POST /chat/query
│   │   │   ├── upload.py        # POST /upload/timetable, POST /upload/notice
│   │   │   ├── schedule.py      # GET /schedule/today|weekly|next-class
│   │   │   ├── deadlines.py     # CRUD /deadlines
│   │   │   └── summarize.py     # GET /summaries, POST /summarize, POST /schedule/suggestions
│   │   ├── services/
│   │   │   ├── groq_service.py       # Groq LLM calls
│   │   │   ├── rag_service.py        # ChromaDB vector store
│   │   │   ├── embedding_service.py  # HuggingFace embeddings
│   │   │   ├── s3_service.py         # AWS S3 operations
│   │   │   └── dynamodb_service.py   # AWS DynamoDB operations
│   │   ├── schemas/schemas.py
│   │   ├── utils/text_extractor.py   # PDF/DOCX/TXT extraction
│   │   ├── config.py
│   │   └── main.py
│   ├── setup_dynamodb.py   # One-time table creation
│   ├── sample_timetable.json
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # Axios API client
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Card.jsx
│   │   │   └── Badge.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Timetable.jsx
│   │       ├── Documents.jsx
│   │       ├── Deadlines.jsx
│   │       └── Chat.jsx
│   ├── .env.example
│   └── tailwind.config.js
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- AWS account with DynamoDB and S3 access
- Groq API key (free at [console.groq.com](https://console.groq.com))

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys
```

**Edit `backend/.env`:**
```env
GROQ_API_KEY=gsk_your_groq_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-campus-flow-bucket
DYNAMODB_STUDENTS_TABLE=students
DYNAMODB_SCHEDULES_TABLE=schedules
DYNAMODB_DEADLINES_TABLE=deadlines
HF_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
CHROMA_DB_PATH=./chroma_db
```

**Create DynamoDB tables (one-time):**
```bash
python setup_dynamodb.py
```

**Start backend:**
```bash
python main.py
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

---

### 2. Frontend Setup

```bash
cd frontend

# Configure environment
cp .env.example .env
# .env already has: VITE_API_URL=http://localhost:8000

# Install dependencies
npm install

# Start dev server
npm run dev
# App runs at http://localhost:5173
```

For production deployments, set `VITE_API_URL` to your public backend URL or proxy path. The deployed frontend will fail with `Network Error` if it is left pointing at `localhost`.

---

### 3. AWS Setup

**S3 Bucket:**
1. Create an S3 bucket in `ap-south-1`
2. Set the bucket name in your `.env`
3. Ensure your IAM user has `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions

**DynamoDB:**
1. Ensure your IAM user has DynamoDB access
2. Run `python setup_dynamodb.py` to create tables
3. Tables created: `students`, `schedules`, `deadlines`

**Minimum IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:*"],
      "Resource": "arn:aws:dynamodb:ap-south-1:*:table/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::your-bucket/*", "arn:aws:s3:::your-bucket"]
    }
  ]
}
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload/timetable` | Upload PDF/JSON timetable |
| POST | `/upload/notice` | Upload & summarize notice |
| GET | `/schedule/today` | Today's class schedule |
| GET | `/schedule/weekly` | Full weekly schedule |
| GET | `/schedule/next-class` | Next upcoming class |
| GET | `/summaries` | All notice summaries |
| POST | `/summarize` | Summarize raw text |
| POST | `/deadlines` | Create deadline |
| GET | `/deadlines` | List all deadlines |
| PUT | `/deadlines/{id}` | Update deadline |
| DELETE | `/deadlines/{id}` | Delete deadline |
| POST | `/schedule/suggestions` | AI study plan |
| POST | `/documents/upload` | Upload & index document for Q&A |
| POST | `/chat/query` | Ask AI assistant |

---

## Usage Guide

### Upload Timetable
Use the sample `backend/sample_timetable.json` to test:
- Go to **Timetable** page → Click **Upload Timetable** → Select `sample_timetable.json`

### Ask Questions
Go to **AI Chat** and try:
- "What classes do I have today?"
- "What is my next class?"
- "When is my next deadline?"
- "Summarize the uploaded notices"

### Add Deadlines
Go to **Deadlines** → Click **Add Deadline** → Fill in details → Click **Study Plan** for AI suggestions

---

## ChromaDB

ChromaDB stores document embeddings locally at `./chroma_db/`.  
Collection name: `campus_documents`  
Embeddings model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)

---

## Notes

- First startup downloads the HuggingFace model (~90MB) — this is cached afterward
- The `default_student` ID is used for all data; extend with auth for multi-user support
- ChromaDB data persists in `backend/chroma_db/` — delete this folder to reset vector store
