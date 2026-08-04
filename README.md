# FormBridge - Document Processing & Automation Platform

FormBridge is an AI-powered document processing and automation platform designed to ingest documents, extract information, store processed data, and provide search/review capabilities.

## Project Overview

FormBridge enables organizations to automate document workflows by:
- Ingesting invoices, receipts, contracts, and other documents
- Extracting structured data using AI-powered OCR
- Providing human-in-the-loop review for low-confidence results
- Maintaining searchable document archives
- Offering comprehensive audit trails

## Features

- Document upload with SAS-based direct-to-blob storage
- Automated OCR and data extraction via Azure AI Document Intelligence
- Human-in-the-loop review workflow for low-confidence results
- Searchable document archive with metadata filtering
- Document reprocessing capabilities
- Comprehensive audit trail and compliance features
- JWT-based authentication with bcrypt password hashing
- Error tracking with Honeybadger integration

## System Architecture

```
User
↓
Next.js Frontend (Vercel)
↓ HTTPS API requests
FastAPI Backend (Azure App Service Docker Container)
↓
Azure Services:
- Cosmos DB (metadata & audit)
- Blob Storage (document storage)
- Azure AI Document Intelligence (OCR/extraction)
- Azure AI Search (indexing & search)
- Service Bus (event processing)
- Application Insights (monitoring & telemetry)
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16.2.12
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Error Tracking**: Honeybadger
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI 0.109.0
- **Language**: Python 3.12
- **ASGI Server**: Uvicorn 0.27.0
- **Production Server**: Gunicorn 21.2.0
- **Authentication**: JWT (python-jose) + bcrypt 3.2.2
- **Testing**: pytest 7.4.4
- **Deployment**: Docker container on Azure App Service

### Azure Cloud Services
- **Azure App Service**: `formbridge-backend` - Hosts Dockerized FastAPI backend
- **Azure App Service Plan**: `formbridge-plan` - Provides compute resources
- **Azure Container Registry**: `formbridgeacr` - Stores Docker container images
- **Azure Cosmos DB**: `formbridgedb` - Stores application data
- **Azure Storage Account**: `formbridgestorage` - Stores uploaded documents
- **Azure AI Document Intelligence**: `formbridgedci` - AI-based document analysis
- **Azure AI Search**: `formbridgess` - Document indexing and search
- **Azure Service Bus**: `formbridgenamespace` - Asynchronous messaging
- **Application Insights**: Monitoring, telemetry, and diagnostics
- **Log Analytics Workspace**: Log storage and analysis
- **Managed Identities**: Azure identity-based access between services

## Project Structure

```
formbridge/
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API endpoints (auth, documents, review, health)
│   │   ├── models/         # Data models and schemas
│   │   ├── services/       # Business logic services
│   │   └── core/           # Core configuration and utilities
│   ├── tests/              # Backend tests
│   ├── Dockerfile          # Docker container definition
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend application
│   ├── app/               # Next.js app directory (pages, layouts)
│   ├── components/        # React components
│   ├── lib/               # API client and utilities
│   └── public/            # Static assets
├── infra/                 # Infrastructure as Code (Bicep)
├── docs/                  # Documentation
├── .github/               # GitHub Actions workflows
│   └── workflows/
│       └── ci-cd.yml      # CI/CD pipeline
└── README.md
```

## Deployment Architecture

### Frontend Deployment
- **Platform**: Vercel
- **Build Process**: Next.js build optimization
- **Environment Variables**: `NEXT_PUBLIC_API_URL` for backend API endpoint

### Backend Deployment
- **Containerization**: Docker with Python 3.11-slim base image
- **Registry**: Azure Container Registry (ACR)
- **Hosting**: Azure App Service with custom Docker container
- **Startup Command**: `gunicorn --bind=0.0.0.0 --timeout 600 -k uvicorn.workers.UvicornWorker app.main:app`
- **CI/CD**: GitHub Actions workflow for automated builds and deployments

### CI/CD Pipeline
The GitHub Actions workflow (`ci-cd.yml`) performs:
1. Backend dependency installation and testing
2. Docker image build and push to Azure Container Registry
3. Deployment to Azure App Service
4. Infrastructure deployment via Bicep templates

## Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- Azure subscription (for cloud deployment)

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
# venv/bin/activate   # On Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Environment Variables

#### Backend (.env)
Create a `.env` file in the `backend/` directory with the following placeholders:

```env
# Application Settings
APP_NAME=FormBridge
APP_VERSION=1.0.0
DEBUG=True

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=your_cosmos_endpoint
AZURE_COSMOS_KEY=your_cosmos_key
AZURE_COSMOS_DATABASE_NAME=your_database_name

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_KEY=your_storage_key

# Azure AI Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_document_intelligence_endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_document_intelligence_key

# Azure AI Search
AZURE_SEARCH_ENDPOINT=your_search_endpoint
AZURE_SEARCH_KEY=your_search_key
AZURE_SEARCH_INDEX_NAME=your_search_index_name

# Azure Service Bus
AZURE_SERVICE_BUS_CONNECTION_STRING=your_service_bus_connection_string
AZURE_SERVICE_BUS_QUEUE_NAME=your_queue_name

# NVIDIA NIM API (Optional fallback)
NVIDIA_NIM_API_KEY=your_nvidia_api_key
NVIDIA_NIM_MODEL=your_nvidia_model_name

# Honeybadger Error Tracking
HONEYBADGER_API_KEY=your_honeybadger_api_key
```

#### Frontend (.env.local)
Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user info

### Documents
- `POST /api/documents/upload` - Upload document (FormData)
- `GET /api/documents` - Search documents with filters
- `GET /api/documents/{documentId}` - Get document metadata
- `GET /api/documents/{documentId}/download` - Get download SAS URL
- `POST /api/documents/{documentId}/reprocess` - Trigger reprocessing
- `POST /api/documents/{documentId}/stop` - Stop processing
- `DELETE /api/documents/{documentId}` - Delete document

### Review
- `GET /api/review/queue` - Get documents pending review
- `GET /api/review/{documentId}` - Get document details for review
- `POST /api/review/{documentId}/submit` - Submit corrected fields

### Health
- `GET /api/health` - Health check endpoint

## Security Considerations

- Secrets are stored through environment variables and Azure configuration
- No secrets are committed to source control
- Azure managed identities are used for service-to-service authentication
- HTTPS communication is enabled between frontend and backend
- Passwords are hashed using bcrypt with passlib
- JWT tokens are used for authentication with configurable expiration
- CORS is configured to allow only specific origins

## Debugging and Deployment Work Completed

The following issues have been resolved during development:
- Configured Azure authentication for deployment
- Configured Azure App Service Docker deployment
- Verified Docker container startup
- Verified FastAPI backend successfully starts in Azure
- Fixed HTTPS mixed-content issue between Vercel frontend and Azure backend
- Configured frontend/backend communication
- Verified authentication endpoint communication
- Fixed FastAPI trailing slash redirects causing 307 responses
- Updated CORS origins to include Vercel frontend domain
- Added temporary debug logging for authentication diagnostics
- Resolved bcrypt/passlib compatibility issues

## Future Improvements

- Implement comprehensive test coverage for frontend and backend
- Add rate limiting to API endpoints
- Implement role-based access control (RBAC)
- Add document versioning and history tracking
- Enhance error handling and user feedback
- Add support for additional document types
- Implement batch document processing
- Add real-time processing status updates via WebSocket
- Enhance search capabilities with advanced filters
- Add document preview generation for multiple formats

## License

MIT
