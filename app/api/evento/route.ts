import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const admin = createAdminClient();

  const [configRes, activitiesRes, scheduleRes, statsRes, sponsorsRes] = await Promise.all([
    admin.from('event_config').select('*').eq('id', 1).single(),
    admin.from('event_activities').select('icon, title, description, tag').order('sort_order'),
    admin.from('event_schedule').select('time, title, description').order('sort_order'),
    admin.from('event_stats').select('number, label').order('sort_order'),
    admin.from('event_sponsors').select('name, subtitle').order('sort_order')
  ]);

  if (configRes.error) {
    console.error('evento: failed to load event_config', configRes.error);
    return NextResponse.json({ error: 'No se pudo cargar la configuración del evento.' }, { status: 500 });
  }
  if (activitiesRes.error || scheduleRes.error || statsRes.error || sponsorsRes.error) {
    console.error(
      'evento: failed to load event lists',
      activitiesRes.error,
      scheduleRes.error,
      statsRes.error,
      sponsorsRes.error
    );
    return NextResponse.json({ error: 'No se pudo cargar el contenido del evento.' }, { status: 500 });
  }

  const c = configRes.data;

  return NextResponse.json({
    config: {
      name: c.name,
      organizer: c.organizer,
      date: c.event_date,
      location: c.location,
      address: c.address,
      status: c.status,
      dressCode: c.dress_code,
      badge: c.badge,
      title: c.title,
      subtitle: c.subtitle,
      ctaText: c.cta_text,
      ctaLink: c.cta_link,
      ctaStatus: c.cta_status,
      descShort: c.desc_short,
      quote: c.quote
    },
    activities: activitiesRes.data ?? [],
    schedule: scheduleRes.data ?? [],
    stats: statsRes.data ?? [],
    sponsors: sponsorsRes.data ?? []
  });
}
