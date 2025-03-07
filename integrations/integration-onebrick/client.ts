import React from 'react'

import type {IntegrationClient} from '@usevenice/cdk-core'
import {Deferred} from '@usevenice/util'

import type {helpers, onebrickSchemas} from './def'

export const onebrickClientIntegration = {
  useConnectHook: (_) => {
    const [options, setOptions] = React.useState<
      (typeof helpers)['_types']['connectInput']
    >({publicToken: undefined, redirect_url: undefined})
    const [deferred] = React.useState(
      new Deferred<(typeof helpers)['_types']['connectOutput']>(),
    )
    React.useEffect(() => {
      if (options.publicToken && options.redirect_url) {
        window.open(
          `https://cdn.onebrick.io/sandbox-widget/?accessToken=${options.publicToken}&redirect_url=${options.redirect_url}/api/webhook/onebrick`,
          'popup',
        )
      }
    }, [options])
    return (opts) => {
      setOptions({
        publicToken: opts.publicToken,
        redirect_url: opts.redirect_url,
      })
      return deferred.promise
    }
  },
} satisfies IntegrationClient<typeof onebrickSchemas>

export default onebrickClientIntegration
