import * as network from '@pulumi/azure-native/network'
import * as privatedns from '@pulumi/azure-native/privatedns'
import { projectName, env, resourceGroup, location, spokeNetworkInfo, tags } from './commons';

import {fwPrivateIP} from './firewall'
import * as pulumi from '@pulumi/pulumi';

const vnetNameSpoke = `vnet-${projectName}-${env}`

interface platformConfig {
    postgresDnsZoneName: string
}

/* spoke virtual network */
export const spokeVnet = new network.VirtualNetwork(vnetNameSpoke, {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnetNameSpoke,
    enableDdosProtection: false,
    location: location,
    addressSpace: {
        addressPrefixes: spokeNetworkInfo.vnetAddress,
    },
    tags: tags
})

/* Route table and route to forward webapp outbound trafic throught firewall*/
const routeTableName = `rt-spoke-to-hub-${projectName}-${env}`
const routeTable = new network.RouteTable(routeTableName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    routeTableName: routeTableName,
    tags: tags,
})

const routeName = `rt-webapp-outbound-through-fw`
new network.Route('routeName', {
    resourceGroupName: resourceGroup.name,
    routeTableName: routeTable.name,
    routeName: routeName,
    addressPrefix: '0.0.0.0/0',
    nextHopType: network.RouteNextHopType.VirtualAppliance,
    nextHopIpAddress: fwPrivateIP
})

/* subnets and nsg on spoke virtual network */
//Sous AppGataway
const snetAgwName = `snet-${projectName}-${env}-public-app-gateway-v2`
const nsgAgwName = `nsg-${snetAgwName}`

export const nsgAgw = new network.NetworkSecurityGroup(
    nsgAgwName,
    {
        networkSecurityGroupName: `${nsgAgwName}`,
        resourceGroupName : resourceGroup.name,
        securityRules: [
            {
                direction: 'Inbound',
                access: 'Allow',
                protocol: 'TCP',
                destinationAddressPrefix: '*', 
                destinationPortRange: '*',
                sourceAddressPrefix: 'Internet', // Service Tag Internet
                priority: 100,
                name: 'Allow-Internet'
            },
            {
                direction: 'Inbound',
                access: 'Allow',
                protocol: '*',
                destinationAddressPrefix: '*', 
                destinationPortRange: '*',
                sourceAddressPrefix: 'GatewayManager', // Service Tag Internet
                priority: 300,
                name: 'Allow-Internet'
            }
        ],
        tags: tags
    }
)

export const snetAgw = new network.Subnet(snetAgwName, {
    subnetName: snetAgwName,
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: spokeVnet.name,
    addressPrefix: spokeNetworkInfo.snetAppGw,
    privateEndpointNetworkPolicies: 'Enable',
    networkSecurityGroup: {
        id: nsgAgw.id,
    }
})

//SNET Webapp INBOUND
const snetWebappInboundName = `snet-${projectName}-webapp-inbound-${env}`
const nsgWebappInBoundName = `nsg-${snetWebappInboundName}`

export const nsgWebappInbound = new network.NetworkSecurityGroup(nsgWebappInBoundName, {
    networkSecurityGroupName: `${nsgWebappInBoundName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags,
})

export const snetWebappInbound = new network.Subnet(
    snetWebappInboundName,
    {
        subnetName: snetWebappInboundName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: spokeVnet.name,
        addressPrefix: spokeNetworkInfo.snetWebappInbound,
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

export const nsgWebappOutbound = new network.NetworkSecurityGroup(nsgWebappOutBoundName, {
    networkSecurityGroupName: `${nsgWebappOutBoundName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetWebappOutbound = new network.Subnet(
    snetWebappOutboundName,
    {
        subnetName: snetWebappOutboundName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: spokeVnet.name,
        addressPrefix: spokeNetworkInfo.snetWebappOutbound,
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
        routeTable: {
            id: routeTable.id
        }
    },
    { dependsOn: [snetWebappInbound]}
)

//SNET postgres
const snetPostgresName = `snet-${projectName}-postgres-${env}`
const nsgPostgresName = `nsg-${snetWebappOutboundName}`

export const nsgPostgres = new network.NetworkSecurityGroup(nsgPostgresName, {
    networkSecurityGroupName: `${nsgPostgresName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetPostgres = new network.Subnet(
    snetPostgresName,
    {
        subnetName: snetPostgresName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: spokeVnet.name,
        addressPrefix: spokeNetworkInfo.snetPostgres,
        privateEndpointNetworkPolicies: 'Enable',
        networkSecurityGroup: {
            id: nsgPostgres.id,
        },
        delegations: [
            {
                name: 'Microsoft-DBforPostgreSQL-flexibleServers',
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' //Required when use the subnet for PostgreSQL vnet integration
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
const snetDataName = `snet-${projectName}-data-${env}`
const nsgDataName = `nsg-${snetDataName}`

export const nsgData = new network.NetworkSecurityGroup(nsgDataName, {
    networkSecurityGroupName: `${nsgDataName}`,
    resourceGroupName: resourceGroup.name,
    tags: tags
})

export const snetData = new network.Subnet(
    snetDataName,
    {
        subnetName: snetDataName,
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: spokeVnet.name,
        addressPrefix: spokeNetworkInfo.snetData,
        privateEndpointNetworkPolicies: 'Enable',
        networkSecurityGroup: {
            id: nsgData.id,
        }
    },
    { dependsOn: [snetPostgres]}
)

const platform = new pulumi.Config('platform').requireObject<platformConfig>('config')

export const privateZoneDns = new privatedns.PrivateZone(platform.postgresDnsZoneName, {
    resourceGroupName: resourceGroup.name,
    privateZoneName: platform.postgresDnsZoneName,
    tags: tags,
})

new privatedns.VirtualNetworkLink(`zone-dns-vnet-link`,{
    resourceGroupName: resourceGroup.name,
    virtualNetworkLinkName: `link-to-vnet-sdx`,
    privateZoneName: privateZoneDns.name,
    virtualNetwork: {
        id: spokeVnet.id,
    },
    registrationEnabled: false,
})