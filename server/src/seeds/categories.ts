import { PrismaClient } from '@prisma/client';

interface CategoryDef {
  id: number;
  name: string;
  parent_id: number | null;
}

/**
 * Standard Newznab/Torznab categories matching Prowlarr's NewznabStandardCategory.
 * Parent categories use thousands (1000, 2000, ...) and subcategories use offsets of 10.
 */
export const STANDARD_CATEGORIES: CategoryDef[] = [
  // Console
  { id: 1000, name: 'Console', parent_id: null },
  { id: 1010, name: 'Console/NDS', parent_id: 1000 },
  { id: 1020, name: 'Console/PSP', parent_id: 1000 },
  { id: 1030, name: 'Console/Wii', parent_id: 1000 },
  { id: 1040, name: 'Console/XBox', parent_id: 1000 },
  { id: 1050, name: 'Console/XBox 360', parent_id: 1000 },
  { id: 1060, name: 'Console/Wiiware', parent_id: 1000 },
  { id: 1070, name: 'Console/XBox 360 DLC', parent_id: 1000 },
  { id: 1080, name: 'Console/PS3', parent_id: 1000 },
  { id: 1090, name: 'Console/Other', parent_id: 1000 },
  { id: 1110, name: 'Console/3DS', parent_id: 1000 },
  { id: 1120, name: 'Console/PS Vita', parent_id: 1000 },
  { id: 1130, name: 'Console/WiiU', parent_id: 1000 },
  { id: 1140, name: 'Console/XBox One', parent_id: 1000 },
  { id: 1180, name: 'Console/PS4', parent_id: 1000 },

  // Movies
  { id: 2000, name: 'Movies', parent_id: null },
  { id: 2010, name: 'Movies/Foreign', parent_id: 2000 },
  { id: 2020, name: 'Movies/Other', parent_id: 2000 },
  { id: 2030, name: 'Movies/SD', parent_id: 2000 },
  { id: 2040, name: 'Movies/HD', parent_id: 2000 },
  { id: 2045, name: 'Movies/UHD', parent_id: 2000 },
  { id: 2050, name: 'Movies/BluRay', parent_id: 2000 },
  { id: 2060, name: 'Movies/3D', parent_id: 2000 },
  { id: 2070, name: 'Movies/DVD', parent_id: 2000 },
  { id: 2080, name: 'Movies/WEB-DL', parent_id: 2000 },
  { id: 2090, name: 'Movies/x265', parent_id: 2000 },

  // Audio
  { id: 3000, name: 'Audio', parent_id: null },
  { id: 3010, name: 'Audio/MP3', parent_id: 3000 },
  { id: 3020, name: 'Audio/Video', parent_id: 3000 },
  { id: 3030, name: 'Audio/Audiobook', parent_id: 3000 },
  { id: 3040, name: 'Audio/Lossless', parent_id: 3000 },
  { id: 3050, name: 'Audio/Other', parent_id: 3000 },
  { id: 3060, name: 'Audio/Foreign', parent_id: 3000 },

  // PC
  { id: 4000, name: 'PC', parent_id: null },
  { id: 4010, name: 'PC/0day', parent_id: 4000 },
  { id: 4020, name: 'PC/ISO', parent_id: 4000 },
  { id: 4030, name: 'PC/Mac', parent_id: 4000 },
  { id: 4040, name: 'PC/Mobile-Other', parent_id: 4000 },
  { id: 4050, name: 'PC/Games', parent_id: 4000 },
  { id: 4060, name: 'PC/Mobile-iOS', parent_id: 4000 },
  { id: 4070, name: 'PC/Mobile-Android', parent_id: 4000 },

  // TV
  { id: 5000, name: 'TV', parent_id: null },
  { id: 5010, name: 'TV/WEB-DL', parent_id: 5000 },
  { id: 5020, name: 'TV/Foreign', parent_id: 5000 },
  { id: 5030, name: 'TV/SD', parent_id: 5000 },
  { id: 5040, name: 'TV/HD', parent_id: 5000 },
  { id: 5045, name: 'TV/UHD', parent_id: 5000 },
  { id: 5050, name: 'TV/Other', parent_id: 5000 },
  { id: 5060, name: 'TV/Sport', parent_id: 5000 },
  { id: 5070, name: 'TV/Anime', parent_id: 5000 },
  { id: 5080, name: 'TV/Documentary', parent_id: 5000 },
  { id: 5090, name: 'TV/x265', parent_id: 5000 },

  // XXX
  { id: 6000, name: 'XXX', parent_id: null },
  { id: 6010, name: 'XXX/DVD', parent_id: 6000 },
  { id: 6020, name: 'XXX/WMV', parent_id: 6000 },
  { id: 6030, name: 'XXX/XviD', parent_id: 6000 },
  { id: 6040, name: 'XXX/x264', parent_id: 6000 },
  { id: 6045, name: 'XXX/UHD', parent_id: 6000 },
  { id: 6050, name: 'XXX/Pack', parent_id: 6000 },
  { id: 6060, name: 'XXX/ImageSet', parent_id: 6000 },
  { id: 6070, name: 'XXX/Other', parent_id: 6000 },
  { id: 6080, name: 'XXX/SD', parent_id: 6000 },
  { id: 6090, name: 'XXX/WEB-DL', parent_id: 6000 },

  // Books
  { id: 7000, name: 'Books', parent_id: null },
  { id: 7010, name: 'Books/Mags', parent_id: 7000 },
  { id: 7020, name: 'Books/EBook', parent_id: 7000 },
  { id: 7030, name: 'Books/Comics', parent_id: 7000 },
  { id: 7040, name: 'Books/Technical', parent_id: 7000 },
  { id: 7050, name: 'Books/Other', parent_id: 7000 },
  { id: 7060, name: 'Books/Foreign', parent_id: 7000 },

  // Other
  { id: 8000, name: 'Other', parent_id: null },
  { id: 8010, name: 'Other/Misc', parent_id: 8000 },
  { id: 8020, name: 'Other/Hashed', parent_id: 8000 },
];

/**
 * Seeds standard Newznab categories into the database.
 * Uses upsert for idempotency — safe to call multiple times.
 */
export async function seedCategories(prisma: PrismaClient): Promise<number> {
  for (const cat of STANDARD_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, parent_id: cat.parent_id },
      create: cat,
    });
  }
  return STANDARD_CATEGORIES.length;
}
