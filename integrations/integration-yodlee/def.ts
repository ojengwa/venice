import type {IntegrationDef, IntegrationSchemas} from '@usevenice/cdk-core'
import {intHelpers} from '@usevenice/cdk-core'
import {makePostingsMap} from '@usevenice/cdk-ledger'
import type {Standard} from '@usevenice/standard'
import type {Brand} from '@usevenice/util'
import {A, objectFromObject, parseDateTime, z, zCast} from '@usevenice/util'

import {
  getYodleeAccountBalance,
  getYodleeAccountName,
  getYodleeAccountType,
} from './yodlee-utils'
import {
  zProviderAccount,
  zUser,
  zYodleeInstitution,
  zYodleeProvider,
  type YodleeAccount,
  type YodleeTransaction,
} from './yodlee.types'
import {
  zAccessToken,
  zConfig,
  zUserCreds,
  zYodleeEnvName,
  zYodleeId,
} from './YodleeClient'

const zSettings = zUserCreds.extend({
  /** Used to be _id */
  providerAccountId: zYodleeId,
  // Cache
  user: zUser.nullish(),
  provider: zYodleeProvider.nullish(),
  providerAccount: zProviderAccount.nullish(),
})

export const yodleeSchemas = {
  name: z.literal('yodlee'),
  integrationConfig: zConfig,
  resourceSettings: zSettings,
  institutionData: zYodleeInstitution,
  // Should accessToken be cached based on provider / userId?
  connectInput: z.object({accessToken: zAccessToken, envName: zYodleeEnvName}),
  connectOutput: z.object({
    providerAccountId: zYodleeId,
    providerId: zYodleeId, // Technically optional
  }),
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<YodleeAccount>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<YodleeTransaction>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('commodity'),
      entity: zCast<Yodlee.HoldingWithSecurity>(),
    }),
  ]),

  // Should the mappers be in here instead? Or a separate function?
} satisfies IntegrationSchemas
export const helpers = intHelpers(yodleeSchemas)

export const yodleeDef = {
  name: 'yodlee',
  schemas: yodleeSchemas,
  metadata: {categories: ['banking'], logoUrl: '/_assets/logo-yodlee.png'},
  extension: {
    sourceMapEntity: {
      account: ({entity: a}, extConn) => ({
        id: `${a.id}`,
        entityName: 'account',
        entity: {
          name: getYodleeAccountName(a),
          lastFour: a.accountNumber?.slice(-4) ?? null,
          type: getYodleeAccountType(a),
          institutionName: extConn.provider?.name,
          removed: a.isDeleted ?? false,
          informationalBalances: {
            available: getYodleeAccountBalance(a, 'availableBalance'),
            current: getYodleeAccountBalance(a, 'balance'),
          },
          defaultUnit: a.currentBalance?.currency as Unit,
          balancesMap: objectFromObject(
            a._balancesMap ?? {},
            (_, val): Standard.Balance => {
              if (val.holdings.length > 0) {
                return {
                  autoShiftPaddingDate: true,
                  holdings: [
                    // Not all holdings come back with a symbol
                    ...val.holdings.map((h): Standard.Holding | null =>
                      h.symbol
                        ? {
                            unit: h.symbol as Unit,
                            quantity: h.quantity,
                            costBasis: h.costBasis
                              ? A(h.costBasis.amount, h.costBasis.currency)
                              : null,
                            lastQuote: h.price
                              ? A(h.price.amount, h.price.currency)
                              : null,
                            lastQuoteDate:
                              parseDateTime(h.lastUpdated)?.toISODate() ?? null,
                          }
                        : null,
                    ),
                    // Must add cash value which is not included in holdings.
                    val.balances.cash?.amount
                      ? A(val.balances.cash.amount, val.balances.cash.currency)
                      : null,
                  ].filter((h): h is NonNullable<typeof h> => !!h),
                }
              }
              const current = getYodleeAccountBalance(
                {
                  accountType: a.accountType,
                  CONTAINER: a.CONTAINER,
                  ...val.balances,
                },
                'balance',
              )
              return {
                holdings: current ? [current] : [],
                autoShiftPaddingDate: true,
                disabled: true,
              }
            },
          ),
        },
      }),
      transaction: ({entity: t}) => {
        const accountExternalId = `${t.accountId}` as ExternalId
        const sign = t.baseType === 'DEBIT' ? -1 : 1
        const currAmount = A(t.amount.amount * sign, t.amount.currency)

        const isStockTrade =
          t.CONTAINER === 'investment' &&
          (t.type === 'BUY' || t.type === 'SELL') &&
          t.quantity &&
          t.symbol

        const stockSign = t.type === 'SELL' ? -1 : 1

        const stockAmount = isStockTrade
          ? A((t.quantity ?? 0) * stockSign, t.symbol ?? '')
          : undefined
        return {
          id: `${t.id}`,
          entityName: 'transaction',
          entity: {
            date: t.date,
            description: t.description.simple || t.description.original || '',
            payee: t.merchant?.name,

            labelsMap: {},
            externalCategory: t.category,
            externalStatus: t.status.toLowerCase() as Brand<
              string,
              'externalStatus'
            >,
            postingsMap: makePostingsMap(
              {main: {accountExternalId, amount: currAmount}},
              // https://stackoverflow.com/questions/38578339/no-way-to-get-per-transaction-commission-fee-in-new-yodlee-api-ysl-restserver
              // How do we get fees from yodlee transaction?
              {trade: stockAmount && {amount: stockAmount, accountExternalId}},
            ),
            removed: t.isDeleted,
          },
        }
      },
    },
  },
  // is the `id` actually externalId?
  standardMappers: {
    institution: (ins) => ({
      logoUrl: ins.logo,
      loginUrl: ins.loginUrl,
      name: ins.name ?? `<${ins.id}>`,
    }),
    resource: (settings) => ({
      id: `${settings.providerAccountId}`,
      displayName:
        settings.provider?.name ?? `Unnamed <${settings.providerAccountId}>`,
      status: (() => {
        switch (settings.providerAccount?.status) {
          case 'SUCCESS':
            return 'healthy'
          case 'USER_INPUT_REQUIRED':
            return 'disconnected'
          case 'FAILED':
            // Venmo refresh seems to run into this issue
            if (
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              settings.providerAccount.dataset[0]?.updateEligibility ===
              'ALLOW_UPDATE_WITH_CREDENTIALS'
            ) {
              return 'disconnected'
            }
            return 'error'
          // TODO: Handle these three situations
          case 'IN_PROGRESS':
          case 'LOGIN_IN_PROGRESS':
          case 'PARTIAL_SUCCESS':
            return 'healthy'
          default:
            return undefined
        }
      })(),
    }),
  },
} satisfies IntegrationDef<typeof yodleeSchemas>

export default yodleeDef
