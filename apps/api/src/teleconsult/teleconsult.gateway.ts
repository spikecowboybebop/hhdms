import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/teleconsult',
  cors: { origin: '*' },
})
export class TeleconsultGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Map socketId -> sessionId for quick reverse lookup on disconnect.
  private socketSessions: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    console.log(`[TELECONSULT] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[TELECONSULT] Client disconnected: ${client.id}`);
    // Silently clean up without emitting peer-left. This prevents transient
    // disconnections (Strict Mode remount, brief network blips) from killing
    // the call for the other peer. Only explicit leave-room emits peer-left.
    const sessionId = this.socketSessions.get(client.id);
    if (sessionId) {
      client.leave(sessionId);
      this.socketSessions.delete(client.id);
    }
  }

  @SubscribeMessage('teleconsult:join-room')
  handleJoinRoom(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;

    if (!sessionId) {
      client.emit('teleconsult:room-error', { message: 'sessionId is required' });
      return;
    }

    client.join(sessionId);
    this.socketSessions.set(client.id, sessionId);

    // Count peers sharing this sessionId in socketSessions.
    let peerCount = 0;
    for (const [, sid] of this.socketSessions) {
      if (sid === sessionId) peerCount++;
    }
    console.log(`[TELECONSULT] ${client.id} joined room ${sessionId} (${peerCount} peers)`);

    client.emit('teleconsult:room-joined', {
      sessionId,
      peerCount,
    });

    if (peerCount === 2) {
      client.to(sessionId).emit('teleconsult:peer-joined', { peerCount });
    }
  }

  @SubscribeMessage('teleconsult:offer')
  handleOffer(
    @MessageBody() data: { sessionId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, sdp } = data;
    client.to(sessionId).emit('teleconsult:offer-received', { sdp });
    console.log(`[TELECONSULT] Offer relayed in room ${sessionId}`);
  }

  @SubscribeMessage('teleconsult:answer')
  handleAnswer(
    @MessageBody() data: { sessionId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, sdp } = data;
    client.to(sessionId).emit('teleconsult:answer-received', { sdp });
    console.log(`[TELECONSULT] Answer relayed in room ${sessionId}`);
  }

  @SubscribeMessage('teleconsult:ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { sessionId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, candidate } = data;
    client.to(sessionId).emit('teleconsult:ice-candidate-received', { candidate });
  }

  @SubscribeMessage('teleconsult:leave-room')
  handleLeaveRoom(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.leaveRoom(client);
  }

  private leaveRoom(client: Socket) {
    const sessionId = this.socketSessions.get(client.id);
    if (sessionId) {
      client.to(sessionId).emit('teleconsult:peer-left', {});
      client.leave(sessionId);
      this.socketSessions.delete(client.id);
      console.log(`[TELECONSULT] ${client.id} left room ${sessionId}`);
    }
  }
}
