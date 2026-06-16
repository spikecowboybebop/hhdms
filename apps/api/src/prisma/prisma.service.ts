import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Create a standard connection pool using your loaded environment variable
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // 2. Wrap it with the Prisma 7 Driver Adapter
    const adapter = new PrismaPg(pool);

    // 3. Pass the adapter directly into the super constructor
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}