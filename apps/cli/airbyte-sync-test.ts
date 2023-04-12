import '@usevenice/app-config/register.node'

import {fsProvider} from '@usevenice/app-config/env'
import {sync} from '@usevenice/cdk-core'

import {Rx, rxjs, safeJSONParse} from '@usevenice/util'
import readline from 'node:readline'
import {mergeImpl} from '@usevenice/integration-merge'
import {postgresProvider} from '@usevenice/integration-postgres'

const srcPath = './apps/tests/__encrypted__/meta'
const destPath = './temp'

// Output sync messages to standard out

// TODO: Take inspiration from airbyte-plaid-connector and make the integration
// we are working with configurable via command line args

switch (process.argv[2]) {
  case 'source-postgres': {
    sync({
      source: postgresProvider.sourceSync({
        id: 'reso_postgres_c89f8b55-2b52-4f33-9327-1ae712cd20f2',
        settings: {
          databaseUrl: process.env['POSTGRES_OR_WEBHOOK_URL'] ?? '',
        },
      }),
      destination: (obs) =>
        obs.pipe(
          Rx.tap((msg) => {
            console.error(JSON.stringify(msg))
          }),
        ),
    }).catch(console.error)
    break
  }
  case 'source-merge': {
    console.log('source mode')
    sync({
      source: mergeImpl.sourceSync({
        id: 'reso_1',
        settings: {
          accountToken: process.env['MERGE_TEST_LINKED_ACCOUNT_TOKEN'] ?? '',
        },
        config: {apiKey: process.env['MERGE_TEST_API_KEY'] ?? ''},
        state: {},
      }),
      destination: (obs) =>
        obs.pipe(
          Rx.tap((msg) => {
            console.error(JSON.stringify(msg))
          }),
        ),
    }).catch(console.error)

    break
  }
  case 'destination': {
    console.log('destination mode')
    sync({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      source: new rxjs.Observable<any>((obs) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false,
        })

        rl.on('line', (line) => {
          // console.log(line)
          const data = safeJSONParse(line)
          if (data) {
            obs.next(data)
          }
        })

        rl.once('close', () => {
          // end of input
          // console.log('end')
          obs.complete()
        })
      }),
      destination: fsProvider.destinationSync({
        id: 'reso_1',
        settings: {basePath: destPath},
      }),
    }).catch(console.error)

    break
  }
  case 'direct': {
    console.log('direct mode')
    sync({
      source: fsProvider.sourceSync({
        id: 'reso_1',
        settings: {basePath: srcPath},
        state: {},
      }),
      destination: fsProvider.destinationSync({
        id: 'reso_1',
        settings: {basePath: destPath},
      }),
    }).catch(console.error)
  }
}
