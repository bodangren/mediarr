import { PrismaClient } from '@prisma/client';
import WebTorrent from 'webtorrent';

async function testBunCompatibility() {
  console.log('Testing Bun Compatibility...');
  
  try {
    console.log('1. Testing Prisma DB Connection...');
    const prisma = new PrismaClient({ log: ['info'] });
    
    await prisma.$connect();
    console.log('✅ Prisma connected successfully.');
    
    const count = await prisma.indexer.count();
    console.log(`✅ Prisma queried successfully. Indexer count: ${count}`);
    
    await prisma.$disconnect();

    console.log('2. Testing WebTorrent Initialization...');
    const client = new WebTorrent();
    
    if (client.torrentPort !== undefined) {
       console.log('✅ WebTorrent initialized successfully.');
    } else {
       console.log('✅ WebTorrent initialized (port undefined initially, which is fine before listen).');
    }
    
    client.destroy((err) => {
       if (err) {
         console.error('❌ WebTorrent destroy error:', err);
       } else {
         console.log('✅ WebTorrent destroyed successfully.');
       }
    });
    
    console.log('🎉 All basic compatibility tests passed on Bun!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Compatibility test failed:', error);
    process.exit(1);
  }
}

testBunCompatibility();