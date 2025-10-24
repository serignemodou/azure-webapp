import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import * as dns from '@pulumi/azure-native/privatedns';
import * as monitor from "@pulumi/azure-native/monitor";
import * as postgresql from "@pulumi/azure-native/DBforPostgreSQL";


import {env, tags, resourceGroup, projectName} from './commons';
import {snetPostgres} from "./networkSpoke";
import {law} from './logAnalytics';


interface PgSqlFlexibleConfig {
    adminUsername: string
    storageMb: number,
    skuName: string,
    skuTier: string,
    dbName: string,
    highAvailability: boolean,
    backupRetentionDays: number
}

interface pgPrivateZoneDns {
    postgresDnsZoneName: string,
}

const namePassword = new random.RandomPassword(`passwordDB`, {
    length: 12,
    special: false,
    upper: true,
})

const pgSqlFlexible = new pulumi.Config('platform').requireObject<PgSqlFlexibleConfig>('config')
const pgPrivateZoneDNS = new pulumi.Config('postgresqlflexible').requireObject<pgPrivateZoneDns>('config')

let highAvailabilityParams: any; 
if (pgSqlFlexible.highAvailability){
    highAvailabilityParams = {
        mode: 'ZoneRedundant',
        standbyAvailibilityZone: '2'
    }
}

//Resolution DNS PosgreSQL Server dans vnet intégration
const privateZone = new dns.PrivateZone(`private-zone-dns`,{
    resourceGroupName: resourceGroup.name,
    location: 'Global',
    privateZoneName: pgPrivateZoneDNS.postgresDnsZoneName,
})

const pgName = `psql-flexible-${pgSqlFlexible.dbName}-${env}`
const flexibleServer = new postgresql.Server(pgName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    version: postgresql.ServerVersion.ServerVersion_15,
    serverName: pgName,
    administratorLogin: pgSqlFlexible.adminUsername,
    administratorLoginPassword: namePassword.result,
    network: {
        delegatedSubnetResourceId: snetPostgres.id,
        privateDnsZoneArmResourceId: privateZone.id,
        publicNetworkAccess: postgresql.ServerPublicNetworkAccessState.Disabled,
    },
    sku: {
        name: pgSqlFlexible.skuName,
        tier: pgSqlFlexible.skuTier,
    },
    highAvailability: highAvailabilityParams,
    storage: {
        storageSizeGB: pgSqlFlexible.storageMb,
    },
    authConfig: {
        passwordAuth: postgresql.PasswordAuth.Enabled,
    },
    backup: {
        backupRetentionDays: pgSqlFlexible.backupRetentionDays,
        geoRedundantBackup: postgresql.GeoRedundantBackup.Disabled,
    },
    tags: tags,
},{
    ignoreChanges: ['tags']
})

//Minimum Required Params
//For All Params https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-server-parameters
const pgConfig = {
    'connection_throttle.enable': 'on',
    application_name: `${projectName}-${env}`,
    log_min_messages: 'notice',
    log_min_duration_statement: '3000',
    log_checkpoints: 'on',
    log_line_prefix: '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h',
    log_lock_waits: 'on',
    log_statement: 'ddl',
    log_temp_files: '0',
    log_autovacum_duration: '0',
    lock_timeout: '600000',
    idle_in_transaction_session_timeout: '3000',
    'pgms_wait_sampling.query_capture_mode': 'All',
    'pgbouncer.enabled': 'true', 
    'azure.extensions': 'PG_STAT_STATEMENTS,PG_BUFFERCACHE,HYPOPG,PGAUDIT,PGSTATTUPLE,PG_TRGM,UNACCENT,PGCRYPTO'
}

Object.entries(pgConfig).forEach(([name, value]) => {
    new postgresql.Configuration(`FlexibleConfiguration-${name}-${env}`, {
        serverName: flexibleServer.name,
        value: value,
        resourceGroupName: resourceGroup.name,
    })
})

new postgresql.Database('flexibleServerDatabase', {
    databaseName: pgSqlFlexible.dbName,
    serverName: flexibleServer.name,
    collation: 'en_US.utf8',
    charset: 'utf8',
    resourceGroupName: resourceGroup.name,
})

new monitor.DiagnosticSetting(`diagnostics-settings-${pgName}`, {
    resourceUri: flexibleServer.id,
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

export const pgPassword = namePassword.result
export const pgUsername = pgSqlFlexible.adminUsername
export const pgDbName = pgSqlFlexible.dbName
export const pgFqdn = flexibleServer.fullyQualifiedDomainName 