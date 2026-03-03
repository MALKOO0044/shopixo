import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin endpoint to check and provide migration SQL for import fidelity columns.
// This helps fix schema cache errors in production.
type RequiredColumn = { name: string; type: string; default: string };

const PRODUCT_QUEUE_REQUIRED_COLUMNS: RequiredColumn[] = [
  { name: 'store_sku', type: 'TEXT', default: 'NULL' },
  { name: 'description_en', type: 'TEXT', default: 'NULL' },
  { name: 'overview', type: 'TEXT', default: 'NULL' },
  { name: 'product_info', type: 'TEXT', default: 'NULL' },
  { name: 'size_info', type: 'TEXT', default: 'NULL' },
  { name: 'product_note', type: 'TEXT', default: 'NULL' },
  { name: 'packing_list', type: 'TEXT', default: 'NULL' },
  { name: 'video_url', type: 'TEXT', default: 'NULL' },
  { name: 'video_source_url', type: 'TEXT', default: 'NULL' },
  { name: 'video_4k_url', type: 'TEXT', default: 'NULL' },
  { name: 'video_delivery_mode', type: 'TEXT', default: 'NULL' },
  { name: 'video_quality_gate_passed', type: 'BOOLEAN', default: 'NULL' },
  { name: 'video_source_quality_hint', type: 'TEXT', default: 'NULL' },
  { name: 'media_mode', type: 'TEXT', default: 'NULL' },
  { name: 'supplier_rating', type: 'NUMERIC(3,1)', default: 'NULL' },
  { name: 'review_count', type: 'INTEGER', default: '0' },
  { name: 'available_colors', type: 'JSONB', default: 'NULL' },
  { name: 'available_sizes', type: 'JSONB', default: 'NULL' },
  { name: 'color_image_map', type: 'JSONB', default: 'NULL' },
  { name: 'variant_pricing', type: 'JSONB', default: "'[]'::JSONB" },
  { name: 'variants', type: 'JSONB', default: "'[]'::JSONB" },
  { name: 'calculated_retail_sar', type: 'NUMERIC(10,2)', default: 'NULL' },
];

const PRODUCTS_REQUIRED_COLUMNS: RequiredColumn[] = [
  { name: 'store_sku', type: 'TEXT', default: 'NULL' },
  { name: 'description', type: 'TEXT', default: 'NULL' },
  { name: 'overview', type: 'TEXT', default: 'NULL' },
  { name: 'product_info', type: 'TEXT', default: 'NULL' },
  { name: 'size_info', type: 'TEXT', default: 'NULL' },
  { name: 'product_note', type: 'TEXT', default: 'NULL' },
  { name: 'packing_list', type: 'TEXT', default: 'NULL' },
  { name: 'video_url', type: 'TEXT', default: 'NULL' },
  { name: 'video_source_url', type: 'TEXT', default: 'NULL' },
  { name: 'video_4k_url', type: 'TEXT', default: 'NULL' },
  { name: 'video_delivery_mode', type: 'TEXT', default: 'NULL' },
  { name: 'video_quality_gate_passed', type: 'BOOLEAN', default: 'NULL' },
  { name: 'video_source_quality_hint', type: 'TEXT', default: 'NULL' },
  { name: 'media_mode', type: 'TEXT', default: 'NULL' },
  { name: 'supplier_rating', type: 'NUMERIC(3,1)', default: 'NULL' },
  { name: 'review_count', type: 'INTEGER', default: '0' },
  { name: 'available_colors', type: 'JSONB', default: 'NULL' },
  { name: 'available_sizes', type: 'JSONB', default: 'NULL' },
  { name: 'color_image_map', type: 'JSONB', default: 'NULL' },
];

function readEnv(name: string): string | undefined {
  const env = (globalThis as any)?.process?.env;
  const value = env?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isMissingColumnError(error: any, columnName: string): boolean {
  if (!error) return false;
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === 'PGRST204') return true;
  if (new RegExp(`column\\s+['\"]?${columnName}['\"]?\\s+does not exist`, 'i').test(message)) return true;
  return /column .* does not exist|does not exist/i.test(message);
}

async function checkMissingColumns(admin: any, tableName: string, requiredColumns: RequiredColumn[]): Promise<string[]> {
  const missingColumns: string[] = [];
  
  for (const col of requiredColumns) {
    try {
      const { error } = await admin
        .from(tableName)
        .select(col.name)
        .limit(1);

      if (isMissingColumnError(error, col.name)) {
        missingColumns.push(col.name);
      }
    } catch (err) {
      missingColumns.push(col.name);
    }
  }
  
  return missingColumns;
}

function generateMigrationSQL(tableName: string, requiredColumns: RequiredColumn[], missingColumns: string[]): string {
  if (missingColumns.length === 0) return '';
  
  return requiredColumns
    .filter(col => missingColumns.includes(col.name))
    .map(col => `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`)
    .join('\n');
}

async function buildSchemaStatus(admin: any) {
  const [missingQueueColumns, missingProductColumns] = await Promise.all([
    checkMissingColumns(admin, 'product_queue', PRODUCT_QUEUE_REQUIRED_COLUMNS),
    checkMissingColumns(admin, 'products', PRODUCTS_REQUIRED_COLUMNS),
  ]);

  const queueColumnStatus: Record<string, string> = {};
  for (const col of PRODUCT_QUEUE_REQUIRED_COLUMNS) {
    queueColumnStatus[col.name] = missingQueueColumns.includes(col.name) ? 'missing' : 'exists';
  }

  const productColumnStatus: Record<string, string> = {};
  for (const col of PRODUCTS_REQUIRED_COLUMNS) {
    productColumnStatus[col.name] = missingProductColumns.includes(col.name) ? 'missing' : 'exists';
  }

  const missingColumnsByTable = {
    product_queue: missingQueueColumns,
    products: missingProductColumns,
  };

  const migrationSQLParts = [
    generateMigrationSQL('product_queue', PRODUCT_QUEUE_REQUIRED_COLUMNS, missingQueueColumns),
    generateMigrationSQL('products', PRODUCTS_REQUIRED_COLUMNS, missingProductColumns),
  ].filter((part) => part.length > 0);

  const migrationSQL = migrationSQLParts.join('\n');
  const missingColumns = [
    ...missingQueueColumns.map((col) => `product_queue.${col}`),
    ...missingProductColumns.map((col) => `products.${col}`),
  ];
  const ready = missingColumns.length === 0;

  return {
    success: ready,
    ready,
    missingCount: missingColumns.length,
    totalRequired: PRODUCT_QUEUE_REQUIRED_COLUMNS.length + PRODUCTS_REQUIRED_COLUMNS.length,
    missingColumns,
    missingColumnsByTable,
    tables: {
      product_queue: {
        requiredCount: PRODUCT_QUEUE_REQUIRED_COLUMNS.length,
        missingColumns: missingQueueColumns,
        columnStatus: queueColumnStatus,
      },
      products: {
        requiredCount: PRODUCTS_REQUIRED_COLUMNS.length,
        missingColumns: missingProductColumns,
        columnStatus: productColumnStatus,
      },
    },
    migrationSQL: migrationSQL || null,
    instructions: ready
      ? ['All required fidelity columns exist. Your database schema is ready for imports.']
      : [
          '1. Go to your Supabase Dashboard.',
          '2. Open SQL Editor.',
          '3. Copy and run the migrationSQL shown below.',
          '4. Go to Settings -> API.',
          '5. Click Reload schema.',
          '6. Return to Shopixo and retry import.',
        ],
  };
}

export async function GET() {
  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      success: false, 
      error: "Supabase credentials not configured" 
    }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const schemaStatus = await buildSchemaStatus(admin);
  return NextResponse.json(schemaStatus);
}

export async function POST() {
  // POST re-checks schema status (same as GET)
  // Actual migration must be done manually via Supabase SQL Editor.
  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      success: false, 
      error: "Supabase credentials not configured" 
    }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const schemaStatus = await buildSchemaStatus(admin);

  return NextResponse.json({
    ...schemaStatus,
    action: schemaStatus.ready
      ? 'No action required.'
      : 'Run migrationSQL in Supabase SQL Editor, reload schema, and retry import.',
    message: schemaStatus.ready
      ? 'All required columns exist. Schema is ready.'
      : `${schemaStatus.missingCount} required columns are missing across product_queue/products.`,
  });
}
