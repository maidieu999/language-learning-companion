import {
  buildStoredFileKey,
  contentTypeForKey,
  isKeySafe,
} from 'src/documents/file-storage-key.util';

describe('file-storage-key.util', () => {
  it('builds keys with userId prefix', () => {
    expect(buildStoredFileKey('user-1', 'doc-1', 'pdf')).toBe(
      'user-1/doc-1/original.pdf',
    );
  });

  it('validates safe keys', () => {
    expect(
      isKeySafe('166d1fdf-33e7-48e7-9d30-ab0de43c2635/doc-1/original.pdf'),
    ).toBe(true);
    expect(isKeySafe('../etc/passwd')).toBe(false);
    expect(isKeySafe('user/doc/original.png')).toBe(false);
  });

  it('maps content types from key extension', () => {
    expect(contentTypeForKey('u/d/original.pdf')).toBe('application/pdf');
    expect(contentTypeForKey('u/d/original.txt')).toBe('text/plain');
    expect(contentTypeForKey('u/d/original.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('accepts docx keys as safe', () => {
    expect(isKeySafe('user-1/doc-1/original.docx')).toBe(true);
  });
});
