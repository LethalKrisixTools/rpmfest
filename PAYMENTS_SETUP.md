# RPM Fest — configuración de pagos y pedidos

La tienda usa Mollie para el checkout. No hay cuota mensual obligatoria en la tarifa estándar; se cobran comisiones por transacciones exitosas.

## Variables de entorno en Vercel

Añade estas variables en el proyecto de Vercel:

- `MOLLIE_API_KEY` — API key live de Mollie.
- `ORDER_TRACK_SECRET` — secreto largo y aleatorio usado para firmar los enlaces privados de seguimiento.
- `GITHUB_TOKEN` — el mismo token que ya utiliza el panel para escribir en el repositorio.
- `GITHUB_REPO` — opcional; por defecto `LethalKrisixTools/rpmfest`.
- `GITHUB_BRANCH` — opcional; por defecto `main`.

No publiques `MOLLIE_API_KEY` ni `ORDER_TRACK_SECRET` en GitHub, HTML o JavaScript del navegador.

## Mollie

1. Crea la cuenta y completa la verificación del negocio.
2. Crea/selecciona el perfil web de RPM Fest.
3. Activa tarjetas (`creditcard`).
4. Activa PayPal (`paypal`) y completa el onboarding de PayPal si Mollie lo solicita.
5. Activa Bizum (`bizum`). Para Bizum, Mollie indica que se necesita una cuenta bancaria empresarial española compatible y la activación con el banco.
6. Usa una API key live en Vercel cuando pases a producción.

La integración no fuerza un método concreto al crear el pago: Mollie mostrará en su checkout los métodos que estén realmente habilitados para el perfil.

## URLs

- Tienda: `/tienda`
- Seguimiento de pedido: `/pedido.html`
- Panel: `/panel`
- Crear pago: `/api/create-payment`
- Seguimiento: `/api/track-order`
- Webhook Mollie: `/api/mollie-webhook`
- Pedidos privados para el panel: `/api/admin-orders`

## Carrito y checkout

La tienda incluye carrito lateral con cantidades, eliminación de líneas, total en tiempo real y validación de stock antes de crear el pago.

El cliente no necesita crear una cuenta para comprar.

## Seguimiento sin cuenta

Después de crear el pago se genera un enlace firmado y privado que apunta a `/pedido.html`. El enlace permite consultar el estado del pago sin exponer la dirección de envío ni otros datos innecesarios.

Como respaldo, el cliente puede introducir el número de pedido junto con el mismo email utilizado en la compra.

## Cuentas de cliente

El flujo actual funciona completamente sin cuenta. La arquitectura queda separada para poder añadir posteriormente cuentas opcionales (inicio de sesión, historial de pedidos y varios pedidos asociados al mismo email) sin cambiar el checkout ni el panel de administración.

## Imágenes

El panel permite seleccionar hasta cuatro imágenes por producto. Se suben al repositorio en `assets/store/` al pulsar Guardar. Límite actual por imagen: 2 MB.

## Pedidos y privacidad

Los datos personales de los clientes no se guardan en GitHub. El panel consulta los pagos y los metadatos privados directamente desde la API de Mollie usando el endpoint serverless protegido.
