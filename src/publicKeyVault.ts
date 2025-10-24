import * as random from "@pulumi/random"
import * as keyvault from "@pulumi/azure-native/keyvault"

import {env, resourceGroup, tags, tenantId} from './commons'

const randomSuffix = new random.RandomString(`kv-rdn-name`, {
    length: 3,
    special: false
})

export const kv = randomSuffix.result.apply((randomSuffix) => {
    const kvname = `kv-pub-cert-${env}-${randomSuffix.toLowerCase()}`

    const kv = new keyvault.Vault(`kv-public-certificates-${env}`, {
        vaultName: kvname,
        resourceGroupName: resourceGroup.name,
        properties: {
            enabledForDeployment: true,
            enabledForDiskEncryption: true,
            enabledForTemplateDeployment: true,
            enableSoftDelete: true,
            enableRbacAuthorization: false,
            enablePurgeProtection: true,
            publicNetworkAccess: keyvault.PublicNetworkAccess.Enabled,
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