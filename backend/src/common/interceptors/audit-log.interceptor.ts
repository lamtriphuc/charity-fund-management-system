import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { SearchService } from "src/modules/search/search.service";

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(private readonly searchService: SearchService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();

        // Thu thập thông tin Request
        const method = request.method;
        const url = request.url;
        const ip = request.ip || request.headers['x-forwarded-for'];
        const user = request.user; // Lấy từ JWT Guard
        const body = request.body;

        // Không log mật khẩu hoặc thông tin nhạy cảm
        const safeBody = { ...body };
        if (safeBody.password) delete safeBody.password;

        return next.handle().pipe(
            tap((response) => {
                // Chỉ log các thao tác quan trọng (POST, PUT, DELETE) hoặc các route của Admin
                if (method !== 'GET' || url.includes('/admin')) {
                    const logData = {
                        actor_id: user?.id || 'GUEST',
                        actor_email: user?.email || 'Unknown',
                        actor_role: user?.role?.name || 'Unknown',
                        action: `${method} ${url}`,
                        ip_address: ip,
                        payload: safeBody,
                        status: 'SUCCESS',
                    };

                    // Đẩy ngầm sang Elasticsearch
                    this.searchService.logAction(logData);
                }
            }),
        );
    }
}