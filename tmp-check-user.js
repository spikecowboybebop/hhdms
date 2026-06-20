const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({
  where: { email: 'dr.arif@hhdms.com' },
  select: { id: true, email: true, status: true }
}).then(u => {
  console.log(JSON.stringify(u, null, 2));
}).catch(e => {
  console.error(e.message);
}).finally(() => {
  p.$disconnect();
});
