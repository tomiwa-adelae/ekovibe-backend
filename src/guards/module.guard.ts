import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from 'src/decorators/require-module.decorator';

/**
 * Must run AFTER AdminGuard (which populates request.admin).
 * SUPER_ADMIN and ADMIN always pass.
 * MODERATOR must have the required module in their modules array.
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModule = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No module restriction on this endpoint — allow any admin through
    if (!requiredModule) return true;

    const request = context.switchToHttp().getRequest();
    const admin = request.admin; // set by AdminGuard

    if (!admin) throw new ForbiddenException('Access denied');

    // SUPER_ADMIN and ADMIN have unrestricted access
    if (admin.position === 'SUPER_ADMIN' || admin.position === 'ADMIN') {
      return true;
    }

    // MODERATOR: check assigned modules
    if (!admin.modules?.includes(requiredModule)) {
      throw new ForbiddenException(
        `You don't have access to the "${requiredModule}" module`,
      );
    }

    return true;
  }
}
