// Azure Communication Services Email module
@description('Name of the Communication Services resource')
param name string

@description('Location for the resource')
param location string

@description('Tags to apply to the resource')
param tags object = {}

@description('Data location for Communication Services')
param dataLocation string = 'United States'

// Communication Services resource
resource communicationServices 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: name
  location: 'global' // Communication Services is always global
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

// Email Services resource (required for sending emails)
resource emailServices 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: '${name}-email'
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

// Azure Managed Domain (azurecommtest.net - free tier)
resource emailServicesDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  name: 'AzureManagedDomain'
  parent: emailServices
  location: 'global'
  tags: tags
  properties: {
    domainManagement: 'AzureManaged'
  }
}

// Sender username for the email domain
resource senderUsername 'Microsoft.Communication/emailServices/domains/senderUsernames@2023-04-01' = {
  name: 'donotreply'
  parent: emailServicesDomain
  properties: {
    username: 'donotreply'
    displayName: 'Smart Support Agent'
  }
}

// Outputs
output communicationServicesId string = communicationServices.id
output communicationServicesName string = communicationServices.name
output communicationServicesEndpoint string = communicationServices.properties.hostName
output emailServicesId string = emailServices.id
output emailServicesDomainName string = emailServicesDomain.properties.fromSenderDomain
output senderAddress string = '${senderUsername.properties.username}@${emailServicesDomain.properties.fromSenderDomain}'

// Connection string (use with caution - store in Key Vault)
output connectionString string = communicationServices.listKeys().primaryConnectionString
