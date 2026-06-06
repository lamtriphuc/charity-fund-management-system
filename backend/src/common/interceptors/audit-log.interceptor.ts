// import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
// import { catchError, Observable, tap, throwError } from "rxjs";
// import { SearchService } from "src/modules/search/search.service";

// @Injectable()
// export class AuditLogInterceptor implements NestInterceptor {
//     constructor(private readonly searchService: SearchService) { }

//     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//         const ctx = context.switchToHttp();
//         const request = ctx.getRequest();

//         const isWriteAction = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

//         if (!isWriteAction) {
//             return next.handle();
//         }

//         const user = request.user;
//         const startTime = Date.now();

//         return next.handle().pipe(
//             tap(() => {
//                 const duration = Date.now() - startTime;
//                 this.logToElastic(request, user, 'SUCCESS', duration);
//             }),
//             catchError((err) => {
//                 const duration = Date.now() - startTime;
//                 this.logToElastic(request, user, 'FAILED', duration, err.message);
//                 return throwError(() => err);
//             })
//         );
//     }

//     private logToElastic(
//         request: any,
//         user: any,
//         status: 'SUCCESS' | 'FAILED',
//         durationMs: number,
//         errorMessage?: string
//     ) {
//         const safeBody = { ...request.body };
//         ['password', 'hashedPassword', 'refreshToken', 'token'].forEach(key => delete safeBody[key]);

//         const url = request.url.split('?')[0];
//         const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
//         const match = url.match(uuidRegex);

//         let entity = 'UNKNOWN';
//         let entityId = null;
//         let action = `${request.method}_API`;

//         try {
//             if (match) {
//                 entityId = match[0];
//                 const partsBeforeId = url.split(`/${entityId}`)[0].split('/');
//                 entity = partsBeforeId[partsBeforeId.length - 1].toUpperCase();

//                 const partsAfterId = url.split(`/${entityId}/`);
//                 if (partsAfterId.length > 1) {
//                     action = `${partsAfterId[1].toUpperCase()}_${entity}`;
//                 } else {
//                     action = `${request.method}_${entity}`;
//                 }
//             } else {
//                 const cleanParts = url
//                     .split('/')
//                     .filter(p => p && p !== 'api' && p !== 'v1' && p !== 'admin' && p !== 'auditor');

//                 if (cleanParts.length > 0) {
//                     entity = cleanParts[cleanParts.length - 1].toUpperCase();
//                     action = `${request.method}_${entity}`;
//                 }
//             }
//         } catch (e) {
//             action = 'PARSE_URL_ERROR';
//         }

//         const logData = {
//             timestamp: new Date().toISOString(),
//             actor_id: user?.id || 'GUEST',
//             actor_email: user?.email || 'Unknown',
//             actor_role: user?.role || 'Unknown',
//             action: request.action || action,
//             entity,
//             entity_id: entityId,
//             ip_address: request.ip || request.headers['x-forwarded-for'] || 'Unknown',
//             payload: safeBody,
//             status,
//             duration_ms: durationMs,
//             error: errorMessage,
//             severity: status === 'FAILED' ? 'WARN' : 'INFO'
//         };

//         this.searchService.logAction(logData).catch(err =>
//             console.error('Lỗi ghi log ES:', err)
//         );
//     }
// }