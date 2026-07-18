import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private onlineUsers = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      client.data = { userId, role: payload.role };
      this.onlineUsers.set(client.id, userId);
      client.join(`user:${userId}`);
      console.log(`[CHAT] User ${userId} connected (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.onlineUsers.delete(client.id);
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`chat:${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; content: string },
  ) {
    const userId = client.data.userId;
    const message = await this.chatService.sendMessage(
      data.conversationId,
      userId,
      data.content,
    );

    this.server
      .to(`chat:${data.conversationId}`)
      .emit('new_message', message);

    const recipientId = await this.chatService.getRecipientUserId(
      data.conversationId,
      userId,
    ).catch(() => null);

    if (recipientId) {
      this.server.to(`user:${recipientId}`).emit('new_message_notification', {
        conversationId: data.conversationId,
        message,
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    client.to(`chat:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      senderId: userId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    client.to(`chat:${data.conversationId}`).emit('user_stop_typing', {
      conversationId: data.conversationId,
      senderId: userId,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    await this.chatService.markRead(data.conversationId, userId);
    this.server.to(`chat:${data.conversationId}`).emit('messages_read', {
      conversationId: data.conversationId,
      readerId: userId,
    });
  }
}
