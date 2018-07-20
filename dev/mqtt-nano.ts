import * as http from 'http'
import * as websocket from 'websocket-stream'
import * as ws from 'ws'
import * as Connection from 'mqtt-connection'

import { execIfScript } from './dev-utils'
import { Config } from './config'

export const serve = (c: Config) => {
  const { hostname, mqttPort: port } = c

  const WebSocketServer = ws.Server

  const server = http.createServer()
  const wss = new WebSocketServer({ server: server })

  let subs: { [K: string]: any } = {}

  wss.on('connection', function (ws: any) {
    const stream = websocket(ws)
    const connection = new Connection(stream)

    handle(connection)
  })

  function handle (conn: any) {
    conn.on('connect', function (packet: any) {
      // acknowledge the connect packet
      conn.connack({ returnCode: 0 })
    })

    // client published
    conn.on('publish', function (packet: any) {
      console.log('MSG', packet.topic, packet.payload.toString())
      const sub = subs[packet.topic]
      if (sub) {
        sub.write(packet)
        if (packet.qos > 0) {
          conn.puback({ messageId: packet.messageId })
        }
      }
    })

    // client pinged
    conn.on('pingreq', function () {
      // send a pingresp
      conn.pingresp()
    })

    // client subscribed
    conn.on('subscribe', function (packet: any) {
      packet.subscriptions.forEach((s: any) => subs[s.topic] = conn)

      if (packet.qos > 0) {
        conn.suback({ granted: [packet.qos], messageId: packet.messageId })
      }
    })

    // connection error handling
    conn.on('close', function () {
      conn.destroy()
      Object.keys(subs).forEach(s => {
        if (subs[s] === conn) delete (subs[s])
      })
    })
    conn.on('error', function (e: any) { console.error('\n\nMQTT-ERROR\n\n', e); conn.destroy() })
    conn.on('disconnect', function () { conn.destroy() })
  }

  server.listen(port, hostname, () => console.log(`MQTT listening on ws://${hostname}:${port}`))

  return () => {
    Object.keys(subs).forEach(s => subs[s].close())
    subs = {}
    server.close()
  }
}

execIfScript(serve, !module.parent)
