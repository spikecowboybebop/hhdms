// E:\Work\HHDMS\hhdms\apps\api\src\nutritionist\dto\index.ts

// 1. Export core shared enums explicitly for the Service and Controller layers
export enum ConsultationType {
  HOME_VISIT = 'HOME_VISIT',
}

export enum FollowUpInterval {
  TWO_WEEKS = 'TWO_WEEKS',
  ONE_MONTH = 'ONE_MONTH',
  THREE_MONTHS = 'THREE_MONTHS',
}

// 2. Export all structured class properties out to the execution tree
// E:\Work\HHDMS\hhdms\apps\api\src\nutritionist\dto\index.ts

export * from './book-consultation.dto';
export * from './calculate-nutrients.dto';
export * from './create-adherence-log.dto';
export * from './create-anthropometric-record.dto';
export * from './create-diet-plan.dto';
export * from './create-education-material.dto';
export * from './create-follow-up.dto';
