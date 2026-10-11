# Recuperación de cuentas

Las cuentas actuales usan `usuario@cinetrack.local`, un correo ficticio. No se
puede entregar un correo de recuperación ni leer la contraseña existente.

## Activación

1. Publica el contenido de `supabase/functions/server` bajo el nombre
   **make-server-da14cc3d** mediante tu flujo habitual de Figma Make o Supabase.
   La configuración incluida en `supabase/config.toml` apunta a la entrada
   existente. Con la CLI ejecuta
   `supabase functions deploy make-server-da14cc3d --project-ref TU_PROJECT_REF`.
2. Publica el frontend (`npm run build`).
3. La función necesita las variables existentes `SUPABASE_URL`,
   `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. No se requieren tablas nuevas:
   se usa `kv_store_da14cc3d`, que debe seguir protegida con RLS y sin políticas
   de acceso público. Solo el servidor y el administrador acceden a los códigos.

## Usuario

Generar un código desde CineTrack exige siempre una sesión válida y la
contraseña actual. No hay excepciones por usuario ni por dispositivo.

Desde la sesión abierta, pulsa el icono «Proteger cuenta: código de recuperación»
junto al nombre del usuario. Confirma la contraseña actual y guarda el código
fuera de CineTrack, por ejemplo en un gestor de contraseñas. Se muestra una vez;
generar otro reemplaza el anterior.

Para recuperar el acceso, pulsa «¿Olvidaste tu contraseña?» y escribe el usuario,
el código y una contraseña nueva de 8 a 128 caracteres. El código se consume;
inicia sesión y genera otro. No se cambia el ID ni las listas del usuario.

## Recuperación controlada por el administrador

### Panel de CineTrack

El panel se abre desde **Mi perfil → Panel de administrador**. Solo las cuentas
con `app_metadata.cinetrack_admin: true` pueden verlo y usar sus rutas del servidor.
El nombre `Admin`, los datos editables de usuario y localStorage no otorgan permisos.

Activación inicial para la cuenta `Admin` elegida por el propietario:

1. Si aún no existe, crea la cuenta `Admin` desde CineTrack con una contraseña
   privada. Comprueba que es tu cuenta antes de asignarle permisos.
2. Ejecuta `scripts/enable-admin.sql` una vez en el SQL Editor de Supabase.
   Debe devolver la cuenta `admin@cinetrack.local`. Si no devuelve filas, no
   existe esa cuenta y no cambió nada.
3. Publica `index.tsx`, `recovery.ts`, `admin-recovery.ts` y `kv_store.tsx` en la
   función `make-server-da14cc3d`, conservando esos nombres. Publica el frontend.
4. Inicia sesión como `Admin` y abre tu perfil. Si ya estabas dentro, vuelve a
   abrir el perfil para cargar el permiso actualizado.

Para recuperar una cuenta: busca el usuario, verifica sus datos e identidad,
marca la confirmación e introduce **tu contraseña de administrador**. El titular
no necesita conocer su contraseña anterior. Guarda el código mostrado y
entrégalo por un canal privado; el titular lo usa en «¿Olvidaste tu contraseña?».
Un código nuevo reemplaza el anterior. El panel no guarda secretos en el navegador.
El servidor registra IDs y fecha de la solicitud, nunca el código ni contraseñas.
Cada petición vuelve a comprobar el permiso; no basta con abrir el panel.

Para retirar el permiso de `Admin`, ejecuta como propietario en SQL Editor:

```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'cinetrack_admin'
WHERE lower(email) = 'admin@cinetrack.local';
```

Las rutas administrativas usan la clave de servicio solo en el servidor.
Para proyectos grandes, la búsqueda exacta actual recorre páginas de Auth;
se puede añadir un índice de nombres en una tabla protegida si fuera necesario.

### Alternativa desde Supabase

Un administrador puede emitir un código para cualquier usuario desde Supabase,
sin conocer la contraseña anterior y sin requerir una sesión del titular:

1. Verifica la identidad del titular por un canal de confianza.
2. Abre `scripts/account-recovery.sql` y copia el contenido al SQL Editor.
3. Cambia `lower(btrim(''))` por `lower(btrim('nombre_usuario'))`; por ejemplo,
   `lower(btrim('Eli'))`. No pongas el correo completo.
4. Ejecuta la consulta una vez y entrega `codigo_recuperacion` solo al titular.
5. El titular usa «¿Olvidaste tu contraseña?» con su usuario, el código y la
   contraseña nueva. No necesita la contraseña anterior.

La consulta devuelve `codigo_recuperacion`, que permite elegir una
contraseña desde «¿Olvidaste tu contraseña?» sin conocer la anterior. Solo guarda
el hash del código y no cambia el usuario ni sus listas. Si no devuelve filas,
el usuario quedó vacío o no existe esa cuenta en el proyecto; no se modificó nada.
Cada ejecución reemplaza el código anterior. No compartas capturas del resultado.
La función de recuperación y el frontend deben estar desplegados primero.
La consulta usa funciones integradas de PostgreSQL y genera 244 bits aleatorios
mediante dos UUID v4; el generador habitual de la aplicación usa 256 bits.

Un administrador debe verificar la identidad del titular por un canal de
confianza antes de emitir un código. La herramienta se ejecuta localmente con
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` definidos en el entorno. Nunca pongas
la clave administrativa en el frontend, Git ni mensajes de chat.

Consultar una cuenta (sin cambios):

```powershell
node scripts/account-recovery.mjs nombre_usuario
```

Emitir un código después de verificar al titular:

```powershell
node scripts/account-recovery.mjs nombre_usuario --issue-code
```

La herramienta pide confirmar el usuario, reemplaza el código previo y muestra
el nuevo código. Entrégalo únicamente al titular por un canal privado. Este elige
su propia contraseña desde la pantalla de recuperación. No es necesario conocer
ni compartir su contraseña. Evita ejecutar la emisión en terminales grabadas.

## Verificación y límites

`node --experimental-strip-types --test tests/recovery.test.mjs` comprueba los
códigos, rotación, uso único, entradas inválidas, concurrencia y fallo de Auth.
`npm run build` comprueba el empaquetado del frontend.

`node --experimental-strip-types --test tests/admin-recovery.test.mjs` verifica
permisos, sesiones, contraseña de administrador, cuentas sustituidas, revocación,
rotación del código y registro sin secretos. No sustituye una prueba con Auth real.

Los códigos tienen 256 bits aleatorios, se guardan con SHA-256 y se consumen con
un único DELETE condicionado por clave y hash en PostgreSQL. El servidor exige
sesión válida y contraseña actual para emitirlos; el restablecimiento no informa
si existe el usuario. No se guardan códigos en localStorage ni en los logs del
servidor. El nuevo código solo reside en memoria hasta cerrar su ventana.

El consumo del código y el cambio en Supabase Auth son dos operaciones: si Auth
falla después del consumo, el código queda invalidado. Un administrador debe
emitir otro. No se promete invalidación inmediata de JWT ya emitidos: respetan
el vencimiento configurado en Supabase. Antes de publicar, verifica el flujo
completo con una cuenta de prueba y la configuración real de Auth y RLS.

Referencia de la API administrativa utilizada:
https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid

Configuración de entradas de funciones:
https://supabase.com/docs/guides/functions/development-tips

Metadatos y autorización:
https://supabase.com/docs/guides/database/postgres/row-level-security
