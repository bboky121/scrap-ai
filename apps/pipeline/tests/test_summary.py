from pipeline.summary import summarize


def test_summary_is_deterministic() -> None:
    one = summarize("반도체 수출 호조", "NEWS", "005930")
    assert one == summarize("반도체 수출 호조", "NEWS", "005930")
    assert one["sentiment"] == "POSITIVE"
    assert one["title_only"] is True


def test_summary_marks_market_neutral_titles() -> None:
    result = summarize("코스피 장 마감 시황", "MARKET_COMMENTARY", None)

    assert result["sentiment"] == "NEUTRAL"
    assert result["title_only"] is True
    assert result["related_stocks"] == []


def test_summary_extracts_multiple_stock_codes() -> None:
    result = summarize("삼성전자(005930)와 SK하이닉스(000660) 실적 발표", "NEWS", "005930")

    assert result["related_stocks"] == ["005930"]
