# RPM Fest — configuración de pagos

La tienda usa Mollie para el checkout. No hay cuota mensual obligatoria en la tarifa estándar; se cobran comisiones por transacciones exitosas.

## Variables de entorno en Vercel

Añade estas variables en el proyecto de Vercel:

- `MOLLIE_API_KEY` — API key live de Mollie.
- `GITHUB_TOKEN` — el mismo token que ya utiliza el panel para escribir en el repositorio.
- `GITHUB_REPO` — opcional; por defecto `LethalKrisixTools/rpmfest`.
- `GITHUB_BRANCH` — opcional; por defecto `main`.

## Mollie

1. Crea la cuenta y completa la verificación del negocio.
2. Crea/selecciona el perfil web de RPM Fest.
3. Activa tarjetas (`creditcard`).
4. Activa PayPal (`paypal`) y completa el onboarding de PayPal si Mollie lo solicita.
5. Activa Bizum (`bizum`). Para Bizum, Mollie indica que se necesita una cuenta bancaria empresarial española compatible y la activación con el banco; el banco debe configurar el PSP ID indicado por Mollie.
6. Usa una API key live en Vercel cuando pases a producción.

La integración no fuerza un método concreto al crear el pago: Mollie mostrará en su checkout los métodos que estén realmente habilitados para el perfil. El objetivo es tener tarjeta, PayPal y Bizum disponibles.

## URLs

- Tienda: `/tienda`
- Panel: `/panel`
- Crear pago: `/api/create-payment`
- Webhook Mollie: `/api/mollie-webhook`
- Pedidos privados para el panel: `/api/admin-orders`

## Imágenes

El panel permite seleccionar hasta cuatro imágenes por producto. Se suben al repositorio en `assets/store/` al pulsar Guardar. Límite actual por imagen: 2 MB.

## Pedidos y privacidad

Los datos personales de los clientes no se guardan en GitHub. El panel consulta los pagos y los metadatos privados directamente desde la API de Mollie usando el endpoint serverless protegido.
