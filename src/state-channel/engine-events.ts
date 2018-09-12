import { AsEventEmitterSpec } from '../utils'

export type ErrorType = 'to' | 'be' | 'discussed' | 'unknown-error'

export type EngineEventsSpec = AsEventEmitterSpec<{
  error: {
    type: ErrorType
    error?: Error
  }
}>
