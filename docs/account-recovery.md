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

Desde la sesión abierta, pulsa el icono «Proteger cuenta: código de recuperación»
junto al nombre del usuario. Confirma la contraseña actual y guarda el código
fuera de CineTrack, por ejemplo en un gestor de contraseñas. Se muestra una vez;
generar otro reemplaza el anterior.

Para recuperar el acceso, pulsa «¿Olvidaste tu contraseña?» y escribe el usuario,
el código y una contraseña nueva de 8 a 128 caracteres. El código se consume;
inicia sesión y genera otro. No se cambia el ID ni las listas del usuario.

## Cuenta antigua sin código

La excepción temporal de recuperación con sesión ya se retiró.
Para la cuenta `Eli` (`eli@cinetrack.local`), un administrador puede ejecutar el contenido de
`scripts/recover-eli.sql` en Supabase → SQL Editor después de verificar
al titular. La consulta devuelve `codigo_recuperacion`, que permite elegir una
contraseña desde «¿Olvidaste tu contraseña?» sin conocer la anterior. Solo guarda
el hash del código y no cambia el usuario ni sus listas. Si no devuelve filas,
no existe una cuenta con ese correo en ese proyecto y no se modificó nada.
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
