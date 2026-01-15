import json
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# .env 파일에서 OPENAI_API_KEY를 로드한다고 가정
VLLM_API_BASE = os.getenv("VLLM_API_BASE", "http://10.23.80.35:8881/v1")
VLLM_MODEL_NAME = os.getenv("VLLM_MODEL_NAME", "llama-hist")
API_KEY = os.getenv("OPENAI_API_KEY", "EMPTY")

def get_ai_insight(question: str, context_data: dict):
    """
    JSON 구조의 데이터를 받아서 분석합니다.
    """
    # 1. 모델 설정 (gpt-4o 추천)
    llm = ChatOpenAI(
            model=VLLM_MODEL_NAME,
            openai_api_key="EMPTY",
            base_url=VLLM_API_BASE,
            temperature=0,
            max_tokens=120000, # 토큰 수는 모델 상황에 맞게 조절
        )
    # 2. 데이터를 보기 좋게 포맷팅 (JSON String)
    # 한글 깨짐 방지를 위해 ensure_ascii=False
    formatted_context = json.dumps(context_data, indent=2, ensure_ascii=False)

    # 3. 프롬프트 (구조적 역할 부여)
    template = """
    당신은 기업 프로젝트 변동 관리(CDC) 전문가입니다.
    아래 제공된 [JSON DATA]는 '전일 대비 당일 프로젝트 변동 내역'입니다.
    
    데이터는 다음 5가지 카테고리로 분류되어 있습니다:
    1. 신규 추가 (new)
    2. 선매출/증액 (adv_sales)
    3. 이월/감액 (carry_over)
    4. 취소/드랍 (del)
    5. 기존 변동 (update)

    [JSON DATA]
    {context}

    위 데이터를 근거로 사용자의 질문에 답변하세요.
    - 인사와 같은 불필요한 작업은 답변에 집어넣지 않습니다.
    - 금액에 대한 내용은 정확하게 계산할 것.
    - 구체적인 금액(원 단위)이나 프로젝트명을 언급하며 전문적으로 답변할 것. 금액에 대해서는 절대 오차가 없도록 신중하게 답변할것.   
    - 질문과 관련 없는 카테고리는 언급하지 말 것.
    - 금액이 큰 순서대로 중요한 이슈 위주로 요약할 것.
    - 최대한 유연하게 대응할 것.
    - 정리가 필요한 답변은 MD(MarkDown)형태를 사용하시오


    사용자 질문: {question}
    """

    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm | StrOutputParser()

    try:
        return chain.invoke({
            "context": formatted_context,
            "question": question
        })
    except Exception as e:
        return f"AI 분석 오류: {str(e)}"