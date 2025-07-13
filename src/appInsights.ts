import * as insights from "@pulumi/azure-native/applicationinsights"
import { env, projectName, resourceGroup, location } from './commons';
import { law } from "./logAnalytics" 
import * as monitor from "@pulumi/azure-native/monitor"

const appInsightName = `appi-${projectName}-${env}`
export const appInsight = new insights.Component(appInsightName, {
    resourceName: appInsightName,
    resourceGroupName: resourceGroup.name,
    location: location,
    applicationType: insights.ApplicationType.Other,
    kind: 'java',
    workspaceResourceId: law.id,
    ingestionMode: insights.IngestionMode.LogAnalytics,
    requestSource: insights.RequestSource.Rest
})

new monitor.DiagnosticSetting(`diagnostics-settings-${appInsightName}`, {
    resourceUri: appInsight.id,
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
