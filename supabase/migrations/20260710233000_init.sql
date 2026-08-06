-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Studio (Tenants)
CREATE TABLE "Studio" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cuit TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  package TEXT DEFAULT 'BASIC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User (Profiles linked to auth.users)
CREATE TABLE "User" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'OPERATOR' CHECK (role IN ('ADMIN', 'LAWYER', 'OPERATOR')),
  studio_id UUID REFERENCES "Studio"(id) ON DELETE SET NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Client
CREATE TABLE "Client" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'PERSONA_FISICA' CHECK (type IN ('PERSONA_FISICA', 'PERSONA_JURIDICA')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  document_id TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  studio_id UUID REFERENCES "Studio"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Case (Expedientes)
CREATE TABLE "Case" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE,
  title TEXT NOT NULL,
  client_id UUID REFERENCES "Client"(id) ON DELETE SET NULL,
  client_name TEXT,
  description TEXT,
  details JSONB, -- Storing the 13 sections form details as JSONB
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  fuero TEXT,
  score INTEGER DEFAULT 0,
  studio_id UUID REFERENCES "Studio"(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  assigned_lawyer_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. CaseFile (Archivos adjuntos)
CREATE TABLE "CaseFile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  case_id UUID REFERENCES "Case"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Deadline (Plazos / Vencimientos)
CREATE TABLE "Deadline" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  case_id UUID REFERENCES "Case"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TimelineEvent
CREATE TABLE "TimelineEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'GENERAL',
  case_id UUID REFERENCES "Case"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Expense
CREATE TABLE "Expense" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  type TEXT DEFAULT 'OTROS',
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  receipt_url TEXT,
  case_id UUID REFERENCES "Case"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notification
CREATE TABLE "Notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  case_id UUID REFERENCES "Case"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FormConfig
CREATE TABLE "FormConfig" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT UNIQUE DEFAULT 'global',
  sections TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE "Studio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deadline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimelineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormConfig" ENABLE ROW LEVEL SECURITY;

-- Crear políticas de aislamiento por studio_id
CREATE POLICY "studio_isolation" ON "Studio"
  FOR ALL USING (id = (SELECT studio_id FROM "User" WHERE id = auth.uid()));

CREATE POLICY "user_isolation" ON "User"
  FOR ALL USING (studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid()));

CREATE POLICY "client_isolation" ON "Client"
  FOR ALL USING (studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid()));

CREATE POLICY "case_isolation" ON "Case"
  FOR ALL USING (studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid()));

-- Políticas para tablas hijas referenciando a Case
CREATE POLICY "casefile_isolation" ON "CaseFile"
  FOR ALL USING (case_id IN (SELECT id FROM "Case" WHERE studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid())));

CREATE POLICY "deadline_isolation" ON "Deadline"
  FOR ALL USING (case_id IN (SELECT id FROM "Case" WHERE studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid())));

CREATE POLICY "timelineevent_isolation" ON "TimelineEvent"
  FOR ALL USING (case_id IN (SELECT id FROM "Case" WHERE studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid())));

CREATE POLICY "expense_isolation" ON "Expense"
  FOR ALL USING (case_id IN (SELECT id FROM "Case" WHERE studio_id = (SELECT studio_id FROM "User" WHERE id = auth.uid())));

-- Política para notificaciones (solo el usuario destinatario)
CREATE POLICY "notification_isolation" ON "Notification"
  FOR ALL USING (user_id = auth.uid());

-- Política para FormConfig (lectura para autenticados, modificación para administradores)
CREATE POLICY "formconfig_read_isolation" ON "FormConfig"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "formconfig_write_isolation" ON "FormConfig"
  FOR ALL USING (
    (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'
  );
