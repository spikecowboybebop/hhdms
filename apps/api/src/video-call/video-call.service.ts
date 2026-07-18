import { Injectable, Logger } from '@nestjs/common';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

@Injectable()
export class VideoCallService {
  private readonly logger = new Logger(VideoCallService.name);
  private readonly appId = process.env.AGORA_APP_ID!;
  private readonly appCertificate = process.env.AGORA_APP_CERTIFICATE!;

  generateRtcToken(channelName: string, uid: number): string {
    const tokenExpire = 3600;
    const privilegeExpire = 3600;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      tokenExpire,
      privilegeExpire,
    );

    this.logger.log(`Generated Agora token for channel=${channelName} uid=${uid}`);
    return token;
  }

  getAppId(): string {
    return this.appId;
  }
}
