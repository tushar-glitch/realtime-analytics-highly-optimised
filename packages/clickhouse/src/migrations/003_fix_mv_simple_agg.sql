-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: change plain UInt64 columns to SimpleAggregateFunction(sum, UInt64).
--
-- AggregatingMergeTree only knows how to merge AggregateFunction / SimpleAggregateFunction
-- columns. Plain UInt64 columns keep the first-seen value during merges, which means
-- pageview / session counts collapse to 1 after the first background merge.
-- SimpleAggregateFunction(sum, UInt64) is merged by summing — same as SummingMergeTree —
-- while AggregateFunction(uniq) columns continue to work unchanged.
-- Query syntax is identical: count()/sum() on insert, sum() on read.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Hourly pageview aggregates
DROP VIEW  IF EXISTS mv_pageviews_hourly;
DROP TABLE IF EXISTS mv_pageviews_hourly_data;

CREATE TABLE mv_pageviews_hourly_data
(
    site_id     UUID,
    hour        DateTime,
    pathname    String,
    country     LowCardinality(FixedString(2)),
    browser     LowCardinality(String),
    device_type LowCardinality(String),
    ref_source  LowCardinality(String),
    pageviews   SimpleAggregateFunction(sum, UInt64),
    visitors    AggregateFunction(uniq, UInt64),
    sessions    AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (site_id, hour, pathname, country, browser, device_type, ref_source);

CREATE MATERIALIZED VIEW mv_pageviews_hourly
TO mv_pageviews_hourly_data
AS SELECT
    site_id,
    toStartOfHour(timestamp)  AS hour,
    pathname,
    country,
    browser,
    device_type,
    ref_source,
    count()                   AS pageviews,
    uniqState(visitor_id)     AS visitors,
    uniqState(session_id)     AS sessions
FROM events
WHERE type = 'pageview'
GROUP BY site_id, hour, pathname, country, browser, device_type, ref_source;

-- Backfill from existing events
INSERT INTO mv_pageviews_hourly_data
SELECT
    site_id,
    toStartOfHour(timestamp)  AS hour,
    pathname,
    country,
    browser,
    device_type,
    ref_source,
    count()                   AS pageviews,
    uniqState(visitor_id)     AS visitors,
    uniqState(session_id)     AS sessions
FROM events
WHERE type = 'pageview'
GROUP BY site_id, hour, pathname, country, browser, device_type, ref_source;


-- 2. Daily session metrics
DROP VIEW  IF EXISTS mv_sessions_daily;
DROP TABLE IF EXISTS mv_sessions_daily_data;

CREATE TABLE mv_sessions_daily_data
(
    site_id        UUID,
    date           Date,
    sessions       SimpleAggregateFunction(sum, UInt64),
    bounces        SimpleAggregateFunction(sum, UInt64),
    total_duration SimpleAggregateFunction(sum, UInt64),
    visitors       AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, date);

CREATE MATERIALIZED VIEW mv_sessions_daily
TO mv_sessions_daily_data
AS SELECT
    site_id,
    toDate(timestamp)         AS date,
    count()                   AS sessions,
    countIf(is_bounce = 1)    AS bounces,
    sum(duration)             AS total_duration,
    uniqState(visitor_id)     AS visitors
FROM events
WHERE type = 'pageview'
GROUP BY site_id, date;

INSERT INTO mv_sessions_daily_data
SELECT
    site_id,
    toDate(timestamp)         AS date,
    count()                   AS sessions,
    countIf(is_bounce = 1)    AS bounces,
    sum(duration)             AS total_duration,
    uniqState(visitor_id)     AS visitors
FROM events
WHERE type = 'pageview'
GROUP BY site_id, date;


-- 3. Daily referrer aggregates
DROP VIEW  IF EXISTS mv_referrers_daily;
DROP TABLE IF EXISTS mv_referrers_daily_data;

CREATE TABLE mv_referrers_daily_data
(
    site_id    UUID,
    date       Date,
    ref_source LowCardinality(String),
    pageviews  SimpleAggregateFunction(sum, UInt64),
    visitors   AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, date, ref_source);

CREATE MATERIALIZED VIEW mv_referrers_daily
TO mv_referrers_daily_data
AS SELECT
    site_id,
    toDate(timestamp)         AS date,
    ref_source,
    count()                   AS pageviews,
    uniqState(visitor_id)     AS visitors
FROM events
WHERE type = 'pageview'
GROUP BY site_id, date, ref_source;

INSERT INTO mv_referrers_daily_data
SELECT
    site_id,
    toDate(timestamp)         AS date,
    ref_source,
    count()                   AS pageviews,
    uniqState(visitor_id)     AS visitors
FROM events
WHERE type = 'pageview'
GROUP BY site_id, date, ref_source;
