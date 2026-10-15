-- Cover both practice_answers foreign keys for efficient parent-row updates/deletes.
create index if not exists practice_answers_session_user_idx
  on public.practice_answers (session_id, user_id);

create index if not exists practice_answers_user_idx
  on public.practice_answers (user_id);
