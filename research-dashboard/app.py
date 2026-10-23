from pathlib import Path
import os

import altair as alt
import pandas as pd
import streamlit as st

from hosting import public_url, qr_bytes


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

st.set_page_config(page_title="LinguaAI зерттеу нәтижелері", page_icon="📊", layout="centered", initial_sidebar_state="collapsed")

st.markdown("""
<style>
:root{--ink:#14213d;--muted:#52627a;--blue:#2463a8;--teal:#2f7f78;--line:#d9e3ef}
.stApp{background:linear-gradient(180deg,#eef5fc 0,#f8fafc 290px,#f8fafc 100%);color:var(--ink)}
.block-container{max-width:900px;padding-top:1.35rem;padding-bottom:4rem}
h1,h2,h3{color:var(--ink);letter-spacing:-.02em}h1{font-size:clamp(2rem,7vw,3.4rem)!important;line-height:1.02!important;margin-bottom:.55rem!important}
h2{font-size:clamp(1.35rem,4vw,1.85rem)!important;margin-top:1.7rem!important}p,li{font-size:1rem;line-height:1.55}
.eyebrow{color:#315f91;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}.hero-copy{color:var(--muted);font-size:1.07rem;max-width:720px}
.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0 8px}.metric-card{background:rgba(255,255,255,.96);border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 8px 30px rgba(27,61,102,.07);min-height:108px}
.metric-card strong{display:block;color:var(--ink);font-size:clamp(1.65rem,6vw,2.2rem);line-height:1.1}.metric-card span{display:block;color:var(--muted);margin-top:8px;font-size:.92rem}
.insight{background:#eaf4f2;border:1px solid #bedbd6;border-radius:16px;padding:15px 16px;color:#194d47;margin:14px 0}.method{background:white;border:1px solid var(--line);border-radius:16px;padding:14px 16px}
div[data-testid="stTabs"] button{min-height:48px;font-weight:700}div[data-testid="stMetric"]{background:white;border:1px solid var(--line);padding:12px;border-radius:14px}div[data-testid="stDataFrame"]{border:1px solid var(--line);border-radius:14px;overflow:hidden}
@media(min-width:720px){.metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.metric-card{min-height:116px}}@media(max-width:480px){.block-container{padding-left:.85rem;padding-right:.85rem}.metric-card{padding:14px;min-height:102px}}
</style>
""", unsafe_allow_html=True)


@st.cache_data
def load_data():
    return pd.read_csv(DATA / "progress_actual.csv"), pd.read_csv(DATA / "daily_actual.csv")


summary, daily = load_data()
long_scores = summary.melt(id_vars=["participant_id", "name", "baseline_level"], value_vars=["pre_score", "mid_score", "post_score"], var_name="checkpoint", value_name="score")
long_scores["day"] = long_scores.checkpoint.map({"pre_score": 0, "mid_score": 7, "post_score": 14})
long_scores["score_pct"] = long_scores.score / 25 * 100
pre_pct = summary.pre_score.mean() / 25 * 100
mid_pct = summary.mid_score.mean() / 25 * 100
post_pct = summary.post_score.mean() / 25 * 100
gain_pp = post_pct - pre_pct
relative = (summary.post_score.sum() - summary.pre_score.sum()) / summary.pre_score.sum() * 100
overall_accuracy = summary.correct.sum() / summary.attempted.sum() * 100

st.markdown('<div class="eyebrow">LinguaAI · зерттеу нәтижелері</div>', unsafe_allow_html=True)
st.title("14 күндегі оқу прогресі")
st.markdown('<p class="hero-copy">10 оқушының үш бақылау нүктесі, күнделікті оқу белсенділігі және жаттығу нәтижелері. Телефоннан көруге арналған интерактивті инфографика.</p>', unsafe_allow_html=True)
st.markdown(f"""<div class="metric-grid">
<div class="metric-card"><strong>{post_pct:.1f}%</strong><span>14 күнгі орташа нәтиже</span></div>
<div class="metric-card"><strong>+{gain_pp:.1f} п.п.</strong><span>топтық өсім</span></div>
<div class="metric-card"><strong>{int(summary.total_minutes.sum()):,}</strong><span>оқу минуты</span></div>
<div class="metric-card"><strong>{overall_accuracy:.1f}%</strong><span>жалпы жаттығу дәлдігі</span></div></div>""".replace(",", " "), unsafe_allow_html=True)

overview_tab, progress_tab, activity_tab, people_tab, survey_tab = st.tabs(["Шолу", "Прогресс", "Белсенділік", "Оқушылар", "Сауалнама"])
navy, teal = "#2463a8", "#2f7f78"

with overview_tab:
    st.subheader("Топ нәтижесінің динамикасы")
    group = pd.DataFrame({"Күн": [0, 7, 14], "Нәтиже": [pre_pct, mid_pct, post_pct], "Кезең": ["Бастапқы", "7 күн", "14 күн"]})
    base = alt.Chart(group).encode(x=alt.X("Күн:Q", axis=alt.Axis(values=[0, 7, 14], title="Бақылау күні", grid=False)), y=alt.Y("Нәтиже:Q", scale=alt.Scale(domain=[0, 100]), axis=alt.Axis(title="Орташа нәтиже, %", gridColor="#dce5f2")), tooltip=[alt.Tooltip("Кезең:N"), alt.Tooltip("Нәтиже:Q", format=".1f", title="Нәтиже, %")])
    chart = base.mark_area(color="#dbeafe", opacity=.65) + base.mark_line(point=alt.OverlayMarkDef(size=95, filled=True), color=navy, strokeWidth=4) + base.mark_text(dy=-18, fontSize=15, fontWeight="bold", color="#14213d").encode(text=alt.Text("Нәтиже:Q", format=".1f"))
    st.altair_chart(chart.properties(height=330), width="stretch")
    st.markdown(f'<div class="insight"><strong>Негізгі нәтиже.</strong> Орташа көрсеткіш {pre_pct:.1f}%-дан {post_pct:.1f}%-ға өсті. Бұл +{gain_pp:.1f} пайыздық пункт және бастапқы орташаға қатысты +{relative:.1f}%.</div>', unsafe_allow_html=True)
    left, right = st.columns(2)
    with left:
        st.subheader("Бастапқы деңгейлер")
        levels = summary.baseline_level.value_counts().rename_axis("Деңгей").reset_index(name="Оқушы")
        donut = alt.Chart(levels).mark_arc(innerRadius=55, outerRadius=90).encode(theta=alt.Theta("Оқушы:Q"), color=alt.Color("Деңгей:N", scale=alt.Scale(scheme="blues"), legend=alt.Legend(orient="bottom")), tooltip=["Деңгей:N", "Оқушы:Q"]).properties(height=290)
        st.altair_chart(donut, width="stretch")
    with right:
        st.subheader("Зерттеу көлемі")
        st.metric("Белсенді күндер", f"{int(summary.active_days.sum())} / 140")
        st.metric("Орындалған тапсырма", f"{int(summary.tasks.sum())}")
        st.metric("Дұрыс жауап", f"{int(summary.correct.sum())} / {int(summary.attempted.sum())}")

with progress_tab:
    st.subheader("Әр оқушының нәтижесі")
    lines = alt.Chart(long_scores).mark_line(point=alt.OverlayMarkDef(filled=True, size=60), strokeWidth=2.2).encode(x=alt.X("day:Q", axis=alt.Axis(values=[0,7,14], title="Күн", grid=False)), y=alt.Y("score_pct:Q", scale=alt.Scale(domain=[0,100]), axis=alt.Axis(title="Тест нәтижесі, %", gridColor="#dce5f2")), color=alt.Color("name:N", title="Оқушы", legend=alt.Legend(orient="bottom", columns=2)), tooltip=[alt.Tooltip("name:N", title="Оқушы"), alt.Tooltip("baseline_level:N", title="Деңгей"), alt.Tooltip("day:Q", title="Күн"), alt.Tooltip("score_pct:Q", format=".1f", title="Нәтиже, %")]).properties(height=430)
    st.altair_chart(lines, width="stretch")
    st.subheader("Жеке өсім")
    gain_chart = alt.Chart(summary.sort_values("gain_pp")).mark_bar(cornerRadiusEnd=6, color=teal).encode(x=alt.X("gain_pp:Q", title="Өсу, пайыздық пункт", scale=alt.Scale(domain=[0,20])), y=alt.Y("name:N", sort="x", title=None), tooltip=[alt.Tooltip("name:N", title="Оқушы"), alt.Tooltip("gain_pp:Q", format=".1f", title="Өсу, п.п."), alt.Tooltip("relative_growth_pct:Q", format=".1f", title="Салыстырмалы өсім, %")])
    labels = gain_chart.mark_text(align="left", baseline="middle", dx=4, color="#14213d").encode(text=alt.Text("gain_pp:Q", format="+.1f"))
    st.altair_chart((gain_chart + labels).properties(height=390), width="stretch")
    display = summary[["name","baseline_level","pre_score","mid_score","post_score","gain_pp","relative_growth_pct"]].copy()
    display.columns = ["Оқушы","Деңгей","0 күн /25","7 күн /25","14 күн /25","Өсу, п.п.","Салыстырмалы өсім, %"]
    st.dataframe(display.style.format({"Өсу, п.п.":"+{:.1f}","Салыстырмалы өсім, %":"{:.1f}"}), hide_index=True, width="stretch")

with activity_tab:
    st.subheader("Күнделікті оқу минуттары")
    heat = alt.Chart(daily).mark_rect(cornerRadius=3).encode(x=alt.X("day:O", title="Күн", sort=list(range(1,15)), axis=alt.Axis(labelAngle=0)), y=alt.Y("name:N", title=None, sort=list(summary.name)), color=alt.Color("minutes:Q", title="Минут", scale=alt.Scale(scheme="blues")), tooltip=[alt.Tooltip("name:N", title="Оқушы"), alt.Tooltip("day:O", title="Күн"), alt.Tooltip("minutes:Q", title="Минут")]).properties(height=390)
    st.altair_chart(heat, width="stretch")
    weekly = summary.melt(id_vars=["name"], value_vars=["week1_minutes","week2_minutes"], var_name="Апта", value_name="Минут")
    weekly["Апта"] = weekly["Апта"].map({"week1_minutes":"1 апта","week2_minutes":"2 апта"})
    st.subheader("Апталар бойынша оқу уақыты")
    bars = alt.Chart(weekly).mark_bar(cornerRadiusEnd=4).encode(x=alt.X("Минут:Q", title="Минут"), y=alt.Y("name:N", title=None, sort=list(summary.name)), color=alt.Color("Апта:N", scale=alt.Scale(range=["#9dbbe0", navy]), legend=alt.Legend(orient="bottom")), yOffset="Апта:N", tooltip=[alt.Tooltip("name:N", title="Оқушы"), "Апта:N", "Минут:Q"]).properties(height=410)
    st.altair_chart(bars, width="stretch")
    c1, c2, c3 = st.columns(3)
    c1.metric("1 апта", f"{int(summary.week1_minutes.sum()):,} мин".replace(","," "))
    c2.metric("2 апта", f"{int(summary.week2_minutes.sum()):,} мин".replace(","," "), f"+{int(summary.week2_minutes.sum()-summary.week1_minutes.sum())}")
    c3.metric("Белсенді күндегі орташа", f"{summary.total_minutes.sum()/summary.active_days.sum():.1f} мин")
    st.subheader("Жаттығу дәлдігі")
    accuracy = alt.Chart(summary.sort_values("accuracy_pct")).mark_bar(cornerRadiusEnd=5, color=navy).encode(x=alt.X("accuracy_pct:Q", title="Дұрыс жауаптар, %", scale=alt.Scale(domain=[0,100])), y=alt.Y("name:N", sort="x", title=None), tooltip=[alt.Tooltip("name:N", title="Оқушы"), alt.Tooltip("accuracy_pct:Q", format=".1f", title="Дәлдік, %"), "correct:Q", "attempted:Q"])
    st.altair_chart(accuracy.properties(height=390), width="stretch")

with people_tab:
    selected = st.selectbox("Оқушыны таңдаңыз", list(summary.name), index=0)
    row = summary[summary.name == selected].iloc[0]
    person_daily, person_scores = daily[daily.name == selected], long_scores[long_scores.name == selected]
    st.subheader(selected); st.caption(f"Бастапқы деңгей: {row.baseline_level}")
    a,b,c = st.columns(3)
    a.metric("Бастапқы", f"{row.pre_score}/25", f"{row.pre_score/25*100:.0f}%")
    b.metric("7 күн", f"{row.mid_score}/25", f"+{(row.mid_score-row.pre_score)/25*100:.0f} п.п.")
    c.metric("14 күн", f"{row.post_score}/25", f"+{row.gain_pp:.0f} п.п.")
    st.altair_chart(alt.Chart(person_scores).mark_line(point=alt.OverlayMarkDef(size=120,filled=True),color=navy,strokeWidth=4).encode(x=alt.X("day:Q",axis=alt.Axis(values=[0,7,14],title="Күн",grid=False)), y=alt.Y("score_pct:Q",scale=alt.Scale(domain=[0,100]),axis=alt.Axis(title="Нәтиже, %",gridColor="#dce5f2")), tooltip=[alt.Tooltip("day:Q",title="Күн"),alt.Tooltip("score_pct:Q",format=".1f",title="Нәтиже, %")]).properties(height=300), width="stretch")
    st.altair_chart(alt.Chart(person_daily).mark_bar(cornerRadiusTopLeft=4,cornerRadiusTopRight=4,color=teal).encode(x=alt.X("day:O",title="Күн",axis=alt.Axis(labelAngle=0)), y=alt.Y("minutes:Q",title="Минут"), tooltip=[alt.Tooltip("day:O",title="Күн"),alt.Tooltip("minutes:Q",title="Минут")]).properties(height=270), width="stretch")
    p1,p2,p3,p4 = st.columns(4)
    p1.metric("Минут", int(row.total_minutes)); p2.metric("Белсенді күн", f"{int(row.active_days)}/14"); p3.metric("Тапсырма", int(row.tasks)); p4.metric("Дәлдік", f"{row.accuracy_pct:.1f}%")
    st.caption(f"Дұрыс жауаптар: {int(row.correct)} / {int(row.attempted)} · 1 апта дәлдігі: {row.week1_accuracy_pct:.1f}% · 2 апта: {row.week2_accuracy_pct:.1f}%")

with survey_tab:
    st.subheader("Жобаның survey бөлімі")
    st.write("Google Forms сауалнамасы интерфейс, жеке оқу жолы, сөздік, AI кері байланысы, мотивация, пайдалы модульдер және кедергілерді бағалайды. Жауаптар аты-жөнінсіз талданады.")
    st.info("Google Forms жауаптарының нақты экспорт файлы әлі енгізілмеген. Сондықтан бұл бетте ойдан шығарылған пікірлер немесе сауалнама пайыздары көрсетілмейді.")
    with st.expander("Сауалнама құрылымын көру", expanded=True):
        st.markdown("""1. AI арқылы ағылшын тілін оқу тәжірибесі
2. Апталық оқу жиілігі
3. Қолдау қажет негізгі дағды
4. Интерфейстің түсініктілігі — 1–5
5. Жеке оқу жолының пайдалығы — 1–5
6. Ақылды сөздіктің пайдалығы — 1–5
7. AI кері байланысының пайдалығы — 1–5
8. Материалдардың ұйымдастырылуы — 1–5
9. Мотивацияға әсері — 1–5
10. Платформаны жалғастырып қолдану ниеті — 1–5
11. Ең пайдалы модуль
12. Негізгі кедергі""")

st.divider()
with st.expander("Әдіс және QR"):
    st.markdown(f'<div class="method"><strong>Есептеу.</strong> Тест пайызы = балл / 25 × 100%. Топтық өсім = {post_pct:.1f}% - {pre_pct:.1f}% = {gain_pp:.1f} пайыздық пункт. Жалпы дәлдік = {int(summary.correct.sum())} / {int(summary.attempted.sum())} × 100% = {overall_accuracy:.1f}%. Нөл минут сол күні оқу тіркелмегенін білдіреді.</div>', unsafe_allow_html=True)
    st.caption("Дерек көзі: пайдаланушы ұсынған 14 күндік өлшеулер. CEFR деңгейлері 25 балдық тесттен автоматты шығарылмаған. Бақылау тобы жоқ, сондықтан нәтижелер өзгерісті сипаттайды және себептік әсерді жеке дәлелдемейді.")
    try:
        url = public_url(os.environ)
        if url:
            st.image(qr_bytes(url), width=220)
            st.link_button("Телефоннан ашу", url, use_container_width=True)
            st.download_button("QR-кодты жүктеу", qr_bytes(url), file_name="LinguaAI_QR.png", mime="image/png", use_container_width=True)
    except ValueError:
        pass
