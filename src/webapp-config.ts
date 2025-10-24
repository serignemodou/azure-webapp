import * as pulumi from '@pulumi/pulumi';

import {kVault, secretsConfig} from './keyVault'
import {input} from '@pulumi/azure-native/types';
import {getKeyVaultObjectReference} from "./helper"
import {appInsight} from "./appInsights"
import {pgDbName,pgFqdn,pgPassword,pgUsername} from "./postgresFlexible"


const appInsightsEnvVar : pulumi.Input<input.web.NameValuePairArgs>[] = [
    {
        name: 'APPLICATIONINSIGHTS_INSTRUMENTATIONKEY',
        value: appInsight.instrumentationKey
    },
    {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
        value: appInsight.connectionString
    },
    {
        name: 'XDT_MicrosoftApplicationInsights_Mode',
        value: 'recommended'
    },
    {
        name: 'APPINSIGTS_SNAPSHOTFEATURE_VERSION',
        value: '1.0.0'
    },
    {
        name: 'APPINSIGHTS_AGENT_EXTENSION_VERSION',
        value: '~3'
    },
    {
        name: 'APPINSIGHTS_PROFILER_FEATURE_VERSION',
        value: '1.0.0'
    },
    {
        name: 'DiagnosticServices_EXTENSION_VERSION',
        value: '~3'
    },
    {
        name: 'XDT_MicrosoftApplicationInsights_BaseExtension',
        value: '~3'
    },
    {
        name: 'ApplicationInsightsAgent_EXTENSION_VERSION',
        value: '~3'
    }
]

const postgresFlexibleEnvVar : pulumi.Input<input.web.NameValuePairArgs>[] = [
    {
        name: 'POSTGRESQL_FQDN',
        value: pgFqdn
    },
    {
        name: 'POSTGRESQL_USERNAME',
        value: pgUsername
    },
    {
        name: 'POSTGRESQL_DB',
        value: pgDbName
    },
    {
        name: 'POSTGRESQL_PASSWORD',
        value: pgPassword
    }
]

const keyvaultSecretEnvVar : pulumi.Input<input.web.NameValuePairArgs>[] = []
interface keyvaultSecrets {
    [name: string]: pulumi.Input<string>
}

const appManualKeyvaultSecrets = new pulumi.Config('app').requireObject<keyvaultSecrets>('manualKeyVaultSecrets')

// Convert app:manualKeyVaultSecrets in @Microsoft.KeyVault into WebApp ENV VAR
Object.entries(appManualKeyvaultSecrets).map(([name, secretName]) => {
    keyvaultSecretEnvVar.push({
        name: name.replace(/-/gi, '_').toUpperCase(),
        value: getKeyVaultObjectReference(`${kVault.name}`, 'secrets', secretName,)
    })
})

// convert keyvaultSecrets:store in @Microsoft.KeyVault into webApp ENV VAR
Object.entries(secretsConfig).map(([name, value]) => {
    keyvaultSecretEnvVar.push({
        name: name.replace(/-/gi, '_').toUpperCase(),
        value: getKeyVaultObjectReference(`${kVault.name}`, 'secrets',value)
    })
})

export const webAppSettings: pulumi.Input<input.web.NameValuePairArgs>[] = [
    ...appInsightsEnvVar,
    ...postgresFlexibleEnvVar,
    ...keyvaultSecretEnvVar,
]