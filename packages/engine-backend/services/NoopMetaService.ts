/* eslint-disable @typescript-eslint/require-await */
import type {MetaService, MetaTable} from './metaService'

const noopTable: MetaTable<string, never> = {
  get: async () => undefined,
  list: async () => [],
  set: async () => {},
  delete: async () => {},
}

// Consider adding a memory metaService as well
// much like used to have memoryKV store
export const noopMetaService: MetaService = {
  tables: {
    resource: noopTable,
    institution: noopTable,
    integration: noopTable,
    pipeline: noopTable,
  },
  searchEndUsers: async () => [],
  searchInstitutions: async () => [],
  findPipelines: async () => [],
  listIntegrationInfos: async () => [],
}
