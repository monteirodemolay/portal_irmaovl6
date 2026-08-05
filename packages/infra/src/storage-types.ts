export interface UploadFileInput {
  path: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadFileResult {
  url: string;
  sizeBytes: number;
}
