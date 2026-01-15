import React from 'react';
import { Paper, Chip, Typography, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export default function ReportTab({ data }) {
  const formatMoney = (val) => val ? Math.round(Number(val)).toLocaleString() : '0';

  const columns = [
    { field: '유형', headerName: 'Type', width: 120, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={params.value} size="small" variant="outlined" sx={{ fontWeight: 800 }}
          color={['신규 추가'].includes(params.value) ? 'success' : ['취소/드랍'].includes(params.value) ? 'error' : 'default'} 
        />
      ) 
    },
    { field: '비고(사업명)', headerName: 'Project Name', flex: 1, minWidth: 300,
      renderCell: (params) => (
        <Box sx={{ py: 1, lineHeight: 1.5, whiteSpace: 'normal' }}>
          <Typography variant="body2" fontWeight={600}>{params.value.split('\n')[0]}</Typography>
          <Typography variant="caption" color="textSecondary">{params.value.split('\n')[1] || ''}</Typography>
        </Box>
      )
    },
    { field: '전월 금액', headerName: 'Before (₩)', width: 160, align: 'right', headerAlign: 'right',
      renderCell: (params) => <Typography variant="body2" fontWeight={500}>{formatMoney(params.value)}</Typography>
    },
    { field: '당월 금액', headerName: 'After (₩)', width: 160, align: 'right', headerAlign: 'right',
      renderCell: (params) => <Typography variant="body2" fontWeight={500}>{formatMoney(params.value)}</Typography>
    },
    { field: '증감', headerName: 'Diff (₩)', width: 160, align: 'right', headerAlign: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color={params.value > 0 ? 'success.main' : params.value < 0 ? 'error.main' : 'text.disabled'}>
          {params.value > 0 ? '+' : ''}{formatMoney(params.value)}
        </Typography>
      )
    },
  ];
  
  const rows = (data?.daily_report || []).map((row, idx) => ({ id: idx, ...row }));

  return (
    <Paper elevation={0} sx={{ height: '100%', minHeight: 600, border: '1px solid #e2e8f0', borderRadius: 3 }}>
      <DataGrid rows={rows} columns={columns} pageSize={15} disableSelectionOnClick rowHeight={70} 
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#f1f5f9', fontWeight: 800 } }} 
      />
    </Paper>
  );
}