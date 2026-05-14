import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AgoraTokenSet {
  appId: string;
  channel: string;
  patientToken: string;
  doctorToken: string;
  patientUid: number;
  doctorUid: number;
}

@Injectable()
export class AgoraService {
  private readonly logger = new Logger(AgoraService.name);
  private readonly appId: string;
  private readonly appCertificate: string;
  private readonly customerId: string;
  private readonly customerSecret: string;
  private readonly baseUrl = 'https://api.agora.io/v1';

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('AGORA_APP_ID');
    this.appCertificate = this.configService.get<string>('AGORA_APP_CERTIFICATE');
    this.customerId = this.configService.get<string>('AGORA_CUSTOMER_ID', '');
    this.customerSecret = this.configService.get<string>('AGORA_CUSTOMER_SECRET', '');
  }

  generateChannelName(sessionRef: string): string {
    const hash = crypto
      .createHash('md5')
      .update(`${sessionRef}-${Date.now()}`)
      .digest('hex')
      .substring(0, 12);
    return `hah-${hash}`;
  }

  generateUids(): { patientUid: number; doctorUid: number } {
    return {
      patientUid: Math.floor(Math.random() * 100000) + 1,
      doctorUid: Math.floor(Math.random() * 100000) + 100001,
    };
  }

  async generateTokenSet(sessionRef: string): Promise<AgoraTokenSet> {
    const channel = this.generateChannelName(sessionRef);
    const { patientUid, doctorUid } = this.generateUids();
    const expireSeconds = 3600;

    // ── PRODUCTION: uncomment after `npm install agora-access-token` ──────
    // import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
    // const expireTime = Math.floor(Date.now() / 1000) + expireSeconds;
    // const patientToken = RtcTokenBuilder.buildTokenWithUid(
    //   this.appId, this.appCertificate, channel,
    //   patientUid, RtcRole.PUBLISHER, expireTime,
    // );
    // const doctorToken = RtcTokenBuilder.buildTokenWithUid(
    //   this.appId, this.appCertificate, channel,
    //   doctorUid, RtcRole.PUBLISHER, expireTime,
    // );
    // ──────────────────────────────────────────────────────────────────────

    // ── TEMPORARY placeholder (replace with above in production) ──────────
    const patientToken = `ptk_${this.appId}_${channel}_${patientUid}_${expireSeconds}`;
    const doctorToken  = `dtk_${this.appId}_${channel}_${doctorUid}_${expireSeconds}`;
    // ──────────────────────────────────────────────────────────────────────

    this.logger.log(`Generated Agora tokens for channel: ${channel}`);

    return {
      appId: this.appId,
      channel,
      patientToken,
      doctorToken,
      patientUid,
      doctorUid,
    };
  }

  async refreshToken(channel: string, uid: number): Promise<string> {
    const expireTime = Math.floor(Date.now() / 1000) + 3600;

    // ── PRODUCTION ────────────────────────────────────────────────────────
    // return RtcTokenBuilder.buildTokenWithUid(
    //   this.appId, this.appCertificate, channel,
    //   uid, RtcRole.PUBLISHER, expireTime,
    // );
    // ──────────────────────────────────────────────────────────────────────

    return `refreshed_${this.appId}_${channel}_${uid}_${expireTime}`;
  }

  async startCloudRecording(
    channel: string,
    uid: number,
    token: string,
  ): Promise<{ resourceId: string; sid: string }> {
    const credentials = Buffer.from(
      `${this.customerId}:${this.customerSecret}`,
    ).toString('base64');

    const acquireRes = await fetch(
      `${this.baseUrl}/apps/${this.appId}/cloud_recording/acquire`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cname: channel,
          uid: String(uid),
          clientRequest: { resourceExpiredHour: 24 },
        }),
      },
    );

    if (!acquireRes.ok) {
      throw new Error(`Agora acquire failed: ${await acquireRes.text()}`);
    }

    const { resourceId } = await acquireRes.json() as { resourceId: string };

    const storageConfig = {
      vendor: Number(this.configService.get('AGORA_STORAGE_VENDOR', '1')),
      region: Number(this.configService.get('AGORA_STORAGE_REGION', '0')),
      bucket: this.configService.get('AGORA_STORAGE_BUCKET', ''),
      accessKey: this.configService.get('AGORA_STORAGE_ACCESS_KEY', ''),
      secretKey: this.configService.get('AGORA_STORAGE_SECRET_KEY', ''),
      fileNamePrefix: ['recordings', channel],
    };

    const startRes = await fetch(
      `${this.baseUrl}/apps/${this.appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cname: channel,
          uid: String(uid),
          clientRequest: {
            token,
            storageConfig,
            recordingConfig: {
              maxIdleTime: 60,
              streamTypes: 3,
              channelType: 0,
              videoStreamType: 0,
              transcodingConfig: {
                height: 640,
                width: 360,
                bitrate: 500,
                fps: 15,
                mixedVideoLayout: 1,
              },
            },
          },
        }),
      },
    );

    if (!startRes.ok) {
      throw new Error(`Agora start recording failed: ${await startRes.text()}`);
    }

    const { sid } = await startRes.json() as { sid: string };
    this.logger.log(`Started recording — resourceId: ${resourceId}, sid: ${sid}`);
    return { resourceId, sid };
  }

  async stopCloudRecording(
    channel: string,
    uid: number,
    resourceId: string,
    sid: string,
  ): Promise<{ recordingUrl: string }> {
    const credentials = Buffer.from(
      `${this.customerId}:${this.customerSecret}`,
    ).toString('base64');

    const stopRes = await fetch(
      `${this.baseUrl}/apps/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cname: channel,
          uid: String(uid),
          clientRequest: {},
        }),
      },
    );

    if (!stopRes.ok) {
      throw new Error(`Agora stop recording failed: ${await stopRes.text()}`);
    }

    const data = await stopRes.json() as any;
    const bucket = this.configService.get('AGORA_STORAGE_BUCKET', '');
    const fileList = data?.serverResponse?.fileList ?? [];
    const recordingUrl = fileList[0]
      ? `https://${bucket}.s3.amazonaws.com/${fileList[0].fileName}`
      : '';

    this.logger.log(`Stopped recording — url: ${recordingUrl}`);
    return { recordingUrl };
  }
}