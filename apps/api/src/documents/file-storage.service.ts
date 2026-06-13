import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound as S3NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import * as path from 'path';
import { PassThrough, type Readable } from 'stream';
import type {
  DocumentFileStream,
  StoredFileExtension,
} from './file-upload.types';
import { getS3Bucket } from './file-upload.constants';
import {
  buildStoredFileKey,
  contentTypeForKey,
  isKeySafe,
} from './file-storage-key.util';
import { createS3Client } from './s3-client.factory';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly bucket: string;
  private readonly s3: S3Client;

  constructor(@Optional() s3Client?: S3Client) {
    this.bucket = getS3Bucket();
    this.s3 = s3Client ?? createS3Client();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!this.isBucketMissingError(error)) {
        throw error;
      }
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created S3 bucket ${this.bucket}`);
    }
  }

  buildStoredFileKey(
    userId: string,
    documentId: string,
    extension: StoredFileExtension,
  ): string {
    return buildStoredFileKey(userId, documentId, extension);
  }

  async save(
    userId: string,
    documentId: string,
    buffer: Buffer,
    extension: StoredFileExtension,
  ): Promise<string> {
    const key = buildStoredFileKey(userId, documentId, extension);
    await this.putObject(key, buffer);
    return key;
  }

  async replace(
    userId: string,
    documentId: string,
    buffer: Buffer,
    extension: StoredFileExtension,
    previousKey: string | null,
  ): Promise<string> {
    const key = buildStoredFileKey(userId, documentId, extension);
    await this.putObject(key, buffer);
    if (previousKey && previousKey !== key) {
      await this.delete(previousKey);
    }
    return key;
  }

  async delete(storedFileKey: string): Promise<void> {
    this.assertKeySafe(storedFileKey);
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storedFileKey,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to delete S3 object ${storedFileKey}: ${String(error)}`,
      );
    }
  }

  openReadStream(storedFileKey: string): DocumentFileStream {
    this.assertKeySafe(storedFileKey);
    const passThrough = new PassThrough();

    void this.s3
      .send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storedFileKey,
        }),
      )
      .then((response) => {
        const body = response.Body as Readable | undefined;
        if (!body) {
          passThrough.destroy(new NotFoundException('Stored file not found'));
          return;
        }
        body.on('error', (err) => passThrough.destroy(err));
        body.pipe(passThrough);
      })
      .catch((error) => {
        if (this.isNotFoundError(error)) {
          passThrough.destroy(new NotFoundException('Stored file not found'));
          return;
        }
        passThrough.destroy(error);
      });

    return {
      stream: passThrough,
      filename: path.posix.basename(storedFileKey),
      mimeType: contentTypeForKey(storedFileKey),
    };
  }

  async assertFileExists(storedFileKey: string): Promise<void> {
    this.assertKeySafe(storedFileKey);
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: storedFileKey,
        }),
      );
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('Stored file not found');
      }
      throw error;
    }
  }

  private async putObject(
    storedFileKey: string,
    buffer: Buffer,
  ): Promise<void> {
    this.assertKeySafe(storedFileKey);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storedFileKey,
        Body: buffer,
        ContentType: contentTypeForKey(storedFileKey),
      }),
    );
  }

  private assertKeySafe(storedFileKey: string): void {
    if (!isKeySafe(storedFileKey)) {
      throw new InternalServerErrorException('Invalid stored file key');
    }
  }

  private isBucketMissingError(error: unknown): boolean {
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    return name === 'NotFound' || name === 'NoSuchBucket' || status === 404;
  }

  private isNotFoundError(error: unknown): boolean {
    if (error instanceof S3NotFound) {
      return true;
    }
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    return name === 'NotFound' || name === 'NoSuchKey' || status === 404;
  }
}
