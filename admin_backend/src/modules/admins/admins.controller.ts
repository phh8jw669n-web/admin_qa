import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminRole } from './enums/admin-role.enum';

@ApiTags('Admins')
@ApiBearerAuth('JWT')
@Roles(AdminRole.SUPER_ADMIN)
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  async create(@Body() createAdminDto: CreateAdminDto) {
    return apiSuccess(
      'Admin created successfully',
      await this.adminsService.create(createAdminDto),
    );
  }

  @Get()
  async findAll(@Query() query: QueryAdminDto) {
    return apiSuccess(
      'Admins fetched successfully',
      await this.adminsService.findAll(query),
    );
  }

  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string) {
    return apiSuccess(
      'Admin fetched successfully',
      await this.adminsService.findOne(id),
    );
  }

  @Put(':id')
  async update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return apiSuccess(
      'Admin updated successfully',
      await this.adminsService.update(id, updateAdminDto),
    );
  }

  @Delete(':id')
  async remove(@Param('id', UuidParamPipe) id: string) {
    await this.adminsService.remove(id);
    return apiSuccessMessage('Admin deleted successfully');
  }
}
