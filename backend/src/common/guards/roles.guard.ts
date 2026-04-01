import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Đọc các roles được yêu cầu từ decorator @Roles()
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true; // Nếu API không yêu cầu role nào, cho qua
        }

        const { user } = context.switchToHttp().getRequest();

        // Kiểm tra xem Role của user trong token có khớp với Role yêu cầu không
        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException('Bạn không có quyền truy cập tính năng này');
        }

        return true;
    }
}