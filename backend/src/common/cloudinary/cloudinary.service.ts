import { Injectable } from "@nestjs/common";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

const PROJECT_ROOT = 'CharityFund_App';

export enum CloudinaryFolder {
    AVATARS = `${PROJECT_ROOT}/avatars`,
    KYC_DOCUMENTS = `${PROJECT_ROOT}/kyc_documents`,
    DISBURSEMENT_PROOFS = `${PROJECT_ROOT}/disbursement_proofs`,
}

@Injectable()
export class CloudinaryService {
    uploadFile(
        file: Express.Multer.File,
        folder: string = 'general'
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: folder }, // Lưu vào thư mục chỉ định trên Cloud
                (error, result) => {
                    if (error || !result) return reject(error || 'Upload failed');
                    resolve(result);
                },
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        })
    }

    deleteFile(publicId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(publicId, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });
    }

    // helper lấy public ID từ url
    extractPublicIdFromUrl(url: string): string | null {
        try {
            // Phân tích URL để lấy phần public_id (bao gồm cả tên folder)
            const parts = url.split('/');
            const uploadIndex = parts.findIndex(p => p === 'upload');
            if (uploadIndex === -1) return null;

            // Lấy từ thư mục trở đi, bỏ version (v123456...) và bỏ đuôi (.jpg, .png)
            const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
            const publicId = publicIdWithExt.split('.')[0];
            return publicId;
        } catch (error) {
            return null;
        }
    }
}