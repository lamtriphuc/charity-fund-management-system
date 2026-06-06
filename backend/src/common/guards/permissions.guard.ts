import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from 'src/modules/users/dto/user.dto';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        // Lấy danh sách quyền API yêu cầu từ Decorator
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Nếu API không gắn @RequirePermissions, tức là ai cũng vào được (đã qua AuthGuard)
        if (!requiredPermissions) {
            return true;
        }

        // Lấy thông tin user từ request (Do JwtStrategy giải mã)
        const { user } = context.switchToHttp().getRequest();

        if (!user || !user.permissions) {
            throw new ForbiddenException('Truy cập bị từ chối: Không nhận diện được quyền hạn.');
        }

        if (user.permissions.includes(Permission.ALL)) {
            return true;
        }

        // Kiểm tra xem User có TẤT CẢ các quyền mà API yêu cầu không
        const hasPermission = requiredPermissions.every(permission =>
            user.permissions.includes(permission)
        );

        if (!hasPermission) {
            throw new ForbiddenException('Bạn không có quyền thực hiện nghiệp vụ này!');
        }

        return true;
    }
}