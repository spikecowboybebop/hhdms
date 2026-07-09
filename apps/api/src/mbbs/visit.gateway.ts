import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/visit',
})
export class VisitGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; role: string }>(
        token,
      );
      (client as any).userId = payload.sub;
      (client as any).role = payload.role;

      if (payload.role === 'MBBS_DOCTOR') {
        client.join(`doctor:${payload.sub}`);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {
    // nothing to clean up per-user
  }

  emitVisitStateChanged(
    doctorUserId: string,
    patientId: string,
    state: string,
    extra?: Record<string, unknown>,
  ) {
    this.server.to(`doctor:${doctorUserId}`).emit('visit_state_changed', {
      patientId,
      state,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }
}
