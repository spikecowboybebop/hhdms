import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  ConfirmPaymentDto,
} from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(
    @Req() req: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      req.user.sub,
      dto.booking_session_id,
    );
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto.payment_id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    await this.paymentsService.handleWebhook(
      req.rawBody!,
      signature,
    );
    res.json({ received: true });
  }

  @Get('status/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paymentsService.getPaymentStatus(
      req.user.sub,
      sessionId,
    );
  }
}
