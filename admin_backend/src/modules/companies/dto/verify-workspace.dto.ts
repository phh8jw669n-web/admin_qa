import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyWorkspaceDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  workspaceUrl!: string;
}

export class WorkspaceVerifyDataDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT containing the encoded company ID',
  })
  companyToken!: string;

  @ApiProperty({
    example: 'Acme Assessments',
    description: 'Company name',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    nullable: true,
    description: 'Company logo URL',
  })
  companyLogo!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/favicon.ico',
    nullable: true,
    description: 'Company favicon URL',
  })
  favicon!: string | null;

  @ApiPropertyOptional({
    example: '#1A73E8',
    nullable: true,
    description: 'Company primary brand color',
  })
  primaryColor!: string | null;

  @ApiPropertyOptional({
    example: '#34A853',
    nullable: true,
    description: 'Company secondary brand color',
  })
  secondaryColor!: string | null;
}

export class WorkspaceVerifyResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Workspace verified successfully' })
  message!: string;

  @ApiProperty({ type: WorkspaceVerifyDataDto })
  data!: WorkspaceVerifyDataDto;
}
