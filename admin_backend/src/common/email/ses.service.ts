import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { getAwsClientOptions } from '../aws/aws-client';

@Injectable()
export class SesService {
  private readonly logger = new Logger(SesService.name);
  private readonly client: SESClient | null;
  private readonly fromEmail: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<boolean>('aws.enabled');
    this.fromEmail = this.configService.get<string>('aws.ses.fromEmail');

    if (!enabled) {
      this.client = null;
      this.logger.log('AWS SES is disabled');
      return;
    }

    this.client = new SESClient(getAwsClientOptions(this.configService));
    this.logger.log('AWS SES client ready');
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  sendEmail(to: string, subject: string, html: string) {
    this.assertReady();

    return this.client!.send(
      new SendEmailCommand({
        Source: this.fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: html } },
        },
      }),
    );
  }

  private assertReady() {
    if (!this.client || !this.fromEmail) {
      throw new Error('AWS SES is disabled or AWS_SES_FROM_EMAIL is not set');
    }
  }
}
