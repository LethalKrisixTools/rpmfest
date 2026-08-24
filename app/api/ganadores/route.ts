import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type WinnerRow = { category_id: string; person_name: string; car_name: string; car_info: string; image_url: string | null };
type CategoryOut = { id: string; name: string; winner: Omit<WinnerRow, 'category_id'> | null };

export async function GET() {
  const admin = createAdminClient();

  const [editionsRes, categoriesRes, winnersRes] = await Promise.all([
    admin.from('award_editions').select('id, name, year').order('year', { ascending: false }),
    admin.from('award_categories').select('id, edition_id, name').order('sort_order'),
    admin
      .from('award_winners')
      .select('category_id, person_name, car_name, car_info, image_url')
      .order('rank')
  ]);

  if (editionsRes.error || categoriesRes.error || winnersRes.error) {
    console.error('ganadores: failed to load data', editionsRes.error, categoriesRes.error, winnersRes.error);
    return NextResponse.json({ error: 'No se pudieron cargar los ganadores.' }, { status: 500 });
  }

  const winnersByCategory = new Map<string, Omit<WinnerRow, 'category_id'>>();
  for (const w of (winnersRes.data ?? []) as WinnerRow[]) {
    if (!winnersByCategory.has(w.category_id)) {
      winnersByCategory.set(w.category_id, {
        person_name: w.person_name,
        car_name: w.car_name,
        car_info: w.car_info,
        image_url: w.image_url
      });
    }
  }

  const categoriesByEdition = new Map<string, CategoryOut[]>();
  for (const cat of categoriesRes.data ?? []) {
    const list = categoriesByEdition.get(cat.edition_id) ?? [];
    list.push({ id: cat.id, name: cat.name, winner: winnersByCategory.get(cat.id) ?? null });
    categoriesByEdition.set(cat.edition_id, list);
  }

  const editions = (editionsRes.data ?? []).map((ed) => ({
    id: ed.id,
    name: ed.name,
    year: ed.year,
    categories: categoriesByEdition.get(ed.id) ?? []
  }));

  return NextResponse.json({ editions });
}
