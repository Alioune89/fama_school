-- Demande de démo en trois champs (nom, téléphone, école) : la fonction devient facultative,
-- comme la ville, l'effectif et le message.
alter table public.demo_requests alter column role drop not null;
