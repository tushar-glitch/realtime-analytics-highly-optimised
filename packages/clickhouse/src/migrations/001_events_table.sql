-- Raw events table — source of truth. Never update rows, only insert.
--
-- Partition by month:  full month scans are common, older months are cold.
-- Order by site+date+session: queries filtered by site+date range skip most data.
-- LowCardinality: dictionary-encodes string columns with < ~10K distinct values.
-- TTL: raw events expire after 2 years; pre-aggregated MVs keep summaries forever.

CREATE TABLE IF NOT EXISTS events
(
    site_id      UUID,
    timestamp    DateTime64(3, 'UTC'),
    type         LowCardinality(String),
    -- Page
    pathname     String,
    hostname     String,
    -- Referrer
    referrer     String,
    ref_source   LowCardinality(String),
    -- UTM parameters
    utm_source   String,
    utm_medium   String,
    utm_campaign String,
    utm_content  String,
    utm_term     String,
    -- Device (from UA parser)
    browser      LowCardinality(String),
    browser_ver  String,
    os           LowCardinality(String),
    os_ver       String,
    device_type  LowCardinality(String),
    -- Geo (from MaxMind GeoLite2)
    country      LowCardinality(FixedString(2)),
    region       LowCardinality(String),
    -- Session (cookieless fingerprint — daily rotating)
    session_id   UInt64,
    visitor_id   UInt64,
    is_bounce    UInt8,
    duration     UInt32,
    -- Custom events
    event_name   String,
    props        Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, toDate(timestamp), session_id)
TTL toDateTime(timestamp) + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;
