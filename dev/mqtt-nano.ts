import * as http from 'http'
import * as websocket from 'websocket-stream'
import * as ws from 'ws'
import * as Connection from 'mqtt-connection'

export const serve = (port = 1884, hostname = 'localhost') => {
  const WebSocketServer = (ws as any).Server

  const server = http.createServer()
  const wss = new WebSocketServer({ server: server })

  let subs = {}

  wss.on('connection', function (ws) {
    const stream = websocket(ws)
    const connection = new Connection(stream)

    handle(connection)
  })

  function handle (conn) {
    conn.on('connect', function (packet) {
      // acknowledge the connect packet
      conn.connack({ returnCode: 0 })
    })

    // client published
    conn.on('publish', function (packet) {
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
    conn.on('subscribe', function (packet) {
      packet.subscriptions.forEach(s => subs[s.topic] = conn)

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
    conn.on('error', function (e) { console.error('\n\nMQTT-ERROR\n\n', e); conn.destroy() })
    conn.on('disconnect', function () { conn.destroy() })
  }

  server.listen(port, hostname, () => console.log(`MQTT listening on ws://${hostname}:${port}`))

  return () => {
    Object.keys(subs).forEach(s => subs[s].close())
    subs = {}
    server.close()
  }
}

if (!module.parent) {
  const port = parseInt(process.argv[2] || '1884', 10)
  const hostname = process.argv[3]
  const dispose = serve(port, hostname)

  process.on('SIGINT', () => {
    dispose()
    process.exit()
  })
}
