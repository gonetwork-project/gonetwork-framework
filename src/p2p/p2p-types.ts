import { Storage } from '../types'

export {
  Storage
}
// broken means irrecoverable error
export type Status = 'initializing' // loading persistent state
  | 'connecting' | 'connected' | 'broken' | 'disposed'

export type CommEventType = 'status-changed' | 'message-received' | 'message-sent' | 'callback-error'

export type MessageId = number & { __MSG_ID__: true }
export type Payload = string // & { __PAYLOAD__: true }
export type Ack = boolean & { __ACK__: true }

export type InternalMessageOut = [MessageId, Payload, Ack]

export type ReceivedMessage = {
  peer: string
  id: MessageId
  payload: Payload
}

export type Channel = {
  outbox: InternalMessageOut[]
  lastIn: MessageId
  isBroken?: boolean
  brokenInfo?: any
}

// subset of react native AsyncStorage
export interface P2PConfig {
  address: string
  mqttUrl: string
  storage: Storage
}

export interface P2P {
  status: Status

  // restrict to only known events
  on: (e: CommEventType, listener: (m: Payload) => void) => void
  off: (e: CommEventType, listener: (m: Payload) => void) => void

  // true indicates that massage has been persisted
  // false indicates that the message will not be sent (e.g. when status: broken)
  send: (to: string, payload: Payload) => Promise<boolean>

  // cancels everything
  dispose: () => Promise<Error | null>
}
