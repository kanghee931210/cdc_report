import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Label, Cell } from 'recharts';

// 금액 포맷 (억 단위)
const formatMoney = (val) => val ? (val / 100000000).toFixed(1) + '억' : '0';

export default function MonthlyTab({ data }) {
  const monthlyData = data?.summary_stats?.monthly_totals || {};
  
  // 1월 ~ 12월 데이터 생성
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      name: `${month}월`,
      value: monthlyData[month] || 0
    };
  });

  const TARGET_AMOUNT = 25000000000; // 250억

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6" fontWeight={800} color="textPrimary" gutterBottom>
        📅 월별 매출 현황 (Annual Overview)
      </Typography>
      
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', height: 600, bgcolor: 'white' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            
            <XAxis 
              dataKey="name" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 14, fontWeight: 600, fill: '#64748b' }} 
              dy={10}
            />
            
            <YAxis 
              tickFormatter={(val) => `${(val / 100000000).toFixed(0)}억`} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#94a3b8' }}
            />
            
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              formatter={(val) => [`${(val).toLocaleString()} 원`, '매출']}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
            />
            
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50} animationDuration={1500}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= TARGET_AMOUNT ? '#16a34a' : '#3b82f6'} />
              ))}
            </Bar>
            
            {/* 🎯 250억 목표 라인 */}
            <ReferenceLine y={TARGET_AMOUNT} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2}>
              <Label 
                value="Target: 250억" 
                position="top" 
                fill="#ef4444" 
                fontWeight={700} 
                fontSize={14}
                dy={-10}
              />
            </ReferenceLine>
            
          </BarChart>
        </ResponsiveContainer>
        
        <Box sx={{ textAlign: 'center', mt: 2 }}>
           <Typography variant="body2" color="textSecondary">
             * 250억 달성 월은 <span style={{color: '#16a34a', fontWeight: 'bold'}}>초록색</span>으로 표시됩니다.
           </Typography>
        </Box>
      </Paper>
    </Box>
  );
}