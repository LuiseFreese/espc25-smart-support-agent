@description('Name of the Azure OpenAI resource')
param name string

@description('Azure region for deployment')
param location string

@description('SKU for Azure OpenAI')
param sku string = 'S0'

@description('GPT deployment name')
param gptDeploymentName string = 'gpt-5-1-chat'

@description('GPT model name')
param gptModelName string = 'gpt-5.1-chat'

@description('GPT model version')
param gptModelVersion string = '2025-11-13'

@description('GPT deployment capacity')
param gptDeploymentCapacity int = 10

@description('Embedding deployment name')
param embeddingDeploymentName string = 'text-embedding-3-large'

@description('Embedding model name')
param embeddingModelName string = 'text-embedding-3-large'

@description('Embedding model version')
param embeddingModelVersion string = '1'

@description('Embedding deployment capacity')
param embeddingDeploymentCapacity int = 10

resource openAIAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  kind: 'OpenAI'
  sku: {
    name: sku
  }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAIAccount
  name: gptDeploymentName
  sku: {
    name: 'GlobalStandard'
    capacity: gptDeploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: gptModelName
      version: gptModelVersion
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
    raiPolicyName: 'Microsoft.Default'
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAIAccount
  name: embeddingDeploymentName
  sku: {
    name: 'Standard'
    capacity: embeddingDeploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: embeddingModelName
      version: embeddingModelVersion
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
    raiPolicyName: 'Microsoft.Default'
  }
  dependsOn: [
    gptDeployment
  ]
}

output endpoint string = openAIAccount.properties.endpoint
output accountName string = openAIAccount.name
output accountId string = openAIAccount.id
output gptDeploymentName string = gptDeployment.name
output embeddingDeploymentName string = embeddingDeployment.name
