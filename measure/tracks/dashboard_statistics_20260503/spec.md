# Dashboard Statistics & Analytics

## Overview

Add a statistics dashboard that provides insights into media library composition, download activity, and system performance. This fills a product vision gap where users currently lack aggregate views of their media collection and system health.

## Problem Statement

While individual media items and downloads are visible, users have no way to understand their library at a glance—how much storage is used, what genres dominate, download success rates, or which indexers are most productive. This makes it harder to optimize their media management setup.

## Solution

Create a statistics dashboard with key metrics and visualizations:

### Library Statistics
- Total movies/TV shows/episodes count
- Storage usage breakdown (movies vs TV vs downloads)
- Genre distribution (pie chart or bar graph)
- Quality profile distribution (1080p vs 4K vs HDR)
- Recently added media (last 7/30 days)

### Download Statistics
- Download success/failure rates
- Average download time by quality
- Most active indexers (grab counts)
- Bandwidth usage over time (daily/weekly)

### System Health
- Database size and record counts
- Active torrent count and total download speed
- Disk space usage with warnings
- Uptime and last restart time

### Data Visualization
- Interactive charts using a lightweight library (Chart.js or similar)
- Date range selector for historical data
- Export statistics as JSON/CSV

## Acceptance Criteria

- [ ] Statistics API returns aggregated library/download/system data
- [ ] Dashboard displays charts for library composition
- [ ] Download statistics show success rates and indexer performance
- [ ] System health metrics display with warnings for low disk space
- [ ] Charts are interactive with tooltips showing exact values
- [ ] Date range filter updates all visualizations
- [ ] Tests cover statistics calculations and API responses

## Out of Scope

- Real-time monitoring dashboards (use existing SSE for that)
- Predictive analytics or recommendations
- User behavior tracking
- External reporting integrations
