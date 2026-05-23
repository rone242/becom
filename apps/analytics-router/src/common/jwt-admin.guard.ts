import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Dual-mode guard for the analytics-router event endpoint.
 *
 * Accepts either:
 *   A) Authorization: Bearer <JWT signed with JWT_SECRET, payload: { role: "ADMIN" }>
 *      → used by admin dashboard / external callers
 *
 *   B) x-internal-key: <INTERNAL_API_KEY>
 *      → used by the Next.js server-side /api/track proxy for internal
 *        service-to-service calls (no JWT needed, shared secret is enough)
 *
 * Mode B is safe because INTERNAL_API_KEY is only available server-side
 * (never exposed in the browser bundle) and traffic flows inside the
 * Docker network in production.
 */
@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // ── Mode B: internal service-to-service key ───────────────────────────────
    const internalKey = this.config.get<string>('INTERNAL_API_KEY');
    const providedKey = req.headers['x-internal-key'] as string | undefined;

    if (internalKey && providedKey && providedKey === internalKey) {
      return true; // trusted internal caller
    }

    // ── Mode A: Bearer JWT ────────────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Provide either Authorization: Bearer <jwt> or x-internal-key header',
      );
    }

    try {
      const token = authHeader.slice(7);
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      }) as { role?: string };

      if (payload.role !== 'ADMIN') {
        throw new ForbiddenException('Admin access required');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
