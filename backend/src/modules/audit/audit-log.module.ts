import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "./audit-log.entity";
import { SearchModule } from "../search/search.module";
import { AuditLogService } from "./audit-log.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    SearchModule,
  ],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}