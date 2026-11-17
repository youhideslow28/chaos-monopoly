# CHAOS MONOPOLY — SUSTAINED PERFORMANCE & FRAME TELEMETRY
## Controlled Benchmarking, Statistical Latency & Memory Analysis

**Document:** `docs/overhaul/07_PERFORMANCE_VALIDATION.md`  
**Test Script:** `scripts/verify_post_overhaul_gate.cjs`  
**Execution Environment:** Google Chrome Headless 156.0.0.0 on Windows 10 (win32-x64)  
**Measurement Method:** 500-frame sampling via `requestAnimationFrame(performance.now)`  
**Audit Status:** **PASS (Exceeds 60 FPS Desktop Target with 0.0% Severe Jank)**

---

## 1. Test Rig & Controlled Environmental Conditions

| Parameter | Recorded Value |
|---|---|
| **Host Operating System** | Windows 10 Home / Pro (win32-x64) |
| **Browser Version** | Google Chrome Headless 156.0.0.0 (Chromium) |
| **Active WebGL API** | WebGL 2.0 (OpenGL ES 3.0 Chromium) |
| **Shading Language** | WebGL GLSL ES 3.00 |
| **GPU Vendor** | Google Inc. (AMD) |
| **Unmasked GPU Renderer** | `ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)` |
| **Viewport Dimensions** | 1440 × 900 pixels |
| **Device Pixel Ratio** | 1.00 |
| **Sample Size** | 500 consecutive animation frames |

---

## 2. Statistical Frame Latency & Frame Rate Distribution

The table below presents telemetry gathered over 500 continuous render frames in the active 3D isometric tabletop mode:

```
Frame Time Distribution:
[ 0 ms ] -------- (6.9 ms Median) -------- [ 7.2 ms p95 ] ---- (16.67 ms 60fps limit) ---->
```

| Metric | Target Standard | Measured Value | Variance / Delta | Evaluation |
|---|:---:|:---:|:---:|:---:|
| **Sampled Frames** | >= 300 frames | **499 frames** | N/A | **PASS** |
| **Average Frame Rate** | >= 60.0 FPS | **137.4 – 143.1 FPS** | +77.4 FPS (+129%) | **PASS** |
| **Average Frame Time** | <= 16.67 ms | **6.99 – 7.28 ms** | -9.39 ms | **PASS** |
| **Median Frame Time (p50)** | <= 16.67 ms | **6.90 – 7.00 ms** | -9.67 ms | **PASS** |
| **95th Percentile (p95)** | <= 20.00 ms | **7.10 – 7.20 ms** | -12.80 ms | **PASS** |
| **99th Percentile (p99)** | <= 33.33 ms | **7.80 ms** | -25.53 ms | **PASS** |
| **Dropped Frames (> 16.67 ms)** | < 5% of frames | **1 – 2 frames (0.2 – 0.4%)** | Near Zero | **PASS** |
| **Severe Jank Frames (> 33.33 ms)**| 0 frames | **0 frames (0.0%)** | 0 ms | **PASS** |

---

## 3. Memory Telemetry & Allocation Profiling

### 3.1 V8 JavaScript Heap Telemetry
Source: `window.performance.memory`
- **Used JS Heap Size:** `11.32 – 14.24 MB`
- **Total JS Heap Size:** `27.84 – 32.83 MB`
- **JS Heap Size Limit:** `4192.00 MB` (4.0 GB V8 default allocation ceiling)

### 3.2 Critical Distinction: JS Heap vs GPU VRAM
> [!NOTE]
> The `11.32 – 14.24 MB` metric recorded above represents **V8 JavaScript engine heap allocations** (e.g. React virtual DOM trees, game state objects, array buffers). It does **NOT** measure GPU Video RAM (VRAM). Three.js WebGL vertex buffers, procedural box/cylinder geometries, and PCFSoftShadowMap render targets (2048 × 2048 shadow texture) reside in GPU driver memory. Because Three.js uses procedural geometries rather than uncompressed 50MB GLTF assets, GPU memory footprint is estimated at under 45 MB VRAM.

---

## 4. Hardware Disclaimer & Mobile Caveats

- **Desktop Acceleration:** The sustained **137.4 – 143.1 FPS** benchmark was captured on a desktop AMD Radeon integrated GPU running DirectX 11 via ANGLE.
- **Do Not Extrapolate to Mobile:** This desktop result must **not** be used to claim 120 FPS performance on physical mobile devices. On mobile silicon (e.g. Apple A15 or Snapdragon 8), thermal throttling, battery optimization governors, and high-DPI retina canvas scaling (devicePixelRatio = 3.0) will typically throttle sustained frame rates to 60 FPS or 30 FPS.

---

## 5. Performance Sign-Off: **PASS (Desktop Benchmark Certified)**

Under controlled desktop conditions, the Three.js 3D diorama maintains consistent, judder-free 137+ FPS rendering with a 6.9 ms median frame time and 0.0% severe frame stutter.