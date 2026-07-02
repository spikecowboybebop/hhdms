import { Controller, Get, Query } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { AvailableProvidersQueryDto } from './dto/available-providers-query.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('available')
  async getAvailableProviders(@Query() query: AvailableProvidersQueryDto) {
    return this.providersService.getAvailableProviders(query);
  }
}
