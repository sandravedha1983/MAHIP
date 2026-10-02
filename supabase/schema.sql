-- MAHIP Supabase schema
-- Run this in Supabase SQL Editor.
-- Use private Storage buckets: medical-reports and medical-images.

create extension if not exists pgcrypto;

drop table if exists public.agent_logs cascade;
drop table if exists public.cases cascade;
drop table if exists public.medical_images cascade;
drop table if exists public.medical_reports cascade;
drop table if exists public.appointments cascade;
drop table if exists public.doctors cascade;
drop table if exists public.patients cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    email text,
    phone text,
    role text not null default 'patient'
        check (role in ('patient','doctor','admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.patients (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    date_of_birth date,
    gender text check (gender in ('male','female','other','prefer_not_to_say')),
    blood_group text,
    medical_history text,
    allergies text,
    emergency_contact_name text,
    emergency_contact_phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.doctors (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    specialization text not null,
    qualification text,
    experience_years integer check (experience_years >= 0),
    license_number text,
    consultation_fee numeric(10,2) check (consultation_fee >= 0),
    bio text,
    is_available boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.appointments (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    doctor_id uuid not null references public.doctors(id) on delete cascade,
    appointment_date date not null,
    appointment_time time not null,
    reason text,
    status text not null default 'scheduled'
        check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.medical_reports (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    file_name text not null,
    file_url text not null,
    file_type text,
    extracted_text text,
    analysis_status text not null default 'pending'
        check (analysis_status in ('pending','processing','completed','failed')),
    analysis_result jsonb,
    uploaded_at timestamptz not null default now(),
    analyzed_at timestamptz
);

create table public.medical_images (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    file_name text not null,
    file_url text not null,
    image_type text not null default 'chest_xray',
    model_name text,
    model_version text,
    prediction jsonb,
    confidence numeric(6,5) check (confidence is null or (confidence >= 0 and confidence <= 1)),
    findings text,
    analysis_status text not null default 'pending'
        check (analysis_status in ('pending','processing','completed','failed')),
    uploaded_at timestamptz not null default now(),
    analyzed_at timestamptz
);

create table public.cases (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    symptoms jsonb,
    medical_history jsonb,
    report_findings jsonb,
    image_findings jsonb,
    rag_context jsonb,
    possible_conditions jsonb,
    supporting_evidence jsonb,
    uncertainties jsonb,
    risk_indicators jsonb,
    recommended_next_steps jsonb,
    clinical_summary text,
    urgency_level text check (urgency_level in ('low','moderate','high','emergency')),
    status text not null default 'open'
        check (status in ('open','processing','reviewed','closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.agent_logs (
    id uuid primary key default gen_random_uuid(),
    case_id uuid references public.cases(id) on delete cascade,
    agent_name text not null,
    agent_type text,
    input_data jsonb,
    output_data jsonb,
    status text not null default 'started'
        check (status in ('started','success','failed')),
    execution_time_ms integer,
    error_message text,
    created_at timestamptz not null default now()
);

create index idx_patients_profile_id on public.patients(profile_id);
create index idx_doctors_specialization on public.doctors(specialization);
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_doctor on public.appointments(doctor_id);
create index idx_reports_patient on public.medical_reports(patient_id);
create index idx_images_patient on public.medical_images(patient_id);
create index idx_cases_patient on public.cases(patient_id);
create index idx_logs_case on public.agent_logs(case_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'patient'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at();
create trigger update_patients_updated_at before update on public.patients
for each row execute function public.update_updated_at();
create trigger update_doctors_updated_at before update on public.doctors
for each row execute function public.update_updated_at();
create trigger update_appointments_updated_at before update on public.appointments
for each row execute function public.update_updated_at();
create trigger update_cases_updated_at before update on public.cases
for each row execute function public.update_updated_at();

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_reports enable row level security;
alter table public.medical_images enable row level security;
alter table public.cases enable row level security;
alter table public.agent_logs enable row level security;

create policy "own profile select" on public.profiles
for select to authenticated using (id = auth.uid());

create policy "own profile update" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own patient select" on public.patients
for select to authenticated using (profile_id = auth.uid());

create policy "own patient insert" on public.patients
for insert to authenticated with check (profile_id = auth.uid());

create policy "own patient update" on public.patients
for update to authenticated using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "own appointments select" on public.appointments
for select to authenticated using (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own appointments insert" on public.appointments
for insert to authenticated with check (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own reports select" on public.medical_reports
for select to authenticated using (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own reports insert" on public.medical_reports
for insert to authenticated with check (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own images select" on public.medical_images
for select to authenticated using (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own images insert" on public.medical_images
for insert to authenticated with check (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own cases select" on public.cases
for select to authenticated using (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "own cases insert" on public.cases
for insert to authenticated with check (
  patient_id in (select id from public.patients where profile_id = auth.uid())
);

create policy "agent logs hidden from patients" on public.agent_logs
for select to authenticated using (false);
