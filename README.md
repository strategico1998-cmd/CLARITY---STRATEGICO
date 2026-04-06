# Strategic Analytics SaaS

Plataforma unificada de analítica web y marketing (Facebook Ads, TikTok Ads, Google Analytics).

## 🚀 Despliegue Rápido en Vercel

1.  **Sube esta carpeta a GitHub** (arrastra y suelta todos los archivos excepto `node_modules` y `.env`).
2.  **Conecta con Vercel**.
3.  **Variables de Entorno**: En el panel de Vercel, agrega:
    *   `VITE_SUPABASE_URL`: Tu URL de proyecto Supabase.
    *   `VITE_SUPABASE_ANON_KEY`: Tu Anon Key de Supabase.

## 🛠️ Tecnologías
- **Core**: React + Vite
- **Base de Datos/Auth**: Supabase (PostgreSQL)
- **Visualización**: Recharts
- **Estándar de Diseño**: Premium Black & White UI

## 📝 Configuración de la Base de Datos
1.  Ve a tu proyecto en Supabase.
2.  Abre el **SQL Editor**.
3.  Copia y pega el contenido del archivo `schema.sql`.
4.  Crea un usuario administrador en la tabla `public.users` o actualiza tu rol:
    ```sql
    UPDATE public.users SET role = 'admin' WHERE email = 'tu@email.com';
    ```

## 📦 Instalación Local
```bash
npm install
npm run dev
```
