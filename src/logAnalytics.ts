import * as operationalinsights from "@pulumi/azure-native/operationalinsights";

import {env, projectName, resourceGroup, location, tags} from './commons';

export const law = new operationalinsights.Workspace("workspace", {
    location: location,
    resourceGroupName: resourceGroup.name,
    retentionInDays: 30,
    tags: tags,
    workspaceName: `law-${projectName}-${env}`,
    sku: {
        name: operationalinsights.WorkspaceSkuNameEnum.PerGB2018,
    },
});