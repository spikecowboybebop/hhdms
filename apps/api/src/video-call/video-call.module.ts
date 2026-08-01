import { Module } from '@nestjs/common';
import { VideoCallService } from './video-call.service';
import { VideoCallController } from './video-call.controller';
import { VideoCallGateway } from './video-call.gateway';
import { VoiceCallGateway } from './voice-call.gateway';

@Module({
  controllers: [VideoCallController],
  providers: [VideoCallService, VideoCallGateway, VoiceCallGateway],
  exports: [VideoCallGateway],
})
export class VideoCallModule {}
