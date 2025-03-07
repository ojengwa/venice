import onebrickClientIntegration from './client'
import oneBrickDef from './def'
import onebrickServerIntegration from './server'

export const oneBrickProvider = {
  ...oneBrickDef,
  ...onebrickClientIntegration,
  ...onebrickServerIntegration,
}

// codegen:start {preset: barrel, include: "./{*.{ts,tsx},*/index.{ts,tsx}}", exclude: "./**/*.{d,spec,test,fixture,gen,node}.{ts,tsx}"}
export * from './client'
export * from './def'
export * from './onebrick-utils'
export * from './OneBrickClient'
export * from './server'
// codegen:end
