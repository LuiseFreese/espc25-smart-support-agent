param name string
param location string
param sku string = 'standard'

resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: name
  location: location
  sku: {
    name: sku
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    semanticSearch: 'free'
  }
  identity: {
    type: 'SystemAssigned'
  }
}

output endpoint string = 'https://${searchService.name}.search.windows.net'
@description('Search admin key - only used for data plane operations during deployment')
#disable-next-line outputs-should-not-contain-secrets
output adminKey string = searchService.listAdminKeys().primaryKey
output id string = searchService.id
