from celery.schedules import crontab

from pipeline.tasks import celery


def test_hourly_jobs_run_at_the_top_of_the_hour() -> None:
    for name in ("hourly-kis-news", "renew-subscriptions"):
        schedule = celery.conf.beat_schedule[name]["schedule"]
        assert isinstance(schedule, crontab)
        assert schedule._orig_minute == 0
        assert schedule._orig_hour == "*"


def test_celery_uses_korea_timezone() -> None:
    assert celery.conf.timezone == "Asia/Seoul"
