import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ListFileCodec } from '@pokemon/shared';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { FormatException } from '../common/exceptions/format.exception';

@Controller('lists')
export class ListsController {
  constructor(private readonly service: ListsService) {}

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.service.create(dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new FormatException({
        code: 'INVALID_FILE_FORMAT',
        message: 'Upload must include a "file" field.',
      });
    }
    const decoded = ListFileCodec.decode(file.buffer.toString('utf8'));
    if (!decoded.ok) {
      throw new FormatException(decoded.error);
    }
    return this.service.createFromFile(decoded.value);
  }

  @Get()
  findAll() {
    return this.service.findAllSummaries();
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { filename, payload } = await this.service.toFile(id);
    res
      .status(200)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(payload);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
