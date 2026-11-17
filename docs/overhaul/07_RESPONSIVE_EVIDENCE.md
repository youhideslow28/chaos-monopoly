# CHAOS MONOPOLY — MULTI-VIEWPORT RESPONSIVE AUDIT & EVIDENCE
## Screen Geometry, Overflow Telemetry & Accessibility Report

**Document:** `docs/overhaul/07_RESPONSIVE_EVIDENCE.md`  
**Evaluation Scope:** Desktop, Tablet, and Mobile Form Factors  
**Browser Engine:** Google Chrome Headless 156.0.0.0  
**Evidence Artifacts:** `docs/evidence/post_overhaul/*.png`  
**Audit Status:** **PARTIAL (Desktop PASS, Tablet/Mobile Horizontal Overflow Defect)**

---

## 1. Testing Methodology & Device Emulation Disclaimer

> [!IMPORTANT]
> **Testing Distinction:** The measurements recorded below were captured via **Playwright-driven Chromium viewport emulation** running on a desktop Windows 10 host (`win32-x64`). While pixel dimensions, CSS media queries, and touch target geometry are strictly evaluated, this does **not** substitute for physical mobile testing on real iOS (WebKit) or Android (Blink) devices with native touch controllers and hardware display notches.

---

## 2. Multi-Viewport Telemetry Matrix

The following table summarizes empirical measurements gathered directly from the DOM across the 6 audited screen configurations:

| Viewport Profile | Target Dimensions | `scrollWidth` | `innerWidth` | Horizontal Bleed | Board Canvas Rendered | Canvas Dimensions | Primary CTA Height | Overflow Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Desktop Standard** | 1440 × 900 | 1440 px | 1440 px | **0 px** | **YES** | 424 × 244 px | 30 px | **PASS** |
| **Desktop Widescreen** | 1920 × 1080 | 1920 px | 1920 px | **0 px** | **YES** | 424 × 244 px | 30 px | **PASS** |
| **Tablet Portrait** | 768 × 1024 | 848 px | 768 px | **+80 px** | **YES** | 424 × 244 px | 30 px | **FAIL (Bleed)** |
| **Mobile Portrait (iPhone X/12)** | 375 × 812 | 537 px | 375 px | **+162 px** | **YES** | 424 × 244 px | 28 px | **FAIL (Bleed)** |
| **Mobile Portrait (iPhone 13/14)** | 390 × 844 | 537 px | 390 px | **+147 px** | **YES** | 424 × 244 px | 28 px | **FAIL (Bleed)** |
| **Mobile Landscape** | 812 × 375 | 848 px | 812 px | **+36 px** | **YES** | 424 × 244 px | 30 px | **FAIL (Bleed)** |

---

## 3. Detailed Root-Cause Analysis of Mobile Bleed

During automated inspection on the `375 × 812` mobile portrait viewport, 39 DOM elements were detected extending beyond `window.innerWidth`. The primary offenders were isolated to two specific components:

### 3.1 Top Navigation Header Bar (`<HeaderBar>`)
- **Offending Element:** `<header class="w-full bg-white/95 ... px-3 sm:px-4 py-2 ...">`
- **Measured Width:** `537 px` (exceeds 375 px by **162 px**).
- **Cause:** The control buttons inside the header bar (`AI Speed`, `Góc 3D`, `Luật`, `Âm Thanh`, `Fullscreen`, `Restart`, `Hồ Sơ`, `Ngôn Ngữ`) are arranged in a horizontal `flex items-center gap-1 sm:gap-1.5` container with `flex-shrink: 0`. On narrow screens, the container fails to wrap or collapse into an overflow drawer, forcing the document root to widen to 537 px.

### 3.2 Ambient World Environment (`<WorldEnvironment>`)
- **Offending Element:** `<div class="absolute inset-x-[-15%] top-0 h-[65vh] ...">`
- **Measured Right Edge:** `431 px` on 375 px viewport.
- **Cause:** The parallax skyline background uses negative horizontal margins (`inset-x-[-15%]`) without an explicit `overflow-hidden` wrapper on the parent container, allowing decorative elements to trigger unwanted document horizontal scroll.

---

## 4. Visual Evidence Inspection by Viewport

### 4.1 Desktop Standard (1440 × 900)
- **Screenshot:** [`docs/evidence/post_overhaul/07_desktop_1440x900.png`](file:///C:/Users/hxn/Desktop/CHAOS MONOPOLY/docs/evidence/post_overhaul/07_desktop_1440x900.png)
- **Visual Inspection:** Tabletop fills the central stage gracefully. Left player leaderboard and right event feed frame the 3D board slab without clipping. Zero horizontal or vertical scrollbars.

### 4.2 Desktop Widescreen (1920 × 1080)
- **Screenshot:** [`docs/evidence/post_overhaul/08_desktop_widescreen_1920x1080.png`](file:///C:/Users/hxn/Desktop/CHAOS MONOPOLY/docs/evidence/post_overhaul/08_desktop_widescreen_1920x1080.png)
- **Visual Inspection:** Expansive presentation with high visual clarity. Three.js PCFSoftShadowMap renders crisp directional daylight across the table.

### 4.3 Tablet Portrait (768 × 1024)
- **Screenshot:** [`docs/evidence/post_overhaul/09_tablet_768x1024.png`](file:///C:/Users/hxn/Desktop/CHAOS MONOPOLY/docs/evidence/post_overhaul/09_tablet_768x1024.png)
- **Visual Inspection:** Board is readable, but the top header bar exceeds the right margin by 80 px.

### 4.4 Mobile Portrait (375 × 812 & 390 × 844)
- **Screenshots:** 
  - [`docs/evidence/post_overhaul/10_mobile_portrait_375x812.png`](file:///C:/Users/hxn/Desktop/CHAOS MONOPOLY/docs/evidence/post_overhaul/10_mobile_portrait_375x812.png)
  - [`docs/evidence/post_overhaul/11_mobile_portrait_390x844.png`](file:///C:/Users/hxn/Desktop/CHAOS MONOPOLY/docs/evidence/post_overhaul/11_mobile_portrait_390x844.png)
- **Visual Inspection:**
  - Board canvas renders at 424 × 244 px, extending slightly outside the 375 px viewport.
  - Header buttons bleed to the right.
  - The bottom primary action button is accessible, but measures 28 px high, which does not meet the WCAG 2.2 Target Size minimum (44 × 44 px).

### 4.5 Mobile Landscape (812 × 375)
- **Screenshot:** [`docs/evidence/post_overhaul/12_mobile_landscape_812x375.png`](file:///C:/Users/hxn/Desktop/CHAOS MONOPOLY/docs/evidence/post_overhaul/12_mobile_landscape_812x375.png)
- **Visual Inspection:** The wide horizontal aspect ratio displays the board cleanly in the center, though slight 36 px overflow remains from the header.

---

## 5. Summary & Remediation Recommendations

1. **HeaderBar Mobile Collapse:** Replace the flat row of header buttons with a compact hamburger icon or collapsible dropdown on viewports `< 768px`.
2. **WorldEnvironment Overflow Guard:** Add `overflow-x: hidden` and `max-w-full` to `<div className="world-env">` to clip negative margin decorative skylines.
3. **Touch Target Sizing:** Increase primary CTA height from 28–30 px to a minimum of 48–56 px on mobile viewports to guarantee family-friendly touch ergonomics.

**Responsive Verification Status: PARTIAL (Pass on Desktop, Fail on Mobile/Tablet Horizontal Overflow)**.