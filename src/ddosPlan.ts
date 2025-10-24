import * as network from '@pulumi/azure-native/network'

import {projectName, env, resourceGroup, location, tags} from './commons'

export const dnsAppGwName = env == "prod" ? `agw-${projectName}-allodoctor` : `agw-${projectName}-${env}-allodoctor`

// DDOS Protection IP-Level
const ddosProtectionPlanName = `ddos-plan-name-${env}`
export const ddosProtectionPlan = new network.DdosProtectionPlan(ddosProtectionPlanName, {
    resourceGroupName: resourceGroup.name,
    location: location,
    ddosProtectionPlanName: ddosProtectionPlanName,
    tags: tags,
})

const publicIAddressName = `pip-agw-${projectName}-${env}`
export const appGwPublicIP = new network.PublicIPAddress(publicIAddressName, {
    resourceGroupName: resourceGroup.name,
    publicIpAddressName: publicIAddressName,
    location: location,
    publicIPAllocationMethod: network.IPAllocationMethod.Static, //Static or Dynamic => Static est obloigatoire pour la DDos protection, loadbalancer
    sku: {
        name: network.PublicIPAddressSkuName.Standard,
        tier: network.PublicIPAddressSkuTier.Regional //Regional or Glabal => Only Regional is compatible with DDOS protection
    },
    ddosSettings: {
        ddosProtectionPlan: {
            id: ddosProtectionPlan.id
        },
        protectionMode: "Enabled",
    },
    zones: ["1", "2", "3"],
    dnsSettings: {
        domainNameLabel: dnsAppGwName,
    }
})

export const agwPublicFqdn =  appGwPublicIP.dnsSettings