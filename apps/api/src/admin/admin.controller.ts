import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import type { AuditActor } from './admin.audit.service';
import { CreateStaffDto, UpdateStaffDto, UpdateStatusDto } from './dto';
import { ReassignTicketDto } from './dto/reassign-ticket.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('roles')
  async getRoles() {
    return this.adminService.listStaffRoles();
  }

  @Post('staff')
  async createStaff(@Body() dto: CreateStaffDto, @Req() req: Request) {
    return this.adminService.createStaff(dto, this.actorFrom(req));
  }

  @Get('staff')
  async listStaff(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listStaff({
      role,
      status,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('staff/:id')
  async getStaff(@Param('id') id: string) {
    return this.adminService.getStaff(id);
  }

  @Patch('staff/:id')
  async updateStaff(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: Request,
  ) {
    return this.adminService.updateStaff(id, dto, this.actorFrom(req));
  }

  @Patch('staff/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.adminService.updateStatus(id, dto.status, this.actorFrom(req));
  }

  @Post('staff/:id/reset-password')
  async resetPassword(@Param('id') id: string, @Req() req: Request) {
    return this.adminService.resetPassword(id, this.actorFrom(req));
  }

  @Get('audit-logs')
  async listAuditLogs(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listAuditLogs({
      action,
      entityType,
      actorUserId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('providers')
  async listProviders(
    @Query('serviceType') serviceType?: string,
    @Query('q') q?: string,
  ) {
    return this.adminService.listProviders({ serviceType, q });
  }

  @Get('tickets')
  async listTickets(
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listTickets({
      status,
      serviceType,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('tickets/:id')
  async getTicket(@Param('id') id: string) {
    return this.adminService.getTicketDetail(id);
  }

  @Post('tickets/:id/reassign')
  async reassignTicket(
    @Param('id') id: string,
    @Body() dto: ReassignTicketDto,
    @Req() req: Request,
  ) {
    return this.adminService.reassignTicket(
      id,
      dto.assigned_provider_id,
      this.actorFrom(req),
    );
  }

  @Get('dashboard/stats')
  async dashboardStats() {
    return this.adminService.dashboardStats();
  }

  @Get('payments/summary')
  async paymentSummary() {
    return this.adminService.paymentSummary();
  }

  @Get('payments')
  async listPayments(
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listPayments({
      status,
      serviceType,
      from,
      to,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch('payments/:id')
  async updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @Req() req: Request,
  ) {
    return this.adminService.updatePaymentStatus(
      id,
      dto.status,
      this.actorFrom(req),
    );
  }

  @Get('payments/:paymentId/invoice')
  async getPaymentInvoice(
    @Param('paymentId') paymentId: string,
    @Req() req: Request,
  ) {
    return this.adminService.getInvoiceForPayment(paymentId, this.actorFrom(req));
  }

  @Get('payments/:paymentId/invoice/pdf')
  async getPaymentInvoicePdf(@Param('paymentId') paymentId: string) {
    return this.adminService.getInvoicePdf(paymentId);
  }

  @Get('service-prices')
  async getServicePrices() {
    return this.adminService.listServicePrices();
  }

  @Get('audit-logs/verify')
  async verifyAuditLogs() {
    return this.adminService.verifyAuditLogs();
  }

  private actorFrom(req: Request): AuditActor {
    // req.user is populated by the JWT strategy: { sub, email, role }
    const authed = req as Request & { user?: { sub?: string; role?: string } };
    const user = authed.user;
    return {
      id: user?.sub ?? 'unknown',
      role: user?.role ?? null,
      ip: typeof req.ip === 'string' ? req.ip : null,
      userAgent:
        typeof req.headers?.['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
    };
  }
}
