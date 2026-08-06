// apps/api/src/modules/nutritionist/nutritionist.module.ts
import { Module } from '@nestjs/common';
import { NutritionistController } from './nutritionist.controller';
import { NutritionistService } from './nutritionist.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [NutritionistController],
  providers: [NutritionistService],
  exports: [NutritionistService], // Exporting makes it safely readable by root orchestrators if needed
})
export class NutritionistModule {}
