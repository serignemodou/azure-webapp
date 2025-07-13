import * as resources from '@pulumi/azure-native/resources'
import * as pulumi from '@pulumi/pulumi';

export const env = pulumi.getStack()
export const envDomain = env == 'sandbox' ? 'sdx' : env
export const projectName = pulumi.getProject()

export const tags = {
    projectName: projectName,
    env: env,
    git: 'git@github.com:serignemodou/azure-webapp.git'
}

const resourceGroupName = `rg-${projectName}-${env}`
export const resourceGroup = new resources.ResourceGroup(resourceGroupName, {
    resourceGroupName: resourceGroupName,
    tags: tags,
})

export const azureNativeConfig = new pulumi.Config('azure-native')
export const subscriptionIdConfig = azureNativeConfig.require('subscriptionId')
export const tenantId = azureNativeConfig.require('tenantId')
export const location = azureNativeConfig.require('location')

interface NetworkConfig {
    snetAppGw: string
    snetWebappInbound: string
    snetWebappOutbound: string
    snetPostgres: string
    snetData: string
    vnetAddress: [string]
}

const network = new pulumi.Config('network')
export const networkInfo = network.requireObject<NetworkConfig>('config')

export const domainProxima = 'prod' == envDomain ? 'allodoctor.app.io' : `allodoctor.${env}.app.io`
interface AppGwConfig {

}
export interface AppGwTagsConfig {
    [key: string]: string
}
export const appGwConfig = new pulumi.Config('appgw').requireObject<AppGwConfig>('config')

export const healthCheckpath = '/actuator/health/custom'

