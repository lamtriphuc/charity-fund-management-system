import { Body, Controller, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { DisbursementService } from './disbursement.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuditProofDto, TransferDisbursementDto } from './dto/disbursement.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('disbursements')
export class DisbursementController {
    constructor(private readonly disbursementService: DisbursementService) { }

    // 1. ADMIN XÁC NHẬN CHUYỂN TIỀN
    @Patch(':id/transfer')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    confirmTransfer(
        @Param('id') id: string,
        @Body() dto: TransferDisbursementDto
    ) {
        return this.disbursementService.confirmTransfer(id, dto);
    }

    // 2. TNV UPLOAD CHỨNG TỪ
    @Post(':id/proofs')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    @UseInterceptors(FileInterceptor('receiptImage')) // Tên trường file form-data là 'receiptImage'
    uploadProof(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.disbursementService.uploadProof(id, user.id, file);
    }

    // 3. KIỂM TOÁN VIÊN DUYỆT CHỨNG TỪ
    @Patch('proofs/:proofId/audit')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('AUDITOR', 'ADMIN') // Cho phép cả Admin và Auditor làm việc này
    auditProof(
        @Param('proofId') proofId: string,
        @Body() dto: AuditProofDto
    ) {
        return this.disbursementService.auditProof(proofId, dto);
    }
}
