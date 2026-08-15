# Registration & Payment System Setup Instructions

This system collects and stores only 3 pieces of information:
1. **Full Name**
2. **Phone Number**
3. **Payment Image**

Backed by **Supabase PostgreSQL** for data storage and **Cloudinary** for image media hosting.

---

## 1. Supabase Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. Navigate to the **SQL Editor**.
3. Copy and run the SQL script found in `supabase-schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    payment_image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for registrations"
ON public.registrations
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow service role full access"
ON public.registrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_registrations_phone ON public.registrations (phone_number);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations (created_at DESC);
```

4. Go to **Project Settings** -> **API** to copy:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Cloudinary Setup

1. Create or log into your [Cloudinary Console](https://cloudinary.com/console).
2. From your dashboard, copy:
   - **Cloud Name** -> `CLOUDINARY_CLOUD_NAME`
   - **API Key** -> `CLOUDINARY_API_KEY`
   - **API Secret** -> `CLOUDINARY_API_SECRET`
3. The server route will upload payment images to the `payments/` folder with unique IDs (`payments/payment_<timestamp>_<rand>`).

---

## 3. Environment Variables

Create or update `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Cloudinary (Server-side)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 4. Endpoints & Pages

- **`/register`**: Dedicated registration page with client-side validation, live preview, 5MB file limit, upload progress bar, and success screen.
- **`/api/register`**: Secure server API route that validates inputs, streams the image buffer to Cloudinary, and saves `{ name, phone_number, payment_image_url }` to Supabase.
