import * as random from "@pulumi/random"
import * as keyvault from "@pulumi/azure-native/keyvault"
import * as monitor from "@pulumi/azure-native/monitor"
import * as network from "@pulumi/azure-native/network"

import {env, resourceGroup, location, tags, tenantId} from './commons'
import {law} from "./logAnalytics";
import {snetData, nsgData} from "./network"

const randomSuffix = new random.RandomString(`kv-rdn-name`, {
    length: 3,
    special: false
})

export const vault = randomSuffix.result.apply((randomSuffix) => {
    const kvname = `kv-allodoctor-${env}-${randomSuffix.toLowerCase()}`

    const kv = new keyvault.Vault(`kv-allodoctor-${env}`, {
        vaultName: kvname,
        resourceGroupName: resourceGroup.name,
        properties: {
            enabledForDeployment: true,
            enabledForDiskEncryption: true,
            enabledForTemplateDeployment: true,
            enableSoftDelete: true,
            enableRbacAuthorization: true,
            enablePurgeProtection: true,
            publicNetworkAccess: keyvault.PublicNetworkAccess.Disabled,
            sku: {
                family: keyvault.SkuFamily.A,
                name: keyvault.SkuName.Standard
            },
            tenantId: tenantId,
        },
        tags: tags
    })
    return kv
})

new network.PrivateEndpoint(`pe-kv-allodoctor`, {
    resourceGroupName: resourceGroup.name,
    location: location,
    privateEndpointName: `pe-kv-allodoctor`,
    subnet: {
        id: snetData.id
    },
    id: vault.id,
})

new monitor.DiagnosticSetting(`diagnostics-settings-kv-allodoctor`, {
    resourceUri: vault.id,
    workspaceId: law.id,
    logs: [{
        enabled: true,
        categoryGroup: 'AllLogs'
    }],
    metrics: [{
        enabled: true,
        category: 'AllMetrics'
    }]
},
{
    dependsOn: [vault]
})
