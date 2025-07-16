/**
 * Dans le cadre d'un projet ou ces fonctions seront utilisées par plusieurs équipe différente, 
 * mais que le gestion des ces fonctions revienne à une équipe spécifique, 
 * pensser à les créer en tant que lib node js, et de l'ajouter dans les dépendance dans package.json
 * https://dextrop.medium.com/creating-and-publishing-a-node-js-library-to-npm-6b541854983e
 */
import * as pulumi from '@pulumi/pulumi';

export function getKeyVaultObjectReference(vaultName: pulumi.Input<string>, type: string, name: pulumi.Input<string>): pulumi.Output<string> {
    const allowedTypes = ["secret", "key", "certificate"];
    if (!allowedTypes.includes(type)) {
        throw new Error (`Invalid key vault object type: "${type}". must be one of ${allowedTypes.join(", ")}`)
    }
    return pulumi.interpolate `@Microsoft.KeyVault(SecretUri=https://${vaultName}.vault.azure.net/${type}/${name}/)`;
}

export function getFrontendIPConfigId(
    subscriptionId: string,
    resourceGroupName: string,
    reourceName: string,
    resourceType: string,
    frontendIPName: string,
): string {
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/${resourceType}/${reourceName}/frontendIPConfigurations/${frontendIPName}`
}