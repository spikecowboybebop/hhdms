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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  allowEIO3: true,
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CallGateway.name);

  @WebSocketServer()
  server!: Server;

  // Track active call pairings: socketId → paired socketId
  private activeCalls: Map<string, string> = new Map();
  // Track ringing (unanswered) calls so early disconnects dismiss agent popups
  private pendingCalls: Set<string> = new Set();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      void client.join(`user:${userId}`);
    }
    this.logger.log(`⚡ Device connected to root namespace: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Device disconnected: ${client.id}`);

    const pairedId = this.activeCalls.get(client.id);
    if (pairedId) {
      this.server
        .to(pairedId)
        .emit('call-ended', { reason: 'peer-disconnected' });
      this.activeCalls.delete(pairedId);
      this.activeCalls.delete(client.id);
    }

    if (this.pendingCalls.has(client.id)) {
      client.broadcast.emit('call-ended', { reason: 'patient-cancelled' });
      this.pendingCalls.delete(client.id);
    }
  }

  @SubscribeMessage('call-center-dial')
  handleIncomingCall(
    @MessageBody() data: { patientEmail: string; sdpOffer: any },
    @ConnectedSocket() client: Socket,
  ) {
    this.pendingCalls.add(client.id);
    this.server.emit('agent-incoming-call', {
      patientEmail: data.patientEmail,
      sdpOffer: data.sdpOffer,
      patientSocketId: client.id,
    });
  }

  @SubscribeMessage('agent-accept-call')
  handleAgentAcceptance(
    @MessageBody() data: { patientSocketId: string; sdpAnswer: any },
    @ConnectedSocket() client: Socket,
  ) {
    this.pendingCalls.delete(data.patientSocketId);
    this.activeCalls.set(data.patientSocketId, client.id);
    this.activeCalls.set(client.id, data.patientSocketId);
    this.server.to(data.patientSocketId).emit('call-routing-connected', {
      sdpAnswer: data.sdpAnswer,
      agentSocketId: client.id,
    });
  }

  @SubscribeMessage('relay-ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { targetSocketId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || !data.targetSocketId) {
      this.logger.warn(
        `⚠️ Warning: Received candidate from [${client.id}] but missing targetSocketId.`,
      );
      return;
    }
    this.server.to(data.targetSocketId).emit('remote-ice-candidate', {
      candidate: data.candidate,
      from: client.id,
    });
  }

  @SubscribeMessage('end-call')
  handleEndCall(
    @MessageBody() data: { targetSocketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const pairedId = data?.targetSocketId || this.activeCalls.get(client.id);
    if (pairedId) {
      this.server.to(pairedId).emit('call-ended', { reason: 'peer-hung-up' });
      this.activeCalls.delete(pairedId);
    } else {
      client.broadcast.emit('call-ended', { reason: 'patient-cancelled' });
    }
    this.pendingCalls.delete(client.id);
    this.activeCalls.delete(client.id);
  }
}
