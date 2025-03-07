import type {IntegrationDef, IntegrationSchemas} from '@usevenice/cdk-core'
import {intHelpers} from '@usevenice/cdk-core'
import {makePostingsMap} from '@usevenice/cdk-ledger'
import type {SerializedTimestamp} from '@usevenice/integration-firebase'
import type {Standard} from '@usevenice/standard'
import type {Merge} from '@usevenice/util'
import {A, objectFromArray, R, z, zCast} from '@usevenice/util'

import type {_parseResourceInfo} from './foreceipt-utils'
import type {ForeceiptClientOptions} from './ForeceiptClient'
import {makeForeceiptClient, zForeceiptConfig} from './ForeceiptClient'

// type ForeceiptSyncOperation = typeof def['_opType']
export const foreceiptSchemas = {
  name: z.literal('foreceipt'),
  // integrationConfig: zForeceiptConfig,
  resourceSettings: z.object({
    credentials: zCast<Readonly<Foreceipt.Credentials>>(),
    options: zCast<ForeceiptClientOptions>(),
    _id: zCast<ExternalId>(),
    envName: z.enum(['staging', 'production']),
  }),
  connectInput: zForeceiptConfig,
  connectOutput: zForeceiptConfig,
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<Foreceipt.Account>(),
      info: zCast<ReturnType<typeof _parseResourceInfo> | undefined>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<
        Merge<
          Foreceipt.Receipt,
          {
            create_time: SerializedTimestamp
            last_update_time: SerializedTimestamp
          }
        >
      >(),
      info: zCast<
        ({_id?: ExternalId} & ReturnType<typeof _parseResourceInfo>) | undefined
      >(),
    }),
  ]),
} satisfies IntegrationSchemas

export const foreceiptHelpers = intHelpers(foreceiptSchemas)

export const foreceiptDef = {
  name: 'foreceipt',
  schemas: foreceiptSchemas,
  metadata: {categories: ['expense-management']},
  extension: {
    sourceMapEntity: {
      account: ({entity: a}) => ({
        id: `${a.id}`,
        entityName: 'account',
        entity: R.identity<Standard.Account>({
          name: `FR ${a.name ?? ''}`,
          type: ((): Standard.AccountType => {
            switch (a.type) {
              case 'Cash':
                return 'asset/cash'
              case 'Chequing':
              case 'Saving':
              case 'Debit Card':
                return 'asset/bank'
              case 'Credit Card':
                return 'liability/credit_card'
              case 'Loan':
                return 'liability/personal_loan'
              default:
                return 'asset'
            }
          })(),
          defaultUnit: a.currency as Unit,
        }),
      }),
      transaction: ({entity, info, id}, _extConn) => {
        const t = entity.content
        const c = info
        const meta = entity
        const creator = c?.memberByGuid[meta.user_guid]
        return {
          id,
          entityName: 'transaction',
          entity: R.identity<Standard.Transaction>({
            date: t.receipt_date,
            payee: t.merchant,
            description: t.notes ?? '',
            // TODO: Split transactions should be handled via deleting one of the receipts in Alka
            removed: t.status === 'Deleted',
            postingsMap: makePostingsMap({
              main: {
                accountExternalId: `${c?._id}-${t.account_id}` as ExternalId,
                amount: A(
                  (t.type === makeForeceiptClient(_extConn).EXPENSE_TYPE ||
                  t.type === makeForeceiptClient(_extConn).TRANSFER_TYPE
                    ? -1
                    : 1) * t.amount,
                  t.currency,
                ),
              },
              remainder: {
                accountExternalId:
                  t.type === makeForeceiptClient(_extConn).TRANSFER_TYPE
                    ? (`${c?._id}-${t.account1_id}` as ExternalId)
                    : undefined,
                accountType: ((): Standard.AccountType => {
                  switch (t.type) {
                    case makeForeceiptClient(_extConn).EXPENSE_TYPE:
                      return 'expense'
                    case makeForeceiptClient(_extConn).INCOME_TYPE:
                      return 'income'
                    case makeForeceiptClient(_extConn).TRANSFER_TYPE:
                    default:
                      return 'equity/clearing'
                  }
                })(),
              },
            }),
            attachmentsMap: objectFromArray(
              t.image_file_list,
              (file) => file,
              (file) => ({
                url: `https://api.foreceipt.io/v1/receipt/image/${t.image_folder}/${file}`,
              }),
            ),
            labelsMap: {
              ...objectFromArray(
                t.tags ?? [],
                (tag) => tag,
                () => true,
              ),
              for_business: t.for_business ?? false, // Should this be label?
            },
            custom: {
              ...(c?.team && {
                created_by: R.compact([
                  creator?.first_name,
                  creator?.last_name,
                ]).join(' '),
              }),
            },
            externalCategory:
              c?.categoryNameById[
                R.compact([t.category_id, t.sub_category_id]).join('/')
              ],
          }),
        }
      },
    },
  },
} satisfies IntegrationDef<typeof foreceiptSchemas>

export default foreceiptDef
