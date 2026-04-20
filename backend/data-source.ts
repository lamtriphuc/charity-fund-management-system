import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'charity_fund_db',
    synchronize: false,
    logging: true,
    entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/src/migrations/*{.ts,.js}'],
});