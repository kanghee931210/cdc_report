import pandas as pd
import numpy as np
import re
import math
from datetime import datetime

# =========================================================
# 1. 유틸리티 함수 (데이터 정제)
# =========================================================

def clean_nan(obj):
    """
    JSON 직렬화 에러(422)를 방지하기 위해 
    데이터 내의 NaN, Infinity를 None으로 재귀 변환하는 함수
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
    elif isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(i) for i in obj]
    return obj

def safe_float(val):
    """
    문자열(예: '1,000', '50%')을 안전하게 float으로 변환
    """
    try:
        if pd.isna(val) or val == '': return 0.0
        s = str(val).replace(',', '').replace('%', '').strip()
        return float(s)
    except:
        return 0.0

def get_probability(row):
    """
    행 데이터에서 '수주가능성' 관련 컬럼을 찾아 0~100 사이의 숫자(확률)로 반환.
    값이 없거나 유효하지 않으면 None 반환 (0으로 변환하지 않음).
    """
    prob_cols = ['수주가능성', '확률', 'Probability', '가능성', '영업기회진행상태', 'Status']
    
    found_col = None
    for col in prob_cols:
        if col in row.index:
            found_col = col
            break
            
    if found_col:
        raw_val = row[found_col]
        
        # 빈 값 체크
        if pd.isna(raw_val) or raw_val is None or str(raw_val).strip() == "":
            return None 

        val = None
        # 숫자인 경우
        if isinstance(raw_val, (int, float)):
            val = float(raw_val)
        # 문자인 경우
        elif isinstance(raw_val, str):
            clean_str = raw_val.replace('%', '').replace(',', '').strip()
            if clean_str == "": return None
            try:
                val = float(clean_str)
            except ValueError:
                return None 
        
        # 0~1 사이 소수점 정규화 (예: 0.5 -> 50)
        if val is not None and 0 < val <= 1.0:
            val = val * 100
            
        return val
    return None

def get_pjt_schedule_and_amount(row, month_cols):
    """
    행에서 가장 큰 금액이 발생하는 월과 그 금액 합계를 찾음
    """
    max_val = 0
    target_month = 0
    total_amt = 0.0
    
    for m_col in month_cols:
        try:
            m_num = int(re.sub(r'[^0-9]', '', m_col))
        except: continue
        
        val = safe_float(row.get(m_col, 0))
        total_amt += val
        
        if abs(val) > abs(max_val):
            max_val = val
            target_month = m_num
            
    return target_month, total_amt


# =========================================================
# 2. 핵심 분석 로직 (CDC)
# =========================================================

def run_cdc_analysis(df_old: pd.DataFrame, df_new: pd.DataFrame, date_new_str: str):
    
    # 1. 기준월 추출
    try:
        dt = datetime.strptime(date_new_str, "%Y-%m-%d")
        current_month = dt.month
    except:
        current_month = 0
    
    # 2. 월 데이터 컬럼 감지
    all_cols = df_new.columns.tolist()
    month_cols = [c for c in all_cols if re.match(r'.*[0-9]+월$', str(c))]
    
    # 3. 메타 데이터 매핑 (Project Code, Dept, Sector 감지)
    pjt_col_new = 'PJT명' if 'PJT명' in df_new.columns else df_new.columns[0]
    dept_col_new = '주관부서' if '주관부서' in df_new.columns else '부서'
    # 부문 컬럼 감지 (우선순위: 부문 > 본부 > Division > Sector)
    sector_col_new = next((col for col in ['부문', '본부', 'Division', 'Sector'] if col in df_new.columns), None)

    pjt_col_old = 'PJT명' if 'PJT명' in df_old.columns else df_old.columns[0]
    dept_col_old = '주관부서' if '주관부서' in df_old.columns else '부서'
    sector_col_old = next((col for col in ['부문', '본부', 'Division', 'Sector'] if col in df_old.columns), None)

    # 딕셔너리 생성
    pjt_map_new = df_new[pjt_col_new].to_dict() if pjt_col_new in df_new.columns else {}
    dept_map_new = df_new[dept_col_new].to_dict() if dept_col_new in df_new.columns else {}
    sector_map_new = df_new[sector_col_new].to_dict() if sector_col_new else {}

    pjt_map_old = df_old[pjt_col_old].to_dict() if pjt_col_old in df_old.columns else {}
    dept_map_old = df_old[dept_col_old].to_dict() if dept_col_old in df_old.columns else {}
    sector_map_old = df_old[sector_col_old].to_dict() if sector_col_old else {}

    old_idxs = set(df_old.index)
    new_idxs = set(df_new.index)
    
    changes = []
    
    # ---------------------------------------------------------
    # (A) 신규 추가 (New)
    # ---------------------------------------------------------
    insert_changes = []
    for pid in (new_idxs - old_idxs):
        row = df_new.loc[pid]
        m_num, amt = get_pjt_schedule_and_amount(row, month_cols)
        
        if amt != 0:
            prob = get_probability(row)
            item = {
                "pjt_code": pid,
                "pjt_name": pjt_map_new.get(pid, "Unknown"),
                "dept_name": dept_map_new.get(pid, "미지정"),
                "sector_name": sector_map_new.get(pid, "미지정"), # 부문 정보 추가
                "type": "신규 추가",
                "month": f"{m_num}월" if m_num else "-",
                "old_val": 0, "new_val": amt,
                "diff": amt, "financial_impact": amt,
                "month_info": f"{m_num}월",
                "probability": prob
            }
            changes.append(item)
            insert_changes.append(item)

    # ---------------------------------------------------------
    # (B) 취소/드랍 (Delete)
    # ---------------------------------------------------------
    delete_changes = []
    for pid in (old_idxs - new_idxs):
        row = df_old.loc[pid]
        m_num, amt = get_pjt_schedule_and_amount(row, month_cols)
        
        if amt != 0:
            prob = get_probability(row)
            item = {
                "pjt_code": pid,
                "pjt_name": pjt_map_old.get(pid, "Unknown"),
                "dept_name": dept_map_old.get(pid, "미지정"),
                "sector_name": sector_map_old.get(pid, "미지정"), # 부문 정보 추가
                "type": "취소/드랍",
                "month": f"{m_num}월" if m_num else "-",
                "old_val": amt, "new_val": 0,
                "diff": -amt, "financial_impact": -amt,
                "month_info": f"{m_num}월",
                "probability": prob
            }
            changes.append(item)
            delete_changes.append(item)

    # ---------------------------------------------------------
    # (C) 변경 (Update)
    # ---------------------------------------------------------
    update_changes = []     
    adv_sales_changes = []  
    carry_over_changes = [] 
    
    common_pids = new_idxs & old_idxs
    
    for pid in common_pids:
        row_new = df_new.loc[pid]
        current_prob = get_probability(row_new)

        for m_col in month_cols:
            try:
                m_num = int(re.sub(r'[^0-9]', '', m_col))
                if m_num > 12: m_num = m_num % 100 
            except: continue

            val_old = safe_float(df_old.at[pid, m_col]) if m_col in df_old.columns else 0.0
            val_new = safe_float(df_new.at[pid, m_col])
            diff = val_new - val_old
            
            if abs(diff) > 0:
                final_type = "기존 변동"
                target_list = update_changes
                
                if current_month > 0 and m_num < current_month:
                    final_type = "선매출"
                    target_list = adv_sales_changes
                elif current_month > 0 and m_num > current_month and diff < 0:
                    final_type = "이월"
                    target_list = carry_over_changes

                item = {
                    "pjt_code": pid,
                    "pjt_name": pjt_map_new.get(pid, "Unknown"),
                    "dept_name": dept_map_new.get(pid, "미지정"),
                    "sector_name": sector_map_new.get(pid, "미지정"), # 부문 정보 추가
                    "type": final_type,
                    "month": f"{m_num}월",
                    "old_val": val_old,
                    "new_val": val_new,
                    "diff": diff,
                    "financial_impact": diff,
                    "month_info": f"{m_num}월",
                    "probability": current_prob
                }
                
                changes.append(item)
                target_list.append(item)

    # ---------------------------------------------------------
    # 4. 통계 집계 및 리포트 생성
    # ---------------------------------------------------------
    
    # (1) 전체 합계
    def calc_total_df(df, m_cols):
        total = 0
        for col in m_cols: 
            if col in df.columns: total += df[col].apply(safe_float).sum()
        return total

    total_new_sum = calc_total_df(df_new, month_cols)
    total_old_sum = calc_total_df(df_old, month_cols)
    macro_diff = total_new_sum - total_old_sum
    total_impact = sum(x['financial_impact'] for x in changes)

    # (2) Top 10 함수
    def get_top_10(lst): 
        return sorted(lst, key=lambda x: abs(x['diff']), reverse=True)[:10]

    df_changes = pd.DataFrame(changes)
    
    # (3) 부문별(Sector) 차트 데이터 생성
    sector_chart_data = []
    if not df_changes.empty:
        # sector_name 컬럼이 없으면 dept_name으로 대체 (방어 코드)
        group_key = 'sector_name' if 'sector_name' in df_changes.columns else 'dept_name'
        
        for name, group in df_changes.groupby(group_key):
            group_impact = group['financial_impact'].sum()
            top_projects = group.sort_values(by='financial_impact', key=abs, ascending=False).head(5)
            projects_list = top_projects[['pjt_name', 'month', 'old_val', 'new_val', 'diff']].to_dict(orient='records')
            
            sector_chart_data.append({
                "name": name, 
                "financial_impact": group_impact,
                "projects": projects_list 
            })
        sector_chart_data.sort(key=lambda x: abs(x['financial_impact']), reverse=True)

    # (4) 부서별(Dept) 차트 데이터 생성 (부문 필터링 지원용)
    dept_chart_data = []
    if not df_changes.empty:
        for name, group in df_changes.groupby('dept_name'):
            group_impact = group['financial_impact'].sum()
            
            # 해당 부서가 속한 부문명 추출 (첫 번째 행 기준)
            sec_name = group['sector_name'].iloc[0] if 'sector_name' in group.columns else "미지정"
            
            top_projects = group.sort_values(by='financial_impact', key=abs, ascending=False).head(5)
            projects_list = top_projects[['pjt_name', 'month', 'old_val', 'new_val', 'diff']].to_dict(orient='records')

            dept_chart_data.append({
                "dept_name": name,
                "sector_name": sec_name, # Frontend 필터링 키
                "financial_impact": group_impact,
                "projects": projects_list 
            })
        dept_chart_data.sort(key=lambda x: abs(x['financial_impact']), reverse=True)

    # (5) 경영진 요약 데이터 (Summary Stats)
    summary_stats = {
        "macro_total_sales": total_new_sum,
        "macro_sales_diff": macro_diff,
        "total_impact": total_impact,
        
        "new_count": len(insert_changes),
        "new_amount": sum(x['diff'] for x in insert_changes),
        "new_top": get_top_10(insert_changes),

        "del_count": len(delete_changes),
        "del_amount": sum(x['diff'] for x in delete_changes),
        "del_top": get_top_10(delete_changes),

        "update_count": len(update_changes),
        "update_amount": sum(x['diff'] for x in update_changes),
        "update_top": get_top_10(update_changes),

        "adv_sales_count": len(adv_sales_changes),
        "adv_sales_amount": sum(x['diff'] for x in adv_sales_changes),
        "adv_sales_top": get_top_10(adv_sales_changes),

        "carry_over_count": len(carry_over_changes),
        "carry_over_amount": sum(x['diff'] for x in carry_over_changes),
        "carry_over_top": get_top_10(carry_over_changes),
        
        "sector_chart_data": sector_chart_data, # 부문별 차트
        "dept_chart_data": dept_chart_data      # 부서별 차트
    }

    # (6) 상세 리포트 (Daily Report)
    daily_report = []
    for row in changes:
        daily_report.append({
            "유형": row['type'],
            "사업명": row['pjt_name'],
            "부문": row['sector_name'],
            "부서": row['dept_name'],
            "기간": row['month'],
            "전월 금액": row['old_val'],
            "당월 금액": row['new_val'],
            "증감": row['diff'],
            "확률": row.get('probability', None),
            "비고": f"{row['month_info']} 변동"
        })

    # (7) AI용 텍스트 리포트
    text_report = "\n".join([f"- [{x['type']}] {x['pjt_name']} ({x['month']}): {x['diff']:+,.0f}" for x in changes[:50]])

    # 5. 최종 반환 (NaN 청소)
    result_data = {
        "summary_stats": summary_stats,
        "daily_report": daily_report,
        "text_report": text_report
    }
    
    return clean_nan(result_data)