param location string = resourceGroup().location
param storageAccountName string
param documentIntelligenceName string
param searchServiceName string
param cosmosDbAccountName string
param serviceBusNamespaceName string
param appServicePlanName string
param webAppName string
param staticWebAppName string

// =========================
// EXISTING RESOURCES
// =========================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
  scope: resourceGroup('DefaultResourceGroup-PAR')
}
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}
resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: documentIntelligenceName
}

resource searchService 'Microsoft.Search/searchServices@2023-11-01' existing = {
  name: searchServiceName
}

resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' existing = {
  name: cosmosDbAccountName
}

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2024-01-01' existing = {
  name: serviceBusNamespaceName
}

// =========================
// STORAGE
// =========================

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' existing = {
  parent: storageAccount
  name: 'default'
}

resource incomingContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'incoming'

  properties: {
    publicAccess: 'None'
  }
}

resource processedContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'processed'

  properties: {
    publicAccess: 'None'
  }
}

resource archiveContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'archive'

  properties: {
    publicAccess: 'None'
  }
}

// =========================
// COSMOS DB
// =========================

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDbAccount
  name: 'formbridge'

  properties: {
    resource: {
      id: 'formbridge'
    }
  }
}

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'documents'

  properties: {
    resource: {
      id: 'documents'

      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

// =========================
// SERVICE BUS
// =========================

resource serviceBusQueue 'Microsoft.ServiceBus/namespaces/queues@2024-01-01' = {
  parent: serviceBusNamespace
  name: 'document-processing'

  properties: {
    lockDuration: 'PT5M'
    maxSizeInMegabytes: 1024
    requiresDuplicateDetection: false
    requiresSession: false
    deadLetteringOnMessageExpiration: false
  }
}

// =========================
// KEY VAULT
// =========================

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: 'fbkv${take(uniqueString(resourceGroup().id),8)}'
  location: location

  properties: {
    tenantId: subscription().tenantId

    sku: {
      family: 'A'
      name: 'standard'
    }

    accessPolicies: []

    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
  }
}

// =========================
// OUTPUTS
// =========================

output storageAccountId string = storageAccount.id
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
output searchEndpoint string = 'https://${searchServiceName}.search.windows.net'
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output serviceBusEndpoint string = serviceBusNamespace.properties.serviceBusEndpoint
