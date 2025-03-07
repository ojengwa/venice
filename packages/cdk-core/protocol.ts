import type {
  Json,
  NoInfer,
  NonDiscriminatedUnion,
  ObjectPartialDeep,
  rxjs,
} from '@usevenice/util'

import type {ExternalId, Id} from './id.types'

/**
 * This will be standardized over time into either
 * [Airbyte protocol](https://docs.airbyte.com/understanding-airbyte/airbyte-protocol/)
 * or the [Singer spec](https://hub.meltano.com/singer/spec) [Orig spec](https://github.com/singer-io/getting-started/blob/master/docs/SPEC.md#singer-specification)
 *
 */

/**
 * TODO: We should add a `change` type here, as `null` could also be a valid value
 * Actually, in the simplest form we should just have a [id, data] without even
 * any entity name. This can get transformed to [id, entityName, changeType, entity] as needed.
 */
export interface AnyEntityPayload {
  // typename: string
  entityName: string
  entity: Json | object
  id: string // ExternalId
}

export interface ResoUpdateData<
  TSettings = {},
  TInsData = {},
  TVariant extends 'partial' | 'complete' = 'partial',
> {
  id: Id['reso']
  // TODO: remove `?` when Variant = 'complete'
  settings?: TVariant extends 'partial'
    ? ObjectPartialDeep<NoInfer<TSettings>> | undefined
    : TSettings
  institution?: {
    externalId: ExternalId
    data: TInsData
  }
}
export interface StateUpdateData<TSrcOptions = {}, TDestOptions = {}> {
  sourceState?: ObjectPartialDeep<NoInfer<TSrcOptions>>
  destinationState?: ObjectPartialDeep<NoInfer<TDestOptions>>
}

type NullableEntity<T> = T extends AnyEntityPayload
  ? {[k in keyof T]: k extends 'entity' ? T[k] | null : T[k]}
  : T

export type SyncOperation<
  TData extends AnyEntityPayload = AnyEntityPayload,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
> =
  | (TResoUpdate & {type: 'resoUpdate'})
  // TODO: We should separate state from options, and perhaps make state
  // less black box also, see airbyte protocol v2 for inspiration
  // Also consider merging fields below into a single field
  | (TStateUpdate & {type: 'stateUpdate'; subtype?: 'init' | 'complete'})
  | {type: 'data'; data: NullableEntity<TData>} // Rename entityName to `stream` and lift to top level?
  | {type: 'commit'} // Should this be a separate type of StateUpdate
  | {type: 'ready'} // Should this be a separate type of StateUpdate

export type AnySyncOperation = NonDiscriminatedUnion<SyncOperation>

export type Source<
  T extends AnyEntityPayload,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
> = rxjs.Observable<SyncOperation<T, TResoUpdate, TStateUpdate>>

/**
 * Adapted from TRPC link and Apollo Link
 * A specialized version of rxjs.OperatorFucntion. Often times stateful.
 */
export type Link<
  TDataIn extends AnyEntityPayload = AnyEntityPayload,
  TDataOut extends AnyEntityPayload = TDataIn,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
> = (
  obs: rxjs.Observable<SyncOperation<TDataIn, TResoUpdate, TStateUpdate>>,
) => rxjs.Observable<SyncOperation<TDataOut, TResoUpdate, TStateUpdate>>

export type LinkFactory<
  TDataIn extends AnyEntityPayload = AnyEntityPayload,
  TDataOut extends AnyEntityPayload = TDataIn,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TArg = any,
> = (arg: TArg) => Link<TDataIn, TDataOut, TResoUpdate, TStateUpdate>

/**
 * Terminating link is just a link... It can still emit things like ready event
 * for the engine to listen to. The resulting event may not be the same as the input events
 */
export type Destination<
  T extends AnyEntityPayload = AnyEntityPayload,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
> = Link<T, AnyEntityPayload, TResoUpdate, TStateUpdate>
