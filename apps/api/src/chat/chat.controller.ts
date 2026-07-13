import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.chatService.getConversations(req.user.sub);
  }

  @Post('start')
  async startChat(@Req() req: any) {
    return this.chatService.getOrCreateForPatient(req.user.sub);
  }

  @Get('unread')
  async getUnreadCounts(@Req() req: any) {
    return this.chatService.getUnreadCounts(req.user.sub);
  }

  @Post('conversation/:assignmentId')
  async getOrCreateConversation(@Param('assignmentId') assignmentId: string) {
    return this.chatService.getOrCreateConversation(assignmentId);
  }

  @Get(':conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.chatService.getMessages(conversationId, req.user.sub);
  }

  @Post(':conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      req.user.sub,
      dto.content,
    );
  }

  @Post(':conversationId/read')
  async markRead(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.chatService.markRead(conversationId, req.user.sub);
  }
}
