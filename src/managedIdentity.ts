import * as uai from '@pulumi/azure-native/managedidentity'

import {projectName, env, resourceGroup, location} from './commons';

//UserManagedIdentity to retrieve ssl certificate from public key vault
const uaiAppGwName = `uai-appgw-wafv2-${projectName}-${env}`
export const uaiAppGw = new uai.UserAssignedIdentity(uaiAppGwName, {
    resourceGroupName: resourceGroup.name,
    location: location,
    resourceName: uaiAppGwName
})

//UserManagedIdentity to retrieve secrets from web app key vault
const uaiWebAppName = `uai-appgw-wafv2-${projectName}-${env}`
export const uaiWebApp = new uai.UserAssignedIdentity(uaiWebAppName, {
    resourceGroupName: resourceGroup.name,
    location: location,
    resourceName: uaiWebAppName
})