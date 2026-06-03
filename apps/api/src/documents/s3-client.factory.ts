import { S3Client } from '@aws-sdk/client-s3';
import {
  getAwsAccessKeyId,
  getAwsEndpointUrl,
  getAwsRegion,
  getAwsSecretAccessKey,
} from './file-upload.constants';

export function createS3Client(): S3Client {
  const endpoint = getAwsEndpointUrl();
  const region = getAwsRegion();

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: !!endpoint,
    credentials: {
      accessKeyId: getAwsAccessKeyId(),
      secretAccessKey: getAwsSecretAccessKey(),
    },
  });
}
