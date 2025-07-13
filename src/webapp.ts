import * as web from "@pulumi/azure-native/web"
import * as monitor from "@pulumi/azure-native/monitor"


import { env, resourceGroup, location, tags, projectName, healthCheckpath } from './commons';
import {appServicePlan} from "./app-plan"
import { law } from "./logAnalytics";


const webAppName = `app-${projectName}-${env}`
export const webApp = new web.WebApp(webAppName, {
    resourceGroupName: resourceGroup.name,
    location: location,
    name: webAppName,
    kind: "linux",
    endToEndEncryptionEnabled: true,
    httpsOnly: true,
    reserved: true,
    serverFarmId: appServicePlan.id,
    virtualNetworkSubnetId: "",
    publicNetworkAccess: "Enabled",
    siteConfig: {
        healthCheckPath: healthCheckpath,
        minTlsVersion: "1.2",
        linuxFxVersion: "JAVA|21",
        keyVaultReferenceIdentity: "",
        alwaysOn: true
    },
})

new monitor.DiagnosticSetting(`diagnostics-settings-${webAppName}`, {
    resourceUri: webApp.id,
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
