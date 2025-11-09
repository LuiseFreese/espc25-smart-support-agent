param name string
param location string
param sku string = 'Y1'

resource hostingPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: name
  location: location
  kind: 'linux'
  sku: {
    name: sku
  }
  properties: {
    reserved: true
  }
}

output planId string = hostingPlan.id
