import type {MaybePromise} from '@usevenice/util'
import {objectEntries, z} from '@usevenice/util'
// This is unfortunately quite duplicated...
// Guess it means accounting router also belongs in the engine backend...
import {R} from '@usevenice/util'

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

export const zInvestment = {
  account: z.object({
    id: z.string(),
    name: z.string(),
  }),
  transaction: z.object({
    id: z.string(),
  }),
  holding: z.object({
    id: z.string(),
  }),
  security: z.object({
    id: z.string(),
  }),
}

export const zInvestmentEntityName = z.enum(
  Object.keys(zInvestment) as [keyof typeof zInvestment],
)

export type ZInvestment = {
  [k in keyof typeof zInvestment]: z.infer<(typeof zInvestment)[k]>
}

export interface InvestmentMethods<
  TDef extends IntegrationSchemas,
  TInstance,
  T extends IntHelpers<TDef> = IntHelpers<TDef>,
> {
  list?: <TType extends keyof T['_verticals']['investment']>(
    instance: TInstance,
    stream: TType,
    opts: Pagination,
  ) => MaybePromise<PaginatedOutput<T['_verticals']['investment'][TType]>>
  get?: <TType extends keyof T['_verticals']['investment']>(
    instance: TInstance,
    stream: TType,
    opts: Pagination,
  ) => MaybePromise<T['_verticals']['investment'][TType] | null>
}

export function createInvestmentRouter(opts: VerticalRouterOpts) {
  const vertical = 'investment'

  return opts.trpc.router(
    R.mapToObj(objectEntries(zInvestment), ([entityName, v]) => [
      `${vertical}_${entityName}_list`,
      opts.remoteProcedure
        .meta({openapi: {method: 'GET', path: `/${vertical}/${entityName}`}})
        .input(zPaginationParams.nullish())
        .output(paginatedOutput(v))
        .query(async ({input, ctx}) =>
          proxyListRemoteRedux({input, ctx, meta: {entityName, vertical}}),
        ),
    ]),
    // We cannot use a single trpc procedure because neither openAPI nor trpc
    // supports switching output shape that depends on input
  )
}
