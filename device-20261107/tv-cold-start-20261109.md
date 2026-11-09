# TV client cold start: ~0.8 s (2026-11-09, 1.3.58 / code 82)

Measured on the living-room box (X96Max, 32-bit ARM), force-stop before each run:

```
adb shell am start -W -n com.mediarr.mediarr_client/.MainActivity
TotalTime: 787 ms
TotalTime: 826 ms
TotalTime: 816 ms
```

So the "hands-off, living-room-first" entry cost is under a second to the client process being up — the
remaining per-screen latency is network (now gzip-compressed and SQL-paginated). Added to the report's
measured-performance table as a device metric.
