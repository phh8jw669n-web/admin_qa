import { ConfigService } from '@nestjs/config';

export function getAwsClientOptions(configService: ConfigService) {
  const region = configService.get<string>('aws.region');
  const accessKeyId = configService.get<string>('aws.accessKeyId');
  const secretAccessKey = configService.get<string>('aws.secretAccessKey');

  return {
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  };
}
