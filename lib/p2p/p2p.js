"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt = require("mqtt");
const events_1 = require("events");
const Subject_1 = require("rxjs/Subject");
const Observable_1 = require("rxjs/Observable");
const FIRST_RETRY_AFTER = 3 * 1000;
const MAX_RETRY_INTERVAL = 5 * 60 * 1000;
const NO_MESSAGES_ID = -1;
const KEY_PREFIX = '___CHANNEL___';
const addressToChannelKey = (a) => `${KEY_PREFIX}${a}`;
const isChannelKey = (s) => s.startsWith(KEY_PREFIX);
const addressFromChannelKey = (s) => s.replace(KEY_PREFIX, '');
const topicPaths = {
    messages: (a) => `/messages/${a}`,
    ack: (a) => `/ack/${a}`
};
const emptyChannel = () => ({
    isBroken: false,
    lastIn: 0,
    outbox: []
});
class P2P {
    constructor(cfg) {
        this.status = 'connecting';
        this._sendingQueues = {};
        this._sendingSubs = {};
        this._em = new events_1.EventEmitter();
        this.loadState = () => {
            this._channels = this._storage.getAllKeys()
                .then(ks => this._storage.multiGet(ks))
                .then(ms => ms
                .filter(([k]) => isChannelKey(k))
                .reduce((acc, [k, v]) => {
                acc[k] = JSON.parse(v);
                return acc;
            }, {}));
            return this._channels;
        };
        this._setupSendingQueue = (address) => {
            this._sendingQueues[address] = new Subject_1.Subject();
            this._sendingSubs[address] = this._sendingQueues[address]
                .switchMap(ch => {
                const m = ch.outbox.find(m => !m[2]);
                console.log('SENDING QUEUE next msg', address, m);
                if (!m)
                    return Observable_1.Observable.empty();
                return this._keepSending(address, m);
            })
                .subscribe();
        };
        this._keepSending = (to, msg, nextRetry = FIRST_RETRY_AFTER) => {
            this._client.then(c => c.publish(topicPaths.messages(to), JSON.stringify({
                id: msg[0],
                peer: this._address,
                payload: msg[1]
            })));
            return Observable_1.Observable.timer(nextRetry)
                .switchMap(() => this._keepSending(to, msg, Math.min(2 * nextRetry, MAX_RETRY_INTERVAL)));
        };
        this._getChannel = (address) => this._channels
            .then(cs => {
            if (!cs[address]) {
                const ch = emptyChannel();
                this._setupSendingQueue(address);
                cs[address] = ch;
                return this._saveChannel(address, ch)
                    .then(() => ch);
            }
            return cs[address];
        });
        this._saveChannel = (address, channel) => this._storage.setItem(addressToChannelKey(address), JSON.stringify(channel));
        this._handleMessageReceived = (m) => {
            console.log('[RECEIVED-MESSAGE]', m);
            return this._getChannel(m.peer)
                .then(ch => {
                console.log('CHan4', ch);
                if (ch.lastIn === m.id) {
                    this._sendAck(m.peer, m.id);
                }
                else if (ch.lastIn === m.id - 1) {
                    ch.lastIn = m.id;
                    this._saveChannel(m.peer, ch)
                        .then(() => {
                        this._sendAck(m.peer, m.id);
                        try {
                            this._emit('message-received', m);
                        }
                        catch (err) {
                            ch.isBroken = true;
                            ch.brokenInfo = {
                                reason: 'Callback error',
                                error: (err && err.toJSON && err.toJSON()) || {
                                    message: err && err.message,
                                    stack: err && err.stack
                                }
                            };
                            this._saveChannel(m.peer, ch);
                        }
                    });
                }
                else {
                    this._brokenChannel(m.peer, ch, 'OUT_OF_ORDER', m);
                }
            });
        };
        this._handleAck = (m) => {
            console.log('[ACK-RECEIVED]', m);
            const { peer, id } = m;
            this._getChannel(peer)
                .then(ch => {
                const msg = ch.outbox.find(_m => _m[0] === id);
                if (!msg && id !== NO_MESSAGES_ID) {
                    this._brokenChannel(peer, ch, 'ID_NOT_FOUND', m);
                }
                else {
                    // todo add some checks if correct message
                    if (msg)
                        msg[2] = true;
                    this._saveChannel(peer, ch)
                        .then(() => this._sendingQueues[peer]
                        .next(ch));
                }
            });
        };
        this._sendAck = (peer, id) => {
            this._client.then(c => c.publish(topicPaths.ack(peer), JSON.stringify({
                id,
                peer: this._address
            })));
        };
        this._brokenChannel = (peer, ch, reason, info) => {
            ch.isBroken = true;
            ch.brokenInfo = {
                reason: reason,
                message: info
            };
            this._saveChannel(peer, ch);
        };
        this._emit = (e, p) => {
            this._em.emit(e, p);
        };
        this._setStatus = (s) => {
            this.status = s;
            this._emit('status-changed', s);
        };
        this._address = cfg.address;
        this._storage = cfg.storage;
        this._setStatus('initializing');
        this._client = this.loadState()
            .then((chs) => {
            this._setStatus('connecting');
            const msgTopic = topicPaths.messages(this._address);
            const ackTopic = topicPaths.ack(this._address);
            const c = mqtt.connect(cfg.mqttUrl);
            c.on('connect', () => {
                c.subscribe([msgTopic, ackTopic], (err) => {
                    if (err) {
                        this._dispose('broken');
                    }
                    else {
                        // sync up state continue sending operations
                        this._setStatus('connected');
                        Object.keys(chs).forEach(k => {
                            this._setupSendingQueue(k);
                            this._sendingQueues[k].next(chs[k]);
                            this._sendAck(k, chs[k].lastIn || NO_MESSAGES_ID);
                        });
                    }
                });
                c.on('message', (t, msg) => {
                    const m = JSON.parse(msg.toString());
                    if (t === msgTopic)
                        return this._handleMessageReceived(m);
                    if (t === ackTopic)
                        return this._handleAck(m);
                });
            });
            c.on('error', () => this._dispose('broken'));
            return c;
        });
    }
    dispose() {
        return this._dispose('disposed');
    }
    send(to, payload) {
        if (!to || !payload || to === this._address) {
            return Promise.reject('WRONG_PARAMS');
        }
        return this._getChannel(to)
            .then(ch => {
            const id = ch.outbox.length + 1;
            const msgOut = [id, payload, false];
            ch.outbox.push(msgOut);
            return this._saveChannel(to, ch)
                .then(() => this._sendingQueues[to].next(ch))
                .then(() => true);
        });
    }
    on(event, listener) {
        this._em.on(event, listener);
    }
    off(event, listener) {
        this._em.removeListener(event, listener);
    }
    _dispose(s) {
        this._setStatus(s);
        this._em.removeAllListeners();
        Object.keys(this._sendingSubs)
            .forEach(k => this._sendingSubs[k].unsubscribe());
        return this._client.then(c => new Promise((resolve) => {
            c.end(false, () => {
                resolve(null);
            });
        }));
    }
}
exports.P2P = P2P;
//# sourceMappingURL=p2p.js.map