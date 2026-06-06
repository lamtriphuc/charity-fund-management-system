import { Client } from "@elastic/elasticsearch";
import { AppDataSource } from "data-source";

const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
});

async function reset() {
  await AppDataSource.initialize();

  await AppDataSource.query(`
    TRUNCATE TABLE
      accounts,
      campaigns,
      disbursement_proofs,
      disbursements,
      donations,
      kyc_profiles,
      ledger_lines,
      ledger_transactions,
      notifications,
      roles,
      users,
      archived_logs,
      audit_logs
    RESTART IDENTITY CASCADE;
  `);

  try {
    const indices = await esClient.cat.indices({
      index: "audit-logs-*",
      format: "json",
    });

    const indexNames = indices
      .map((item: any) => item.index)
      .filter(Boolean);

    for (const indexName of indexNames) {
      await esClient.indices.delete({
        index: indexName,
      });

      console.log(`Deleted Elasticsearch index: ${indexName}`);
    }

    if (indexNames.length === 0) {
      console.log("No Elasticsearch audit log indices found");
    }
  } catch (error) {
    console.warn("Cannot reset Elasticsearch audit logs:", error.message);
  }

  console.log('Database reset completed');

  process.exit(0);
}

reset();