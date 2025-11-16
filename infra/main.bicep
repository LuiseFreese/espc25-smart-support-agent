targetScope = 'subscription'

@description('Primary location for all resources')
param location string = 'swedencentral'

@description('Environment name (dev, staging, prod)')
param environmentName string = 'dev'

@description('Unique suffix for resource names')
param resourceSuffix string = uniqueString(subscription().subscriptionId, environmentName)

@description('Current user Object ID for Key Vault access - OPTIONAL for development convenience. Leave empty for production.')
@metadata({
  note: 'This is NOT for application access (that uses Managed Identity). This is only so developers can view secrets in Azure Portal.'
  getObjectId: '(Get-AzADUser -UserPrincipalName user@domain.com).Id'
})
param currentUserObjectId string = ''

@description('Create role assignments (set to false if they already exist from previous deployment)')
param createRoleAssignments bool = true

@description('Microsoft Graph Client ID for email processing')
param graphClientId string = ''

@description('Microsoft Graph Client Secret for email processing')
@secure()
param graphClientSecret string = ''

@description('Microsoft Graph Tenant ID')
param graphTenantId string = ''

var resourceGroupName = 'rg-smart-agents-${environmentName}'
var searchServiceName = 'srch-agents-${resourceSuffix}'
var storageAccountName = 'stagents${take(resourceSuffix, 16)}'
var logAnalyticsName = 'log-smart-agents-${resourceSuffix}'
var appInsightsName = 'appi-smart-agents-${resourceSuffix}'
var functionAppName = 'func-agents-${resourceSuffix}'
var ragFunctionAppName = 'func-rag-${resourceSuffix}'
var hostingPlanName = 'plan-agents-${resourceSuffix}'
var keyVaultName = 'kv-agents-${resourceSuffix}'
var openAIName = 'oai-agents-${resourceSuffix}'
var aiHubName = 'aihub-agents-${resourceSuffix}'
var aiProjectName = 'aiproject-agents-${resourceSuffix}'
var communicationServicesName = 'comm-agents-${resourceSuffix}'

// Resource Group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
}

// Azure AI Search
module searchService 'modules/search.bicep' = {
  name: 'searchServiceDeployment'
  scope: resourceGroup
  params: {
    name: searchServiceName
    location: location
    sku: 'standard'
  }
}

// Storage Account
module storageAccount 'modules/storage.bicep' = {
  name: 'storageAccountDeployment'
  scope: resourceGroup
  params: {
    name: storageAccountName
    location: location
  }
}

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'logAnalyticsDeployment'
  scope: resourceGroup
  params: {
    name: logAnalyticsName
    location: location
  }
}

// Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'appInsightsDeployment'
  scope: resourceGroup
  params: {
    name: appInsightsName
    location: location
    workspaceId: logAnalytics.outputs.workspaceId
  }
}

// App Service Plan (Linux, Node 20)
module hostingPlan 'modules/hosting-plan.bicep' = {
  name: 'hostingPlanDeployment'
  scope: resourceGroup
  params: {
    name: hostingPlanName
    location: location
    sku: 'Y1'
  }
}

// Function App (Main - Demo 04)
module functionApp 'modules/function-app.bicep' = {
  name: 'functionAppDeployment'
  scope: resourceGroup
  params: {
    name: functionAppName
    location: location
    hostingPlanId: hostingPlan.outputs.planId
    storageAccountName: storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    openAIEndpoint: openAI.outputs.endpoint
    searchEndpoint: searchService.outputs.endpoint
    graphClientId: graphClientId
    graphClientSecret: graphClientSecret
    graphTenantId: graphTenantId
    runtime: 'node'
  }
  dependsOn: [
    storageAccount
  ]
}

// RAG Function App (Demo 02)
module ragFunctionApp 'modules/function-app.bicep' = {
  name: 'ragFunctionAppDeployment'
  scope: resourceGroup
  params: {
    name: ragFunctionAppName
    location: location
    hostingPlanId: hostingPlan.outputs.planId
    storageAccountName: storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    openAIEndpoint: openAI.outputs.endpoint
    searchEndpoint: searchService.outputs.endpoint
    graphClientId: ''
    graphClientSecret: ''
    graphTenantId: ''
    runtime: 'python'
  }
  dependsOn: [
    storageAccount
  ]
}

// Key Vault
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVaultDeployment'
  scope: resourceGroup
  params: {
    name: keyVaultName
    location: location
  }
}

// AI Hub
module aiHub 'modules/ai-hub.bicep' = {
  name: 'aiHubDeployment'
  scope: resourceGroup
  params: {
    name: aiHubName
    location: location
    friendlyName: 'Smart Support Agent AI Hub'
    description: 'AI Hub for deploying RAG and triage prompt flows'
    storageAccountId: storageAccount.outputs.id
    keyVaultId: keyVault.outputs.id
    appInsightsId: appInsights.outputs.id
  }
}

// AI Project (child of AI Hub)
module aiProject 'modules/ai-project.bicep' = {
  name: 'aiProjectDeployment'
  scope: resourceGroup
  params: {
    name: aiProjectName
    location: location
    friendlyName: 'Smart Support Agent Project'
    description: 'AI Project for RAG and triage flows'
    aiHubId: aiHub.outputs.id
  }
}

// Azure OpenAI
module openAI 'modules/openai.bicep' = {
  name: 'openAIDeployment'
  scope: resourceGroup
  params: {
    name: openAIName
    location: location
    gptDeploymentName: 'gpt-4o-mini'
    embeddingDeploymentName: 'text-embedding-3-large'
  }
}

// Azure Communication Services for email sending
module communicationServices 'modules/communication-services.bicep' = {
  name: 'communicationServicesDeployment'
  scope: resourceGroup
  params: {
    name: communicationServicesName
    location: location
    dataLocation: 'United States'
  }
}

// Role Assignments - Grant Function Apps Managed Identity access to resources
module roleAssignments 'modules/role-assignments.bicep' = {
  name: 'roleAssignmentsDeployment'
  scope: resourceGroup
  params: {
    functionAppPrincipalId: functionApp.outputs.principalId
    openAIAccountName: openAIName
    searchServiceName: searchServiceName
    keyVaultName: keyVaultName
    userObjectId: currentUserObjectId
    createRoleAssignments: createRoleAssignments
  }
}

module ragRoleAssignments 'modules/role-assignments.bicep' = {
  name: 'ragRoleAssignmentsDeployment'
  scope: resourceGroup
  params: {
    functionAppPrincipalId: ragFunctionApp.outputs.principalId
    openAIAccountName: openAIName
    searchServiceName: searchServiceName
    keyVaultName: keyVaultName
    userObjectId: currentUserObjectId
    createRoleAssignments: createRoleAssignments
  }
}

// Outputs
output resourceGroupName string = resourceGroupName
output searchServiceName string = searchServiceName
output searchEndpoint string = searchService.outputs.endpoint
output searchAdminKey string = searchService.outputs.adminKey
output storageAccountName string = storageAccountName
output storageConnectionString string = storageAccount.outputs.connectionString
output appInsightsConnectionString string = appInsights.outputs.connectionString
output functionAppName string = functionAppName
output ragFunctionAppName string = ragFunctionAppName
output functionAppUrl string = functionApp.outputs.functionAppUrl
output ragFunctionAppUrl string = ragFunctionApp.outputs.functionAppUrl
output keyVaultName string = keyVaultName
output keyVaultUri string = keyVault.outputs.vaultUri
output openAIEndpoint string = openAI.outputs.endpoint
output openAIAccountName string = openAI.outputs.accountName
output openAIGptDeployment string = openAI.outputs.gptDeploymentName
output openAIEmbeddingDeployment string = openAI.outputs.embeddingDeploymentName
output aiHubName string = aiHub.outputs.name
output aiHubId string = aiHub.outputs.id
output aiProjectName string = aiProject.outputs.name
output aiProjectId string = aiProject.outputs.id
output communicationServicesName string = communicationServices.outputs.communicationServicesName
output communicationServicesSenderAddress string = communicationServices.outputs.senderAddress
output communicationServicesConnectionString string = communicationServices.outputs.connectionString
