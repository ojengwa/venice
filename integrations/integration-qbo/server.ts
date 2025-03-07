import type {IntegrationServer} from '@usevenice/cdk-core'
import {Rx, rxjs} from '@usevenice/util'

import type {qboSchemas} from './def'
import {qboHelpers, TRANSACTION_TYPE_NAME} from './def'
import {makeQBOClient} from './QBOClient'

export const qboServer = {
  newInstance: ({config, settings}) => makeQBOClient(config, settings),

  sourceSync: ({config, settings}) => {
    const qbo = makeQBOClient(config, settings)
    const realmId = settings.oauth.connection_config.realmId
    async function* iterateEntities() {
      for await (const res of qbo.getAll('Account')) {
        yield res.entities.map((a) => qboHelpers._opData('account', a.Id, a))
      }
      const updatedSince = undefined
      for (const type of Object.values(TRANSACTION_TYPE_NAME)) {
        for await (const res of qbo.getAll(type, {updatedSince})) {
          const entities = res.entities as QBO.Transaction[]
          yield entities.map((t) =>
            qboHelpers._opData('transaction', t.Id, {
              type: type as 'Purchase',
              entity: t as QBO.Purchase,
              realmId,
            }),
          )
        }
      }
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, qboHelpers._op('commit')])))
  },

  verticals: {
    accounting: {
      list: async (qbo, type, _opts) => {
        switch (type) {
          case 'account': {
            const res = await qbo.getAll('Account').next()
            return {hasNextPage: true, items: res.value?.entities ?? []}
          }
          case 'expense': {
            const res = await qbo.getAll('Purchase').next()
            return {hasNextPage: true, items: res.value?.entities ?? []}
          }
          case 'vendor': {
            const res = await qbo.getAll('Vendor').next()
            return {hasNextPage: true, items: res.value?.entities ?? []}
          }
          default:
            throw new Error(`Unknown type: ${type}`)
        }
      },
    },
  },
} satisfies IntegrationServer<
  typeof qboSchemas,
  ReturnType<typeof makeQBOClient>
>

export default qboServer
