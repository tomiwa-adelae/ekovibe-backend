import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VenueOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Access denied');

    const profile = await this.prisma.venueOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) throw new ForbiddenException('Venue owner account required');

    request.venueOwner = profile;
    return true;
  }
}
