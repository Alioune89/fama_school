-- =============================================================================
-- Lecture des données selon le métier de chaque membre de la direction.
--
-- Jusqu'ici, tout le personnel de direction (private.is_staff) lisait notes, présences et finances.
-- Désormais :
--   - notes, bulletins, conseils, appréciations, examens : fondateur, directeur, censeur, secrétaire ;
--   - programme et cahier de textes : fondateur, directeur, censeur (private.can_manage_academics) ;
--   - présences, retards, justificatifs, pointage, signalements : fondateur, directeur, censeur, surveillant ;
--   - factures, encaissements, réductions, options de frais : fondateur, directeur, comptable
--     (private.can_manage_finance).
-- Élèves, parents, classes, personnel et calendrier restent lisibles par toute la direction.
-- Les accès des enseignants (teaches_class) et des parents (is_guardian_of…) ne changent pas.
-- Les menus de l'application suivent les mêmes règles (src/config/navigation.ts).
-- =============================================================================

create function private.can_read_grades(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director', 'censor', 'secretary']::public.app_role[]);
$$;

create function private.can_read_attendance(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director', 'censor', 'supervisor']::public.app_role[]);
$$;

revoke all on function private.can_read_grades(uuid) from public, anon;
revoke all on function private.can_read_attendance(uuid) from public, anon;
grant execute on function private.can_read_grades(uuid) to authenticated, service_role;
grant execute on function private.can_read_attendance(uuid) to authenticated, service_role;

-- Présences ------------------------------------------------------------------------
drop policy attendance_sessions_select on public.attendance_sessions;
create policy attendance_sessions_select on public.attendance_sessions for select to authenticated
  using (private.can_read_attendance(school_id) or private.teaches_class(class_id));

drop policy attendance_records_select on public.attendance_records;
create policy attendance_records_select on public.attendance_records for select to authenticated
  using (private.can_read_attendance(school_id) or private.teaches_class(class_id) or private.is_guardian_of(student_id));

drop policy attendance_submissions_select on public.attendance_submissions;
create policy attendance_submissions_select on public.attendance_submissions for select to authenticated
  using (private.can_read_attendance(school_id) or private.teaches_class(class_id));

drop policy attendance_changes_select on public.attendance_changes;
create policy attendance_changes_select on public.attendance_changes for select to authenticated
  using (exists (
    select 1 from public.attendance_submissions s
    where s.id = submission_id and (private.can_read_attendance(s.school_id) or private.teaches_class(s.class_id))
  ));

drop policy absence_justifications_select on public.absence_justifications;
create policy absence_justifications_select on public.absence_justifications for select to authenticated
  using (private.can_read_attendance(school_id) or private.is_guardian_of(student_id));

drop policy student_arrivals_select on public.student_arrivals;
create policy student_arrivals_select on public.student_arrivals for select to authenticated
  using (private.can_read_attendance(school_id) or private.is_guardian_of(student_id));

drop policy student_departures_select on public.student_departures;
create policy student_departures_select on public.student_departures for select to authenticated
  using (private.can_read_attendance(school_id) or private.is_guardian_of(student_id));

drop policy student_reports_select on public.student_reports;
create policy student_reports_select on public.student_reports for select to authenticated
  using (private.can_read_attendance(school_id) or private.teaches_class(class_id) or private.is_guardian_of(student_id));

drop policy absence_justifications_files_read on storage.objects;
create policy absence_justifications_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'absence-justifications'
    and (
      private.can_read_attendance(private.try_uuid((storage.foldername(name))[1]))
      or private.is_guardian_of(private.try_uuid((storage.foldername(name))[2]))
    )
  );

-- Notes et bulletins (les évaluations, simples dates de devoirs et de compositions, restent visibles
-- de toute la direction pour le calendrier) ------------------------------------------
drop policy grades_select on public.grades;
create policy grades_select on public.grades for select to authenticated
  using (private.can_read_grades(school_id) or private.can_view_grade(evaluation_id, student_id));

drop policy subject_appreciations_select on public.subject_appreciations;
create policy subject_appreciations_select on public.subject_appreciations for select to authenticated
  using (private.can_read_grades(school_id) or private.teaches_class(class_id));

drop policy council_decisions_select on public.council_decisions;
create policy council_decisions_select on public.council_decisions for select to authenticated
  using (private.can_read_grades(school_id) or private.teaches_class(class_id));

drop policy report_cards_select on public.report_cards;
create policy report_cards_select on public.report_cards for select to authenticated
  using (
    private.can_read_grades(school_id)
    or private.teaches_class(class_id)
    or (published_at is not null and private.is_guardian_of(student_id))
  );

drop policy exam_candidates_select on public.exam_candidates;
create policy exam_candidates_select on public.exam_candidates for select to authenticated
  using (private.can_read_grades(school_id) or private.is_guardian_of(student_id));

-- Programme et cahier de textes ----------------------------------------------------
drop policy chapter_progress_select on public.chapter_progress;
create policy chapter_progress_select on public.chapter_progress for select to authenticated
  using (private.can_manage_academics(school_id) or private.teaches_class(class_id) or private.is_guardian_in_class(class_id));

drop policy lesson_entries_select on public.lesson_entries;
create policy lesson_entries_select on public.lesson_entries for select to authenticated
  using (private.can_manage_academics(school_id) or private.teaches_class(class_id) or private.is_guardian_in_class(class_id));

-- Finances -------------------------------------------------------------------------
drop policy invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (private.can_manage_finance(school_id) or private.is_guardian_of(student_id));

drop policy payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (private.can_manage_finance(school_id) or private.is_guardian_of(student_id));

drop policy student_discounts_select on public.student_discounts;
create policy student_discounts_select on public.student_discounts for select to authenticated
  using (private.can_manage_finance(school_id) or private.is_guardian_of(student_id));

drop policy student_fee_options_select on public.student_fee_options;
create policy student_fee_options_select on public.student_fee_options for select to authenticated
  using (private.can_manage_finance(school_id) or private.is_guardian_of(student_id));
