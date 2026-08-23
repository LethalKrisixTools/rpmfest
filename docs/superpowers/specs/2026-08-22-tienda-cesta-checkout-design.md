# Rediseño de Tienda, Cesta, Checkout y Cuentas — Diseño

**Fecha:** 2026-08-22
**Estado:** Aprobado para planificación de implementación

## 1. Contexto y objetivo

El sitio de RPM Fest es hoy un conjunto de páginas HTML estáticas (sin build) desplegadas en Vercel, con funciones serverless en `/api` para el checkout vía Mollie. Los productos viven en `data/store.json` y se editan desde `admin/app.js`, que escribe directamente al repositorio de GitHub **desde el navegador**, usando un token de GitHub personal hardcodeado y ofuscado en el JS de cliente, más una contraseña de admin en texto plano (`admin2026`). Al estar en un repo público, ese token debe considerarse comprometido.

No existen cuentas de cliente: toda compra es como invitado, con seguimiento de pedido mediante un enlace firmado.

**Objetivo:** rediseñar tienda, ficha de producto, cesta y checkout con un flujo seguro de extremo a extremo, añadir cuentas de cliente opcionales, y sustituir el almacenamiento de productos/pedidos/usuarios por Supabase (Postgres + Auth + Storage), eliminando el flujo inseguro de escritura vía GitHub.

**Acción pendiente fuera de este proyecto:** revocar el token de GitHub expuesto (`admin/app.js`) desde la configuración de GitHub, ya que persiste en el historial de git aunque se borre del código.

## 2. Alcance

**Dentro de alcance** (se migran a Next.js):
- `/tienda` — grid de productos
- `/tienda/[slug]` — ficha de producto
- `/cesta` — página de cesta
- `/checkout` — wizard de pago
- `/checkout/confirmacion/[pedido]` — confirmación post-pago
- `/pedido` — seguimiento de pedido sin cuenta
- `/login`, `/registro` — acceso de clientes
- `/cuenta` — historial de pedidos + dirección guardada + derechos RGPD (exportar/eliminar datos)
- `/admin` — panel admin (productos y pedidos)
- `/privacidad`, `/terminos`, `/cookies` — páginas legales (política de privacidad, términos de compra, política de cookies)

**Fuera de alcance** (no se tocan): `index.html`, `eventos.html`, `data/data.json` y su carga vía `js/data-loader.js` siguen siendo HTML/JS estático, servidos desde `public/` de la nueva app Next.js.

**Explícitamente fuera de alcance para esta iteración** (posibles mejoras futuras, no bloquean este proyecto):
- Autoregistro de administradores (alta de admins es manual vía base de datos).
- Cesta sincronizada en tiempo real entre pestañas/dispositivos más allá de recarga de página.
- Rate limiting personalizado más allá de las protecciones nativas de Vercel/Supabase/Mollie.
- Login social (Google, etc.) — solo email + contraseña.

## 3. Stack técnico

- **Next.js 14+ (App Router) + TypeScript**, desplegado en Vercel.
- **Tailwind CSS**, con tema personalizado que replica la paleta e identidad visual actual:
  - Fondos: `#060201` · `#0e0d12` · `#1a090e`
  - Rojos: `#400a10` · `#651b21` · `#703939` · `#942825`
  - Acento dorado: `#f79f23`
  - Texto: `#e3d2b8` (crema) · `#eeeeee` (blanco cálido)
  - Secundario: `#a17467`
  - Fuente: Inter
- **Supabase**: Postgres (productos, pedidos, perfiles, cestas), Auth (email + contraseña), Storage (imágenes de producto), Row Level Security en todas las tablas.
- **Mollie** se mantiene como pasarela de pago (tarjeta, PayPal, Bizum). Se descarta Stripe: no soporta Bizum, clave para el público español del evento, y la cuenta Mollie ya está en proceso de verificación.
- El navbar/footer de las páginas nuevas replica exactamente el actual (mismo logo, enlaces, colores y tipografía) para que la transición entre páginas estáticas y Next.js sea invisible para el usuario.

## 4. Modelo de datos (Supabase)

### `profiles`
1:1 con `auth.users`, creada automáticamente por un trigger al registrarse.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| phone | text | opcional |
| default_address, default_city, default_postal_code | text | dirección guardada para autorrelleno en checkout |
| role | text | `customer` (default) o `admin` |
| terms_accepted_at | timestamptz | fecha en que aceptó política de privacidad/términos al registrarse (evidencia de consentimiento, RGPD art. 7) |
| created_at | timestamptz | |

### `products`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| slug | text unique | para `/tienda/[slug]` |
| name, short_description, description | text | |
| price_cents | int | precio en céntimos |
| stock | int, nullable | `null` = ilimitado |
| category | text | |
| images | text[] | rutas en Supabase Storage (hasta 4) |
| active, featured | bool | |
| created_at, updated_at | timestamptz | |

### `cart_items`
Solo para clientes con sesión iniciada. Los invitados usan `localStorage` (no se persiste en base de datos).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid, not null | fk a `auth.users` |
| product_id | uuid, fk | |
| qty | int | |
| created_at, updated_at | timestamptz | |
| — | unique(user_id, product_id) | |

### `orders`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_number | text unique | ej. `RPM-2026-XXXXX`, visible al cliente |
| user_id | uuid, nullable | `null` = compra como invitado |
| customer_name, customer_email, shipping_address, shipping_city, shipping_postal_code | text | snapshot en el momento de la compra |
| amount_cents, currency | int/text | |
| status | text | `pending` · `paid` · `failed` · `canceled` · `expired` |
| mollie_payment_id | text unique | |
| privacy_consent_at | timestamptz | fecha en que aceptó la política de privacidad para esta compra (necesario también para invitados sin perfil) |
| anonymized_at | timestamptz, nullable | se rellena si el cliente ejerce su derecho de supresión; a partir de entonces `customer_name`/`shipping_address` quedan anonimizados |
| created_at, paid_at | timestamptz | |

### `order_items`

| Campo | Tipo | Notas |
|---|---|---|
| id, order_id (fk), product_id (fk, nullable) | | |
| product_name, unit_price_cents, image | | snapshot — un pedido no cambia si el producto se edita/borra después |
| qty | int | |

### Row Level Security (resumen)
- `products`: lectura pública de productos activos; escritura solo `role = admin`.
- `profiles`: cada usuario lee/edita solo la suya; admins leen todas.
- `cart_items`: cada usuario lee/escribe solo sus propias filas (`user_id = auth.uid()`).
- `orders` / `order_items`: un usuario logueado ve solo sus propios pedidos. Los invitados no acceden vía RLS directa — consultan a través de una ruta de servidor protegida (token firmado o nº de pedido + email). **Nunca se crean pedidos directamente desde el navegador**: siempre pasan por una ruta de servidor que recalcula precios/stock reales.

## 5. Comportamiento de la cesta

- **Invitado**: cesta en `localStorage`, como hoy.
- **Con cuenta**: cesta en `cart_items`, sincronizada entre dispositivos.
- **Login antes de comprar**: se añade un botón visible "Iniciar sesión / Mi cuenta" en la cabecera de `/tienda` (y demás páginas de tienda) para animar a iniciar sesión antes de añadir productos, de forma que se cargue primero la cesta guardada real.
- **Login a mitad de compra**: si al iniciar sesión hay productos en `localStorage`, se muestra un aviso explícito — *"Tenías productos en tu cesta de invitado. ¿Quieres añadirlos a tu cesta guardada?"* con opciones **Sí, añadir** / **No, descartar** — nunca se fusiona automáticamente, para evitar compras por error de productos "fantasma" guardados previamente.
- A partir del login, la cesta se lee/escribe siempre desde Supabase.

## 6. Páginas de tienda y producto

- **`/tienda`**: grid de productos (`auto-fit, minmax(250px,1fr)`, como hoy). Cada tarjeta: imagen y nombre clicables → ficha de producto; badge "DESTACADO"/"AGOTADO" si aplica; botones apilados — **"COMPRAR YA"** (dorado, destacado) y **"+ AÑADIR AL CARRITO"** (outline) debajo.
- **`/tienda/[slug]`**: galería de imágenes a la izquierda (principal + miniaturas), info a la derecha (categoría, nombre, precio, stock disponible, descripción, selector de cantidad, botones apilados "COMPRAR YA" / "AÑADIR AL CARRITO").
- **`/cesta`**: dos columnas — lista de productos con miniatura, cantidad editable y opción de quitar a la izquierda; resumen fijo (total + botón **"CONTINUAR A LA COMPRA"**) a la derecha. En móvil colapsa a una columna.

## 7. Checkout (wizard de 3 pasos)

1. **Invitado o cuenta** — si ya hay sesión iniciada, se salta automáticamente al paso 2 con datos precargados del perfil. Si no, el cliente elige "Continuar como invitado" (solo email) o "Iniciar sesión / Crear cuenta" (formulario inline).
2. **Datos de envío** — nombre, email, dirección, ciudad, código postal (autorrellenado y editable si hay cuenta).
3. **Revisar y pagar** — resumen del pedido + botón "Pagar ahora".

**"Comprar ya"** no toca la cesta: abre este mismo wizard en el paso 1 con un pedido temporal de un solo producto (cantidad editable en el paso 3).

**Al pulsar "Pagar ahora"** (toda la lógica en servidor, nunca se confía en precios/totales del navegador):
1. Se recalculan precios y stock reales desde `products`.
2. Se reserva el stock de forma atómica (descuento inmediato, no al confirmar pago — evita sobreventa durante el tiempo que el pago está pendiente, a diferencia del sistema actual).
3. Se crea el pedido (`orders` + `order_items`, estado `pending`).
4. Si el pedido viene de la cesta de un usuario con cuenta, se vacía su `cart_items`.
5. Se crea el pago en Mollie (`redirectUrl` → `/checkout/confirmacion/[order_number]`, `webhookUrl` → `/api/mollie-webhook`) y se redirige al cliente.

**Webhook de Mollie**: consulta el estado real del pago y actualiza `orders.status`. Si el resultado final es `failed`/`canceled`/`expired`, restaura el stock reservado (actualización condicional para garantizar que ocurre una sola vez).

## 8. Confirmación y seguimiento de pedido

- `/checkout/confirmacion/[pedido]`: pantalla de éxito tras volver de Mollie.
- `/pedido`: seguimiento sin cuenta, igual que hoy (enlace firmado o nº de pedido + email), consultando Supabase en vez de la API de Mollie.
- `/cuenta`: clientes con sesión ven su historial completo de pedidos y su dirección guardada.

## 9. Panel admin (`/admin`)

- Login con Supabase Auth (sin contraseña fija en código). Middleware protege todas las rutas `/admin/*`, exigiendo sesión válida **y** `profiles.role = 'admin'`.
- `/admin/productos`: CRUD de productos; subida de imágenes a Supabase Storage (bucket `product-images`), verificado en servidor (rol, tipo y tamaño de archivo).
- `/admin/pedidos`: listado de pedidos leído directamente de Supabase.
- Alta de administradores: manual (se marca `role='admin'` en la base de datos tras un registro normal); sin autoregistro de admins.

## 10. Seguridad — resumen de cambios respecto a hoy

- Se elimina el token de GitHub y la contraseña fija del admin panel.
- La `service_role key` de Supabase solo se usa en rutas de servidor (Route Handlers / Server Actions), nunca llega al navegador. El navegador solo usa la `anon key`, segura de exponer porque RLS controla el acceso.
- Todas las escrituras sensibles (crear pedido, guardar productos, ver pedidos ajenos) pasan por rutas de servidor que verifican sesión y rol antes de tocar la base de datos.
- Precios y totales se recalculan siempre en servidor desde la base de datos — nunca se confía en lo enviado por el cliente (igual que ya hacía `create-payment.js`, se conserva esa propiedad).
- Validación de entrada con Zod en todas las rutas de servidor.
- Variables de entorno nuevas en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas), `SUPABASE_SERVICE_ROLE_KEY`, `MOLLIE_API_KEY`, `ORDER_TRACK_SECRET` (secretas). Se eliminan `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` al terminar la migración.

## 11. Migración de datos existentes

1. Crear tablas, políticas RLS, trigger de creación de perfil y bucket de Storage en Supabase.
2. Script único de migración: lee `data/store.json`, inserta cada producto en `products` (genera `slug` a partir del `id` actual), sube las imágenes actuales (`assets/store/*.svg`) al bucket `product-images`.
3. Verificar que `/tienda` funciona correctamente contra los datos reales de Supabase.
4. Eliminar del repo: `tienda.html`, `pedido.html`, `panel.html`, `admin/`, `css/store.css`, `css/store-overrides.css`, `data/store.json`, y las funciones antiguas en `/api` (`create-payment.js`, `mollie-webhook.js`, `track-order.js`, `admin-orders.js`), sustituidas por las nuevas rutas de Next.js.
5. `index.html`, `eventos.html`, `data/data.json` y `js/data-loader.js` no se tocan.

## 12. Pruebas

El proyecto no tiene infraestructura de tests hoy. Se añade Vitest para lo que es realista automatizar:
- Cálculo de precios/stock server-side (recalcular importe real desde `products`).
- Fusión de cesta invitado → cuenta.
- Generación y verificación del token de seguimiento firmado (`/pedido`).

El flujo de pago real con Mollie se valida manualmente en modo test antes de pasar a producción — no es realista automatizar de extremo a extremo un pago real.

## 13. Cumplimiento RGPD / LOPDGDD

Marco legal aplicable: Reglamento (UE) 2016/679 (RGPD), LOPDGDD (España) y LSSI-CE (cookies). Alojamiento de datos en la UE en todo momento: Supabase en `eu-west-1` (Irlanda) y Mollie en Países Bajos — sin transferencias fuera del EEE.

**Base legal de tratamiento:**
- Datos de envío/facturación (nombre, email, dirección): ejecución del contrato de compraventa (art. 6.1.b RGPD) — se piden solo los campos estrictamente necesarios para procesar y enviar el pedido (minimización de datos).
- Cuenta de cliente (email, contraseña, historial): consentimiento explícito al registrarse (art. 6.1.a).
- No se planea ningún uso de los datos para marketing o publicidad; si en el futuro se añadiera, requeriría un consentimiento explícito y separado (opt-in), fuera de alcance de este proyecto.

**Páginas legales nuevas** (enlazadas desde el footer de todas las páginas de tienda y desde los checkboxes de consentimiento):
- `/privacidad` — identidad del responsable del tratamiento, finalidades, base legal, plazos de conservación, destinatarios (Supabase y Mollie como encargados de tratamiento) y cómo ejercer derechos.
- `/terminos` — condiciones de compra, devoluciones, envíos.
- `/cookies` — declara que solo se usan cookies técnicas/esenciales (sesión de Supabase Auth para mantener el login, estado de la cesta). Al ser estrictamente necesarias para el funcionamiento del sitio, no requieren banner de consentimiento previo según el RGPD/LSSI-CE, pero se informa igualmente por transparencia. Si en el futuro se añadieran cookies de analítica o marketing, sí exigirían un banner de consentimiento previo — no es el caso hoy.

**Consentimiento explícito y verificable** (principio de responsabilidad proactiva, art. 5.2 RGPD):
- Checkbox obligatorio y **no premarcado** ("He leído y acepto la Política de Privacidad") en `/registro` y en el paso 2 del checkout de invitado. No se puede continuar sin marcarlo.
- Se guarda la fecha de aceptación (`profiles.terms_accepted_at` para cuentas, `orders.privacy_consent_at` para cada pedido, incluidos los de invitado) como evidencia de consentimiento.

**Derechos del interesado (acceso, rectificación, supresión, portabilidad, oposición) — implementados en `/cuenta`:**
- **Acceso y rectificación**: el cliente ya puede ver y editar su perfil y consultar su historial de pedidos.
- **Portabilidad**: botón "Descargar mis datos" que exporta perfil + historial de pedidos en JSON.
- **Supresión ("derecho al olvido")**: botón "Eliminar mi cuenta". Como España exige conservar los datos contables/fiscales de una compra (mínimo 4 años, normativa tributaria; 6 años, Código de Comercio), los pedidos **no se borran físicamente** — se anonimiza la información personal (`customer_name`, `shipping_address`, etc. se sustituyen por valores anonimizados, `anonymized_at` se rellena) conservando solo lo obligatorio a efectos contables (importe, fecha, nº de pedido). El usuario se elimina de Supabase Auth y su `profile` se anonimiza.
- **Invitados sin cuenta**: al no tener panel propio, `/privacidad` incluye un email de contacto para ejercer estos derechos manualmente; el equipo del evento localiza el pedido por nº de pedido + email y aplica la misma anonimización.

**Conservación de datos:** se documenta explícitamente en `/privacidad` el plazo de conservación (duración legal fiscal/contable). La purga o revisión automática de datos tras ese plazo (p. ej. mediante un job programado) queda fuera de alcance de esta iteración y se deja anotada como mejora futura recomendada.

**Encargados de tratamiento:** Supabase y Mollie procesan datos personales en nombre del negocio. Es responsabilidad del propietario del proyecto (fuera del alcance de este código) verificar que ambos tienen un Acuerdo de Encargado de Tratamiento (DPA) vigente y aceptado — ambos lo ofrecen de forma estándar.

## 14. Decisiones visuales aprobadas

- **Tarjeta de producto** (grid `/tienda`): imagen y nombre clicables hacia la ficha; botones apilados con "COMPRAR YA" en dorado destacado sobre "+ AÑADIR AL CARRITO" en outline.
- **Ficha de producto**: galería a la izquierda (imagen principal + miniaturas), info a la derecha, botones apilados.
- **Página de cesta**: dos columnas — lista de productos a la izquierda, resumen con total y botón "Continuar a la compra" fijo a la derecha.
- **Checkout**: wizard de 3 pasos (invitado/cuenta → datos de envío → revisar y pagar).
