import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      select
        schemaname,
        tablename,
        rowsecurity
      from pg_tables
      where schemaname = 'public'
      order by tablename;
    `)
    const policies = await prisma.$queryRawUnsafe(`
      select
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname;
    `)
    
    console.log(JSON.stringify({ tables, policies }, null, 2))
  } catch (error) {
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
