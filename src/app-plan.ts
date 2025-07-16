import * as pulumi from "@pulumi/pulumi"
import * as web from "@pulumi/azure-native/web"
import * as monitor from "@pulumi/azure-native/monitor"

import {env, resourceGroup, location, projectName} from "./commons"
import {law} from "./logAnalytics"

interface SkuPlan {
    name: string
    tier: string
    capacity: number,
    zoneRedundant: boolean,
}

export const skuPlan = new pulumi.Config('app').requireObject<SkuPlan>('skuPlan')

const planName = `plan-${projectName}-${env}`
export const appServicePlan = new web.AppServicePlan(
    planName,
    {
        name: planName,
        resourceGroupName: resourceGroup.name,
        location: location,
        kind: 'linux',
        reserved: true,
        zoneRedundant: skuPlan.zoneRedundant,
        sku: {
            name: skuPlan.name,
            tier: skuPlan.tier,
            capacity: skuPlan.capacity,
        },
    },

    {
        ignoreChanges: ['maximumElasticWorkerCount'],
    },
)

new monitor.DiagnosticSetting(`diagnostics-settings-${planName}`, {
    resourceUri: appServicePlan.id,
    workspaceId: law.id,
    logs: [{
        enabled: true,
        categoryGroup: 'AllLogs'
    }],
    metrics: [{
        enabled: true,
        category: 'AllMetrics'
    }]
})