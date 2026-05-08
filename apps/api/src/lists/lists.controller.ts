import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
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
