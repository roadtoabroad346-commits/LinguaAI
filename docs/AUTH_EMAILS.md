# Фирменные письма LinguaAI (подтверждение почты, сброс пароля)

Готовые шаблоны лежат в `supabase/email-templates/`:
- `confirm-signup.html` — тема `Подтвердите почту — LinguaAI`
- `reset-password.html` — тема `Сброс пароля — LinguaAI`
- `change-email.html` — тема `Подтвердите новую почту — LinguaAI`

Логотип для писем: `public/icons/email-logo.png` (PNG 512×512 — почтовики не показывают SVG,
поэтому сгенерирован PNG в стиле `icon.svg`). После деплоя он доступен по адресу
`https://lingua-ai-project.vercel.app/icons/email-logo.png`.

## Шаг 0. Замени домен (2 минуты)

В каждом HTML-шаблоне замени `https://lingua-ai-project.vercel.app` на свой прод-домен
(3 места: логотип + ссылка сайта в подвале; в каждом файле помечено комментарием).
Если домен останется чужим — логотип в письмах не загрузится.

## Шаг 1. Отправитель «LinguaAI» — нужен Custom SMTP (10 минут)

Без этого письма уходят от `noreply@mail.app.supabase.io`, плюс на бесплатном тарифе
у Supabase жёсткий лимит (несколько писем в час) — пользователи будут жаловаться,
что «письмо не приходит». Решение — свой SMTP через Resend (есть бесплатный тариф):

1. Зарегистрируйся на resend.com → **Domains** → **Add Domain** → введи свой домен.
2. Добавь у DNS-регистратора записи, которые покажет Resend: **SPF**, **DKIM** (и желательно **DMARC**).
   Без них Gmail/Outlook будут класть письма в спам. Статус станет `Verified` обычно за 5–30 минут.
3. **API Keys** → **Create API Key** → скопируй ключ (показывается один раз).
4. Supabase Dashboard → твой проект → **Project Settings → Auth → SMTP Settings**:
   - **Enable Custom SMTP**: ON
   - **Sender email**: например `noreply@твой-домен` (домен = верифицированный в Resend)
   - **Sender name**: `LinguaAI` ← это имя увидят получатели
   - **Host**: `smtp.resend.com`, **Port**: `465`
   - **Username**: `resend`
   - **Password**: API-ключ из шага 3
   - Сохрани и нажми **Send test email** себе на почту.
5. Нет своего домена? Тогда Custom SMTP не настроить — письма будут от Supabase-отправителя,
   но HTML-шаблоны из шага 3 всё равно дадут фирменное оформление внутри письма.

## Шаг 2. Redirect URLs и Site URL (3 минуты)

Иначе ссылки из писем не пустят обратно в приложение:

1. **Authentication → URL Configuration**:
   - **Site URL**: `https://твой-домен`
   - **Redirect URLs**: добавь `https://твой-домен/auth/callback`
     (и `http://localhost:3000/auth/callback` для локальных тестов).
2. Проверь, что `NEXT_PUBLIC_APP_URL` в Vercel → **Environment Variables** = прод-домен
   (код сам строит `redirectTo: <origin>/auth/callback?next=/reset-password`).

## Шаг 3. Вставь шаблоны (5 минут)

1. **Authentication → Emails** → открой шаблон **Confirm signup**:
   - **Subject**: `Подтвердите почту — LinguaAI`
   - **Message source**: вставь целиком `supabase/email-templates/confirm-signup.html` → **Save**.
2. То же для **Reset Password** (`reset-password.html`, тема `Сброс пароля — LinguaAI`).
3. То же для **Confirm Change Email Address** (`change-email.html`, тема `Подтвердите новую почту — LinguaAI`).
4. Переменные `{{ .ConfirmationURL }}` и `{{ .Email }}` не трогай — их подставляет Supabase.

## Шаг 4. Проверка (5 минут)

1. Разлогинься → **Sign up** новым ящиком → письмо приходит за ~10–60 сек → кнопка ведёт
   в `/auth/callback` → онбординг.
2. **Log in** → «Забыли пароль?» → письмо → кнопка → `/reset-password` → новый пароль → вход.
3. В Gmail открой письмо → ⋮ → **Show original** → `SPF: PASS`, `DKIM: PASS` (если настроен Resend).
4. Проверь на телефоне (Gmail/Outlook app): логотип, кнопка, русский текст.

## Если письмо не приходит

| Симптом | Причина → действие |
|---|---|
| Вообще ничего нет, и в спаме нет | Лимит Supabase без Custom SMTP → сделай Шаг 1; проверь адрес без опечаток |
| Падает в спам | Нет SPF/DKIM → закончи верификацию домена в Resend (Шаг 1.2) |
| Кнопка ведёт на ошибку / «ссылка недействительна» | Нет Redirect URL (Шаг 2) или ссылке > 1 часа / уже использована → запроси новую |
| Тестовое письмо из SMTP-настроек не уходит | Неверный API-ключ Resend или порт → перепроверь host/port/user/pass, порт 465 |
| Логотип не показывается | В шаблоне остался чужой домен → Шаг 0; деплой с `email-logo.png` точно вышел в прод |

## Файлы

- `supabase/email-templates/confirm-signup.html`
- `supabase/email-templates/reset-password.html`
- `supabase/email-templates/change-email.html`
- `public/icons/email-logo.png` (сгенерирован из `icon.svg`, скрипт не сохранялся — цвета `#4f46e5→#7c3aed→#6d28d9`, точка `#f59e0b`)
