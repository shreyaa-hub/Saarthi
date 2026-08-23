-- Verbal Coach — clinician-side billing
--
-- 0002 created the invoices table and the parent's read-only Finances view,
-- but nothing could create a row: there was no clinician UI, and more
-- fundamentally a clinician could not read a guardian's profile at all, so
-- there was no way to even name the person being billed.
--
-- profiles_select_guardian (0002) grants the parent → clinician direction.
-- This adds the reverse, scoped the same way: a clinician may see the
-- guardians of patients on their own active caseload, and nobody else's.
--
-- Safe to re-run.

drop policy if exists "profiles_select_my_patients_guardians" on public.profiles;
create policy "profiles_select_my_patients_guardians" on public.profiles
  for select using (
    exists (
      select 1
      from public.parent_children pc
      join public.clinician_patients cp on cp.patient_id = pc.child_id
      where pc.parent_id = profiles.id
        and cp.clinician_id = auth.uid()
        and cp.status = 'active'
    )
  );

-- invoices_clinician_all from 0002 already scopes writes to
-- `clinician_id = auth.uid()`, but that alone would let a clinician invoice
-- ANY profile id — the same shape of hole 0003 closed on assignments. Bill
-- only a guardian of one of your own patients.
create or replace function public.can_bill(target_parent_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.parent_children pc
    join public.clinician_patients cp on cp.patient_id = pc.child_id
    where pc.parent_id = target_parent_id
      and cp.clinician_id = auth.uid()
      and cp.status = 'active'
  );
$$;

grant execute on function public.can_bill(uuid) to authenticated;

drop policy if exists "invoices_clinician_all" on public.invoices;

drop policy if exists "invoices_clinician_select" on public.invoices;
create policy "invoices_clinician_select" on public.invoices
  for select using (clinician_id = auth.uid());

drop policy if exists "invoices_clinician_insert" on public.invoices;
create policy "invoices_clinician_insert" on public.invoices
  for insert with check (clinician_id = auth.uid() and public.can_bill(parent_id));

drop policy if exists "invoices_clinician_update" on public.invoices;
create policy "invoices_clinician_update" on public.invoices
  for update
  using (clinician_id = auth.uid())
  with check (clinician_id = auth.uid() and public.can_bill(parent_id));

drop policy if exists "invoices_clinician_delete" on public.invoices;
create policy "invoices_clinician_delete" on public.invoices
  for delete using (clinician_id = auth.uid());
