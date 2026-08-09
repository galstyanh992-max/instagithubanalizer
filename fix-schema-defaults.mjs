import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Fix id @default(cuid())
content = content.replace(/id(\s+)String(\s+)@id(\s*)\n/g, 'id$1String$2@id @default(cuid())\n');

// Fix updatedAt @updatedAt
content = content.replace(/updatedAt(\s+)DateTime(\s*)\n/g, 'updatedAt$1DateTime @updatedAt\n');

// Fix createdAt @default(now()) if missing
content = content.replace(/createdAt(\s+)DateTime(\s*)\n/g, 'createdAt$1DateTime @default(now())\n');

fs.writeFileSync('prisma/schema.prisma', content);
