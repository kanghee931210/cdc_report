import pandas as pd
import io
import re

def preprocess_file(file_content: bytes):
    """
    [업데이트] CSV뿐만 아니라 Excel(.xlsx, .xls) 파일도 지원합니다.
    파일 전체에서 'PJT' 헤더를 찾아 데이터를 로드하는 단순하고 강력한 로직입니다.
    """
    encodings_to_try = ['utf-8-sig', 'cp949', 'euc-kr', 'latin1']
    
    raw_df = None
    detected_enc = None
    file_type = None  # 'csv' 또는 'excel'
    
    print("📂 [FileHandler] 파일 로드 시작 (Excel/CSV Universal Mode)...")

    # 1. 엑셀 파일인지 먼저 시도 (바이너리라 인코딩 불필요)
    try:
        # 헤더 없이 앞부분 50줄만 읽어서 구조 파악
        temp_df = pd.read_excel(io.BytesIO(file_content), header=None, nrows=50)
        raw_df = temp_df
        file_type = 'excel'
        print("✅ 파일 형식 감지: Excel")
    except Exception:
        # 엑셀이 아니면 CSV로 간주하고 인코딩 감지 시도
        pass

    # 2. 엑셀이 아닐 경우 CSV 인코딩 감지 루프 실행
    if raw_df is None:
        for enc in encodings_to_try:
            try:
                temp_df = pd.read_csv(io.BytesIO(file_content), header=None, encoding=enc, nrows=50, engine='python')
                raw_df = temp_df
                detected_enc = enc
                file_type = 'csv'
                print(f"✅ 파일 형식 감지: CSV (인코딩: {enc})")
                break
            except Exception:
                continue
            
    if raw_df is None: 
        print("❌ 파일 읽기 실패 (지원하지 않는 형식이거나 인코딩 문제)")
        return None

    # 3. 'PJT', 'Code' 등이 포함된 실제 헤더 행 찾기
    real_header_idx = -1
    
    for i in range(len(raw_df)):
        row = raw_df.iloc[i]
        # 모든 값을 문자로 변환 후 대문자로 합쳐서 검색 (NaN 처리 포함)
        row_str = " ".join(row.fillna('').astype(str).values).upper()
        
        if ("PJT" in row_str) or ("PROJECT" in row_str) or ("코드" in row_str) or ("CODE" in row_str):
            real_header_idx = i
            print(f"✅ 헤더 발견 위치: {i}행")
            break
    
    if real_header_idx == -1: 
        print("❌ 'PJT' 또는 'PROJECT' 헤더를 찾을 수 없습니다.")
        return None

    # 4. 진짜 데이터프레임 생성 (형식에 따라 분기)
    try:
        if file_type == 'excel':
            df = pd.read_excel(io.BytesIO(file_content), header=real_header_idx)
        else:
            # CSV일 경우 감지된 인코딩 사용
            df = pd.read_csv(io.BytesIO(file_content), header=real_header_idx, encoding=detected_enc)
        
        # [기존 로직 유지] 헤더 이후 5행 건너뛰기
        # 주의: 헤더 바로 밑에 데이터가 있다면 이 부분은 제거해야 합니다.
        if len(df) > 7:
            df = df.iloc[7:, :]
        else:
            print("⚠️ 데이터 행이 부족하여 상단 5행 자르기를 건너뜁니다.")

    except Exception as e:
        print(f"❌ 데이터프레임 변환 에러: {e}")
        return None

    # 컬럼명 공백 제거
    df.columns = [str(c).strip() for c in df.columns]

    # 5. 헤더 메트릭 (총 매출) 단순 계산
    total_sales = 0
    col_money = '매출(계)' # 기본 컬럼명
    
    # 유사한 컬럼명 찾기
    if col_money not in df.columns:
        for c in df.columns:
            if "매출" in c and "계" in c:
                col_money = c
                break

    if col_money in df.columns:
        # 숫자 변환 후 합계 (문자열인 경우 콤마 등 제거)
        total_sales = pd.to_numeric(
            df[col_money].astype(str).str.replace(r'[^\d.-]', '', regex=True), 
            errors='coerce'
        ).sum()

    # 메타데이터 저장
    header_metrics = {}
    header_metrics['total_sales'] = total_sales
    # 주의: 최신 pandas에서는 df.attrs 사용 권장, 기존 방식 유지 시 경고 발생 가능
    try:
        df.header_metrics = header_metrics 
    except:
        pass # 일부 객체 타입에 따라 실패할 수 있음

    # 6. 데이터 정제 (Key 컬럼 기준)
    key_col = None
    
    # 우선순위에 따라 Key 컬럼 탐색
    candidates = ["PJT", "PROJECT", "코드", "CODE"]
    for cand in candidates:
        for col in df.columns:
            if cand in col.upper():
                key_col = col
                break
        if key_col: break
                
    if key_col:
        df.dropna(subset=[key_col], inplace=True)
        # 합계/소계 행 제거
        df = df[~df[key_col].astype(str).str.contains('합계|총계|Total|소계', case=False, na=False)]
        
        # 중복 제거 및 인덱스 설정
        df.drop_duplicates(subset=[key_col], keep='first', inplace=True)
        df.set_index(key_col, inplace=True)
        df = df.fillna(0)
        return df
    else:
        print("❌ 기준 Key 컬럼(PJT 등)을 찾지 못했습니다.")
        return None