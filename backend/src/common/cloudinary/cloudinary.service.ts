import { Injectable } from "@nestjs/common";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

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
}