import React, { useState, useMemo } from 'react';
import { 
  Grid, Paper, Typography, Box, Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Tooltip, Zoom 
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

import NewReleasesIcon from '@mui/icons-material/NewReleases';
import CancelIcon from '@mui/icons-material/Cancel';
import UpdateIcon from '@mui/icons-material/Update';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TuneIcon from '@mui/icons-material/Tune'; 
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

// ----------------------------------------------------------------------
// 1. 포맷팅 및 헬퍼 함수
// ----------------------------------------------------------------------

const formatUnit = (val) => {
  if (val === 0 || val === undefined || val === null) return '0';
  const sign = val > 0 ? '+' : '';
  const formatted = parseFloat((Math.abs(val) / 100000000).toFixed(1));
  return `${sign}${formatted}억`;
};

const formatMoneyFull = (val) => val ? Math.round(val).toLocaleString() : '0';

const formatDetailChange = (oldVal, newVal) => {
  const fOld = oldVal ? Math.round(oldVal).toLocaleString() : '0';
  const fNew = newVal ? Math.round(newVal).toLocaleString() : '0';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: '#64748b' }}>
      <span>{fOld}</span>
      <ArrowRightAltIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
      <span style={{ fontWeight: 600, color: '#334155' }}>{fNew}</span>
    </Box>
  );
};

// ----------------------------------------------------------------------
// 2. 컴팩트 툴팁 컴포넌트
// ----------------------------------------------------------------------
const CustomChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isTotalPositive = data.financial_impact > 0;
    const projectsToShow = (data.projects || []).slice(0, 3);
    const hiddenCount = (data.projects || []).length - 3;
    const titleName = data.name || data.dept_name || "미지정";

    return (
      <Paper elevation={4} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, minWidth: 320, bgcolor: 'rgba(255, 255, 255, 0.98)', zIndex: 9999 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a' }}>{titleName}</Typography>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: isTotalPositive ? '#2563eb' : '#ef4444' }}>
            {isTotalPositive ? '+' : ''}{formatMoneyFull(data.financial_impact)}
            <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 400 }}>({formatUnit(data.financial_impact)})</Typography>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {projectsToShow.length > 0 ? projectsToShow.map((pjt, idx) => {
              const isPositive = pjt.diff > 0;
              return (
                <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', p: 1, borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#334155', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                    [{pjt.month}] {pjt.pjt_name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {formatDetailChange(pjt.old_val, pjt.new_val)}
                    <Typography variant="caption" fontWeight={800} sx={{ color: isPositive ? '#16a34a' : '#dc2626' }}>
                      {isPositive ? '+' : ''}{formatMoneyFull(pjt.diff)}
                      <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '4px', fontSize: '0.7rem' }}>({formatUnit(pjt.diff)})</span>
                    </Typography>
                  </Box>
                </Box>
              );
            }) : <Typography variant="caption" color="text.secondary" align="center">상세 내역 없음</Typography>}
        </Box>
        {hiddenCount > 0 && <Typography variant="caption" sx={{ display:'block', mt: 1, pt: 0.5, textAlign:'center', color:'#94a3b8', borderTop: '1px solid #f1f5f9' }}>... 외 {hiddenCount}건 생략</Typography>}
      </Paper>
    );
  }
  return null;
};

// ----------------------------------------------------------------------
// 3. 카드 컴포넌트
// ----------------------------------------------------------------------
const StatCard = ({ title, value, subValue, icon, color, bgcolor, onClick, hasDetail, isHero }) => (
  <Tooltip title={hasDetail ? "클릭하여 상세 내역 보기" : ""} arrow placement="top">
    <Paper 
      elevation={0} 
      onClick={hasDetail ? onClick : undefined}
      sx={{ 
        p: isHero ? 3 : 2.5, height: '100%', bgcolor: bgcolor, border: `1px solid ${color}30`, borderRadius: 4, 
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        cursor: hasDetail ? 'pointer' : 'default', transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': hasDetail ? { transform: 'translateY(-4px)', boxShadow: `0 10px 20px -5px ${color}40` } : {}
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant={isHero ? "subtitle1" : "overline"} color="textSecondary" fontWeight={700} sx={{ lineHeight: 1.2 }}>{title}</Typography>
        <Box sx={{ p: isHero ? 1.2 : 1, borderRadius: '50%', bgcolor: 'white', color: color, display: 'flex', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>{icon}</Box>
      </Box>
      <Box>
        <Typography variant={isHero ? "h3" : "h4"} fontWeight={800} sx={{ color: '#1e293b', letterSpacing: -1 }}>{value}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant={isHero ? "subtitle2" : "body2"} fontWeight={600} sx={{ color: color }}>{subValue}</Typography>
          {hasDetail && <TouchAppIcon sx={{ fontSize: 18, color: color, opacity: 0.7 }} />}
        </Box>
      </Box>
    </Paper>
  </Tooltip>
);

// ----------------------------------------------------------------------
// 4. 메인 컴포넌트: SummaryTab
// ----------------------------------------------------------------------
export default function SummaryTab({ data }) {
  const stats = data?.summary_stats || {};
  
  const { 
    total_impact, new_count, new_amount, new_top, del_count, del_amount, del_top,
    update_count, update_amount, update_top, carry_over_count, carry_over_amount, carry_over_top,
    adv_sales_count, adv_sales_amount, adv_sales_top,
    dept_chart_data, sector_chart_data 
  } = stats;

  const [open, setOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState([]);
  const [modalColor, setModalColor] = useState("primary");
  const [selectedSector, setSelectedSector] = useState(null);

  const handleSectorClick = (data) => {
    if (data && data.name) {
      setSelectedSector(prev => prev === data.name ? null : data.name);
    }
  };

  const filteredDeptData = useMemo(() => {
    const allDepts = dept_chart_data || [];
    if (!selectedSector) return allDepts; 
    return allDepts.filter(d => d.sector_name === selectedSector);
  }, [dept_chart_data, selectedSector]);

  const handleCardClick = (title, items, color) => {
    if (!items || items.length === 0) return;
    setModalTitle(title); setModalData(items); setModalColor(color); setOpen(true);
  };

  const DiffTooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5 }}>변동 원인 상세 (원 단위)</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, fontSize: '0.85rem' }}>
        <span style={{color: '#86efac'}}>+ 신규:</span> <span>{formatMoneyFull(new_amount)}</span>
        <span style={{color: '#c084fc'}}>+ 선매출:</span> <span>{formatMoneyFull(adv_sales_amount)}</span>
        <span style={{color: '#fcd34d'}}>+ 기존변동:</span> <span>{formatMoneyFull(update_amount)}</span>
        <span style={{color: '#fb923c'}}>- 이월:</span> <span>{formatMoneyFull(carry_over_amount)}</span>
        <span style={{color: '#fca5a5'}}>- 드랍:</span> <span>{formatMoneyFull(del_amount)}</span>
        <Box sx={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.2)', mt: 0.5, pt: 0.5, textAlign: 'right', fontWeight: 'bold' }}>최종 순 변동: {formatMoneyFull(total_impact)}</Box>
      </Box>
    </Box>
  );

  const isTotalNegative = total_impact < 0;
  const heroColor = isTotalNegative ? '#ef4444' : '#2563eb'; 
  const heroBg = isTotalNegative ? '#fef2f2' : '#eff6ff';
  const HeroIcon = isTotalNegative ? <TrendingDownIcon sx={{ fontSize: 32 }} /> : <TrendingUpIcon sx={{ fontSize: 32 }} />;
  const updateColor = update_amount < 0 ? '#d97706' : '#059669'; 
  const updateBg = update_amount < 0 ? '#fffbeb' : '#ecfdf5';

  return (
    <Box sx={{ maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* 1. 상단 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Tooltip title={DiffTooltipContent} arrow TransitionComponent={Zoom} placement="bottom">
            <Box><StatCard title="매출 변동 총합" value={formatUnit(total_impact)} subValue="최종 매출 변동치" icon={HeroIcon} color={heroColor} bgcolor={heroBg} isHero={true} hasDetail={true} /></Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2} columns={{ xs: 2, sm: 8, md: 10 }}>
            <Grid item xs={2} sm={4} md={2}><StatCard title="변동" value={`${update_count || 0} 건`} subValue={formatUnit(update_amount)} icon={<TuneIcon />} color={updateColor} bgcolor={updateBg} hasDetail={update_count > 0} isHero={false} onClick={() => handleCardClick("기존 변동 Top 10", update_top, updateColor)} /></Grid>
            <Grid item xs={2} sm={4} md={2}><StatCard title="신규" value={`${new_count} 건`} subValue={formatUnit(new_amount)} icon={<NewReleasesIcon />} color="#16a34a" bgcolor="#f0fdf4" hasDetail={new_count > 0} isHero={false} onClick={() => handleCardClick("신규 추가 Top 10", new_top, "#16a34a")} /></Grid>
            <Grid item xs={2} sm={4} md={2}><StatCard title="선매출" value={`${adv_sales_count} 건`} subValue={formatUnit(adv_sales_amount)} icon={<PriceCheckIcon />} color="#7c3aed" bgcolor="#f5f3ff" hasDetail={adv_sales_count > 0} isHero={false} onClick={() => handleCardClick("선매출 (증액) Top 10", adv_sales_top, "#7c3aed")} /></Grid>
            <Grid item xs={2} sm={4} md={2}><StatCard title="이월" value={`${carry_over_count} 건`} subValue={formatUnit(carry_over_amount)} icon={<UpdateIcon />} color="#ea580c" bgcolor="#fff7ed" hasDetail={carry_over_count > 0} isHero={false} onClick={() => handleCardClick("이월 (감액) Top 10", carry_over_top, "#ea580c")} /></Grid>
            <Grid item xs={2} sm={4} md={2}><StatCard title="취소 / 드랍" value={`${del_count} 건`} subValue={formatUnit(del_amount)} icon={<CancelIcon />} color="#dc2626" bgcolor="#fef2f2" hasDetail={del_count > 0} isHero={false} onClick={() => handleCardClick("취소 / 드랍 Top 10", del_top, "#dc2626")} /></Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* 2-1. 부문별 차트 (X축: 부문명 / Y축: 금액) */}
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
        📊 부문별 변동 현황 
        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}>
          (막대를 클릭하면 하단에서 해당 부문 부서만 볼 수 있습니다)
        </Typography>
      </Typography>
      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ height: 400, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* 🔥 [수정] layout prop 제거 (기본값 Horizontal) */}
            <BarChart data={sector_chart_data || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              {/* 🔥 X축에 카테고리(이름) 배치 */}
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              {/* 🔥 Y축에 수치 배치 (숨김 처리하여 깔끔하게) */}
              <YAxis type="number" hide />
              <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              
              <Bar 
                dataKey="financial_impact" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
                onClick={handleSectorClick}
                style={{ cursor: 'pointer' }}
              >
                {(sector_chart_data || []).map((entry, index) => (
                  <Cell 
                    key={`cell-sec-${index}`} 
                    fill={entry.financial_impact > 0 ? '#3b82f6' : '#ef4444'} 
                    stroke={selectedSector === entry.name ? '#1e293b' : 'none'}
                    strokeWidth={selectedSector === entry.name ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* 2-2. 부서별 차트 (X축: 부서명 / Y축: 금액) */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h6" fontWeight={800}>📉 부서별 변동 현황</Typography>
        {selectedSector && (
          <Typography variant="body2" sx={{ bgcolor: '#e2e8f0', px: 1, py: 0.5, borderRadius: 1, fontWeight: 600, color: '#475569' }}>
            필터: {selectedSector}
          </Typography>
        )}
      </Box>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ height: 400, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* 🔥 [수정] layout prop 제거 */}
            <BarChart data={filteredDeptData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              {/* 🔥 X축에 부서명 배치 */}
              <XAxis dataKey="dept_name" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis type="number" hide />
              <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="financial_impact" radius={[4, 4, 0, 0]} barSize={40}>
                {filteredDeptData.map((entry, index) => (
                  <Cell key={`cell-dept-${index}`} fill={entry.financial_impact > 0 ? '#2563eb' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* 3. 모달 (상세 내역) */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #eee', fontWeight: 800, color: modalColor }}>📊 {modalTitle}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead><TableRow><TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', width: '35%' }}>프로젝트명</TableCell><TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', width: '15%' }}>부서</TableCell><TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', width: '30%' }}>상세 내역</TableCell><TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', width: '20%' }}>변동 금액</TableCell></TableRow></TableHead>
              <TableBody>
                {modalData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell><Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>{row.pjt_name}</Typography></TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{row.dept_name}</TableCell>
                    <TableCell><Box sx={{ display: 'flex', flexDirection: 'column' }}>{row.month && <Typography variant="caption" sx={{ color: modalColor, fontWeight: 700, mb: 0.5, display: 'inline-block', border: `1px solid ${modalColor}30`, px: 0.8, borderRadius: 1, width: 'fit-content' }}>{row.month}</Typography>}{formatDetailChange(row.old_val, row.new_val)}</Box></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: row.diff > 0 ? '#16a34a' : '#dc2626' }}>{row.diff > 0 ? '+' : ''}{formatMoneyFull(row.diff)}<Typography variant="caption" display="block" color="text.secondary" fontWeight={400}>({formatUnit(row.diff)})</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)} sx={{ fontWeight: 700 }}>닫기</Button></DialogActions>
      </Dialog>
    </Box>
  );
}