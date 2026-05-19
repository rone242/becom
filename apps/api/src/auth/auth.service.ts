import { BadRequestException, Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, UpdateAdminDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException('Phone number already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashedPassword },
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
    });

    const token = this.generateToken(user.id, user.phone, user.role);
    return { user, ...token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const { password: _, ...userWithoutPassword } = user;
    const token = this.generateToken(user.id, user.phone, user.role);
    return { user: userWithoutPassword, ...token };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
    });
  }

  async updateAdmin(userId: string, dto: UpdateAdminDto) {
    if (!dto.phone && !dto.password) {
      throw new BadRequestException('Phone or password is required');
    }

    if (dto.phone) {
      const existingPhoneUser = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhoneUser && existingPhoneUser.id !== userId) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const data: { phone?: string; password?: string } = {};
    if (dto.phone) data.phone = dto.phone;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id: userId, role: Role.ADMIN },
      data,
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
  }

  private generateToken(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: '7d',
    };
  }
}
