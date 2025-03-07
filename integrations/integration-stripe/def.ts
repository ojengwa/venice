import type {IntegrationDef, IntegrationSchemas} from '@usevenice/cdk-core'
import {intHelpers, zIntAuth} from '@usevenice/cdk-core'
import {makePostingsMap, zCommon} from '@usevenice/cdk-ledger'
import {A, z, zCast} from '@usevenice/util'

import type {components} from './stripe.gen'

export const stripeSchemas = {
  name: z.literal('stripe'),
  integrationConfig: zIntAuth.oauthOrApikeyAuth,
  resourceSettings: z.object({secretKey: z.string()}),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<components['schemas']['account']>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<components['schemas']['balance_transaction']>(),
    }),
  ]),
  sourceState: z
    .object({
      /** Account ids to sync */
      accountIds: z.array(z.string()).nullish(),
      /** Date to sync since */
      sinceDate: z.string().nullish() /** ISO8601 */,
      transactionSyncCursor: z.string().nullish(),
    })
    .default({}),
  destinationInputEntity: zCommon.Entity,
} satisfies IntegrationSchemas

export const stripeDef = {
  schemas: stripeSchemas,
  name: 'stripe',
  metadata: {
    categories: ['commerce'],
    logoUrl: '/_assets/logo-stripe.png',
    stage: 'beta',
  },
  extension: {
    sourceMapEntity: {
      account: ({entity: a}) => ({
        id: a.id,
        entityName: 'account',
        entity: {
          name: a.settings?.dashboard.display_name ?? '',
          type: 'asset/digital_wallet',
          institutionName: a.settings?.payments.statement_descriptor,
          defaultUnit: a.default_currency?.toUpperCase() as Unit,
          // informationalBalances: {
          //   available: A(
          //     a.balance?.available[0]?.amount ?? 0,
          //     a.default_currency?.toUpperCase() as Unit,
          //   ),
          // },
        },
      }),
      transaction: ({entity: t}) => ({
        id: t.id,
        entityName: 'transaction',
        entity: {
          date: new Date(t.created).toISOString(),
          description: t.description ?? '',
          postingsMap: makePostingsMap({
            main: {
              accountExternalId: t.source as ExternalId,
              amount: A(t.amount, t.currency as Unit),
            },
          }),
        },
      }),
    },
  },
} satisfies IntegrationDef<typeof stripeSchemas>

export const helpers = intHelpers(stripeSchemas)

export default stripeDef
