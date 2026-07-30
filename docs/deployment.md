# Deployment Guide

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- Docker installed (for local testing)
- Node.js 18+ and Python 3.11+

## Azure Infrastructure Setup

### 1. Create Resource Group

```bash
az group create --name formbridge-rg --location eastus
```

### 2. Deploy Infrastructure

```bash
az deployment group create \
  --resource-group formbridge-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.json
```

### 3. Configure Azure Resources

After deployment, configure the following:

- **Azure Storage**: Set up CORS rules for blob access
- **Azure Document Intelligence**: Get API key and endpoint
- **Azure Cognitive Search**: Create search index
- **Cosmos DB**: Note connection strings
- **Service Bus**: Configure queue properties
- **Key Vault**: Store all secrets and connection strings

## Backend Deployment

### Local Development

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Azure credentials
uvicorn app.main:app --reload
```

### Docker Deployment

```bash
cd backend
docker build -t formbridge-api .
docker run -p 8000:8000 --env-file .env formbridge-api
```

### Azure Container Registry

```bash
az acr login --name youracr
docker build -t youracr.azurecr.io/docproc-fastapi:latest ./backend
docker push youracr.azurecr.io/docproc-fastapi:latest
```

### Azure Web App Deployment

```bash
az webapp create \
  --resource-group formbridge-rg \
  --plan formbridge-asp \
  --name formbridge-api \
  --runtime "PYTHON|3.11"
```

## Frontend Deployment

### Local Development

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

### Azure Static Web Apps

1. Create Static Web App in Azure Portal
2. Connect to GitHub repository
3. Configure build settings:
   - App location: `/frontend`
   - API location: (empty)
   - Output location: `.next`

## Environment Variables

### Backend (.env)

```bash
AZURE_STORAGE_ACCOUNT_URL=https://youraccount.blob.core.windows.net
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://youraccount.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key
AZURE_SEARCH_ENDPOINT=https://yoursearch.search.windows.net
AZURE_SEARCH_KEY=your_search_key
AZURE_COSMOS_ENDPOINT=https://youraccount.documents.azure.com:443/
AZURE_COSMOS_KEY=your_cosmos_key
AZURE_SERVICE_BUS_CONNECTION_STRING=your_connection_string
JWT_SECRET_KEY=your_secret_key
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automatically:

1. Runs tests for backend and frontend
2. Builds Docker image for backend
3. Pushes to Azure Container Registry
4. Deploys to Azure Web App
5. Deploys infrastructure changes
6. Deploys frontend to Static Web Apps

### Required GitHub Secrets

- `AZURE_CREDENTIALS`: Azure service principal JSON
- `ACR_NAME`: Azure Container Registry name
- `ACR_LOGIN_SERVER`: ACR login server
- `RESOURCE_GROUP`: Azure resource group name
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Static Web Apps deployment token

## Monitoring and Logging

- **Application Insights**: Monitor application performance and errors
- **Log Analytics**: Query logs and metrics
- **Azure Monitor**: Set up alerts for:
  - API error rates
  - Queue depth
  - Processing latency
  - Function failures

## Security Considerations

1. **Managed Identities**: Use Azure Managed Identities instead of connection strings where possible
2. **Key Vault**: Store all secrets in Azure Key Vault
3. **Private Endpoints**: Use private endpoints for Storage, Cosmos DB, and Search
4. **Network Security**: Configure VNet integration for App Service
5. **HTTPS Only**: Enable HTTPS only for all web applications
6. **RBAC**: Implement proper role-based access control

## Troubleshooting

### Common Issues

1. **SAS URL Generation Failures**: Check storage account permissions and container existence
2. **Document Intelligence Errors**: Verify API key and endpoint are correct
3. **Cosmos DB Connection Issues**: Check firewall rules and connection strings
4. **Search Index Not Found**: Ensure search index is created before querying

### Logs

- Backend logs: Azure Application Insights
- Frontend logs: Azure Static Web Apps logs
- Function logs: Azure Monitor

## Scaling

### Backend Scaling

- **App Service**: Scale up to higher tiers for more CPU/memory
- **AKS**: Use Kubernetes for horizontal scaling with HPA
- **Functions**: Use Consumption or Premium plan for serverless scaling

### Database Scaling

- **Cosmos DB**: Enable autoscale throughput
- **Search**: Increase replica count for higher query throughput

## Backup and Recovery

- **Storage**: Enable soft delete and versioning
- **Cosmos DB**: Enable continuous backup
- **Search**: Indexes can be rebuilt from Cosmos DB data
- **Key Vault**: Enable soft delete and purge protection
