import * as network from "@pulumi/azure-native/network";

import {projectName, env, resourceGroup, location, tags} from './commons'

const wafPolicyName = `waf-policy-${projectName}-${env}`

export const wafPolicy = new network.WebApplicationFirewallPolicy(wafPolicyName, {
    resourceGroupName: resourceGroup.name,
    location: location,
    policyName: wafPolicyName,
    policySettings: {
        mode: network.WebApplicationFirewallMode.Prevention,
        state: network.WebApplicationFirewallEnabledState.Enabled,
        requestBodyCheck: true
    },
    managedRules: {
        managedRuleSets: [
            {
                ruleSetType: "OWASP",
                ruleSetVersion: "3.2",
                ruleGroupOverrides: [
                    {
                        ruleGroupName: 'REMOTE-FILE-INCLUSION',
                        rules: [
                            {
                                ruleId: "931120",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled
                            },
                            {
                                ruleId: "931130",
                                action: network.ActionType.Block,
                                state:network.ManagedRuleEnabledState.Enabled
                            }
                        ]
                    },
                    {
                        ruleGroupName: 'SQL-INJECTION',
                        rules: [
                            {
                                ruleId: "942100",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.High
                            },
                            {
                                ruleId: "932150",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.High
                            }
                        ]
                    },
                    {
                        ruleGroupName: 'KNOWN_CVES',
                        rules: [
                            {
                                ruleId: "800100",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.High,
                            }
                        ]
                    }
                ]
            },
            {
                ruleSetType: "Microsoft_BotManagerRuleSet",
                ruleSetVersion: "1.1",
                ruleGroupOverrides: [
                    {
                        ruleGroupName: "BAD-BOTS",
                        rules: [
                            {
                                ruleId: "Bot100100",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.High
                            },
                            {
                                ruleId: "Bot100200",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.High

                            },
                            {
                                ruleId: "Bot100300",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.High
                            }
                        ]
                    },
                    {
                        ruleGroupName: "UNKNOWN-BOTS",
                        rules: [
                            {
                                ruleId: "Bot300600",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.Medium
                            },
                            {
                                ruleId: "Bot300700",
                                action: network.ActionType.Block,
                                state: network.ManagedRuleEnabledState.Enabled,
                                sensitivity: network.SensitivityType.Medium                                
                            }
                        ]
                    }
                ]
            }
        ]
    },
    tags: tags,
})