@description('Principal ID of the Function App managed identity')
param functionAppPrincipalId string

@description('Name of the Azure OpenAI account')
param openAIAccountName string

@description('Name of the Azure AI Search service')
param searchServiceName string

@description('Name of the Key Vault')
param keyVaultName string

@description('User object ID for Key Vault access (optional)')
param userObjectId string = ''

@description('Create role assignments (set to false if they already exist)')
param createRoleAssignments bool = true

@description('Unique identifier for this role assignment module (prevents conflicts when deployed multiple times)')
param deploymentIdentifier string = uniqueString(functionAppPrincipalId)

// Built-in role definition IDs
// https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
var cognitiveServicesOpenAIUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
var searchIndexDataReaderRoleId = '1407120a-92aa-4202-b7e9-c0e197c71c8f'

// Reference existing resources
resource openAIAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: openAIAccountName
}

resource searchService 'Microsoft.Search/searchServices@2023-11-01' existing = {
  name: searchServiceName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Generate deterministic names for role assignments
var openAIRoleAssignmentName = guid(openAIAccount.id, functionAppPrincipalId, cognitiveServicesOpenAIUserRoleId)
var searchRoleAssignmentName = guid(searchService.id, functionAppPrincipalId, searchIndexDataReaderRoleId)
var userOpenAIRoleAssignmentName = guid(openAIAccount.id, userObjectId, cognitiveServicesOpenAIUserRoleId, deploymentIdentifier)
var userSearchRoleAssignmentName = guid(searchService.id, userObjectId, searchIndexDataReaderRoleId, deploymentIdentifier)

// Grant Function App access to Azure OpenAI
// Note: Uses deterministic GUID to be idempotent across deployments
resource openAIRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createRoleAssignments) {
  name: openAIRoleAssignmentName
  scope: openAIAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUserRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Allows Function App to call Azure OpenAI via Managed Identity'
  }
}

// Grant Function App access to Azure AI Search
resource searchRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createRoleAssignments) {
  name: searchRoleAssignmentName
  scope: searchService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchIndexDataReaderRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Allows Function App to query Azure AI Search via Managed Identity'
  }
}

// Grant user access to Azure OpenAI (for local development/KB ingestion)
resource userOpenAIRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(userObjectId)) {
  name: userOpenAIRoleAssignmentName
  scope: openAIAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUserRoleId)
    principalId: userObjectId
    principalType: 'User'
    description: 'Allows user to call Azure OpenAI for KB ingestion and local development'
  }
}

// Grant user access to Azure AI Search (for local development/KB ingestion)
resource userSearchRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(userObjectId)) {
  name: userSearchRoleAssignmentName
  scope: searchService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchIndexDataReaderRoleId)
    principalId: userObjectId
    principalType: 'User'
    description: 'Allows user to query Azure AI Search for local development'
  }
}

// Grant Function App access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  name: 'add'
  parent: keyVault
  properties: {
    accessPolicies: concat(
      [
        {
          tenantId: subscription().tenantId
          objectId: functionAppPrincipalId
          permissions: {
            secrets: [
              'get'
              'list'
            ]
          }
        }
      ],
      // Add user access if objectId provided
      !empty(userObjectId) ? [
        {
          tenantId: subscription().tenantId
          objectId: userObjectId
          permissions: {
            secrets: [
              'get'
              'list'
            ]
          }
        }
      ] : []
    )
  }
}

output openAIRoleAssignmentId string = openAIRoleAssignment.id
output searchRoleAssignmentId string = searchRoleAssignment.id
output userOpenAIRoleAssignmentId string = !empty(userObjectId) ? userOpenAIRoleAssignment.id : ''
output userSearchRoleAssignmentId string = !empty(userObjectId) ? userSearchRoleAssignment.id : ''
