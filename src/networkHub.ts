import * as network from '@pulumi/azure-native/network'

import { projectName, env, resourceGroup, location, spokeNetworkInfo, hubNetworkInfo, tags } from './commons';

const hubVnetName = `vnet-hub-${projectName}-${env}`

//########### Hub vnet ###############
export const hubVnet = new network.VirtualNetwork(hubVnetName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    virtualNetworkName: hubVnetName, 
    enableDdosProtection: false,
    addressSpace: {
        addressPrefixes: hubNetworkInfo.vnetAddress,
    },
    tags: tags
})

/* Firewall subnet */
const snetFirewallName = `AzureFirewallSubnet`
export const snetFirewall = new network.Subnet(snetFirewallName, {
    resourceGroupName: resourceGroup.name,
    subnetName: snetFirewallName,
    virtualNetworkName: hubVnet.name,
    addressPrefix: hubNetworkInfo.snetFirewall,
})