import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VideoCallService } from './video-call.service';
import { TokenRequestDto } from './dto/token-request.dto';

@Controller('api/video-call')
export class VideoCallController {
  private readonly logger = new Logger(VideoCallController.name);

  constructor(private readonly videoCallService: VideoCallService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  getToken(@Body() dto: TokenRequestDto) {
    this.logger.log(
      `Token requested for channel=${dto.channelName} uid=${dto.uid}`,
    );
    const token = this.videoCallService.generateRtcToken(
      dto.channelName,
      dto.uid,
    );
    return {
      token,
      appId: this.videoCallService.getAppId(),
    };
  }
}
