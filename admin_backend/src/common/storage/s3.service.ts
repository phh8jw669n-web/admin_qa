import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as createS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAwsClientOptions } from '../aws/aws-client';

type SignedUrlOperation = 'get' | 'put';

type SignedUrlOptions = {
  expiresIn?: number;
  operation?: SignedUrlOperation;
  contentType?: string;
};

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | undefined;
  private readonly region: string | undefined;
  private readonly endpoint: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<boolean>('aws.enabled');
    this.bucket = this.configService.get<string>('aws.s3.bucket');
    this.region = this.configService.get<string>('aws.region');
    this.endpoint = this.configService.get<string>('aws.s3.endpoint');

    if (!enabled) {
      this.client = null;
      this.logger.log('AWS S3 is disabled');
      return;
    }

    this.client = new S3Client(getAwsClientOptions(this.configService));
    this.logger.log('AWS S3 client ready');
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async upload(key: string, body: Buffer, contentType: string) {
    this.assertReady();

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return { key, bucket: this.bucket, url: this.buildPublicUrl(key) };
  }

  async delete(key: string) {
    this.assertReady();

    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getSignedUrl(key: string, options: SignedUrlOptions = {}) {
    this.assertReady();

    const expiresIn = options.expiresIn ?? 3600;
    const operation = options.operation ?? 'get';

    const command =
      operation === 'put'
        ? new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: options.contentType,
          })
        : new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          });

    return createS3SignedUrl(this.client!, command, { expiresIn });
  }

  private buildPublicUrl(key: string) {
    const encodedKey = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    if (this.endpoint) {
      const endpoint = this.endpoint.startsWith('http')
        ? this.endpoint.replace(/\/+$/, '')
        : `https://${this.endpoint.replace(/\/+$/, '')}`;

      return `${endpoint}/${this.bucket}/${encodedKey}`;
    }

    const region = this.region || 'ap-south-1';
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }

  private assertReady() {
    if (!this.client || !this.bucket) {
      throw new Error('AWS S3 is disabled or AWS_S3_BUCKET is not set');
    }
  }
}
