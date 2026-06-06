import { Module } from "@nestjs/common";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { SearchService } from "./search.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { SearchController } from "./search.controller";

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
    controllers: [SearchController],
    providers: [SearchService],
    exports: [SearchService]
})
export class SearchModule { }