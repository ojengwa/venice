/**
 * We have to generate the integration list into actual files because webpack / next.js is extremely not performant
 * when importing modules with dynamic paths at runtime
 */

import * as fs from 'node:fs'
import {join as pathJoin} from 'node:path'

import prettier from 'prettier'

import type {IntegrationDef} from '@usevenice/cdk-core'
import {camelCase} from '@usevenice/util/string-utils'

import prettierConfig from '../../prettier.config'

function writePretty(filename: string, content: string, pretty = true) {
  fs.mkdirSync(pathJoin(__dirname, 'integrations'), {recursive: true})
  fs.writeFileSync(
    pathJoin(__dirname, 'integrations', filename),
    !pretty
      ? content
      : prettier.format(
          `
    // generated by _generateIntegrationLists.ts. Do not modify by hand
    ${content}`,
          {...prettierConfig, parser: 'typescript'},
        ),
  )
}

const integrationList = fs
  .readdirSync(pathJoin(__dirname, '../../integrations'), {
    withFileTypes: true,
  })
  .filter((r) => r.isDirectory())
  .map((r) => {
    const path = pathJoin(__dirname, '../../integrations', r.name)
    const def = fs.existsSync(pathJoin(path, 'def.ts'))
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (require(`@usevenice/${r.name}/def`).default as IntegrationDef)
      : undefined

    return {
      name: def?.name,
      dirName: r.name,
      varName: camelCase(r.name),
      imports: {
        def: fs.existsSync(pathJoin(path, 'def.ts'))
          ? `@usevenice/${r.name}/def`
          : undefined,
        client: fs.existsSync(pathJoin(path, 'client.ts'))
          ? `@usevenice/${r.name}/client`
          : undefined,
        server: fs.existsSync(pathJoin(path, 'server.ts'))
          ? `@usevenice/${r.name}/server`
          : undefined,
      },
    }
  })

writePretty(
  'meta.js',
  `
  module.exports = ${JSON.stringify(integrationList)}
  `,
)

const entries = ['def', 'client', 'server'] as const

for (const entry of entries) {
  const list = integrationList.filter((int) => !!int.imports[entry])
  writePretty(
    `integrations.${entry}.ts`,
    `${list
      .map(
        (int) =>
          `import {default as ${int.varName}} from '${int.imports[entry]}'`,
      )
      .join('\n')}
    export const ${entry}Integrations = {${list
      .map(({name, varName}) => `${name}: ${varName},`)
      .join('\n')}}
  `,
  )
}
const mergedlist = integrationList.filter((int) =>
  Object.values(int.imports).some((v) => !!v),
)

writePretty(
  'integrations.merged.ts',
  `${mergedlist
    .flatMap((int) => {
      const validImports = Object.fromEntries(
        Object.entries(int.imports).filter(([, v]) => !!v),
      )
      return [
        Object.entries(validImports)
          .map(
            ([k, v]) => `import {default as ${int.varName}_${k}} from '${v}'`,
          )
          .join('\n'),
        `const ${int.varName} = {
            ${Object.keys(validImports)
              .map((k) => `...${int.varName}_${k}`)
              .join(',')}
        }`,
      ]
    })
    .join('\n')}


  export const mergedIntegrations = {${mergedlist
    .map(({name, varName}) => `${name}: ${varName},`)
    .join('\n')}}
`,
)
