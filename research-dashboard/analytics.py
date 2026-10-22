"""Validated progress analysis. No score imputation or score-to-CEFR conversion."""
from io import BytesIO
import zipfile
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

SYNTHETIC='SYNTHETIC_DEMO_NOT_REAL'
REAL='REAL_MEASUREMENT'
SUMMARY=['participant_id','baseline_level','pre_score','mid_score','post_score','test_max','data_origin']
DAILY=['participant_id','day','minutes','tasks','attempted','correct','words_reviewed','data_origin']
LABELS={'pre_score':'0 күн','mid_score':'7 күн','post_score':'14 күн'}

def _numeric(df,cols):
    for col in cols:
        raw=df[col].map(lambda value: np.nan if isinstance(value,str) and not value.strip() else value)
        clean=pd.to_numeric(raw,errors='coerce')
        if (raw.notna() & clean.isna()).any(): raise ValueError(f'{col}: сан орнына мәтін енгізілген.')
        if np.isinf(clean.dropna()).any(): raise ValueError(f'{col}: шексіз мәнге рұқсат жоқ.')
        df[col]=clean
    return df

def _base(df,columns,origin):
    missing=set(columns)-set(df.columns)
    if missing: raise ValueError('Бағандар жетіспейді: '+', '.join(sorted(missing)))
    df=df[columns].copy()
    if df.empty: raise ValueError('Кесте бос.')
    for key in ['participant_id','data_origin']:
        df[key]=df[key].fillna('').astype(str).str.strip()
    if not df.data_origin.eq(origin).all():raise ValueError('Дерек түрлері араласқан немесе белгісі қате. DEMO мен нақты деректі бөлек ұстаңыз.')
    pattern=r'DEMO-\d{2}' if origin==SYNTHETIC else r'P\d{3}'
    if not df.participant_id.str.fullmatch(pattern).all():raise ValueError('Қатысушы коды қате. DEMO-01 немесе нақты режимде P001 пішімін қолданыңыз.')
    return df

def validate_summary(df,origin):
    df=_numeric(_base(df,SUMMARY,origin),['pre_score','mid_score','post_score','test_max'])
    if df.participant_id.duplicated().any():raise ValueError('Қатысушы кодтары қайталанған.')
    if df.test_max.isna().any() or not df.test_max.between(1,1000).all() or df.test_max.nunique()!=1:raise ValueError('Барлық оқушы үшін бірдей оң test_max керек (1–1000).')
    for c in ['pre_score','mid_score','post_score']:
        if ((df[c]<0)|(df[c]>df.test_max)).any():raise ValueError(f'{c}: балл 0 және test_max арасында болуы керек.')
    df.baseline_level=df.baseline_level.fillna('').astype(str).str.strip()
    if not df.baseline_level.isin(['','A1','A2','B1','B2','C1','C2','Белгісіз']).all():raise ValueError('Деңгей A1–C2, Белгісіз немесе бос болуы керек.')
    return df

def validate_daily(df,origin,ids):
    df=_numeric(_base(df,DAILY,origin),['day','minutes','tasks','attempted','correct','words_reviewed'])
    if not df.participant_id.isin(ids).all():raise ValueError('Күнделікте бастапқы тізімде жоқ қатысушы бар.')
    if df.day.isna().any() or not df.day.between(1,14).all() or not df.day.mod(1).eq(0).all():raise ValueError('Күн нөмірі 1–14 бүтін сан болуы керек.')
    if df.duplicated(['participant_id','day']).any():raise ValueError('Бір қатысушының бір күнге екі жазбасы бар.')
    limits={'minutes':1440,'tasks':10000,'attempted':10000,'correct':10000,'words_reviewed':10000}
    for c,maximum in limits.items():
        if ((df[c]<0)|(df[c]>maximum)).any():raise ValueError(f'{c}: рұқсат етілмейтін мән.')
        if c!='minutes' and not df[c].dropna().mod(1).eq(0).all():raise ValueError(f'{c}: бүтін сан керек.')
    if (df.correct.notna() & df.attempted.isna()).any() or (df.correct>df.attempted).any():raise ValueError('correct attempted санынан аспауы керек; attempted міндетті.')
    return df

def paired(df):
    result=df.dropna(subset=['pre_score','post_score']).copy()
    result['gain']=result.post_score-result.pre_score
    result['gain_pp']=result.gain/result.test_max*100
    result['relative_pct']=result.gain/result.pre_score.where(result.pre_score>0)*100
    return result

def metrics(df):
    p=paired(df)
    if p.empty:return {'n':0,'pre':None,'post':None,'gain':None,'gain_pp':None,'relative_pct':None}
    pre=float(p.pre_score.mean());post=float(p.post_score.mean())
    return {'n':len(p),'pre':pre,'post':post,'gain':post-pre,'gain_pp':float(p.gain_pp.mean()),'relative_pct':(post-pre)/pre*100 if pre>0 else None}

def checkpoint_long(df):
    return df.melt(id_vars=['participant_id','baseline_level','test_max'],value_vars=list(LABELS),var_name='checkpoint',value_name='score').assign(day=lambda d:d.checkpoint.map({'pre_score':0,'mid_score':7,'post_score':14})).dropna(subset=['score'])

def create_figures(summary,daily,origin):
    """Publication-ready figures from the exact current inputs, with origin labels."""
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'svg.fonttype':'none','axes.spines.top':False,'axes.spines.right':False})
    tag='МОДЕЛЬДІК ЗЕРТТЕУ НӘТИЖЕЛЕРІ' if origin==SYNTHETIC else 'НАҚТЫ ӨЛШЕУЛЕР · Пайдаланушы енгізген деректер'
    def canvas(title,subtitle):
        fig,ax=plt.subplots(figsize=(10,5.625));fig.subplots_adjust(left=.11,right=.95,bottom=.20,top=.76)
        fig.text(.07,.94,title,fontsize=18,weight='bold',va='top',color='#172744')
        fig.text(.07,.85,subtitle,fontsize=10,color='#475569')
        fig.text(.07,.045,tag,fontsize=10,weight='bold',color='#234d7a')
        return fig,ax
    figures={};p=paired(summary);m=metrics(summary)
    if not p.empty:
        fig,ax=canvas('Екі аптадағы жұпталған нәтиже',f'n = {len(p)} · Бірдей тест шкаласы · Балл өзгерісі оқу әсерінің себебін дәлелдемейді')
        x=np.arange(len(p));w=.37
        ax.bar(x-w/2,p.pre_score,w,label='0 күн',color='#91a9df');ax.bar(x+w/2,p.post_score,w,label='14 күн',color='#2554be')
        ax.set_xticks(x,p.participant_id,rotation=35,ha='right');ax.set_ylabel('Тест балы');ax.set_ylim(0,float(summary.test_max.iloc[0])*1.12);ax.legend(frameon=False,ncol=2)
        figures['07_pre_post_paired']=fig
        fig,ax=canvas('Әр профильдегі балл өзгерісі',f'n = {len(p)} · Δ = 14 күнгі балл − бастапқы балл · Теріс және нөлдік өзгерістер сақталған')
        ax.barh(p.participant_id,p.gain,color=['#227b70' if v>0 else '#bb5462' if v<0 else '#778599' for v in p.gain]);ax.axvline(0,color='#64748b',lw=1)
        extent=max(float(p.gain.abs().max()),1);ax.set_xlim(-extent*1.35,extent*1.35);ax.set_xlabel('Балл айырмасы');ax.invert_yaxis()
        for i,v in enumerate(p.gain):ax.text(v+(.12 if v>=0 else -.12),i,f'{v:+g}',va='center',ha='left' if v>=0 else 'right')
        figures['08_individual_gain']=fig
    complete=summary.dropna(subset=['pre_score','mid_score','post_score'])
    if not complete.empty:
        fig,ax=canvas('Бақылау нүктелеріндегі орташа балл',f'n = {len(complete)} · Үш өлшемі де бар бірдей профильдер · Аралық күндерге тест балы қосылмаған')
        means=[complete[c].mean() for c in LABELS];ax.plot([0,7,14],means,'o-',color='#2554be',lw=2.8,ms=8)
        for day,val in zip([0,7,14],means):ax.annotate(f'{val:.2f}',(day,val),xytext=(0,13),textcoords='offset points',ha='center')
        ax.set_xticks([0,7,14],['0 күн','7 күн','14 күн']);ax.set_ylim(0,float(summary.test_max.iloc[0])*1.1);ax.set_ylabel('Орташа тест балы');ax.grid(axis='y',alpha=.15)
        figures['09_checkpoint_means']=fig
    measured=daily.dropna(subset=['minutes'])
    if not measured.empty:
        fig,ax=canvas('Он төрт күндегі оқу уақыты','Ұяшықтағы сан — минут · Сұр ұяшық — дерек жоқ · 0 — тіркелген нөл минут')
        table=measured.pivot(index='participant_id',columns='day',values='minutes').reindex(index=summary.participant_id,columns=range(1,15))
        cmap=plt.get_cmap('Blues').copy();cmap.set_bad('#dfe4ea')
        im=ax.imshow(table.to_numpy(),aspect='auto',cmap=cmap,vmin=0,vmax=max(1,float(measured.minutes.max())))
        ax.set_xticks(range(14),range(1,15));ax.set_yticks(range(len(table)),table.index);ax.set_xlabel('Күн')
        for i in range(len(table)):
            for j in range(14):
                v=table.iloc[i,j]
                if pd.notna(v):ax.text(j,i,f'{v:g}',ha='center',va='center',fontsize=8,color='white' if v>measured.minutes.max()*.6 else '#172744')
        figures['10_daily_minutes_heatmap']=fig
    return figures

def figure_bytes(fig,fmt='png'):
    b=BytesIO();fig.savefig(b,format=fmt,dpi=300,facecolor='white');return b.getvalue()

def export_figures(summary,daily,origin):
    figures=create_figures(summary,daily,origin);output=BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for name,fig in figures.items():
            for ext in ['png','svg','pdf']:z.writestr(name+'.'+ext,figure_bytes(fig,ext))
            plt.close(fig)
    return output.getvalue()
