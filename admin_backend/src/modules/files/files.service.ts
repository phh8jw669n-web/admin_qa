import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { posix } from 'path';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { S3Service } from '../../common/storage/s3.service';
import { apiError } from '../../common/utils/api-response.util';
import { FILE_TYPE_NOT_ALLOWED_MESSAGE } from './constants/upload.constants';
import { CreateDownloadUrlDto } from './dto/create-download-url.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import {
  INVALID_STORAGE_PATH_MESSAGE,
  isSafeStoragePath,
} from './utils/storage-path.util';
import {
  isAllowedUploadContentType,
  isAllowedUploadFileName,
} from './utils/upload-file-type.util';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly companyContext: CompanyContextService,
  ) {}

  async uploadFile(file: Express.Multer.File, dto: UploadFileDto) {
    this.assertFile(file);
    this.assertFileName(dto.filename);

    const folderType = dto.folderType || 'docs';
    const folderId = this.resolveFolder(folderType);
    const originalName = dto.filename || file.originalname;
    const safeName = originalName.replace(/[/\\]/g, '_');
    const key = `${this.tenantPrefix()}/${folderId}/${randomUUID()}/${safeName}`;
    const uploaded = await this.putFile(file, key);

    return {
      filename: originalName,
      fullPath: key,
      url: uploaded.url,
      key: uploaded.key,
      bucket: uploaded.bucket,
      folderType,
      fileSize: file.size,
      contentType: file.mimetype,
    };
  }

  async updateFile(file: Express.Multer.File, dto: UpdateFileDto) {
    this.assertFile(file);
    this.assertFileName(dto.filename);

    const key = this.assertOwnedKey(dto.key.replace(/^\/+/, ''));
    const originalName =
      dto.filename || key.split('/').pop() || file.originalname;
    const uploaded = await this.putFile(file, key);

    return {
      filename: originalName,
      fullPath: key,
      url: uploaded.url,
      key: uploaded.key,
      bucket: uploaded.bucket,
      fileSize: file.size,
      contentType: file.mimetype,
    };
  }

  async createUploadUrl(dto: CreateUploadUrlDto) {
    this.assertS3Ready();

    const key = this.assertOwnedKey(dto.key || this.buildKey(dto.folder, dto.fileName));
    const expiresIn = dto.expiresIn ?? 3600;
    const uploadUrl = await this.s3Service.getSignedUrl(key, {
      operation: 'put',
      contentType: dto.contentType,
      expiresIn,
    });

    return {
      key,
      uploadUrl,
      method: 'PUT' as const,
      headers: { 'Content-Type': dto.contentType },
      expiresIn,
    };
  }

  async createDownloadUrl(dto: CreateDownloadUrlDto) {
    this.assertS3Ready();

    const expiresIn = dto.expiresIn ?? 3600;
    const url = await this.s3Service.getSignedUrl(this.assertOwnedKey(dto.key), {
      expiresIn,
    });

    return { key: dto.key, url, expiresIn };
  }

  async remove(dto: DeleteFileDto) {
    this.assertS3Ready();

    const key = this.assertOwnedKey(dto.key);
    await this.s3Service.delete(key);

    if (dto.previousKey && dto.previousKey !== key) {
      await this.s3Service.delete(this.assertOwnedKey(dto.previousKey));
    }

    return { key };
  }

  private resolveFolder(folderType: string) {
    const docsFolder =
      this.configService.get<string>('aws.s3.docsFolder') || 'docs';
    const folderMap: Record<string, string> = {
      docs: docsFolder,
    };

    return folderMap[folderType] || docsFolder;
  }

  private async putFile(file: Express.Multer.File, key: string) {
    this.assertS3Ready();

    try {
      return await this.s3Service.upload(key, file.buffer, file.mimetype);
    } catch (error) {
      this.logger.error(
        `Error uploading file to S3: ${error instanceof Error ? error.message : error}`,
      );
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : '';
      const timedOut = code === 'RequestTimeout' || code === 'ECONNRESET';

      throw new InternalServerErrorException(
        apiError(
          timedOut
            ? 'Upload timeout - file may be too large. Please try again.'
            : 'Error uploading file to S3',
        ),
      );
    }
  }

  private buildKey(folder: string | undefined, fileName: string) {
    const safeName = fileName.replace(/[/\\]/g, '_');
    const prefix = folder?.replace(/^\/+|\/+$/g, '') || 'uploads';

    if (!isSafeStoragePath(prefix)) {
      throw new BadRequestException(apiError(INVALID_STORAGE_PATH_MESSAGE));
    }

    return `${this.tenantPrefix()}/${prefix}/${randomUUID()}-${safeName}`;
  }

  private tenantPrefix(): string {
    return this.companyContext.getOptionalCompanyId() ?? 'super-admin';
  }

  private assertOwnedKey(key: string): string {
    const prefix = `${this.tenantPrefix()}/`;
    const normalized = posix
      .normalize(key.replace(/\\/g, '/').replace(/^\/+/, ''))
      .replace(/^\/+/, '');

    if (
      !isSafeStoragePath(normalized) ||
      !normalized.startsWith(prefix)
    ) {
      throw new BadRequestException(apiError(INVALID_STORAGE_PATH_MESSAGE));
    }

    return normalized;
  }

  private assertFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        apiError(
          'No file provided. Please upload a file with key "file" in form-data',
        ),
      );
    }

    if (
      !isAllowedUploadContentType(file.mimetype) ||
      !isAllowedUploadFileName(file.originalname)
    ) {
      throw new BadRequestException(apiError(FILE_TYPE_NOT_ALLOWED_MESSAGE));
    }
  }

  private assertFileName(fileName?: string) {
    if (fileName && !isAllowedUploadFileName(fileName)) {
      throw new BadRequestException(apiError(FILE_TYPE_NOT_ALLOWED_MESSAGE));
    }
  }

  private assertS3Ready() {
    if (!this.s3Service.isEnabled()) {
      throw new ServiceUnavailableException(
        apiError(
          'File uploads are temporarily unavailable. Please try again later.',
        ),
      );
    }
  }
}
