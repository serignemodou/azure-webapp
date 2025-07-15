import * as network from '@pulumi/azure-native/network'
import * as uai from '@pulumi/azure-native/managedidentity'
import * as keyvault from "@pulumi/azure-native/keyvault"

import { projectName, env, resourceGroup, location, tags, healthCheckpath, AppGwTagsConfig, tenantId, appGwConfig, domainAlloDoctor, subscriptionId } from './commons';
import { appGwPublicIP } from './ddosPlan'
import { law } from './logAnalytics'
import * as pulumi from '@pulumi/pulumi';
import {snetAgw, nsgAgw} from "./network"
import {kv} from "./public-keyVault"

interface AppGwAutoscaleConfig {
    minCapacity: number,
    maxCapacity: number
}

export const appGWAutoscaleConfig = new pulumi.Config('appgw').requireObject<AppGwAutoscaleConfig>('autoscaling')
export const appgwTags = new pulumi.Config('appgw').getObject<AppGwTagsConfig>('tags')
const appGwNsgPortRange = '65200-65535'

//NSG Rule for VPN Gateway, Expresse Route Gateway
const nsgSecuRuleGatewayManager = new network.SecurityRule(`Allow-GatewayManager`, {
    name: `Allow-GatewayManager (Internal)`,
    resourceGroupName: resourceGroup.name,
    networkSecurityGroupName: nsgAgw.name,
    access: 'Allow',
    destinationAddressPrefix: "*",
    destinationPortRange: appGwNsgPortRange,
    direction: 'Inbound',
    priority: 100,
    protocol: '*',
    sourceAddressPrefix: 'GatewayManager', //serviceTag that represent IP used in VPN Gateway, ExpressRouteGateway, AppGateway "https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview"
    sourcePortRange: "*"
})

//NSG Rule for App Gateway Health Check 
const nsgSecuRuleAzureLoadBalancer = new network.SecurityRule(`Allow-AzureLoadBalancer`, {
    name: `Allow-AzureLoadBalancer`,
    resourceGroupName: resourceGroup.name,
    networkSecurityGroupName: nsgAgw.name,
    access: 'Allow',
    destinationAddressPrefix: '*',
    destinationPortRange: '*',
    direction: 'Inbound',
    priority: 200,
    protocol: '*',
    sourceAddressPrefix: 'AzureLoadBalancer', // serviceTag that represent IP to make health check request (168.63.129.16)
    sourcePortRange: '*'
})

//NSG Rule for Internet only when app gateway must be publicly exposed
new network.SecurityRule('Allow-Internet', {
    name: 'Allow-Internet',
    resourceGroupName: resourceGroup.name,
    networkSecurityGroupName: nsgAgw.name,
    access: 'Allow',
    destinationAddressPrefix: '*',
    destinationPortRange: '*',
    direction: 'Inbound',
    priority: 300,
    protocol: 'TCP',
    sourceAddressPrefix: 'Internet',
    sourcePortRange: '*'
})

//UserManagedIdentity to retrieve ssl certificate from public key vault
const uaiAppGwName = `uai-appgw-wafv2-${projectName}-${env}`
const uaiAppGw = new uai.UserAssignedIdentity(uaiAppGwName, {
    resourceGroupName: resourceGroup.name,
    location: location,
    resourceName: uaiAppGwName
})

//Grant access AppGw uia to public key vault to read certificate for SSL PathThrough
//IMPORTANT: This key vault must be deployed before app gateway, because it store SSL Certificate used by app gateway, you can use new github repo to deploy this keyVault resource
new keyvault.AccessPolicy('appgw-access-policy', {
    resourceGroupName: resourceGroup.name,
    vaultName: kv.name,
    policy: {
        objectId: uaiAppGw.principalId,
        applicationId: uaiAppGw.clientId,
        tenantId: tenantId,
        permissions: {
            certificates: ["get", "list"]
        }
    }
})

function getFrontendIPConfigId(
    subscriptionId: string,
    resourceGroupName: string,
    reourceName: string,
    resourceType: string,
    frontendIPName: string,
): string {
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/${resourceType}/${reourceName}/frontendIPConfigurations/${frontendIPName}`
}

const appGwName = `appgw-wafV2-${projectName}-${env}`
const appgwConfig = {
    name : appGwName,
    gatewayIPConfigurationName: 'appGatewayIPConfig', //To deploy app gateway on specific subnet
    frontendPortsName: {
        https: `appgw-port-https`
    },
    frontendIPConfigurationsName: {
        public: 'appgw-frontend-ip-public'
    },
    httpListenersName: {
        publicAlloDoctorio: 'appgw-https-listener-allodoctor-io'
    },
    requestRoutingRulesName: {
        allodoctor: 'appgw-routing-rule-allodoctor'
    },
    backendAddressPoolsName: {
        azure: 'backend-azure', //WebApp azure
    },
    probesName: {
        azure: 'probe-http-azure'
    },
    backendHttpSettingsCollectionName: {
        azure: 'http-settings-azure'
    },
    urlPathMapName: {
        allodoctor: 'path-apps-allodoctor'
    },
    sslCertificatesName: {
        publicCertAlloDoctor: 'public-cert-allodoctor-from-asc' //SSL certificate for SSL PathThrough
    },
    identityId: {
        uiaAppGw: uaiAppGw.id
    }
}

const agw = new network.ApplicationGateway(
    appgwConfig.name, 
    {
        applicationGatewayName: appgwConfig.name,
        resourceGroupName: resourceGroup.name,
        location: location,
        sku: {
            name: network.ApplicationGatewaySkuName.WAF_v2,
            tier: network.ApplicationGatewayTier.WAF_v2
        },
        autoscaleConfiguration: {
            minCapacity: appGWAutoscaleConfig.minCapacity,
            maxCapacity: appGWAutoscaleConfig.maxCapacity
        },
        enableHttp2: true,
        identity: {
            type: network.ResourceIdentityType.UserAssigned,
            userAssignedIdentities: [appgwConfig.identityId.uiaAppGw]
        },
        gatewayIPConfigurations: [
            {
                name: appgwConfig.gatewayIPConfigurationName,
                subnet: {
                    id: snetAgw.id
                }
            }
        ],
        frontendPorts: [
            {
                name: appgwConfig.frontendPortsName.https,
                port: 443
            }
        ],
        frontendIPConfigurations: [
            {
                name: appgwConfig.frontendIPConfigurationsName.public,
                publicIPAddress: {
                    id: appGwPublicIP.id
                }
            }
        ],
        zones: appGwConfig.zones,
        sslCertificates: [
            {
                name: appgwConfig.sslCertificatesName.publicCertAlloDoctor,
                keyVaultSecretId: kv.id
            }
        ],
        sslPolicy: {
            policyName: network.ApplicationGatewaySslPolicyName.AppGwSslPolicy20220101S,
            policyType: network.ApplicationGatewaySslPolicyType.Predefined
        },
        httpListeners: [
            {
                name: appgwConfig.httpListenersName.publicAlloDoctorio,
                hostName: domainAlloDoctor,
                frontendIPConfiguration: {
                    id: getFrontendIPConfigId(subscriptionId, `${resourceGroup.name}`, appgwConfig.name, 'applicationGateways',appgwConfig.frontendIPConfigurationsName.public)
                },
                frontendPort: {
                    id: getFrontendIPConfigId(subscriptionId, `${resourceGroup.name}`, appgwConfig.name, 'applicationGateways',appgwConfig.frontendPortsName.https)
                },
                sslCertificate: {
                    id: getFrontendIPConfigId(subscriptionId, `${resourceGroup.name}`, appgwConfig.name, 'applicationGateways',appgwConfig.sslCertificatesName.publicCertAlloDoctor)
                },
                protocol: network.ApplicationGatewayProtocol.Https
            }
        ]
    }
)