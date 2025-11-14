param name string
param location string = resourceGroup().location
param friendlyName string = name
param description string = 'AI Hub for Smart Support Agent'
param storageAccountId string
param keyVaultId string
param appInsightsId string
param tags object = {}

resource aiHub 'Microsoft.MachineLearningServices/workspaces@2024-04-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'Hub'
  properties: {
    friendlyName: friendlyName
    description: description
    storageAccount: storageAccountId
    keyVault: keyVaultId
    applicationInsights: appInsightsId
    publicNetworkAccess: 'Enabled'
  }
}

output id string = aiHub.id
output name string = aiHub.name
output principalId string = aiHub.identity.principalId
