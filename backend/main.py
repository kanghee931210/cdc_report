import traceback
import io
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request
from typing import Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, LargeBinary, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 서비스 로직 임포트
from services.ai_service import get_ai_insight
from services.file_handler import preprocess_file
from services.cdc_logic import run_cdc_analysis

# ==========================================
# [DB 설정] SQLite
# ==========================================
# SQLALCHEMY_DATABASE_URL = "sqlite:///./cdc_dashboard.db" # local 용
SQLALCHEMY_DATABASE_URL = "sqlite:////app/data/cdc_database.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DailyData(Base):
    __tablename__ = "daily_data"
    date = Column(String, primary_key=True, index=True) 
    filename = Column(String)
    content = Column(LargeBinary) 

class ReportCache(Base):
    __tablename__ = "report_cache"
    id = Column(String, primary_key=True, index=True) 
    date_old = Column(String)
    date_new = Column(String)
    result_json = Column(Text) 

Base.metadata.create_all(bind=engine)

# ==========================================
# [FastAPI 설정]
# ==========================================
app = FastAPI(title="Project CDC Backend")

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "*"  # 개발 중에는 모두 허용
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    date_old: str
    date_new: str

# ---------------------------------------------------------
# API: 파일 업로드
# ---------------------------------------------------------
@app.post("/api/upload")
async def upload_daily_file(
    date: str = Form(...),
    file: UploadFile = File(...)
):
    db = SessionLocal()
    try:
        content = await file.read()
        existing = db.query(DailyData).filter(DailyData.date == date).first()
        
        if existing:
            existing.filename = file.filename
            existing.content = content
        else:
            new_data = DailyData(date=date, filename=file.filename, content=content)
            db.add(new_data)
        
        db.query(ReportCache).filter(
            (ReportCache.date_old == date) | (ReportCache.date_new == date)
        ).delete()
        
        db.commit()
        return {"message": "저장 완료"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# ---------------------------------------------------------
# API: 날짜 목록 조회
# ---------------------------------------------------------
@app.get("/api/dates")
def get_uploaded_dates():
    db = SessionLocal()
    dates = db.query(DailyData.date).all()
    db.close()
    return [d[0] for d in dates]

# ---------------------------------------------------------
# API: 데이터 삭제
# ---------------------------------------------------------
@app.delete("/api/delete/{date}")
def delete_daily_data(date: str):
    db = SessionLocal()
    try:
        record = db.query(DailyData).filter(DailyData.date == date).first()
        if not record:
            raise HTTPException(status_code=404, detail="데이터 없음")
        
        db.delete(record)
        db.query(ReportCache).filter((ReportCache.date_old == date) | (ReportCache.date_new == date)).delete()
        
        db.commit()
        return {"message": "삭제 완료"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# ---------------------------------------------------------
# API: 분석 (DB 기반)
# ---------------------------------------------------------
@app.post("/api/analyze")
def analyze_dates(req: AnalyzeRequest):
    db = SessionLocal()
    try:
        cache_key = f"{req.date_old}_{req.date_new}"
        
        data_old = db.query(DailyData).filter(DailyData.date == req.date_old).first()
        data_new = db.query(DailyData).filter(DailyData.date == req.date_new).first()

        if not data_old or not data_new:
            raise HTTPException(status_code=404, detail="원본 파일 없음")

        df_old = preprocess_file(data_old.content)
        df_new = preprocess_file(data_new.content)

        if df_old is None or df_new is None:
            raise HTTPException(status_code=400, detail="데이터 전처리 실패")

        result = run_cdc_analysis(df_old, df_new, req.date_new)
        
        db.query(ReportCache).filter(ReportCache.id == cache_key).delete()
        new_cache = ReportCache(id=cache_key, date_old=req.date_old, date_new=req.date_new, result_json=json.dumps(result, ensure_ascii=False))
        db.add(new_cache)
        db.commit()

        return {"message": "분석 완료", "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# # ---------------------------------------------------------
# # API: AI 질문 (Pydantic 우회 - 디버깅용)
# # ---------------------------------------------------------
# @app.post("/api/ask-report")
# async def ask_report(request: Request):
#     """
#     [강력 디버깅 모드] 
#     어떤 데이터 형식이 오든 에러를 내지 않고 받아서 확인합니다.
#     """
#     try:
#         # 1. 원본 데이터 수신
#         body = await request.json()
#         print(f"🔥 [DEBUG] 수신된 데이터 키: {list(body.keys())}")
        
#         # 2. 데이터 추출 (안전하게 get 사용)
#         question = body.get("question", "")
#         context_data = body.get("context_data", {})
        
#         print(f"✅ 질문: {question}")
#         print(f"✅ 데이터 타입: {type(context_data)}")
        
#         # 3. 데이터가 혹시 문자열로 왔다면 파싱 시도 (방어 로직)
#         if isinstance(context_data, str):
#             print("⚠️ 데이터가 문자열로 옴 -> JSON 파싱 시도")
#             try:
#                 context_data = json.loads(context_data)
#             except:
#                 print("❌ JSON 파싱 실패")
        
#         # 4. 서비스 호출
#         answer = get_ai_insight(question, context_data)
#         return {"answer": answer}
        
#     except Exception as e:
#         traceback.print_exc()
#         # 422 대신 500 에러와 함께 상세 내용을 반환하여 디버깅
#         return {"answer": f"서버 내부 오류 발생: {str(e)}"}

class ReportRequest(BaseModel):
    question: str
    context_data: Any
@app.post("/api/ask-report")
async def ask_report(req: ReportRequest):
    """
    Pydantic 모델(ReportRequest)을 사용하여 데이터를 검증하고 받습니다.
    """
    # 디버깅: 실제로 들어온 데이터 타입 찍어보기
    print(f"📥 [질문]: {req.question}")
    print(f"📥 [데이터 타입]: {type(req.context_data)}")
    
    # 데이터 정제 (만약 문자열로 왔을 경우 대비)
    data = req.context_data
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except:
            pass

    answer = get_ai_insight(req.question, data)
    return {"answer": answer}

@app.get("/api/stats/monthly")
def get_monthly_stats(year: str, month: str):
    """
    [최적화 버전]
    이미 분석되어 DB(ReportCache)에 저장된 'total_impact' 값만 빠르게 조회합니다.
    분석하지 않은 날짜는 0으로 반환합니다.
    """
    db = SessionLocal()
    try:
        # 1. 전체 날짜 목록 로드 (순서 파악용)
        # (Tip: 데이터가 수만 건이 아니므로 전체 날짜 로드는 매우 빠름)
        all_dates = db.query(DailyData.date).order_by(DailyData.date).all()
        all_dates = [d[0] for d in all_dates]

        # 2. 요청한 '년-월'에 해당하는 날짜만 필터링
        target_prefix = f"{year}-{month.zfill(2)}"
        target_dates = [d for d in all_dates if d.startswith(target_prefix)]

        stats = []

        for curr_date in target_dates:
            try:
                # 3. 전일 날짜 찾기 (Cache Key 생성용)
                curr_idx = all_dates.index(curr_date)
                
                # 첫 번째 데이터라 비교 대상이 없으면 0
                if curr_idx == 0:
                    stats.append({"date": curr_date, "impact": 0})
                    continue
                
                prev_date = all_dates[curr_idx - 1]
                cache_key = f"{prev_date}_{curr_date}"

                # 4. 🔥 [핵심] ReportCache 테이블만 조회 (분석 로직 실행 X)
                cached = db.query(ReportCache).filter(ReportCache.id == cache_key).first()
                
                if cached:
                    # DB에 저장된 JSON 파싱 -> total_impact 추출
                    import json
                    result_json = json.loads(cached.result_json)
                    impact = result_json.get("summary_stats", {}).get("total_impact", 0)
                    stats.append({"date": curr_date, "impact": impact})
                else:
                    # 파일은 있는데 아직 '분석' 버튼을 안 누른 경우 -> 0 처리
                    stats.append({"date": curr_date, "impact": 0})
            
            except Exception as e:
                print(f"Stats Error ({curr_date}): {e}")
                stats.append({"date": curr_date, "impact": 0})

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
if __name__ == "__main__":
    import uvicorn
    # 외부 접속 허용 (host 0.0.0.0)
    uvicorn.run(app, host="0.0.0.0", port=7676)