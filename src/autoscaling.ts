import * as pulumi from '@pulumi/pulumi';
import {input} from "@pulumi/azure-native/types"
import * as monitor from "@pulumi/azure-native/monitor"


import {appServicePlan, skuPlan} from './app-plan'
import {resourceGroup} from './commons';
import {law} from "./logAnalytics"


interface AutoscaleConfig {
    minimumWorkerInDayWorkWorkingHours: string
    maximumWorkerInDayWorkWorkingHours: string
    maximumWorkerInDayWorkNonWorkingHours: string
}

export const autoscalingConfig = new pulumi.Config('app').requireObject<AutoscaleConfig>('autoscaling')

const autoScaleDefault = 'Default' // Out off Monday to Saturday => On Sunday
const autoScaleWorkDay = 'Autoscaling Work day' // From Monday to saturday 
const autoScalingNonWorkDay = 'Autoscaling work off day' // Out off Monday to Saturday => On Sunday

const capacityDefault: pulumi.Input<input.monitor.ScaleCapacityArgs> = {
    minimum: `${skuPlan.capacity}`,
    maximum: `${skuPlan.capacity}`,
    default: `${skuPlan.capacity}`,
}

const capacityWorkDayWorkingHours: pulumi.Input<input.monitor.ScaleCapacityArgs> = {
    minimum: autoscalingConfig.minimumWorkerInDayWorkWorkingHours,
    maximum: autoscalingConfig.maximumWorkerInDayWorkWorkingHours,
    default: autoscalingConfig.minimumWorkerInDayWorkWorkingHours,
}

const capacityWorkDayNonWorkingHours: pulumi.Input<input.monitor.ScaleCapacityArgs> = {
    minimum: `${skuPlan.capacity}`,
    maximum: autoscalingConfig.maximumWorkerInDayWorkNonWorkingHours,
    default: `${skuPlan.capacity}`
}

const rules: pulumi.Input<input.monitor.ScaleRuleArgs>[] = [
    {
        scaleAction: {
            direction: 'Increase',
            type: 'ChangeCount',
            value: '2', 
            cooldown: 'PT1M'
        },
        metricTrigger: {
            metricName: 'CpuPercentage',
            metricResourceUri: appServicePlan.id,
            operator: 'GreaterThan',
            statistic: 'Average',
            threshold: 75,
            timeAggregation: 'Average',
            timeGrain: 'PT1M', //Evaluation toute les 1mn
            timeWindow: 'PT5M', //scal up si l'usage cpu dépasse 80% sur 5mns
        }
    },
    {
        scaleAction: {
            direction: "Decrease",
            type: 'ChangeCount',
            value: '1',
            cooldown: 'PT1M'
        },
        metricTrigger: {
            metricName: 'CPUPercentage',
            metricResourceUri: appServicePlan.id,
            operator: 'LessThan',
            statistic: 'Average',
            threshold: 30,
            timeAggregation: 'Average',
            timeGrain: 'PT1M',
            timeWindow: 'PT5M'
        }
    }
]

const autoScale = new monitor.AutoscaleSetting(`autoscale-webapp`, {
    autoscaleSettingName: 'Autoscale appservice',
    resourceGroupName: resourceGroup.name,
    enabled: true,
    targetResourceUri: appServicePlan.id,
    profiles: [
        {
            name: autoScaleDefault,
            capacity: capacityDefault,
            rules: []
        },
        {
            name: autoScaleWorkDay,
            capacity: capacityWorkDayWorkingHours,
            rules: rules,
            recurrence: {
                frequency: 'Week',
                schedule: {
                    timeZone: 'Romance Standard Time',
                    days: ['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday'],
                    hours: [5],
                    minutes: [0]
                }
            }
        },
        {
            name: autoScaleWorkDay,
            capacity: capacityWorkDayNonWorkingHours,
            rules: [],
            recurrence: {
                frequency: 'Week',
                schedule: {
                    timeZone: 'Romance Standard Time',
                    days: ['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday'],
                    hours: [22],
                    minutes: [59]
                }
            }
        },
        {
            name: `${autoScalingNonWorkDay}-morning`,
            capacity: capacityWorkDayNonWorkingHours,
            rules: rules,
            recurrence: {
                frequency: 'Week',
                schedule: {
                    timeZone: 'Romance Standard Time',
                    days: ['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday'],
                    hours: [23],
                    minutes: [0]
                }
            }
        },
        {
            name: autoScalingNonWorkDay,
            capacity: capacityWorkDayNonWorkingHours,
            rules: [],
            recurrence: {
                frequency: 'Week',
                schedule: {
                    timeZone: 'Romance Standard Time',
                    days: ['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday'],
                    hours: [4],
                    minutes: [59]
                }
            }
        }
    ]
})

new monitor.DiagnosticSetting(`diagnostics-settings-auto-scale`, {
    resourceUri: autoScale.id,
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