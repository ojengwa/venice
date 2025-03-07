import type {IntegrationServer} from '@usevenice/cdk-core'
import type {z} from '@usevenice/util'
import {Rx, rxjs} from '@usevenice/util'

import type {tellerSchemas} from './def'
import {helpers} from './def'
import type {accountTellerSchema, transactionItemSchema} from './TellerClient'
import {makeTellerClient} from './TellerClient'

export const tellerServer = {
  // eslint-disable-next-line @typescript-eslint/require-await
  preConnect: async (config) => ({
    userToken: '',
    applicationId: config.applicationId,
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  postConnect: async (input, _config) => ({
    resourceExternalId: input.token, // FIXME
    settings: {token: input.token},
    // institution // FIXME
  }),
  sourceSync: ({settings, config}) => {
    const client = makeTellerClient({...config, token: settings.token})
    async function* iterateEntities() {
      const res = await client.getAccounts(undefined)
      const combineRes = await Promise.all(
        res.map(async (a: z.infer<typeof accountTellerSchema>) => ({
          ...a,
          balance: await client.getAccountBalances({id: a.id}),
        })),
      )
      yield combineRes.map((a: z.infer<typeof accountTellerSchema>) =>
        helpers._opData('account', a.id, a),
      )

      const combineRes2 = await Promise.all(
        res.map(
          async (a: z.infer<typeof accountTellerSchema>) =>
            await client.getTransactions({
              id: a.id,
            }),
        ),
      )
      const res2 = combineRes2.flat(1)
      yield res2.map((t: z.infer<typeof transactionItemSchema>) =>
        helpers._opData('transaction', t.id, t),
      )
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from([...ops, helpers._op('commit')])))
  },

  metaSync: ({config}) => {
    console.log('metaZSync teller', config)
    return rxjs
      .from(makeTellerClient(config).getInstitutions())
      .pipe(Rx.map((ins) => helpers._insOpData(ins.id as ExternalId, ins)))
  },
} satisfies IntegrationServer<typeof tellerSchemas>

export default tellerServer
