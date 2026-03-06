import { Body, Controller, Post } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { CreateMembershipApplicationDto } from './dto/create-membership-application.dto';
import { Public } from 'src/decorators/public.decorator';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Public()
  @Post('apply')
  submitApplication(@Body() dto: CreateMembershipApplicationDto) {
    return this.membershipService.submitApplication(dto);
  }
}
