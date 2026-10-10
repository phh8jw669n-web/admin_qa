import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  enabled: process.env.AWS_ENABLED === 'true',
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3: {
    bucket: process.env.AWS_S3_BUCKET,
    endpoint: process.env.AWS_S3_ENDPOINT,
    docsFolder: process.env.AWS_S3_DOCS_FOLDER || 'docs',
  },
  ses: {
    fromEmail: process.env.AWS_SES_FROM_EMAIL,
  },
}));
