import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'If an account exists for this email, a reset token was created.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Dev only: plaintext reset token (not sent by email yet)',
  })
  resetToken?: string;

  @ApiPropertyOptional({ description: 'Dev only: when the reset token expires' })
  expiresAt?: string;
}
