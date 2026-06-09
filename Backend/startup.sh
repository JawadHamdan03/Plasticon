#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Running migrations..."
# Try migrate deploy; if P3005 (non-empty DB with no migration history), baseline first
if ! npx prisma migrate deploy 2>&1; then
  echo "Baselining existing database schema..."
  # Mark all migrations EXCEPT add_sales_rep as already applied
  # (those tables already exist from the original db push)
  npx prisma migrate resolve --applied 20260227194827_plasticon         2>/dev/null || true
  npx prisma migrate resolve --applied 20260227201711_add_chat_system   2>/dev/null || true
  npx prisma migrate resolve --applied 20260228100623_add_student       2>/dev/null || true
  npx prisma migrate resolve --applied 20260302124554_simple_fix        2>/dev/null || true
  npx prisma migrate resolve --applied 20260304230408_edit_schema       2>/dev/null || true
  npx prisma migrate resolve --applied 20260328161453_add_group_member_last_read_at 2>/dev/null || true
  npx prisma migrate resolve --applied 20260331162548_apply_all_schema_enhancements 2>/dev/null || true
  # Now deploy again — only add_sales_rep will run (idempotent SQL, safe to apply)
  npx prisma migrate deploy
fi

echo "Starting server..."
exec npx tsx src/app.ts
