import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin endpoint to check and provide migration SQL for product_queue table
// This helps fix PGRST204 schema cache errors in production

// All columns that the import system requires
const REQUIRED_COLUMNS = [
  // Media + SKU
  { name: 'video_url', type: 'TEXT', default: 'NULL' },
  { name: 'has_video', type: 'BOOLEAN', default: 'false' },
  { name: 'product_code', type: 'TEXT', default: 'NULL' },
  // Existing optional product metadata
  { name: 'weight_g', type: 'NUMERIC', default: 'NULL' },
  { name: 'pack_length', type: 'NUMERIC', default: 'NULL' },
  { name: 'pack_width', type: 'NUMERIC', default: 'NULL' },
  { name: 'pack_height', type: 'NUMERIC', default: 'NULL' },
  { name: 'material', type: 'TEXT', default: 'NULL' },
  { name: 'origin_country', type: 'TEXT', default: 'NULL' },
  { name: 'hs_code', type: 'TEXT', default: 'NULL' },
  { name: 'category_name', type: 'TEXT', default: 'NULL' },
  { name: 'available_colors', type: 'JSONB', default: 'NULL' },
  { name: 'available_sizes', type: 'JSONB', default: 'NULL' },
  { name: 'size_chart_images', type: 'JSONB', default: 'NULL' },
  { name: 'cj_category_id', type: 'TEXT', default: 'NULL' },
];

async function checkMissingColumns(admin: any): Promise<string[]> {
  const missingColumns: string[] = [];
  
  for (const col of REQUIRED_COLUMNS) {
    try {
      const { error } = await admin
        .from('product_queue')
        .select(col.name)
        .limit(1);

      if (error?.code === 'PGRST204') {
        missingColumns.push(col.name);
      }
    } catch (err) {
      missingColumns.push(col.name);
    }
  }
  
  return missingColumns;
}

function generateMigrationSQL(missingColumns: string[]): string {
  if (missingColumns.length === 0) return '';
  
  return REQUIRED_COLUMNS
    .filter(col => missingColumns.includes(col.name))
    .map(col => `ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`)
    .join('\n');
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      success: false, 
      error: "Supabase credentials not configured" 
    }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const missingColumns = await checkMissingColumns(admin);
  const migrationSQL = generateMigrationSQL(missingColumns);

  const columnStatus: Record<string, string> = {};
  for (const col of REQUIRED_COLUMNS) {
    columnStatus[col.name] = missingColumns.includes(col.name) ? 'missing' : 'exists';
  }

  return NextResponse.json({
    success: missingColumns.length === 0,
    ready: missingColumns.length === 0,
    missingCount: missingColumns.length,
    totalRequired: REQUIRED_COLUMNS.length,
    missingColumns,
    columnStatus,
    migrationSQL: migrationSQL || null,
    instructions: missingColumns.length > 0 ? [
      '1. Go to your Supabase Dashboard',
      '2. Navigate to SQL Editor',
      '3. Paste and run the migrationSQL provided below',
      '4. Go to Settings → API',
      '5. Click "Reload schema" button',
      '6. Return to Shopixo and try importing products again'
    ] : ['All required columns exist. Your database schema is ready for imports.']
  });
}

export async function POST(request: NextRequest) {
  // POST just re-checks the schema status (same as GET)
  // Actual migration must be done manually via Supabase SQL Editor
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      success: false, 
      error: "Supabase credentials not configured" 
    }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const missingColumns = await checkMissingColumns(admin);
  const migrationSQL = generateMigrationSQL(missingColumns);

  if (missingColumns.length > 0) {
    return NextResponse.json({
      success: false,
      message: `${missingColumns.length} columns are missing from product_queue table.`,
      missingColumns,
      migrationSQL,
      action: 'Please run the SQL below in your Supabase SQL Editor, then reload the schema.',
      instructions: [
        '1. Copy the migrationSQL below',
        '2. Go to Supabase Dashboard → SQL Editor',
        '3. Paste and run the SQL',
        '4. Go to Settings → API → Click "Reload schema"',
        '5. Try importing products again'
      ]
    });
  }

  return NextResponse.json({
    success: true,
    message: 'All required columns exist in product_queue table. Schema is ready.',
    missingColumns: [],
    migrationSQL: null
  });
}
