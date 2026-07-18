import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { verify } from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token || client.handshake?.query?.token;

    if (!token) throw new WsException('Missing authentication token');

    try {
      const payload = verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret_key_anchor',
      );
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Invalid authentication token');
    }
  }
}
