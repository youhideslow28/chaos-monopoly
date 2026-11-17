---
name: production-monitoring
description: >-
  Runtime performance profiling, FPS monitoring, Web Vitals, and error telemetry for web games.
risk: none
source: community
date_added: "2026-03-01"
---

# Production Monitoring & Game Telemetry

## 1. Runtime Telemetry Metrics
- **Frame Rate (FPS)**: Monitor requestAnimationFrame delta to flag frame drops (<55fps).
- **Core Web Vitals**: LCP (<2.5s), FID (<100ms), CLS (<0.1).
- **Game Engine Errors**: Capture unhandled reducer exceptions, invalid state transitions, and audio context failures.
- **Session Duration & Heatmap**: Track game completion percentage, average turns per match, and chaos card frequency.
