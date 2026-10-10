import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { CreateDownloadUrlDto } from './dto/create-download-url.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService } from './files.service';

const fileUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

@ApiTags('Files')
@ApiBearerAuth('JWT')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        folderType: { type: 'string', example: 'docs' },
        filename: { type: 'string' },
      },
    },
  })
  @UseInterceptors(fileUploadInterceptor)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    return apiSuccess(
      'File uploaded successfully',
      await this.filesService.uploadFile(file, dto),
    );
  }

  @Put()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'key'],
      properties: {
        file: { type: 'string', format: 'binary' },
        key: { type: 'string' },
        filename: { type: 'string' },
      },
    },
  })
  @UseInterceptors(fileUploadInterceptor)
  async update(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateFileDto,
  ) {
    return apiSuccess(
      'File updated successfully',
      await this.filesService.updateFile(file, dto),
    );
  }

  @Post('upload-url')
  async createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return apiSuccess(
      'Upload URL created successfully',
      await this.filesService.createUploadUrl(dto),
    );
  }

  @Post('download-url')
  async createDownloadUrl(@Body() dto: CreateDownloadUrlDto) {
    return apiSuccess(
      'Download URL created successfully',
      await this.filesService.createDownloadUrl(dto),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(@Query() dto: DeleteFileDto) {
    await this.filesService.remove(dto);
    return apiSuccessMessage('File deleted successfully');
  }
}
