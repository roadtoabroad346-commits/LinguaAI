"""Run: python -m unittest -v test_progress.py"""
import unittest
from pathlib import Path
from io import BytesIO
import zipfile
import pandas as pd
from analytics import SYNTHETIC,REAL,validate_summary,validate_daily,paired,metrics,export_figures

DATA=Path(__file__).parent/'data'
class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.s=validate_summary(pd.read_csv(DATA/'checkpoints_demo.csv'),SYNTHETIC)
        self.d=validate_daily(pd.read_csv(DATA/'daily_demo.csv'),SYNTHETIC,self.s.participant_id)
    def test_demo_totals_and_decline(self):
        m=metrics(self.s);self.assertEqual(m['n'],10);self.assertAlmostEqual(m['pre'],15.9);self.assertAlmostEqual(m['post'],17.8);self.assertAlmostEqual(m['gain_pp'],7.6)
        self.assertEqual((paired(self.s).gain<0).sum(),1);self.assertEqual((paired(self.s).gain==0).sum(),2)
    def test_real_starts_unmeasured(self):
        real=validate_summary(pd.read_csv(DATA/'checkpoints_real_template.csv'),REAL)
        self.assertTrue(real.baseline_level.eq('').all());self.assertEqual(metrics(real)['n'],0)
    def test_missing_not_zero_and_paired_cohort(self):
        s=self.s.copy();s.loc[0,'post_score']=float('nan');self.assertEqual(metrics(s)['n'],9)
        self.assertEqual(self.d.minutes.isna().sum(),3);self.assertGreater(self.d.minutes.eq(0).sum(),0)
    def test_zero_baseline(self):
        s=self.s.iloc[:1].copy();s['pre_score']=0
        self.assertIsNone(metrics(s)['relative_pct']);self.assertTrue(pd.isna(paired(s).relative_pct.iloc[0]))
    def test_mixed_origins_and_ids_rejected(self):
        s=self.s.copy();s.loc[0,'data_origin']=REAL
        with self.assertRaises(ValueError):validate_summary(s,SYNTHETIC)
        s=self.s.copy();s.loc[0,'participant_id']='P001'
        with self.assertRaises(ValueError):validate_summary(s,SYNTHETIC)
    def test_bounds_duplicates_nonnumeric(self):
        for col,value in [('post_score',26),('pre_score',-1),('test_max',0),('mid_score','invalid')]:
            s=self.s.astype({col:'object'}).copy();s.loc[0,col]=value
            with self.assertRaises(ValueError):validate_summary(s,SYNTHETIC)
        with self.assertRaises(ValueError):validate_summary(pd.concat([self.s,self.s.iloc[:1]]),SYNTHETIC)
    def test_daily_integrity(self):
        d=self.d.copy();d.loc[0,'correct']=d.loc[0,'attempted']+1
        with self.assertRaises(ValueError):validate_daily(d,SYNTHETIC,self.s.participant_id)
        d=self.d.copy();d.loc[0,'day']=15
        with self.assertRaises(ValueError):validate_daily(d,SYNTHETIC,self.s.participant_id)
    def test_export_includes_twelve_files(self):
        z=zipfile.ZipFile(BytesIO(export_figures(self.s,self.d,SYNTHETIC)))
        self.assertEqual(len(z.namelist()),12)
        for n in z.namelist():self.assertGreater(len(z.read(n)),1000)
if __name__=='__main__':unittest.main()
