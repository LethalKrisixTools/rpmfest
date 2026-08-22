import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type LegacyProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  shortDescription?: string;
  description?: string;
  images: string[];
  active: boolean;
  featured: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function uploadImage(localPath: string, productId: string): Promise<string | null> {
  const absolutePath = join(process.cwd(), 'public', localPath);
  const bytes = readFileSync(absolutePath);
  const ext = extname(localPath) || '.svg';
  const storagePath = `${productId}${ext}`;
  const contentType = ext === '.svg' ? 'image/svg+xml' : 'image/png';

  const { error } = await supabase.storage
    .from('product-images')
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const raw = readFileSync(join(process.cwd(), 'public', 'data', 'store.json'), 'utf8');
  const { products } = JSON.parse(raw) as { products: LegacyProduct[] };

  for (const legacy of products) {
    const images: string[] = [];
    for (const img of legacy.images) {
      const url = await uploadImage(img, legacy.id);
      if (url) images.push(url);
    }

    const { error } = await supabase.from('products').upsert(
      {
        slug: legacy.id,
        name: legacy.name,
        short_description: legacy.shortDescription ?? null,
        description: legacy.description ?? null,
        price_cents: Math.round(legacy.price * 100),
        stock: legacy.stock ?? null,
        category: legacy.category ?? null,
        images,
        active: legacy.active !== false,
        featured: legacy.featured === true
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.error(`Failed to migrate ${legacy.id}:`, error.message);
    } else {
      console.log(`Migrated ${legacy.id} -> slug "${legacy.id}"`);
    }
  }
}

main().then(() => process.exit(0));
