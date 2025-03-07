import type {MaybePromise} from '@usevenice/util'
import {objectEntries, R, z} from '@usevenice/util'

import type {IntegrationSchemas, IntHelpers} from '../integration.types'
import type {
  PaginatedOutput,
  Pagination,
  VerticalRouterOpts,
} from './new-mapper'
import {
  paginatedOutput,
  proxyListRemoteRedux,
  zPaginationParams,
} from './new-mapper'

export const zAccounting = {
  account: z.object({
    id: z.string(),
    number: z.string().nullish(),
    name: z.string(),
    type: z.string(), //  z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  }),
  // .openapi({format: 'prefix:acct'}),
  expense: z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    payment_account: z.string(),
  }),
  // .openapi({format: 'prefix:exp'}),
  vendor: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
  }),
  // .openapi({format: 'prefix:ven'}),
}

export const zAccountingEntityName = z.enum(
  Object.keys(zAccounting) as [keyof typeof zAccounting],
)

export type ZAccounting = {
  [k in keyof typeof zAccounting]: z.infer<(typeof zAccounting)[k]>
}

export interface AccountingMethods<
  TDef extends IntegrationSchemas,
  TInstance,
  T extends IntHelpers<TDef> = IntHelpers<TDef>,
> {
  list?: <TType extends keyof T['_verticals']['accounting']>(
    instance: TInstance,
    stream: TType,
    opts: Pagination,
  ) => MaybePromise<PaginatedOutput<T['_verticals']['accounting'][TType]>>
  get?: <TType extends keyof T['_verticals']['accounting']>(
    instance: TInstance,
    stream: TType,
    opts: Pagination,
  ) => MaybePromise<T['_verticals']['accounting'][TType] | null>
}

// This is unfortunately quite duplicated...
// Guess it means accounting router also belongs in the engine backend...

export function createAccountingRouter(opts: VerticalRouterOpts) {
  const vertical = 'accounting'
  // We cannot use a single trpc procedure because neither openAPI nor trpc
  // supports switching output shape that depends on input

  return opts.trpc.router(
    R.mapToObj(objectEntries(zAccounting), ([entityName, v]) => [
      `${vertical}_${entityName}_list`,
      opts.remoteProcedure
        .meta({openapi: {method: 'GET', path: `/${vertical}/${entityName}`}})
        .input(zPaginationParams.nullish())
        .output(paginatedOutput(v))
        .query(async ({input, ctx}) =>
          proxyListRemoteRedux({input, ctx, meta: {entityName, vertical}}),
        ),
    ]),
  )
}
