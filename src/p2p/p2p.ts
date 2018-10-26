import * as mqtt from 'mqtt'
import { EventEmitter } from 'events'

import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable'

import * as T from './p2p-types'

// broken means irrecoverable error

const FIRST_RETRY_AFTER = 3 * 1000
const MAX_RETRY_INTERVAL = 5 * 60 * 1000
const NO_MESSAGES_ID = -1 as T.MessageId

const KEY_PREFIX = '___CHANNEL___'
const addressToChannelKey = (a: string) =>
  `${KEY_PREFIX}${a}`
const isChannelKey = (s: string) => s.startsWith(KEY_PREFIX)
const addressFromChannelKey = (s: string) =>
  s.replace(KEY_PREFIX, '')

const topicPaths = {
  messages: (a: string) => `/messages/${a}`,
  ack: (a: string) => `/ack/${a}`
}

const emptyChannel = () => ({
  isBroken: false,
  lastIn: 0 as T.MessageId,
  outbox: []
} as T.Channel)

export class P2P implements T.P2P {
  status: T.Status = 'connecting'

  private _sendingQueues: {
    [key: string]: Subject<T.Channel>
  } = {}
  private _sendingSubs: {
    [key: string]: { unsubscribe: () => void }
  } = {}
  private _address: string
  private _em = new EventEmitter()
  private _storage: T.Storage
  private _channels!: Promise<{ [key: string]: T.Channel }>

  private _client: Promise<mqtt.MqttClient>

  constructor (cfg: T.P2PConfig) {
    this._address = cfg.address
    this._storage = cfg.storage

    this._setStatus('initializing')
    this._client = this.loadState()
      .then((chs) => {
        this._setStatus('connecting')
        const msgTopic = topicPaths.messages(this._address)
        const ackTopic = topicPaths.ack(this._address)
        const c = mqtt.connect(cfg.mqttUrl)

        c.on('connect', () => {
          c.subscribe([msgTopic, ackTopic], (err) => {
            if (err) {
              this._dispose('broken')
            } else {
              // sync up state continue sending operations
              this._setStatus('connected')
              Object.keys(chs).forEach(k => {
                this._setupSendingQueue(k as string)
                this._sendingQueues[k].next(chs[k])
                this._sendAck(k as string,
                  chs[k].lastIn || NO_MESSAGES_ID)
              })
            }
          })
          c.on('message', (t, msg) => {
            const m = JSON.parse(msg.toString())
            if (t === msgTopic) return this._handleMessageReceived(m)
            if (t === ackTopic) return this._handleAck(m)
          })
        })
        c.on('error', () => this._dispose('broken'))

        return c
      })

  }

  dispose () {
    return this._dispose('disposed')
  }

  loadState = () => {
    this._channels = this._storage.getAllKeys()
      .then(ks => this._storage.multiGet(ks))
      .then(ms => ms
        .filter(([k]) => isChannelKey(k))
        .reduce((acc, [k, v]) => {
          acc[k] = JSON.parse(v)
          return acc
        }, {} as { [key: string]: T.Channel }))
    return this._channels
  }

  send (to: string, payload: T.Payload) {
    if (!to || !payload /* || to === this._address */) {
      console.log(to, this._address, payload)
      return Promise.reject('WRONG_PARAMS')
    }

    return this._getChannel(to)
      .then(ch => {
        const id = ch.outbox.length + 1 as T.MessageId

        const msgOut: T.InternalMessageOut = [id, payload, false as T.Ack]
        ch.outbox.push(msgOut)

        return this._saveChannel(to, ch)
          .then(() => this._sendingQueues[to].next(ch))
          .then(() => true)
      })
  }

  on (event: T.CommEventType, listener: (...args: any[]) => void) {
    this._em.on(event, listener)
  }

  off (event: T.CommEventType, listener: (...args: any[]) => void) {
    this._em.removeListener(event, listener)
  }

  private _setupSendingQueue = (address: string) => {
    this._sendingQueues[address] = new Subject<T.Channel>()
    this._sendingSubs[address] = this._sendingQueues[address]
      .switchMap(ch => {
        const m = ch.outbox.find(m => !m[2])
        // console.log('SENDING QUEUE next msg', address, m)
        if (!m) return Observable.empty()
        return this._keepSending(address, m)
      })
      .subscribe()
  }
  private _keepSending = (to: string, msg: T.InternalMessageOut, nextRetry = FIRST_RETRY_AFTER) => {
    this._client.then(c => c.publish(
      topicPaths.messages(to),
      JSON.stringify({
        id: msg[0],
        peer: this._address,
        payload: msg[1]
      } as T.ReceivedMessage)
    ))
    return Observable.timer(nextRetry)
      .switchMap(() =>
        this._keepSending(to, msg,
          Math.min(2 * nextRetry, MAX_RETRY_INTERVAL)))
  }

  private _getChannel = (address: string) => this._channels
    .then(cs => {
      if (!cs[address]) {
        const ch = emptyChannel()
        this._setupSendingQueue(address)
        cs[address] = ch
        return this._saveChannel(address, ch)
          .then(() => ch)
      }
      return cs[address]
    })

  private _saveChannel = (address: string, channel: T.Channel) =>
    this._storage.setItem(addressToChannelKey(address), JSON.stringify(channel))

  private _handleMessageReceived = (m: T.ReceivedMessage) => {
    // console.log('[RECEIVED-MESSAGE]', m)
    return this._getChannel(m.peer)
      .then(ch => {
        // console.log('MESSAGE', ch)
        if (ch.lastIn === m.id) {
          this._sendAck(m.peer, m.id)
        } else if (ch.lastIn === m.id - 1) {
          ch.lastIn = m.id
          this._saveChannel(m.peer, ch)
            .then(() => {
              this._sendAck(m.peer, m.id)
              try {
                this._emit('message-received', m.payload)
              } catch (err) {
                this._emit('callback-error', err)
                /*
                  FIXME - error in registered callback should be treated as a critical error
                  but engine currently throws an application level error
                */
                // ch.isBroken = true
                // ch.brokenInfo = {
                //   reason: 'Callback error',
                //   error: (err && err.toJSON && err.toJSON()) || {
                //     message: err && err.message,
                //     stack: err && err.stack
                //   }
                // }
                // this._saveChannel(m.peer, ch)
              }
            })
        } else {
          this._brokenChannel(m.peer, ch, 'OUT_OF_ORDER', m)
        }
      })
  }

  private _handleAck = (m: T.ReceivedMessage) => {
    // console.log('[ACK-RECEIVED]', m)
    const { peer, id } = m
    this._getChannel(peer)
      .then(ch => {
        const msg = ch.outbox.find(_m => _m[0] === id)
        if (!msg && id !== NO_MESSAGES_ID) {
          this._brokenChannel(peer, ch, 'ID_NOT_FOUND', m)
        } else {
          // todo add some checks if correct message
          if (msg) msg[2] = true as T.Ack
          this._saveChannel(peer, ch)
            .then(() => this._sendingQueues[peer]
              .next(ch))
        }
      })
  }
  private _sendAck = (peer: string, id: T.MessageId) => {
    this._client.then(c => c.publish(
      topicPaths.ack(peer),
      JSON.stringify({
        id,
        peer: this._address
      })
    ))
  }

  private _brokenChannel = (peer: string, ch: T.Channel, reason: string, info?: any) => {
    ch.isBroken = true
    ch.brokenInfo = {
      reason: reason,
      message: info
    }
    this._saveChannel(peer, ch)
  }

  private _dispose (s: T.Status) {
    this._setStatus(s)
    this._em.removeAllListeners()
    Object.keys(this._sendingSubs)
      .forEach(k => this._sendingSubs[k].unsubscribe())
    return this._client.then(c =>
      new Promise<null>((resolve) => {
        c.end(false, () => {
          resolve(null)
        })
      })
    )
  }

  private _emit = (e: T.CommEventType, p: any) => {
    this._em.emit(e, p)
  }

  private _setStatus = (s: T.Status) => {
    this.status = s
    this._emit('status-changed', s)
  }
}
