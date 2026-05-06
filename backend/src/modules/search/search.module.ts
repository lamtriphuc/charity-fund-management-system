import { Module } from "@nestjs/common";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { SearchService } from "./search.service";
import { AuditController } from "./audit.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([Campaign]),
        ElasticsearchModule.register({
            node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
            // auth: {
            //     username: process.env.ELASTIC_USERNAME || 'elastic',
            //     password: process.env.ELASTIC_PASSWORD || 'changeme',
            // }
        })
    ],
    controllers: [AuditController],
    providers: [SearchService],
    exports: [SearchService]
})
export class SearchModule { }