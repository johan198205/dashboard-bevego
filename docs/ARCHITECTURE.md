Komponenter

UI: components/SourceToggle, widgets/TimeSeries, widgets/ChannelTable, widgets/TotalDiffCard.

Server: lib/resolver.ts, lib/ga4Client.ts, lib/bqClient.ts, lib/cache.ts.

Data: BQ-vyer vw_sessions, vw_pageviews_users.

Flöde

[User Toggle GA4/BQ]
        |
        v
[resolver.getKpi(params, dataSource)]
        |------------------------------|
        |                              |
   [ga4Client]                    [bqClient]
        |                              |
 [normalize -> contract schema] <------|
        |
   [return to UI + source_label + explainer]


BQ SQL (sammandrag)

Pageviews/Users:

WITH ev AS (
  SELECT DATE(TIMESTAMP_MICROS(event_timestamp), "Europe/Stockholm") AS ga_date,
         COALESCE(user_id, user_pseudo_id) AS ga_user
  FROM `project.dataset.events_*`
  WHERE _TABLE_SUFFIX BETWEEN @utc_start AND @utc_end
    AND event_name = 'page_view'
)
SELECT ga_date AS date,
       COUNT(*) AS pageviews,
       COUNT(DISTINCT ga_user) AS users
FROM ev
WHERE ga_date BETWEEN @start_date AND @end_date
GROUP BY date;


Sessions/Engaged sessions: (dedupe enligt GA-session-id, ≥10s eller ≥2 views eller konv).

Se vy vw_sessions enligt samma logik.

Paritet

Normalisera nycklar: date, channel_group (GA4: sessionDefaultChannelGroup; BQ: mapping via traffic_source).

Dokumentera avvikelser i UI.