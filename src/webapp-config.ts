import * as pulumi from '@pulumi/pulumi';

import {vault} from './keyVault'
import {input} from '@pulumi/azure-native/types';
import {getKeyVaultObjectReference} from "./helper"

interface keyVaultSecret {
    [name: string]: pulumi.Input<string>
}
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
]