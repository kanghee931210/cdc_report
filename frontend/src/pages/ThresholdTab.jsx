import React, { useState, useMemo } from 'react';
import { 
  Box, Typography, Slider, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, Alert
} from '@mui/material';

const formatCurrency = (val) => new Intl.NumberFormat('ko-KR').format(val);

// 1. 등간격 배치를 위한 매핑 (Index <-> Value)
const THRESHOLD_MAP = [
  { index: 0, value: 0, label: '0%' },
  { index: 1, value: 10, label: '10%' },
  { index: 2, value: 30, label: '30%' },
  { index: 3, value: 50, label: '50%' },
  { index: 4, value: 60, label: '60%' },
  { index: 5, value: 70, label: '70%' },
  { index: 6, value: 90, label: '90%' },
  { index: 7, value: 100, label: '100%' },
];

export default function ThresholdTab({ data }) {
  const [sliderIndex, setSliderIndex] = useState(4); // 기본값 60%
  const threshold = THRESHOLD_MAP[sliderIndex].value;

  const { catchUpGroup, forecastGroup, totals, validCount } = useMemo(() => {
    if (!data || !data.daily_report) return { catchUpGroup: null, forecastGroup: null, totals: {}, validCount: 0 };

    const rawData = data.daily_report;
    const catchUp = [];
    const forecast = [];
    
    // 전체 합계 변수
    let globalTotalOld = 0;
    let globalTotalNew = 0;
    let globalTotalDiff = 0;
    let validItemCount = 0;

    rawData.forEach(item => {
      const probValue = item['확률'];

      // 1. 유효성 체크: 값이 없거나, 0인 경우 제외
      if (probValue === null || probValue === undefined || probValue === '') return;
      
      const prob = Number(probValue);
      if (prob === 0) return; // 0% 제외

      const oldVal = Number(item['전월 금액'] || 0);
      const newVal = Number(item['당월 금액'] || 0);
      const diff = Number(item['증감'] || 0);

      // 2. 금액이 모두 0이면 제외
      if (oldVal === 0 && newVal === 0 && diff === 0) return;

      // 유효 데이터 카운트
      validItemCount++;
      
      // 전체 합계 누적
      globalTotalOld += oldVal;
      globalTotalNew += newVal;
      globalTotalDiff += diff;

      // 그룹 분류
      if (prob < threshold) {
        catchUp.push(item);
      } else {
        forecast.push(item);
      }
    });

    // 🔥 [핵심 수정] 그룹별 소계(전월, 당월, 증감) 계산 함수
    const processGroup = (list) => {
      const grouped = {};
      let groupTotalOld = 0;
      let groupTotalNew = 0;
      let groupTotalDiff = 0;

      list.forEach(item => {
        const type = item['유형'] || '기타';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(item);

        // 그룹 소계 누적
        groupTotalOld += Number(item['전월 금액'] || 0);
        groupTotalNew += Number(item['당월 금액'] || 0);
        groupTotalDiff += Number(item['증감'] || 0);
      });

      return { 
        grouped, 
        count: list.length,
        totalOld: groupTotalOld, 
        totalNew: groupTotalNew, 
        totalDiff: groupTotalDiff 
      };
    };

    return {
      catchUpGroup: processGroup(catchUp),
      forecastGroup: processGroup(forecast),
      totals: { totalOld: globalTotalOld, totalNew: globalTotalNew, totalDiff: globalTotalDiff },
      validCount: validItemCount
    };
  }, [data, threshold]);

  const renderGroupRows = (groupName, groupData, bgColor) => {
    if (!groupData) return null;
    // 🔥 계산된 소계 데이터 구조 분해 할당
    const { grouped, count, totalOld, totalNew, totalDiff } = groupData;
    const types = Object.keys(grouped);
    
    if (types.length === 0) return null;

    return (
      <>
        {types.map((type, typeIdx) => {
          const items = grouped[type];
          return items.map((item, itemIdx) => (
            <TableRow key={`${groupName}-${type}-${itemIdx}`} sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}>
              {typeIdx === 0 && itemIdx === 0 && (
                <TableCell 
                  rowSpan={count} 
                  sx={{ 
                    bgcolor: bgColor, fontWeight: 'bold', textAlign: 'center', 
                    borderRight: '1px solid #d1d5db', verticalAlign: 'middle'
                  }}
                >
                  <Typography variant="body2" fontWeight={800}>{groupName}</Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {groupName === '만회' ? `(< ${threshold}%)` : `(≥ ${threshold}%)`}
                  </Typography>
                </TableCell>
              )}
              {itemIdx === 0 && (
                <TableCell rowSpan={items.length} sx={{ fontWeight: 600, verticalAlign: 'middle', borderRight: '1px solid #f1f5f9' }}>
                  {type}
                </TableCell>
              )}
              <TableCell align="right">{formatCurrency(item['전월 금액'])}</TableCell>
              <TableCell align="right">{formatCurrency(item['당월 금액'])}</TableCell>
              <TableCell align="right" sx={{ color: item['증감'] > 0 ? 'blue' : 'red', fontWeight: 600 }}>
                {formatCurrency(item['증감'])}
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={`${item['확률']}%`} size="small" 
                  color={item['확률'] >= threshold ? "success" : "warning"} 
                  variant={item['확률'] >= threshold ? "filled" : "outlined"}
                />
              </TableCell>
              <TableCell sx={{ fontSize: '0.85rem' }}>{item['사업명']}</TableCell>
              <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>{item['비고']}</TableCell>
            </TableRow>
          ));
        })}
        
        {/* 🔥 [소계 행] 계산된 값 표시 */}
        <TableRow sx={{ bgcolor: bgColor, borderTop: '2px solid #cbd5e1' }}>
          <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', color: '#334155' }}>{groupName} 소계</TableCell>
          <TableCell align="right" sx={{ fontWeight: 'bold', color: '#475569' }}>
            {formatCurrency(totalOld)}
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 'bold', color: '#475569' }}>
            {formatCurrency(totalNew)}
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 'bold', color: totalDiff > 0 ? 'blue' : 'red' }}>
            {formatCurrency(totalDiff)}
          </TableCell>
          <TableCell colSpan={3}></TableCell>
        </TableRow>
      </>
    );
  };

  if (!data) return <Alert severity="info">데이터가 없습니다.</Alert>;

  return (
    <Box sx={{ pb: 4 }}>
      {/* 컨트롤 패널 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e293b' }}>
              🎯 수주 가능성 기준
            </Typography>
            <Chip 
              label={`${threshold}%`} 
              color="primary" 
              sx={{ fontWeight: '800', fontSize: '1rem', px: 1, height: 32 }} 
            />
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ bgcolor: '#f1f5f9', px: 2, py: 0.5, borderRadius: 2 }}>
            데이터 <b>{validCount}건</b>을 분석합니다.
          </Typography>
        </Box>

        <Box sx={{ px: 2 }}>
          <Slider
            value={sliderIndex}
            onChange={(e, v) => setSliderIndex(v)}
            min={0}
            max={7}
            step={1}
            marks={THRESHOLD_MAP.map(item => ({ value: item.index, label: item.label }))}
            valueLabelDisplay="off"
            sx={{
              color: '#1e40af',
              height: 8,
              '& .MuiSlider-track': { border: 'none' },
              '& .MuiSlider-rail': { opacity: 0.3, backgroundColor: '#cbd5e1' },
              '& .MuiSlider-thumb': {
                height: 24, width: 24, backgroundColor: '#fff', border: '3px solid currentColor',
                '&:focus, &:hover, &.Mui-active': { boxShadow: '0 0 0 8px rgba(30, 64, 175, 0.16)' },
              },
              '& .MuiSlider-mark': { backgroundColor: '#94a3b8', height: 4, width: 4, borderRadius: '50%' },
              '& .MuiSlider-markActive': { opacity: 1, backgroundColor: '#fff' },
              '& .MuiSlider-markLabel': { fontSize: '0.8rem', fontWeight: 600, color: '#64748b', top: 36, whiteSpace: 'nowrap' },
              '& .MuiSlider-markLabelActive': { color: '#1e40af', fontWeight: 800, fontSize: '0.9rem' }
            }}
          />
        </Box>
      </Paper>

      {/* 데이터 테이블 */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#334155' }}>
              <TableCell align="center" width="10%" sx={{ color: 'white', fontWeight: 600 }}>구분</TableCell>
              <TableCell align="center" width="10%" sx={{ color: 'white', fontWeight: 600 }}>변동구분</TableCell>
              <TableCell align="center" width="12%" sx={{ color: 'white' }}>전월</TableCell>
              <TableCell align="center" width="12%" sx={{ color: 'white' }}>당월</TableCell>
              <TableCell align="center" width="12%" sx={{ color: 'white' }}>변동액</TableCell>
              <TableCell align="center" width="8%" sx={{ color: 'white' }}>가능성</TableCell>
              <TableCell align="center" sx={{ color: 'white' }}>사업명</TableCell>
              <TableCell align="center" width="15%" sx={{ color: 'white' }}>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {renderGroupRows('만회', catchUpGroup, '#fff7ed')} 
            {renderGroupRows('추정', forecastGroup, '#f0fdf4')}
            
            {/* 전체 합계 행 */}
            <TableRow sx={{ bgcolor: '#1e293b' }}>
              <TableCell colSpan={2} align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                일 변동 합계
              </TableCell>
              <TableCell align="right" sx={{ color: '#94a3b8' }}>{formatCurrency(totals.totalOld)}</TableCell>
              <TableCell align="right" sx={{ color: '#94a3b8' }}>{formatCurrency(totals.totalNew)}</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {formatCurrency(totals.totalDiff)}
              </TableCell>
              <TableCell colSpan={3}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}