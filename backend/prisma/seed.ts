import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const ROUNDS = 12;

async function main() {
  const users = [
    { username: 'Poli', password: '651005', role: 'ADMIN' as const },
    { username: 'Jeab', password: '030330', role: 'ADMIN' as const },
    { username: 'Yowthi', password: '1234', role: 'GUIDED' as const },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, ROUNDS);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, role: u.role },
      create: { username: u.username, passwordHash, role: u.role },
    });
    console.log(`Upserted user: ${u.username}`);
  }

  const processingItems = [
    { id: 'H01', type: 'H01' as const, name: '原料加工 / แยกใบพลู' },
    { id: 'H02', type: 'H02' as const, name: '成品加工 / ตัดก้านใบพลู' },
    { id: 'H03', type: 'H03' as const, name: '瑕疵品加工 / แปรรูปใบเกรดสอง' },
  ];

  for (const item of processingItems) {
    await prisma.processingItem.upsert({
      where: { id: item.id },
      update: { name: item.name, type: item.type },
      create: { id: item.id, type: item.type, name: item.name },
    });
    console.log(`Upserted processingItem: ${item.id} - ${item.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
