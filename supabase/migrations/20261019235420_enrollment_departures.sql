-- Départs en cours d'année (transfert, abandon) : cohérence des dates et du statut.
alter table public.enrollments
  add constraint enrollments_left_after_enrolled check (left_on is null or left_on >= enrolled_on),
  add constraint enrollments_departure_date check (status not in ('transferred', 'left') or left_on is not null);

comment on column public.enrollments.left_on is 'Date de départ (obligatoire pour un transfert ou un abandon).';
