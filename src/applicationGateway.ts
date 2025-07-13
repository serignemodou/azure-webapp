import * as network from '@pulumi/azure-native/network'

import { projectName, env, resourceGroup, location, tags } from './commons'
import { appGwPublicIP } from './ddosPlan'
import { law } from './logAnalytics'

const appGwName = `appgw-${projectName}-${env}`

