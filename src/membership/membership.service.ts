import { Injectable } from '@nestjs/common';
import Mailjet from 'node-mailjet';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMembershipApplicationDto } from './dto/create-membership-application.dto';
import { MembershipApplicationConfirmationEmail } from 'emails/membership-application-confirmation-email';
import { MembershipApplicationAdminEmail } from 'emails/membership-application-admin-email';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  async submitApplication(dto: CreateMembershipApplicationDto) {
    const application = await this.prisma.membershipApplication.create({
      data: dto,
    });

    const mj = getMailjet();

    // 1. Confirmation to applicant
    await mj.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.SENDER_EMAIL_ADDRESS,
            Name: 'Ekovibe',
          },
          To: [{ Email: application.email, Name: application.fullName }],
          Subject: `Your Ekovibe ${application.tier === 'GOLD' ? 'Gold' : 'Black'} Membership Application`,
          HTMLPart: MembershipApplicationConfirmationEmail({
            fullName: application.fullName,
            tier: application.tier as 'GOLD' | 'BLACK',
          }),
        },
      ],
    });

    // 2. Alert to admin team
    const adminEmail = process.env.ADMIN_EMAIL_ADDRESS || process.env.SENDER_EMAIL_ADDRESS!;
    await mj.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.SENDER_EMAIL_ADDRESS,
            Name: 'Ekovibe System',
          },
          To: [{ Email: adminEmail, Name: 'Ekovibe Team' }],
          Subject: `New ${application.tier} Membership Application — ${application.fullName}`,
          HTMLPart: MembershipApplicationAdminEmail({
            fullName: application.fullName,
            email: application.email,
            phone: application.phone,
            occupation: application.occupation,
            city: application.city,
            tier: application.tier as 'GOLD' | 'BLACK',
            referral: application.referral ?? undefined,
            message: application.message ?? undefined,
          }),
        },
      ],
    });

    return { message: 'Application submitted successfully.' };
  }
}
