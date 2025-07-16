import * as network from '@pulumi/azure-native/network'

import {projectName, env, resourceGroup, location, networkInfo, tags} from './commons'

const vnetNameSpoke = `vnet-${projectName}-${env}`

export const vnet = new network.VirtualNetwork(vnetNameSpoke, {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnetNameSpoke,
    location: location,
    addressSpace: {
        addressPrefixes: networkInfo.vnetAddress,
    },
})

//Sous AppGataway
const snetAgwName = `snet-${projectName}-${env}-public-app-gateway-v2`
const nsgAgwName = `nsg-${snetAgwName}`

export const nsgAgw = new network.NetworkSecurityGroup(
    nsgAgwName,
    {
        networkSecurityGroupName: `${nsgAgwName}`,
        resourceGroupName : resourceGroup.name,
        tags: tags
    }
)

export const snetAgw = new network.Subnet(snetAgwName, {
    subnetName: snetAgwName,
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: networkInfo.snetAppGw,
    privateEndpointNetworkPolicies: 'Enable',
    networkSecurityGroup: {
        id: nsgAgw.id,
    }
})

//SNET Webapp INBOUND
const snetWebappInboundName = `snet-${projectName}-webapp-inbound-${env}`
const nsgWebappInBoundName = `nsg-${snetWebappInboundName}`

const nsgWebappInbound = new network.NetworkSecurityGroup(nsgWebappInBoundName, {
    networkSecurityGroupName: `${nsgWebappInBoundName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetWebappInbound = new network.Subnet(
    snetWebappInboundName,
    {
        subnetName: snetWebappInboundName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: vnet.name,
        addressPrefix: networkInfo.snetWebappInbound,
        privateEndpointNetworkPolicies: 'Enable',
        networkSecurityGroup: {
            id: nsgWebappInbound.id,
        }
    },
    { dependsOn: [snetAgw]}
)

//SNET Webapp OUTBOUND
const snetWebappOutboundName = `snet-${projectName}-webapp-outbound-${env}`
const nsgWebappOutBoundName = `nsg-${snetWebappOutboundName}`

const nsgWebappOutbound = new network.NetworkSecurityGroup(nsgWebappOutBoundName, {
    networkSecurityGroupName: `${nsgWebappOutBoundName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetWebappOutbound = new network.Subnet(
    snetWebappOutboundName,
    {
        subnetName: snetWebappOutboundName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: vnet.name,
        addressPrefix: networkInfo.snetWebappOutbound,
        privateEndpointNetworkPolicies: 'Enable',
        networkSecurityGroup: {
            id: nsgWebappOutbound.id,
        },
        delegations: [
            {
                name: 'VnetIntegration',
                serviceName: 'Microsoft.Web/serverFrams' //Required when use the subnet for web app vnet integration
            },
        ],
    },
    { dependsOn: [snetWebappInbound]}
)

//SNET postgres
const snetPostgresName = `snet-${projectName}-postgres-${env}`
const nsgPostgresName = `nsg-${snetWebappOutboundName}`

const nsgPostgres = new network.NetworkSecurityGroup(nsgPostgresName, {
    networkSecurityGroupName: `${nsgPostgresName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetPostgres = new network.Subnet(
    snetPostgresName,
    {
        subnetName: snetPostgresName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: vnet.name,
        addressPrefix: networkInfo.snetPostgres,
        privateEndpointNetworkPolicies: 'Enable',
        networkSecurityGroup: {
            id: nsgPostgres.id,
        },
        delegations: [
            {
                name: 'Microsoft-DBforPostgreSQL-flexibleServers',
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServer'
            },
        ],
        serviceEndpoints: [
            {
                service: 'Microsoft.Storage'
            }
        ]
    },
    { dependsOn: [snetWebappOutbound]}
)

//SNET Data
const snetDataName = `snet-${projectName}-${env}`
const nsgDataName = `nsg-${snetDataName}`

const nsgData = new network.NetworkSecurityGroup(nsgDataName, {
    networkSecurityGroupName: `${nsgDataName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetData = new network.Subnet(
    snetDataName,
    {
        subnetName: snetDataName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: vnet.name,
        addressPrefix: networkInfo.snetData,
        privateEndpointNetworkPolicies: 'Enable',
        networkSecurityGroup: {
            id: nsgData.id,
        }
    },
    { dependsOn: [snetPostgres]}
)
