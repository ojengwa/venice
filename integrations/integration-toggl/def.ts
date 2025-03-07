import type {
  IntegrationDef,
  IntegrationSchemas} from '@usevenice/cdk-core';
import {
  intHelpers,
} from '@usevenice/cdk-core'
import {makePostingsMap} from '@usevenice/cdk-ledger'
import type {Standard} from '@usevenice/standard'
import {A, R, z} from '@usevenice/util'

import {itemProjectResponseSchema, itemTimeEntriesSchema} from './TogglCient'

export const togglSchemas = {
  name: z.literal('toggl'),
  // integrationConfig: zTogglConfig,
  connectInput: z.object({
    apiToken: z.string(),
  }),
  connectOutput: z.object({
    apiToken: z.string(),
    email: z.string().nullish(),
    password: z.string().nullish(),
  }),
  resourceSettings: z.object({
    apiToken: z.string(),
    email: z.string().nullish(),
    password: z.string().nullish(),
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: itemProjectResponseSchema,
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: itemTimeEntriesSchema,
    }),
  ]),
} satisfies IntegrationSchemas

export const togglHelpers = intHelpers(togglSchemas)

export const togglDef = {
  name: 'toggl',
  schemas: togglSchemas,
  extension: {
    sourceMapEntity: (data) => {
      if (data.entityName === 'account') {
        const a = data.entity
        return {
          id: `${a.id}`,
          entityName: 'account',
          entity: R.identity<Standard.Account>({
            name: data.entity.name ?? '',
            type: 'expense',
          }),
        }
      } else if (data.entityName === 'transaction') {
        const t = data.entity
        return {
          id: `${t.id}`,
          entityName: 'transaction',
          entity: R.identity<Standard.Transaction>({
            date: data.entity.at ?? '',
            description: data.entity.description ?? '',
            postingsMap: makePostingsMap({
              main: {
                accountExternalId: `${data.entity.workspace_id}` as ExternalId,
                amount: A(data.entity.duration ?? 0, 'Second' as Unit),
              },
            }),
          }),
        }
      }
      return null
    },
  },
} satisfies IntegrationDef<typeof togglSchemas>

export default togglDef
