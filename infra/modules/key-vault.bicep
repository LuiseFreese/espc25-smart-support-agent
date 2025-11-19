param name string
param location string

// Key Vault will automatically recover soft-deleted vault if one exists with same name
// This is handled by Azure RP - no special createMode needed
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    // Note: If a soft-deleted vault exists, deployment will fail with ConflictError
    // Users must either wait for retention period or manually recover/purge the vault
  }
}

output id string = keyVault.id
output vaultUri string = keyVault.properties.vaultUri
output vaultName string = keyVault.name
