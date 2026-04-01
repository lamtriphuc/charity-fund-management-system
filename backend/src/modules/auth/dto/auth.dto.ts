import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    fullName: string;
}

export class LoginDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    password: string;
}