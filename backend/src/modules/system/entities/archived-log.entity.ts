import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('archived_logs')
export class ArchivedLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'file_name', type: 'varchar' })
    fileName: string;

    @Column({ name: 'file_url', type: 'varchar' })
    fileUrl: string;

    @Column({ name: 'record_count', type: 'int' })
    recordCount: number;

    @Column({ name: 'from_date', type: 'timestamp' })
    fromDate: Date;

    @Column({ name: 'to_date', type: 'timestamp' })
    toDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}