import {zKVStore} from '@usevenice/engine-backend'
import {_pathFromId} from '@usevenice/integration-fs'
import {
  $path,
  joinPath,
  R,
  readDir,
  safeReadJson,
  writeJson,
  z,
  zFunction,
} from '@usevenice/util'

export const _idFromPath = (path: string) =>
  $path()
    .basename(path)
    .replace(/\.json$/i, '')

export const makeFsKVStore = zFunction(
  z.object({basePath: z.string()}),
  zKVStore,
  ({basePath}) => ({
    get: (id) =>
      safeReadJson(_pathFromId(basePath, id)) as unknown as Record<
        string,
        unknown
      >,
    list: async () => {
      const filenames = await readDir(basePath)
      const results = await Promise.all(
        filenames.map(async (filename) => {
          const data = await safeReadJson(joinPath(basePath, filename))
          return [
            _idFromPath(filename),
            data as Record<string, unknown>,
          ] as const
        }),
      )
      return R.compact(results)
    },
    set: (id, data) => writeJson(_pathFromId(basePath, id), data),
  }),
)
