import { SetMetadata } from '@nestjs/common';
import { Permission } from 'src/modules/users/dto/user.dto';

export const PERMISSIONS_KEY = 'permissions';

// Yêu cầu User phải có các quyền này mới được vào API
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);