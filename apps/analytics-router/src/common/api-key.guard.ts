import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guards the POST /api/event endpoint with a pre-shared internal API key.
 *
 * The Next.js frontend must include the header:
 *   x-internal-key: <INTERNAL_API_KEY>
 *
 * This prevents external actors from flooding the event queue.
 * For production, also consider IP allow-listing at the load-balancer level.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validKey: string;

  constructor(config: ConfigService) {
    this.validKey = config.get<string>('INTERNAL_API_KEY') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers['x-internal-key'];

    if (!provided || provided !== this.validKey) {
      throw new UnauthorizedException(
        'Missing or invalid x-internal-key header',
      );
    }
    return true;
  }
}
