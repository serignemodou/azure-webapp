import * as network from '@pulumi/azure-native/network'

import { projectName, env, resourceGroup, location, spokeNetworkInfo, hubNetworkInfo, tags } from './commons';
import {hubVnet} from "./networkHub"
import {spokeVnet} from "./networkSpoke"

new network.VirtualNetworkPeering('spoke-hub-peering', {
    resourceGroupName: resourceGroup.name,
    virtualNetworkPeeringName: `spoke-hub-peer-${env}`,
    allowVirtualNetworkAccess: true,
    allowForwardedTraffic: true,
    useRemoteGateways: true,
    allowGatewayTransit: false,
    enableOnlyIPv6Peering: false,
    virtualNetworkName: spokeVnet.name,
    remoteVirtualNetwork: {
        id: hubVnet.id,
    }
})

new network.VirtualNetworkPeering('hub-spoke-peering', {
    resourceGroupName: resourceGroup.name,
    virtualNetworkPeeringName: `hub-spoke-peer-${env}`,
    allowVirtualNetworkAccess: true,
    allowForwardedTraffic: true,
    useRemoteGateways: false,
    allowGatewayTransit: true,
    enableOnlyIPv6Peering: false,
    virtualNetworkName: hubVnet.name,
    remoteVirtualNetwork: {
        id: spokeVnet.id
    }
})
