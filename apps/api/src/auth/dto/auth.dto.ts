import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: '01712345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  password: string;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: '01712345679' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'NewSecurePass123' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
