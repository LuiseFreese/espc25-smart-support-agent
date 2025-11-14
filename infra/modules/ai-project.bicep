param name string
param location string = resourceGroup().location
param aiHubId string
param friendlyName string = name
param description string = 'AI Project for Smart Support Agent'
param tags object = {}

resource aiProject 'Microsoft.MachineLearningServices/workspaces@2024-04-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'Project'
  properties: {
    friendlyName: friendlyName
    description: description
    hubResourceId: aiHubId
    publicNetworkAccess: 'Enabled'
  }
}

output id string = aiProject.id
output name string = aiProject.name
output principalId string = aiProject.identity.principalId
