import { DurableObject } from 'cloudflare:workers'
import { MAX_LIGHTS, MIN_GAP_MS, cityLabel, parseMove, type Move } from './space'

// What the room remembers about each connection. It rides on the socket itself, so it survives
// the room hibernating while nobody is sending anything.
type Light = { id: string; city: string; last: number; state: Move | null }

// The one shared space. Uses hibernatable WebSockets: an idle room costs nothing, and pings are
// answered by Cloudflare without waking it.
export class Space extends DurableObject<object> {
  constructor(ctx: DurableObjectState, env: object) {
    super(ctx, env)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(req: Request): Promise<Response> {
    if (this.ctx.getWebSockets().length >= MAX_LIGHTS) return new Response('Space is full', { status: 503 })
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    const me: Light = { id: crypto.randomUUID().slice(0, 8), city: cityLabel(req.headers.get('x-city')), last: 0, state: null }
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment(me)
    // Who's already here, so a new light sees everyone at once.
    const lights = this.lights(server).flatMap(l => (l.state ? [{ id: l.id, c: l.city, ...l.state }] : []))
    server.send(JSON.stringify({ t: 'hi', you: me.id, lights }))
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
    const me = ws.deserializeAttachment() as Light | null
    if (!me) return
    const now = Date.now()
    if (now - me.last < MIN_GAP_MS) return
    const move = parseMove(msg)
    if (!move) return
    me.last = now
    me.state = move
    ws.serializeAttachment(me)
    this.broadcast(ws, JSON.stringify({ t: 'm', id: me.id, c: me.city, ...move }))
  }

  async webSocketClose(ws: WebSocket) {
    this.leave(ws)
  }

  async webSocketError(ws: WebSocket) {
    this.leave(ws)
  }

  private leave(ws: WebSocket) {
    const me = ws.deserializeAttachment() as Light | null
    try {
      ws.close(1000, 'bye')
    } catch {
      // already closed
    }
    if (me) this.broadcast(ws, JSON.stringify({ t: 'bye', id: me.id }))
  }

  private lights(except: WebSocket): Light[] {
    return this.ctx.getWebSockets().filter(w => w !== except).map(w => w.deserializeAttachment() as Light | null).filter((l): l is Light => !!l)
  }

  private broadcast(from: WebSocket, text: string) {
    for (const w of this.ctx.getWebSockets()) {
      if (w === from) continue
      try {
        w.send(text)
      } catch {
        // that one is going away; its close handler says bye
      }
    }
  }
}
