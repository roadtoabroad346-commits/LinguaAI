from pathlib import Path
import io
import os
import pandas as pd
import altair as alt
import streamlit as st
from analytics import SYNTHETIC,REAL,validate_summary,validate_daily,paired,metrics,checkpoint_long,export_figures
from hosting import public_url,qr_bytes

ROOT=Path(__file__).resolve().parent
st.set_page_config(page_title='LinguaAI Research Progress',layout='wide')
st.title('LinguaAI зерттеу нәтижелері')
st.caption('14 күндік бақылау · Бастапқы тест → 7 күн → 14 күн · Оқу белсенділігі')
try:
    url=public_url(os.environ)
    if url:
        with st.sidebar:
            st.subheader('Телефоннан ашу')
            st.image(qr_bytes(url),width=220)
            st.link_button('Дашбордты ашу',url)
            st.download_button('QR PNG жүктеу',qr_bytes(url),file_name='LinguaAI_QR.png',mime='image/png')
            st.download_button('QR SVG жүктеу',qr_bytes(url,'svg'),file_name='LinguaAI_QR.svg',mime='image/svg+xml')
except ValueError as e:
    st.sidebar.error(str(e))
mode=st.sidebar.radio('Деректер режимі',['Модельдік зерттеу нәтижелері','Нақты өлшеулер'],key='mode')
demo=mode=='Модельдік зерттеу нәтижелері';origin=SYNTHETIC if demo else REAL
if demo:st.info('Модельдік зерттеу нәтижелері. Деректер модельдеу арқылы жасалды. Талдауда 10 модельдік профиль қолданылады.')
else:st.info('Нақты өлшеулер режимі. Бастапқыда баллдар бос. Есептеу тек сіз енгізген өлшеулерге негізделеді; деректердің шынайылығы автоматты түрде расталмайды.')
with st.sidebar:
    st.subheader('Деректерді ашу')
    upload=st.file_uploader('Бақылау тесттері CSV',type=['csv'],key='scores_upload_'+str(demo))
    daily_upload=st.file_uploader('Күнделікті белсенділік CSV',type=['csv'],key='daily_upload_'+str(demo))
    st.caption('Файлдар осы сессияда өңделеді. Өзгерістерді CSV ретінде жүктеп сақтаңыз.')
suffix='demo' if demo else 'real_template'
try:
    base=pd.read_csv(upload if upload else ROOT/'data'/f'checkpoints_{suffix}.csv',keep_default_na=True)
    raw_daily=pd.read_csv(daily_upload if daily_upload else ROOT/'data'/f'daily_{suffix}.csv',keep_default_na=True)
    base=validate_summary(base,origin);raw_daily=validate_daily(raw_daily,origin,base.participant_id)
except (ValueError,UnicodeError,pd.errors.ParserError) as e:
    st.error(str(e));st.stop()

overview_tab,person_tab,survey_tab,edit_tab,method_tab=st.tabs(['Топ нәтижелері','Жеке прогресс','Сауалнама','Өлшеулерді енгізу','Зерттеуге экспорт'])
score_key='confirmed_scores_'+str(demo)
signature=base.to_csv(index=False)
signature_key='input_signature_'+str(demo)
if st.session_state.get(signature_key)!=signature:
    st.session_state[signature_key]=signature
    st.session_state.pop(score_key,None)
with edit_tab:
    st.subheader('Тест өлшеулері')
    st.caption('Деңгейді тек бөлек placement test немесе мұғалім бағасынан енгізіңіз. 25 балдық тесттен CEFR автоматты анықталмайды. Бос балл нөл болып есептелмейді.')
    with st.form('scores_form_'+str(demo)):
        edited=st.data_editor(base,hide_index=True,num_rows='fixed',disabled=['participant_id','data_origin'],key='score_editor_'+str(demo))
        submit=st.form_submit_button('Баллдарды талдауға қолдану',type='primary')
    if submit:
        try:st.session_state[score_key]=validate_summary(edited,origin);st.success('Сессияда қолданылды. Төмендегі CSV файлын сақтаңыз.')
        except ValueError as e:st.error(str(e))
    data=st.session_state.get(score_key,base)
    st.download_button('Бақылау тесттерін CSV жүктеу',data.to_csv(index=False).encode('utf-8-sig'),file_name=f'checkpoints_{"DEMO" if demo else "REAL"}.csv',mime='text/csv')
    st.subheader('Күнделікті белсенділік')
    st.caption('Күнделікті CSV шаблонын толтырып, сол жақтан жүктеңіз. minutes — оқу минуты; tasks — аяқталған тапсырма; attempted және correct — әрекеттер мен дұрыс жауап саны. 0 нақты нөлді, бос ұяшық өлшенбегенді білдіреді.')
    st.dataframe(raw_daily,hide_index=True)
    st.download_button('Күнделік CSV жүктеу',raw_daily.to_csv(index=False).encode('utf-8-sig'),file_name=f'daily_{"DEMO" if demo else "REAL"}.csv',mime='text/csv')
with st.sidebar:
    chosen=st.multiselect('Қатысушы кодтары',list(data.participant_id),default=list(data.participant_id),key='filter_'+str(demo))
    st.caption('Есімдер ашық графиктерде көрсетілмейді. Жеке тізім бөлек файлда сақталады.')
filtered=data[data.participant_id.isin(chosen)].copy();daily=raw_daily[raw_daily.participant_id.isin(chosen)].copy()
m=metrics(filtered)
with overview_tab:
    st.subheader('Жұпталған салыстыру')
    st.caption('Тек бастапқы және 14 күнгі тесті бар бірдей оқушылар салыстырылады.')
    a,b,c,d=st.columns(4)
    a.metric('Жұпталған жазба',m['n']);b.metric('Бастапқы орташа','—' if m['pre'] is None else f"{m['pre']:.2f}")
    c.metric('14 күнгі орташа','—' if m['post'] is None else f"{m['post']:.2f}")
    d.metric('Балл өзгерісі','—' if m['gain'] is None else f"{m['gain']:+.2f}")
    if not m['n']:st.info('Жұпталған нәтиже жоқ. Бастапқы және 14 күнгі баллдарды енгізіңіз.')
    else:
        st.caption(f"Шкалаға қатысты өзгеріс: {m['gain_pp']:+.1f} пайыздық пункт. Бастапқы орташаға қатысты өзгеріс: "+('есептелмейді' if m['relative_pct'] is None else f"{m['relative_pct']:+.1f}%")+'. Бұл екі көрсеткіштің бөлімдері әртүрлі.')
        p=paired(filtered);long=checkpoint_long(filtered)
        chart=alt.Chart(long).mark_line(point=True).encode(x=alt.X('day:Q',title='Күн',axis=alt.Axis(values=[0,7,14])),y=alt.Y('score:Q',title='Тест балы',scale=alt.Scale(domain=[0,float(data.test_max.iloc[0])])),color=alt.Color('participant_id:N',title='Код'),tooltip=['participant_id','day','score','test_max']).properties(height=340)
        st.altair_chart(chart, width='stretch')
        st.caption('Сызықтар тек 0, 7 және 14 күндегі бар өлшеулерді байланыстырады. Аралық күндердің тест балы өлшенген деп есептелмейді.')
        st.dataframe(p[['participant_id','baseline_level','pre_score','post_score','gain','gain_pp','relative_pct']],hide_index=True)
    st.subheader('Күнделікті оқу уақыты')
    measured=daily.dropna(subset=['minutes'])
    if measured.empty:st.info('Оқу минуттары әлі енгізілмеген.')
    else:
        heat=alt.Chart(measured).mark_rect().encode(x=alt.X('day:O',title='Күн',sort=list(range(1,15))),y=alt.Y('participant_id:N',title='Код'),color=alt.Color('minutes:Q',scale=alt.Scale(scheme='blues'),title='Минут'),tooltip=['participant_id','day','minutes','tasks']).properties(height=max(180,28*len(chosen)))
        st.altair_chart(heat,width='stretch')
        st.caption('Бос орын — өлшеу жоқ. Нөл минут жеке мән ретінде сақталады.')
with person_tab:
    if chosen:
        person=st.selectbox('Жеке профиль',chosen)
        row=filtered[filtered.participant_id==person].iloc[0]
        st.subheader(person)
        st.write('Бастапқы деңгей: '+(row.baseline_level or 'Әлі бағаланбаған'))
        vals=checkpoint_long(filtered[filtered.participant_id==person])
        if not vals.empty:st.altair_chart(alt.Chart(vals).mark_line(point=True,color='#2554be').encode(x=alt.X('day:Q',axis=alt.Axis(values=[0,7,14]),title='Күн'),y=alt.Y('score:Q',scale=alt.Scale(domain=[0,float(row.test_max)]),title='Тест балы'),tooltip=['day','score']).properties(height=280),width='stretch')
        person_days=daily[daily.participant_id==person];recorded=person_days.minutes.notna().sum();active=person_days.minutes.gt(0).sum()
        st.write(f'Күні тіркелген: {recorded}/14 · Оқу белсенділігі бар күн: {active} · Тіркелген минут: {person_days.minutes.sum(min_count=1) if recorded else "—"}')
        attempted=person_days.dropna(subset=['attempted','correct']);total=attempted.attempted.sum()
        st.write('Жаттығудағы дәлдік: '+(f'{attempted.correct.sum()/total*100:.1f}% ({int(attempted.correct.sum())}/{int(total)})' if total>0 else 'есептелмейді'))
        st.caption('Жаттығу дәлдігі бақылау тестінен бөлек. Тапсырмалар қиындығы әртүрлі болуы мүмкін.')
        st.dataframe(person_days.drop(columns='data_origin'),hide_index=True)
    else:st.info('Сол жақтан кемінде бір қатысушыны таңдаңыз.')
with survey_tab:
    st.subheader('Модельдік зерттеу нәтижелері — сауалнама')
    st.caption('Деректер модельдеу арқылы жасалды. 150 модельдік жауап; тәжірибе сұрақтарының бөлімі — 120 жауап. Бұл бөлім прогресс режимінен бөлек көрсетіледі.')
    st.write('Пайыз = жауап саны / тиісті топтағы жауап саны × 100%. Диаграммаларда бір ондық таңба қолданылады.')
    for asset in sorted((ROOT/'assets'/'survey').glob('*.png')):
        st.image(str(asset),width='stretch')
    st.caption('Сауалнама моделі мен 10 профильдің прогресс моделі бір-біріне байланыстырылмаған.')
with method_tab:
    st.subheader('Ғылыми жұмысқа арналған экспорт')
    st.write('Экспорт таңдалған кодтар мен осы сессиядағы мәндерден қайта есептеледі. PNG 300 dpi, SVG және PDF. Әр графикте деректердің түрі көрсетіледі.')
    if st.button('Графиктер архивін дайындау',type='primary'):
        with st.spinner('Графиктер дайындалуда...'):
            st.session_state['chart_export_'+str(demo)]=export_figures(filtered,daily,origin) if not filtered.empty else None
            st.session_state['chart_export_signature_'+str(demo)]=filtered.to_csv(index=False)+daily.to_csv(index=False)
    export_key='chart_export_'+str(demo)
    signature=filtered.to_csv(index=False)+daily.to_csv(index=False)
    if st.session_state.get(export_key) and st.session_state.get('chart_export_signature_'+str(demo))==signature:
        st.download_button('PNG SVG PDF архивін жүктеу',st.session_state[export_key],file_name=f'LinguaAI_{"SYNTHETIC" if demo else "REAL"}_figures.zip',mime='application/zip')
    st.markdown('''**Әдіс.** 0 күн — бастапқы тест, 1–14 күн — оқу журналы, 7 күн — аралық тест, 14 күн — соңғы тест. Бірдей шкала мен салыстырмалы тапсырмалар қолданылады. Балл айырмасы = post − pre. Пайыздық өзгеріс = (post орташа − pre орташа) / pre орташа × 100%. Бастапқы орташа 0 болса пайыз есептелмейді.

**Шектеу.** 10 оқушы мен 14 күндік бақылау ұзақ мерзімді есте сақтауды немесе себептік әсерді дәлелдемейді. Бақылау тобы, жаттығу әсері және өлшем қатесі ескерілуі керек. Жобадағы төрт апталық пилот жоспары осы екі апталық мысалмен алмастырылмайды.

**Дерек көзі.** Модельдік бөлімнің барлық жауаптары, деңгейлері мен баллдары бағдарламалық модельдеу арқылы жасалды. Модельдік кодтар жеке оқушы тізіміне байланыстырылмайды. Нақты өлшеулер бөлек режимде енгізіледі.

**Деңгей.** CEFR деңгейі қысқа тест балынан автоматты шығарылмайды. Модельде деңгейлер бастапқы жорамал ретінде берілген; нақты режимде placement test немесе мұғалім бағасы қажет.

**Құпиялылық.** Жеке есімдер бөлек тізімде. Дашбордқа есімдер енгізілмейді. Нақты оқушы деректерімен жалпыға ашық жарияламаңыз; келісім мен қолжетімділік тәртібін жетекшімен келісіңіз.''')
