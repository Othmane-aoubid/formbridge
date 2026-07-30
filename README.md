# FormBridge - Document Processing & Automation Platform

A scalable, secure document processing platform for ingesting invoices, receipts, contracts, and other documents with automated extraction, human review, and downstream integrations.

## Tech Stack

- **Frontend**: Next.js + Tailwind CSS
- **Backend**: FastAPI
- **Cloud**: Microsoft Azure
  - Blob Storage (document storage)
  - Form Recognizer (OCR/extraction)
  - Cognitive Search (indexing & search)
  - Cosmos DB (metadata & audit)
  - Service Bus (event processing)
  - Azure Functions (processing workers)
  - Key Vault (secrets management)
  - Azure AD / B2C (authentication)

## Project Structure

```
formbridge/
├── backend/          # FastAPI backend application
│   ├── app/
│   │   ├── api/     # API endpoints
│   │   ├── models/  # Data models and schemas
│   │   ├── services/# Business logic services
│   │   └── core/    # Core configuration and utilities
│   ├── tests/       # Backend tests
│   └── requirements.txt
├── frontend/         # Next.js frontend application
│   ├── app/         # Next.js app directory
│   ├── components/  # React components
│   └── public/      # Static assets
├── infra/           # Infrastructure as Code (Bicep/Terraform)
├── docs/            # Documentation
└── .github/         # GitHub Actions workflows
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Azure subscription (for deployment)

### Local Development

#### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Features

- Document upload with SAS-based direct-to-blob storage
- Automated OCR and data extraction via Azure Form Recognizer
- Human-in-the-loop review for low-confidence results
- Searchable document archive with metadata
- Downstream integrations (ERP/DMS)
- Comprehensive audit trail and compliance features

## API Endpoints

- `POST /api/documents/upload` - Upload document
- `GET /api/documents/{id}` - Get document metadata
- `GET /api/documents/{id}/download` - Download document
- `GET /api/documents?query=...` - Search documents
- `GET /api/review/queue` - Get review queue
- `POST /api/review/{id}/submit` - Submit review

## Deployment

See [docs/deployment.md](docs/deployment.md) for deployment instructions.

## License

MIT
