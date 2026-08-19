from pipeline.kis import NEWS_PATH, NEWS_TR_ID, VOLUME_RANK_PATH, VOLUME_RANK_TR_ID, NewsQuery, normalize


def test_domestic_news_contract() -> None:
    assert NEWS_PATH == "/uapi/domestic-stock/v1/quotations/news-title"
    assert NEWS_TR_ID == "FHKST01011800"
    assert set(NewsQuery().model_dump(by_alias=True)) == {
        "FID_NEWS_OFER_ENTP_CODE",
        "FID_COND_MRKT_CLS_CODE",
        "FID_INPUT_ISCD",
        "FID_TITL_CNTT",
        "FID_INPUT_DATE_1",
        "FID_INPUT_HOUR_1",
        "FID_RANK_SORT_CLS_CODE",
        "FID_INPUT_SRNO",
    }


def test_volume_rank_contract() -> None:
    assert VOLUME_RANK_PATH == "/uapi/domestic-stock/v1/quotations/volume-rank"
    assert VOLUME_RANK_TR_ID == "FHPST01710000"


def test_kis_time_is_kst_and_dorg_classifies_disclosure() -> None:
    item = normalize({"data_dt": "20260814", "data_tm": "163646", "dorg": "코스닥 공시", "hts_pbnt_titl_cntt": "반기보고서"})
    assert item["published_at"].isoformat() == "2026-08-14T07:36:46+00:00"
    assert item["kind"] == "DISCLOSURE"
