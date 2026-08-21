const { Client } = require("pg");

async function main() {
  const c = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  });
  await c.connect();
  const cols = await c.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('orders', 'payments', 'reports')
      and column_name in (
        'source_result_id', 'currency', 'product_name_snapshot',
        'provider_order_id', 'requested_amount', 'approved_amount',
        'payment_key', 'status', 'order_id'
      )
    order by 1, 2
  `);
  const prod = await c.query(
    `select id, name, sale_price, status from products where slug = '2026-total'`
  );
  const mig = await c.query(
    `select version from supabase_migrations.schema_migrations where version like '0011%'`
  );
  console.log(
    JSON.stringify(
      { phase6cols: cols.rows, product: prod.rows, migration0011: mig.rows },
      null,
      2
    )
  );
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
