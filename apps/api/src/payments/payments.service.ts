import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    } else {
      console.warn(
        'STRIPE_SECRET_KEY not configured. Payment endpoints will be unavailable.',
      );
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Payments are not configured. Please set STRIPE_SECRET_KEY.',
      );
    }
    return this.stripe;
  }

  async createPaymentIntent(userId: string, bookingSessionId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!patient)
      throw new NotFoundException('No patient profile found for this user.');

    const session = await this.prisma.booking_sessions.findUnique({
      where: { id: bookingSessionId },
      include: { tickets: true },
    });
    if (!session) throw new NotFoundException('Booking session not found.');
    if (session.patient_id !== patient.id)
      throw new BadRequestException('Session does not belong to this patient.');

    const mbbsTicket = session.tickets.find((t) => t.service_type === 'MBBS');
    if (!mbbsTicket) throw new NotFoundException('No MBBS ticket found.');

    const price = await this.billing.resolveServicePrice('MBBS');
    const amount = mbbsTicket.price ?? price;

    const paymentIntent = await this.requireStripe().paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'bdt',
      automatic_payment_methods: { enabled: true },
      metadata: {
        patient_id: patient.id,
        booking_session_id: bookingSessionId,
        service_type: 'MBBS',
      },
    });

    const payment = await this.prisma.payments.create({
      data: {
        patient_id: patient.id,
        booking_session_id: bookingSessionId,
        amount,
        currency: 'BDT',
        service_type: 'MBBS',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret,
        status: 'pending',
      },
    });

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: Number(amount),
      serviceType: 'MBBS',
    };
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    if (payment.status === 'completed') {
      return { message: 'Payment already confirmed.' };
    }

    if (!payment.stripe_payment_intent_id)
      throw new BadRequestException('No Stripe payment intent on record.');

    const pi = await this.requireStripe().paymentIntents.retrieve(
      payment.stripe_payment_intent_id,
    );

    if (pi.status !== 'succeeded') {
      throw new BadRequestException(
        `Payment not completed (status: ${pi.status}). Please try again in a moment.`,
      );
    }

    await this.prisma.payments.update({
      where: { id: paymentId },
      data: { status: 'completed', completed_at: new Date() },
    });

    return { message: 'Payment confirmed.' };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET not configured.',
      );
    }
    let event: Stripe.Event;

    try {
      event = this.requireStripe().webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature.');
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await this.prisma.payments.updateMany({
        where: { stripe_payment_intent_id: pi.id },
        data: { status: 'completed', completed_at: new Date() },
      });
    }

    return { received: true };
  }

  async getPaymentStatus(userId: string, bookingSessionId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!patient) return { paid: false, paymentId: null };

    const payment = await this.prisma.payments.findFirst({
      where: {
        patient_id: patient.id,
        booking_session_id: bookingSessionId,
        service_type: 'MBBS',
        status: 'completed',
      },
      orderBy: { created_at: 'desc' },
    });

    return { paid: !!payment, paymentId: payment?.id ?? null };
  }
}
