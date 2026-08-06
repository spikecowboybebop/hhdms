import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  @IsNotEmpty()
  status!: 'ACTIVE' | 'SUSPENDED';
}
