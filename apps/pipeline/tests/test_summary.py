from pipeline.summary import summarize


def test_summary_is_deterministic() -> None:
    one = summarize("반도체 수출 호조", "NEWS", "005930")
    assert one == summarize("반도체 수출 호조", "NEWS", "005930")
    assert one["sentiment"] == "POSITIVE"
    assert one["title_only"] is True
