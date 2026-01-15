import React, { useState, useEffect } from 'react';
import { Box, Grid, Tab, Tabs, Typography, AppBar, Toolbar, CircularProgress, Paper, Fade, CssBaseline, Fab, IconButton, Slide } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import dayjs from 'dayjs';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';

// 컴포넌트 임포트
import CalendarBoard from './components/CalendarBoard';
import RangeCalendarBoard from './components/RangeCalendarBoard';
import SummaryTab from './pages/SummaryTab';
import ThresholdTab from './pages/ThresholdTab'; 
import AIChatPanel from './components/AIChatPanel'; 
import { getUploadedDates, uploadFile, analyzeDates, deleteDate } from './api/cdcApi';

const theme = createTheme({
  palette: {
    primary: { main: '#1e40af' },
    secondary: { main: '#64748b' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: { fontFamily: '"Pretendard", "Inter", sans-serif', h6: { fontWeight: 700 } },
  components: { MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } }, MuiButton: { styleOverrides: { root: { borderRadius: 12, fontWeight: 600 } } } },
});

export default function App() {
  const [mainTab, setMainTab] = useState(0); 
  const [subTab, setSubTab] = useState(0);   
  const [uploadedDates, setUploadedDates] = useState([]); 
  
  // Daily 탭용 상태
  const [currentDateStr, setCurrentDateStr] = useState(dayjs().format('YYYY-MM-DD'));
  
  // Period 탭용 상태
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("데이터를 불러오는 중...");
  const [aiOpen, setAiOpen] = useState(false);

  // 날짜 목록 갱신
  const refreshDates = async () => {
    try {
      const dates = await getUploadedDates();
      setUploadedDates(dates);
      return dates;
    } catch (e) { console.error(e); }
  };
  useEffect(() => { refreshDates(); }, []);

  // 공통 기능: 삭제, 업로드
  const handleDelete = async (dateStr) => {
    try {
      setLoading(true);
      await deleteDate(dateStr);
      await refreshDates();
      setData(null);
      setStatusMessage("🗑️ 삭제 완료.");
    } catch (e) { alert("삭제 실패: " + e.message); } finally { setLoading(false); }
  };

  const handleUpload = async (dateStr, file) => {
    try {
      setLoading(true);
      await uploadFile(dateStr, file);
      await refreshDates();
      setData(null);
    } catch (e) { alert("업로드 실패: " + e.message); } finally { setLoading(false); }
  };

  // -----------------------------------------------------------
  // 분석 로직 (Daily & Period 공통 사용)
  // -----------------------------------------------------------
  const runAnalysis = async (dateOld, dateNew) => {
    if (!dateOld || !dateNew) return;
    setLoading(true);
    setStatusMessage(`🔄 분석 중... (${dateOld} ➡ ${dateNew})`);
    try {
      const result = await analyzeDates(dateOld, dateNew);
      if (result.data) {
        setData({ ...result.data, meta: { date_old: dateOld, date_new: dateNew } });
        setStatusMessage("");
      } else { setStatusMessage("분석 결과가 없습니다."); setData(null); }
    } catch (e) { setStatusMessage("분석 실패"); setData(null); } finally { setLoading(false); }
  };

  // [1] Daily 탭: 날짜 선택 시 자동 분석 (전일 대비)
  useEffect(() => {
    if (mainTab !== 0 || !uploadedDates.length) return;
    
    const sorted = uploadedDates.sort();
    const idx = sorted.indexOf(currentDateStr);
    
    if (idx === -1) { setData(null); setStatusMessage("📂 해당 날짜에 데이터가 없습니다."); return; }
    if (idx === 0) { setData(null); setStatusMessage("ℹ️ 기준 데이터 (비교 대상 없음)"); return; }

    const prevDate = sorted[idx - 1];
    runAnalysis(prevDate, currentDateStr);
  }, [currentDateStr, uploadedDates, mainTab]);

  // [2] Period 탭: 두 날짜 선택 시 분석
  const handleRangeSelect = (start, end) => {
    setRangeStart(start);
    setRangeEnd(end);

    if (start && end) {
      const sStr = start.format('YYYY-MM-DD');
      const eStr = end.format('YYYY-MM-DD');
      const hasStart = uploadedDates.includes(sStr);
      const hasEnd = uploadedDates.includes(eStr);

      if (!hasStart || !hasEnd) {
        setData(null);
        setStatusMessage("⚠️ 선택한 날짜에 업로드된 파일이 없습니다.");
        return;
      }
      runAnalysis(sStr, eStr);
    } else {
      setData(null);
      setStatusMessage("비교할 두 날짜(시작/종료)를 선택해주세요.");
    }
  };

  const getAllContextData = () => {
    if (!data?.summary_stats) return { report_date: "N/A", summary: {}, all_project_details: [] };
    return {
      report_date: `기준일: ${data.meta?.date_new} (대비: ${data.meta?.date_old})`,
      summary: {
        net_variation: data.summary_stats.total_impact,
        counts: { 
          new: data.summary_stats.new_count, drop: data.summary_stats.del_count, 
          update: data.summary_stats.update_count, adv_sales: data.summary_stats.adv_sales_count, 
          carry_over: data.summary_stats.carry_over_count 
        }
      },
      all_project_details: data.daily_report || [] 
    };
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
        
        {/* 헤더 */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <Toolbar sx={{ height: 70 }}>
            <DashboardIcon sx={{ color: 'primary.main', mr: 2, fontSize: 32 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" color="textPrimary">HIST Report</Typography>
              <Typography variant="caption" color="textSecondary">Enterprise Data Monitor</Typography>
            </Box>
            {/* 🔥 Monthly 탭 삭제됨 */}
            <Tabs value={mainTab} onChange={(e, v) => { setMainTab(v); setData(null); setStatusMessage("데이터를 선택해주세요."); }} sx={{ '& .MuiTab-root': { fontWeight: 700 } }}>
              <Tab label="Daily" />
              <Tab label="Period" />
            </Tabs>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, p: 3, overflow: 'hidden' }}>
          <Grid container spacing={3} sx={{ height: '100%' }}>
            
            {/* 왼쪽 패널 */}
            <Grid item xs={12} md={3} sx={{ height: '100%', overflowY: 'auto' }}>
              {mainTab === 0 ? (
                <CalendarBoard 
                  filesMap={uploadedDates.reduce((acc, d) => ({...acc, [d]: true}), {})} 
                  onUpload={handleUpload} onDelete={handleDelete}
                  onSelectDate={(d) => setCurrentDateStr(d.format('YYYY-MM-DD'))}
                  selectedDateStr={currentDateStr}
                />
              ) : (
                // Period 탭용 캘린더 (차트 없음)
                <RangeCalendarBoard 
                  filesMap={uploadedDates.reduce((acc, d) => ({...acc, [d]: true}), {})} 
                  onUpload={handleUpload} onDelete={handleDelete}
                  onRangeSelect={handleRangeSelect} 
                />
              )}
            </Grid>
            
            {/* 오른쪽 패널 */}
            <Grid item xs={12} md={9} sx={{ height: '100%' }}>
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', position: 'relative', overflow:'hidden' }}>
                {loading && (
                  <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection:'column' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2, fontWeight: 600 }}>데이터 분석 중...</Typography>
                  </Box>
                )}
                
                {!loading && data ? (
                  <Fade in={true}>
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ px: 4, py: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', flexShrink: 0 }}>
                        <Typography variant="h6">
                          📈 {data.meta?.date_old} 대비 <span style={{ color: '#1e40af' }}>{data.meta?.date_new}</span> 변동
                        </Typography>
                        <Tabs value={subTab} onChange={(e, v) => setSubTab(v)}>
                          <Tab label="경영진 요약" />
                          <Tab label="수주 가능성 리포트" />
                        </Tabs>
                      </Box>
                      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
                        {subTab === 0 && <SummaryTab data={data} />}
                        {subTab === 1 && <ThresholdTab data={data} />}
                      </Box>
                    </Box>
                  </Fade>
                ) : (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.6 }}>
                    <DashboardIcon sx={{ fontSize: 60, mb: 2, color: '#cbd5e1' }} />
                    <Typography variant="h6">{statusMessage}</Typography>
                    {mainTab === 1 && <Typography variant="caption" color="textSecondary">캘린더에서 시작일과 종료일을 차례로 선택하세요.</Typography>}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* AI 버튼 */}
        {data && (
          <Fab color="primary" sx={{ position: 'fixed', bottom: 40, right: 40, width: 64, height: 64 }} onClick={() => setAiOpen(!aiOpen)}>
             {aiOpen ? <CloseIcon fontSize="large" /> : <SmartToyIcon fontSize="large" />}
          </Fab>
        )}
        <Slide direction="up" in={aiOpen} mountOnEnter unmountOnExit>
          <Paper elevation={10} sx={{ position: 'fixed', bottom: 120, right: 40, width: 400, height: 600, zIndex: 9999, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between' }}><Typography variant="subtitle1" fontWeight={700}>AI Insight</Typography><IconButton size="small" onClick={()=>setAiOpen(false)} sx={{color:'white'}}><CloseIcon/></IconButton></Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}><AIChatPanel contextData={getAllContextData()} /></Box>
          </Paper>
        </Slide>
      </Box>
    </ThemeProvider>
  );
}