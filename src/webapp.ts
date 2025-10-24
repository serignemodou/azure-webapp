import * as pulumi from '@pulumi/pulumi';
import * as web from "@pulumi/azure-native/web"
import * as monitor from "@pulumi/azure-native/monitor"
import * as network from "@pulumi/azure-native/network"
import * as authorization from "@pulumi/azure-native/authorization"


import { env, resourceGroup, location, tags, projectName, healthCheckpath } from './commons';
import {appServicePlan} from "./app-plan"
import {law} from "./logAnalytics";
import {webAppSettings} from "./webapp-config";
import {input} from "@pulumi/azure-native/types";
import {snetWebappInbound, snetWebappOutbound, nsgWebappOutbound, nsgWebappInbound} from "./networkSpoke"
import {vault} from "./keyVault";

const siteConfig: pulumi.Input<input.web.SiteConfigArgs> = {
    appSettings: webAppSettings,
    linuxFxVersion: "JAVA|21-java21",
    minTlsVersion: "1.2",
    healthCheckPath: healthCheckpath,
    httpLoggingEnabled: true,
    logsDirectorySizeLimit: 35,
    vnetRouteAllEnabled: true,
    ftpsState: web.FtpsState.FtpsOnly,
}

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
    publicNetworkAccess: "Enabled",
    keyVaultReferenceIdentity: "SystemAssigned", //Identité utiliser pour s'authenfier au keyVault
    identity: {
        type: web.ManagedServiceIdentityType.SystemAssigned,
    },
    clientAffinityEnabled: false,
    siteConfig: {
        ...siteConfig,
        alwaysOn: true
    },
    tags: tags,
},{
    dependsOn: [snetWebappInbound, snetWebappOutbound]
})

export const alloDoctorWebappFqdn = webApp.defaultHostName


new network.PrivateEndpoint(`pe-${webAppName}`, {
    resourceGroupName: resourceGroup.name,
    location: location,
    privateEndpointName: `pe-${webAppName}`,
    subnet: {
        id: snetWebappInbound.id
    },
    id: webApp.id,
})

//RBAC Role to read secret on KV
const roleDefinition = new authorization.RoleDefinition(`rd-uai-to-kv${webAppName}`, {
    scope: vault.id,
    roleName: "Key Vault Secrets User"
})

new authorization.RoleAssignment(`ra-uai-to-kv-${webAppName}`, {
    principalId: webApp.identity.apply(managedIdentity => managedIdentity!.principalId!), 
    principalType: authorization.PrincipalType.ServicePrincipal,
    roleDefinitionId: roleDefinition.id,
    scope: vault.id,
})

//VNET integration for webapp outbound traffic
new web.WebAppSwiftVirtualNetworkConnection(`snet-injection-${webAppName}`, {
    resourceGroupName: resourceGroup.name,
    swiftSupported: true,
    name: webApp.name,
    subnetResourceId: snetWebappOutbound.id
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
},
{
    dependsOn: [webApp]
})

const webAppStagingSlot = new web.WebAppSlot(`${webAppName}-staging-slot`, {
    name: webApp.name,
    resourceGroupName: resourceGroup.name,
    location: location,
    slot: "staging",
    httpsOnly: true,
    clientAffinityEnabled: false,
    siteConfig: {...siteConfig, alwaysOn: false}
})

new network.PrivateEndpoint(`pe-${webAppName}-staging-slot`, {
    resourceGroupName: resourceGroup.name,
    location: location,
    privateEndpointName: `pe-${webAppName}-staging-slot`,
    subnet: {
        id: snetWebappInbound.id
    },
    id: webApp.id,
},
{
    dependsOn: [webAppStagingSlot]
})

new monitor.DiagnosticSetting(`diagnostics-settings-${webAppName}-staging-slot`, {
    resourceUri: webAppStagingSlot.id,
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
    dependsOn: [webAppStagingSlot]
})
