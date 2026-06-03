import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { FileStorageService } from 'src/documents/file-storage.service';

describe('FileStorageService', () => {
  let send: jest.Mock;
  let service: FileStorageService;

  beforeEach(() => {
    send = jest.fn();
    const s3 = { send } as unknown as S3Client;
    service = new FileStorageService(s3);
  });

  it('puts object on save', async () => {
    send.mockResolvedValue({});

    const key = await service.save(
      'user-1',
      'doc-1',
      Buffer.from('data'),
      'txt',
    );

    expect(key).toBe('user-1/doc-1/original.txt');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input.Bucket).toBeDefined();
    expect(command.input.Key).toBe('user-1/doc-1/original.txt');
    expect(command.input.ContentType).toBe('text/plain');
  });

  it('deletes object', async () => {
    send.mockResolvedValue({});

    await service.delete('user-1/doc-1/original.pdf');

    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it('head object for assertFileExists', async () => {
    send.mockResolvedValue({});

    await expect(
      service.assertFileExists('user-1/doc-1/original.txt'),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
  });

  it('throws NotFoundException when head fails', async () => {
    send.mockRejectedValue({
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });

    await expect(
      service.assertFileExists('user-1/doc-1/original.txt'),
    ).rejects.toThrow(NotFoundException);
  });

  it('pipes get object body to read stream', async () => {
    const body = Readable.from([Buffer.from('chunk')]);
    send.mockResolvedValue({ Body: body });

    const { stream } = service.openReadStream('user-1/doc-1/original.txt');
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    expect(Buffer.concat(chunks).toString()).toBe('chunk');
  });
});
