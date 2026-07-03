import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SonologistService } from './sonologist.service';
import { CreateUsgReportDto } from './dto/create-usg-report.dto';

@Controller('sonologist')
@UseGuards(AuthGuard('jwt'))
export class SonologistController {
  constructor(private readonly sonologistService: SonologistService) {}

  private getUserId(req: any): string {
    return req.user?.sub;
  }

  // ── Profile ─────────────────────────────────────────────

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.sonologistService.getProfile(this.getUserId(req));
  }

  // ── Dashboard Stats ─────────────────────────────────────

  @Get('dashboard')
  async getDashboardStats(@Req() req: any) {
    return this.sonologistService.getDashboardStats(this.getUserId(req));
  }

  // ── Patients ────────────────────────────────────────────

  @Get('patients')
  async getMyPatients(@Req() req: any) {
    return this.sonologistService.getMyPatients(this.getUserId(req));
  }

  // ── USG Studies ─────────────────────────────────────────

  @Get('studies')
  async getMyStudies(@Req() req: any) {
    return this.sonologistService.getMyStudies(this.getUserId(req));
  }

  @Get('studies/:id')
  async getStudy(@Param('id') id: string, @Req() req: any) {
    return this.sonologistService.getStudy(id, this.getUserId(req));
  }

  @Post('studies')
  @HttpCode(HttpStatus.CREATED)
  async createStudy(@Body() dto: CreateUsgReportDto, @Req() req: any) {
    return this.sonologistService.createStudy(this.getUserId(req), dto);
  }

  // ── Reports ─────────────────────────────────────────────

  @Get('reports')
  async getMyReports(@Req() req: any) {
    return this.sonologistService.getMyReports(this.getUserId(req));
  }
}
