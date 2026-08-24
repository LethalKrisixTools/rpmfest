insert into public.event_config (id, name, organizer, event_date, location, address, status, dress_code, badge, title, subtitle, cta_text, cta_link, cta_status, desc_short, quote)
values (
  1,
  'RPM FEST',
  'Diamond Squad Events',
  'Sábado 16 de Mayo · 10:00',
  'Circuito Internacional FK1',
  E'Ctra. Comarcal, 602, 47465\nVillaverde de Medina, Valladolid',
  'finalizado',
  'Casual',
  'DIAMOND SQUAD EVENTS',
  'RPM FEST',
  'Sábado 16 de Mayo · 10:00 · Circuito FK1',
  'EXPLORAR EVENTO',
  '#experiencias',
  'FINALIZADO',
  'RPM Fest no es solo una concentración de coches. Es un festival donde el rugido de los motores, la música en directo y el ambiente brutal se fusionan en un día inolvidable en el Circuito FK1.',
  'RPM Fest no es solo una concentración… es un festival del motor.'
)
on conflict (id) do nothing;

insert into public.event_activities (icon, title, description, tag, sort_order) values
  ('🎤', 'Escenario en Directo', 'Artistas en vivo durante toda la jornada. Música y actuaciones para que el festival no pare ni un momento.', 'MÚSICA', 0),
  ('🚗', 'Zona Expo', 'Coches preparados, deportivos, clásicos y proyectos exclusivos. Ideal para inspirarte, hacer fotos y conocer a otros apasionados.', 'EXPOSICIÓN', 1),
  ('🏆', 'Batalla de Clubs', 'Los clubs compiten por demostrar quién tiene el mejor proyecto, más estilo y presencia. Pasión por el motor en estado puro.', 'COMPETICIÓN', 2),
  ('🚀', 'Lanzadas', 'Potencia pura en acción. Aceleraciones que ponen los pelos de punta y máquinas sacando todo su potencial en pista.', 'VELOCIDAD', 3),
  ('🔥', 'Grip & Drift', 'Tandas de agarre y derrapes espectaculares. Humo, ruido, técnica y espectáculo asegurado para los fans del drifting.', 'DRIFT', 4),
  ('🎁', 'Shows & Sorpresas', 'Animación constante, exhibiciones y regalos para el público. Aquí siempre están pasando cosas.', 'SHOW', 5);

insert into public.event_schedule (time, title, description, sort_order) values
  ('10:00', 'Apertura de Puertas', 'Comienza la fiesta. Acceso al recinto, acreditaciones y primer contacto con la zona expo.', 0),
  ('11:00', 'Inicio Zona Expo', 'Apertura oficial de la exposición de coches. Primeros pases por la pista.', 1),
  ('12:00', 'Lanzadas — Sesión 1', 'Primeras aceleraciones en pista. Potencia pura en acción.', 2),
  ('14:00', 'Música en Directo', 'Actuaciones musicales. El escenario principal cobra vida.', 3),
  ('16:00', 'Batalla de Clubs', 'Los clubs compiten por el mejor proyecto y estilo. Ambiente competitivo.', 4),
  ('18:00', 'Grip & Drift', 'Tandas de derrapes espectaculares. Humo, ruido y espectáculo asegurado.', 5),
  ('20:00', 'Show de Clausura', 'Gran final con exhibiciones, sorpresas y el cierre por todo lo alto.', 6);

insert into public.event_stats (number, label, sort_order) values
  ('6+', 'Actividades', 0),
  ('10h', 'Duración', 1),
  ('700+', 'Asistencias', 2),
  ('∞', 'Adrenalina', 3);

insert into public.event_sponsors (name, subtitle, sort_order) values
  ('DIAMOND SQUAD', 'ORGANIZA', 0),
  ('FK1 CIRCUIT', 'SEDE', 1),
  ('RPM FEST', 'EVENTO', 2);
