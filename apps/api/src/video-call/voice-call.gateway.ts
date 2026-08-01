import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VideoCallService } from './video-call.service';

interface VoiceCallSession {
  id: string;
  patientId: string;
  patientEmail: string;
  patientName: string;
  channelName: string;
  patientSocketId?: string;
  agentSocketId?: string;
  status: 'ringing' | 'active' | 'ended';
}

@WebSocketGateway({
  cors: { origin: '*' },
  allowEIO3: true,
})
export class VoiceCallGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VoiceCallGateway.name);

  @WebSocketServer()
  server!: Server;

  private sessions = new Map<string, VoiceCallSession>();
  private socketToSession = new Map<string, string>();
  private connectedSockets = new Map<
    string,
    { role?: string; connectedAt: Date }
  >();

  constructor(private readonly videoCallService: VideoCallService) {}

  handleConnection(client: Socket) {
    this.connectedSockets.set(client.id, { connectedAt: new Date() });

    const role = client.handshake.query.role as string;
    if (role === 'agent') {
      void client.join('agents');
      const info = this.connectedSockets.get(client.id);
      if (info) info.role = 'agent';
      this.logger.log(
        `Call center agent connected: ${client.id} (total: ${this.connectedSockets.size})`,
      );
    } else {
      this.logger.log(
        `Voice call socket connected: ${client.id} (total: ${this.connectedSockets.size})`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedSockets.delete(client.id);
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.status !== 'ended') {
        const otherSocket =
          client.id === session.patientSocketId
            ? session.agentSocketId
            : session.patientSocketId;
        if (otherSocket) {
          this.server.to(otherSocket).emit('voice-call:end', {
            sessionId,
            reason: 'peer-disconnected',
          });
        }
        session.status = 'ended';
      }
      this.socketToSession.delete(client.id);
    }
  }

  @SubscribeMessage('voice-call:start')
  handleStart(
    @MessageBody()
    data: { patientId: string; patientEmail: string; patientName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channelName = `cc-${sessionId}`;

    const session: VoiceCallSession = {
      id: sessionId,
      patientId: data.patientId,
      patientEmail: data.patientEmail,
      patientName: data.patientName || 'Mobile User',
      channelName,
      patientSocketId: client.id,
      status: 'ringing',
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(client.id, sessionId);

    this.logger.log(
      `Voice call started: session=${sessionId} channel=${channelName} patientId=${data.patientId}`,
    );

    const ringingPayload = {
      sessionId,
      patientId: data.patientId,
      patientEmail: data.patientEmail,
      patientName: session.patientName,
      channelName,
    };

    const agentCount =
      this.server.sockets.adapter.rooms.get('agents')?.size ?? 0;
    if (agentCount > 0) {
      this.server.to('agents').emit('voice-call:ringing', ringingPayload);
    } else {
      this.server.emit('voice-call:ringing', ringingPayload);
    }
  }

  @SubscribeMessage('voice-call:accept')
  handleAccept(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session || session.status === 'ended') {
      this.logger.warn(
        `Voice call accept for unknown/ended session: ${data.sessionId}`,
      );
      return;
    }

    session.agentSocketId = client.id;
    session.status = 'active';
    this.socketToSession.set(client.id, data.sessionId);

    this.logger.log(`Voice call accepted: session=${data.sessionId}`);

    const agentToken = this.videoCallService.generateRtcToken(
      session.channelName,
      1,
    );
    const patientToken = this.videoCallService.generateRtcToken(
      session.channelName,
      2,
    );
    const appId = this.videoCallService.getAppId();

    if (session.patientSocketId) {
      this.server.to(session.patientSocketId).emit('voice-call:ready', {
        sessionId: data.sessionId,
        token: patientToken,
        appId,
        channelName: session.channelName,
        uid: 2,
      });
    }

    this.server.to(client.id).emit('voice-call:ready', {
      sessionId: data.sessionId,
      token: agentToken,
      appId,
      channelName: session.channelName,
      uid: 1,
    });
  }

  @SubscribeMessage('voice-call:decline')
  handleDecline(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    this.logger.log(`Voice call declined: session=${data.sessionId}`);

    if (session.patientSocketId) {
      this.server.to(session.patientSocketId).emit('voice-call:end', {
        sessionId: data.sessionId,
        reason: 'declined',
      });
    }

    session.status = 'ended';
    this.socketToSession.delete(client.id);
    this.sessions.delete(data.sessionId);
  }

  @SubscribeMessage('voice-call:end')
  handleEnd(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session || session.status === 'ended') return;

    const otherSocket =
      client.id === session.patientSocketId
        ? session.agentSocketId
        : session.patientSocketId;

    if (otherSocket) {
      this.server.to(otherSocket).emit('voice-call:end', {
        sessionId: data.sessionId,
      });
    }

    this.logger.log(`Voice call ended: session=${data.sessionId}`);

    session.status = 'ended';
    this.socketToSession.delete(client.id);
    if (otherSocket) this.socketToSession.delete(otherSocket);
    this.sessions.delete(data.sessionId);
  }
}
