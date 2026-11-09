import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
