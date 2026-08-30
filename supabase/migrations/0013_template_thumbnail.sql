-- A creator-uploaded thumbnail for each template.
--
-- Templates have only ever shown a generic icon on a coloured tile, so every
-- card in the Studio and the Global Library looks alike and a clinician
-- scanning the library cannot tell one activity from another at a glance. A
-- thumbnail the creator uploads — a screenshot, a representative picture —
-- makes the library actually browsable.
--
-- Nullable and additive: every existing template keeps its coloured-tile
-- placeholder until someone uploads a picture, and thumbnail_color stays as
-- the fallback the card falls back to. The image itself lives in the existing
-- template-assets storage bucket (public read, owner-scoped writes), so this
-- is only the pointer to it.
alter table public.templates
  add column if not exists thumbnail_url text;
