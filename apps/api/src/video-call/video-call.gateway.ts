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

interface VideoCallSession {
  id: string;
  referralId: string;
  patientId: string;
  specialistName: string;
  channelName: string;
  patientSocketId?: string;
  specialistSocketId?: string;
  status: 'ringing' | 'active' | 'ended';
}

@WebSocketGateway({
  cors: { origin: '*' },
  allowEIO3: true,
})
export class VideoCallGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VideoCallGateway.name);

  @WebSocketServer()
  server!: Server;

  private sessions = new Map<string, VideoCallSession>();
  private socketToSession = new Map<string, string>();
  private connectedSockets = new Map<
    string,
    { patientId?: string; connectedAt: Date }
  >();

  constructor(private readonly videoCallService: VideoCallService) {}

  handleConnection(client: Socket) {
    this.logger.log(
      `Video call socket connected: ${client.id} (total connected: ${this.connectedSockets.size + 1})`,
    );
    this.connectedSockets.set(client.id, { connectedAt: new Date() });

    const patientId = client.handshake.query.patientId as string;
    if (patientId) {
      void client.join(`patient:${patientId}`);
      this.connectedSockets.get(client.id)!.patientId = patientId;
      this.logger.log(
        `Socket ${client.id} auto-joined room patient:${patientId}`,
      );
    }

    // Log all connected sockets for debugging
    this.logger.log(
      `All connected video-call sockets: ${Array.from(this.connectedSockets.keys()).join(', ')}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Video call socket disconnected: ${client.id}`);
    this.connectedSockets.delete(client.id);
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.status !== 'ended') {
        const otherSocket =
          client.id === session.patientSocketId
            ? session.specialistSocketId
            : session.patientSocketId;
        if (otherSocket) {
          this.server.to(otherSocket).emit('video-call:end', { sessionId });
        }
        session.status = 'ended';
      }
      this.socketToSession.delete(client.id);
    }
  }

  @SubscribeMessage('register:patient')
  handleRegisterPatient(
    @MessageBody() data: { patientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Socket ${client.id} registering as patient ${data.patientId}`,
    );
    void client.join(`patient:${data.patientId}`);
    const info = this.connectedSockets.get(client.id);
    if (info) info.patientId = data.patientId;
    this.logger.log(
      `Socket ${client.id} joined room patient:${data.patientId}. All rooms: ${Array.from(this.server.sockets.adapter.rooms.keys()).join(', ')}`,
    );
  }

  @SubscribeMessage('video-call:start')
  handleStart(
    @MessageBody()
    data: {
      referralId: string;
      patientId: string;
      specialistName: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = `vc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channelName = `vc-${data.referralId}`;

    const session: VideoCallSession = {
      id: sessionId,
      referralId: data.referralId,
      patientId: data.patientId,
      specialistName: data.specialistName,
      channelName,
      specialistSocketId: client.id,
      status: 'ringing',
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(client.id, sessionId);

    this.logger.log(
      `Video call started: session=${sessionId} channel=${channelName} patientId=${data.patientId}`,
    );

    const ringingPayload = {
      sessionId,
      specialistName: data.specialistName,
      channelName,
      referralId: data.referralId,
    };

    // Route the ring only to sockets that have registered as this patient.
    const patientRoom = `patient:${data.patientId}`;
    const roomSockets = this.server.sockets.adapter.rooms.get(patientRoom);
    const registeredPatientSockets: string[] = [];

    if (roomSockets) {
      roomSockets.forEach((socketId) =>
        registeredPatientSockets.push(socketId),
      );
    }

    // Fallback: any socket that connected with this patientId in the query param.
    for (const [socketId, info] of this.connectedSockets.entries()) {
      if (
        info.patientId === data.patientId &&
        !registeredPatientSockets.includes(socketId)
      ) {
        registeredPatientSockets.push(socketId);
      }
    }

    this.logger.log(
      `Emitting video-call:ringing to ${registeredPatientSockets.length} socket(s) for patient ${data.patientId}`,
    );

    for (const socketId of registeredPatientSockets) {
      this.server.to(socketId).emit('video-call:ringing', ringingPayload);
    }

    if (registeredPatientSockets.length === 0) {
      this.logger.warn(
        `No online socket registered for patient ${data.patientId} — ringing will not be delivered.`,
      );
    }
  }

  @SubscribeMessage('video-call:accept')
  handleAccept(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session || session.status === 'ended') {
      this.logger.warn(`Accept for unknown/ended session: ${data.sessionId}`);
      return;
    }

    // Only the patient the call is intended for may accept it. Verify the
    // accepting socket has registered under the session's patientId.
    const socketInfo = this.connectedSockets.get(client.id);
    const isRegisteredPatient =
      socketInfo?.patientId === session.patientId ||
      client.rooms.has(`patient:${session.patientId}`);

    if (!isRegisteredPatient) {
      this.logger.warn(
        `Rejecting accept from unverified socket ${client.id} for session ${data.sessionId} (expected patient ${session.patientId})`,
      );
      return;
    }

    session.patientSocketId = client.id;
    session.status = 'active';
    this.socketToSession.set(client.id, data.sessionId);

    this.logger.log(`Video call accepted: session=${data.sessionId}`);

    const specialistToken = this.videoCallService.generateRtcToken(
      session.channelName,
      1,
    );
    const patientToken = this.videoCallService.generateRtcToken(
      session.channelName,
      2,
    );
    const appId = this.videoCallService.getAppId();

    if (session.specialistSocketId) {
      this.server.to(session.specialistSocketId).emit('video-call:ready', {
        sessionId: data.sessionId,
        token: specialistToken,
        appId,
        channelName: session.channelName,
        uid: 1,
      });
    }

    this.server.to(client.id).emit('video-call:ready', {
      sessionId: data.sessionId,
      token: patientToken,
      appId,
      channelName: session.channelName,
      uid: 2,
    });
  }

  @SubscribeMessage('video-call:decline')
  handleDecline(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    this.logger.log(`Video call declined: session=${data.sessionId}`);

    if (session.specialistSocketId) {
      this.server.to(session.specialistSocketId).emit('video-call:end', {
        sessionId: data.sessionId,
        reason: 'declined',
      });
    }

    session.status = 'ended';
    this.socketToSession.delete(client.id);
    this.sessions.delete(data.sessionId);
  }

  @SubscribeMessage('video-call:end')
  handleEnd(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(data.sessionId);
    if (!session || session.status === 'ended') return;

    const otherSocket =
      client.id === session.patientSocketId
        ? session.specialistSocketId
        : session.patientSocketId;

    if (otherSocket) {
      this.server.to(otherSocket).emit('video-call:end', {
        sessionId: data.sessionId,
      });
    }

    this.logger.log(`Video call ended: session=${data.sessionId}`);

    session.status = 'ended';
    this.socketToSession.delete(client.id);
    if (otherSocket) this.socketToSession.delete(otherSocket);
    this.sessions.delete(data.sessionId);
  }
}
