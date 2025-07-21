import * as pulumi from '@pulumi/pulumi';

import {vault} from './keyVault'
import {input} from '@pulumi/azure-native/types';
import {getKeyVaultObjectReference} from "./helper"
import {appInsight} from "./appInsights"

interface keyVaultSecret {
    [name: string]: pulumi.Input<string>
}
const webAppEnvVar : pulumi.Input<input.web.NameValuePairArgs>[] = [
    {
        name: 'APPINSIGHTS_AGENT_EXTENSION_VERSION',
        value: '~3'
    },
    {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
        value: appInsight.connectionString
    },
    {
        name: 'APPINSIGHTS_PROFILER_FEATURE_VERSION',
        value: '1.0.0'
    },
    {
        name: 'APPLICATIONINSIGHTS_ROLE_NAME',
        value: 'allodoctor-app'
    },
    {
        name: 'DIAGNOSTICS_AZUREMONITOR_LOGS_ENABLED',
        value: 'true'
    }
]
const keyvaultSecretEnvVar : pulumi.Input<input.web.NameValuePairArgs>[] = []
const appManualKeyvaultSecrets = new pulumi.Config('app').requireObject<keyVaultSecret>('manualKeyVaultSecrets')

Object.entries(appManualKeyvaultSecrets).map(([name, secretName]) => {
    keyvaultSecretEnvVar.push({
        name: name.replace(/-/gi, '_').toUpperCase(),
        value: getKeyVaultObjectReference(`${vault}`, 'secrets', secretName,)
    })
})

export const webAppSettings: pulumi.Input<input.web.NameValuePairArgs>[] = [
    ...keyvaultSecretEnvVar,
    ...webAppEnvVar,
]