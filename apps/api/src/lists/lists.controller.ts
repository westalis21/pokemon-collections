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
} from '@nestjs/common';
import type { Response } from 'express';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';

@Controller('lists')
export class ListsController {
  constructor(private readonly service: ListsService) {}

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.service.create(dto);
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
