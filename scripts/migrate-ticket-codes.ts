/**
 * One-time migration: update all existing tickets from UUID codes
 * to the short human-readable format (e.g. LAPD-X7K3MN).
 *
 * Run from backend/ directory:
 *   pnpm migrate:ticket-codes
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env manually (dotenv not installed as a direct dep)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf-8');
  for (const line of raw.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (match) {
      const [, key, val] = match;
      if (!process.env[key]) process.env[key] = val.replace(/^["']|["']$/g, '');
    }
  }
}

import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { PrismaClient } from '../generated/prisma/client';

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const TICKET_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateTicketCode(eventTitle: string): string {
  const abbrev = eventTitle
    .split(/\s+/)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 4)
    .join('');

  let random = '';
  for (let i = 0; i < 6; i++) {
    random += TICKET_CHARSET[Math.floor(Math.random() * TICKET_CHARSET.length)];
  }

  return `${abbrev}-${random}`;
}

async function main() {
  const tickets = await prisma.ticket.findMany({
    include: {
      order: {
        include: {
          event: { select: { title: true } },
        },
      },
    },
  });

  console.log(`Found ${tickets.length} ticket(s) to migrate.`);

  const usedCodes = new Set<string>();
  let updated = 0;

  for (const ticket of tickets) {
    const eventTitle = ticket.order.event.title;

    let code: string = '';
    let attempts = 0;
    do {
      code = generateTicketCode(eventTitle);
      attempts++;
      if (attempts > 50) throw new Error(`Cannot generate unique code for ticket ${ticket.id}`);
    } while (usedCodes.has(code));

    usedCodes.add(code);

    await prisma.ticket.update({ where: { id: ticket.id }, data: { code } });
    console.log(`  ${ticket.id.slice(0, 8)}… → ${code}`);
    updated++;
  }

  console.log(`\nDone. ${updated} ticket(s) migrated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
