import fs from 'fs';
import path from 'path';

const schemaPath = 'prisma/schema.prisma';
const original = fs.readFileSync(schemaPath, 'utf8');

const lines = original.split('\n');
const models = [];
let currentModel = null;

for (const line of lines) {
  const match = line.match(/^model\s+([A-Za-z0-9_]+)\s+{/);
  if (match) {
    currentModel = {
      name: match[1],
      dbName: match[1], // default
      ownerField: null
    };
    models.push(currentModel);
    continue;
  }
  
  if (currentModel) {
    if (line.trim() === '}') {
      currentModel = null;
      continue;
    }
    
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    if (mapMatch) {
      currentModel.dbName = mapMatch[1];
    }
    
    // Check for owner field
    if (line.match(/^\s+ownerUserId\s+String/)) {
      currentModel.ownerField = 'ownerUserId';
    } else if (line.match(/^\s+ownerId\s+String/) && !currentModel.ownerField) {
      currentModel.ownerField = 'ownerId';
    } else if (currentModel.name === 'User' && line.match(/^\s+id\s+String/)) {
      currentModel.ownerField = 'id';
    }
    
    // Specific field names
    if (line.match(/@map\("user_id"\)/) && currentModel.ownerField === 'ownerUserId') {
      currentModel.ownerFieldDB = 'user_id';
    }
  }
}

let sql = `-- JARVIS Clean Baseline RLS Security Migration\n\n`;

for (const m of models) {
  const table = m.dbName;
  const ownerField = m.ownerFieldDB || m.ownerField;
  
  if (!ownerField) {
    sql += `-- WARNING: Model ${m.name} lacks an owner field. Defaulting to deny all.\n`;
    sql += `ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;\n\n`;
    continue;
  }

  sql += `-- RLS for ${m.name} (mapped to ${table})\n`;
  sql += `ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;\n\n`;
  
  // Single policy: allow owner, deny others
  sql += `CREATE POLICY "owner_all_${m.name}" ON "public"."${table}"\n`;
  sql += `  FOR ALL\n`;
  sql += `  USING ( auth.uid()::text = "${ownerField}" )\n`;
  sql += `  WITH CHECK ( auth.uid()::text = "${ownerField}" );\n\n`;
}

// Create migration dir and file
const dir = path.join('prisma', 'migrations', '00000000000001_jarvis_single_owner_rls');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(path.join(dir, 'migration.sql'), sql);
console.log('RLS SQL generated successfully.');
