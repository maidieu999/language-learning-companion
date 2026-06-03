export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DEFAULT_S3_BUCKET = 'llc-documents';
export const DEFAULT_AWS_REGION = 'us-east-1';

export function getMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES;
  if (!raw) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  return parsed;
}

export function getS3Bucket(): string {
  return process.env.S3_BUCKET ?? DEFAULT_S3_BUCKET;
}

export function getAwsRegion(): string {
  return process.env.AWS_REGION ?? DEFAULT_AWS_REGION;
}

export function getAwsEndpointUrl(): string | undefined {
  const url = process.env.AWS_ENDPOINT_URL?.trim();
  return url || undefined;
}

export function getAwsAccessKeyId(): string {
  return process.env.AWS_ACCESS_KEY_ID ?? 'test';
}

export function getAwsSecretAccessKey(): string {
  return process.env.AWS_SECRET_ACCESS_KEY ?? 'test';
}
