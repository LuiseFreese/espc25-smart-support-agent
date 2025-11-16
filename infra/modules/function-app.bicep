param name string
param location string
param hostingPlanId string
param storageAccountName string
param appInsightsConnectionString string
param openAIEndpoint string = ''
param searchEndpoint string = ''
param graphClientId string = ''
@secure()
param graphClientSecret string = ''
param graphTenantId string = ''
@allowed(['node', 'python'])
param runtime string = 'node'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlanId
    siteConfig: {
      linuxFxVersion: runtime == 'python' ? 'PYTHON|3.11' : 'NODE|20'
      appSettings: concat(
        [
          {
            name: 'AzureWebJobsStorage'
            value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
          }
          {
            name: 'FUNCTIONS_EXTENSION_VERSION'
            value: '~4'
          }
          {
            name: 'FUNCTIONS_WORKER_RUNTIME'
            value: runtime
          }
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: appInsightsConnectionString
          }
          {
            name: 'AZURE_OPENAI_ENDPOINT'
            value: openAIEndpoint
          }
          {
            name: 'AZURE_AI_SEARCH_ENDPOINT'
            value: searchEndpoint
          }
          {
            name: 'AZURE_CLIENT_ID'
            value: 'system'
          }
          {
            name: 'STORAGE_ACCOUNT_NAME'
            value: storageAccount.name
          }
          {
            name: 'STORAGE_ACCOUNT_KEY'
            value: storageAccount.listKeys().keys[0].value
          }
          {
            name: 'GRAPH_CLIENT_ID'
            value: graphClientId
          }
          {
            name: 'GRAPH_CLIENT_SECRET'
            value: graphClientSecret
          }
          {
            name: 'GRAPH_TENANT_ID'
            value: graphTenantId
          }
        ],
        runtime == 'node' ? [
          {
            name: 'WEBSITE_NODE_DEFAULT_VERSION'
            value: '~20'
          }
        ] : []
      )
      cors: {
        allowedOrigins: ['*']
      }
    }
    httpsOnly: true
  }
}

output functionAppId string = functionApp.id
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output principalId string = functionApp.identity.principalId
