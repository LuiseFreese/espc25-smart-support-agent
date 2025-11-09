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

// Grant Function App access to Azure OpenAI
// Using existing resource to avoid RoleAssignmentExists error on redeployment
resource openAIRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createRoleAssignments) {
  name: guid(openAIAccount.id, functionAppPrincipalId, cognitiveServicesOpenAIUserRoleId)
  scope: openAIAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUserRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Allows Function App to call Azure OpenAI via Managed Identity'
  }
}

// Grant Function App access to Azure AI Search
// Using existing resource to avoid RoleAssignmentExists error on redeployment
resource searchRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createRoleAssignments) {
  name: guid(searchService.id, functionAppPrincipalId, searchIndexDataReaderRoleId)
  scope: searchService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchIndexDataReaderRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
    description: 'Allows Function App to query Azure AI Search via Managed Identity'
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
