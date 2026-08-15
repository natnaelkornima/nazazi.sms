# Nazazi - Daily Spiritual Reflections SMS Platform

A production-ready, security-focused full-stack web application for automated and verified SMS spiritual encouragement broadcasts.

---

## 🔒 Security & Architecture Overview

This project adheres strictly to zero-trust security standards:

- **No Secrets in Client-Side Code**: All sensitive keys (Supabase Service Role Key, Cloudinary API Secret, Admin Passwords) are strictly confined to server-side execution.
- **Server-Side Authorization**: Administrative routes (`/api/admin/*`) require cryptographically signed HMAC authorization tokens with constant-time verification.
- **Privacy-Preserving Public Lookups**: The public verification endpoint (`/api/registrations?phone=...`) allows subscribers to verify their individual registration status by exact phone number lookup only, preventing customer record enumeration.
- **Robust File Validation**: File uploads are strictly validated server-side by checking MIME types, file signature headers, maximum file size (10 MB), and sanitized identifiers before streaming to Cloudinary storage.
- **Supabase Row Level Security (RLS)**: Database tables are protected with strict RLS policies ensuring that public clients cannot read arbitrary subscriber records or elevate permissions.

---

## 📋 Environment Variables

Copy `.env.example` to your local environment file:

```bash
cp .env.example .env.local
```

### Public Variables (Client-Accessible)
| Variable | Description | Where to Obtain |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | [Supabase Console](https://supabase.com/dashboard) -> Project Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous API key | [Supabase Console](https://supabase.com/dashboard) -> Project Settings -> API |

### Server-Only Variables (Secret Credentials)
| Variable | Description | Where to Obtain |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Full privileges service role key (Never expose to browser) | Supabase Console -> Project Settings -> API -> `service_role` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | [Cloudinary Console](https://cloudinary.com/console) Dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Cloudinary Console Dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret (Server-only) | Cloudinary Console Dashboard |
| `ADMIN_PASSWORD` | Passcode for the administrative dashboard | Custom secure string configured by the site operator |
| `ADMIN_AUTH_SECRET` | Secret seed used to sign HMAC admin session tokens | Random 32+ character string |
| `GEMINI_API_KEY` | Google Gemini AI key (Server-only) | [Google AI Studio](https://aistudio.google.com/) |

---

## 🗄️ Database Setup & Migrations

Database structure is managed under `supabase/migrations/`.

To apply migrations to your Supabase instance:

### Option 1: Using Supabase CLI
```bash
# Link your Supabase project
npx supabase link --project-ref <your-project-ref>

# Apply migrations
npx supabase db push
```

### Option 2: Using Supabase SQL Editor
1. Open the **SQL Editor** in your Supabase dashboard.
2. Open and copy the contents of `supabase/migrations/20260101000000_initial_schema.sql`.
3. Execute the SQL script.

The migration sets up:
- The `registrations` table with typed columns (`id`, `name`, `phone_number`, `payment_image_url`, `plan_name`, `amount`, `status`, `created_at`, `reviewed_at`).
- Row Level Security (RLS) enabled on `public.registrations`.
- Public INSERT policy for incoming registrations.
- Server-side `service_role` full access policy.
- Performance indexes on `phone_number`, `status`, and `created_at`.

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd nazazi-app
```

### 2. Install dependencies
```bash
npm install
# or
bun install
```

### 3. Configure environment
```bash
cp .env.example .env.local
# Populate with your Supabase and Cloudinary credentials
```

### 4. Run development server
```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🧪 Testing & Verification

- **Linting & Code Standards**:
  ```bash
  npm run lint
  ```
- **TypeScript Typecheck & Production Build**:
  ```bash
  npm run build
  ```

---

## 🚢 Safe Deployment

When deploying to platforms such as Vercel, Cloud Run, or AWS:
1. Ensure all **Server-Only** environment variables are configured in the host's secret manager or environment settings.
2. Never inject `SUPABASE_SERVICE_ROLE_KEY` or `CLOUDINARY_API_SECRET` with the `NEXT_PUBLIC_` prefix.
3. Configure `ADMIN_PASSWORD` and `ADMIN_AUTH_SECRET` in production secrets.
