# Project Analysis & Sponsorship Strategy

## 1. Project Feature Analysis
**"Anime Role Grid" (我推的格子)** is a specialized tool for the ACG community.

### Core Capabilities
*   **Grid Engine**: Supports classic (3x3, 4x4) and Custom layouts.
*   **Search**: Bangumi API integration for Anime, Characters, CVs, Games.
*   **Export**: High-Res Image (Canvas) & Video (MP4) generation.
*   **Social**: Trending "What's Hot" lists & QQ Group integration.

---

## 2. Sponsorship Strategy: "The Production Committee" (制作委员会)

This plan separates "Free Content" (Layouts) from "Premium Status" (Skins/Influence).

### 🥉 Tier 1: "Grid Guardian" (格子守护者) - ¥5.00/mo
> *"Buy me a Cola."*
*   **QQ Title**: `Lv1. 格子守护者`
*   **Benefit**: Name in Credits.

### 🥈 Tier 2: "PM Experience Card" (产品经理体验卡) - ¥15.00–28.00/mo
> *"I have better ideas than you."*
*   **QQ Title**: `Lv2. 还是你懂格`
*   **Benefit**:
    *   **Feature Voting**: Vote on the next features (e.g., "Add 5x5 Grid" vs "Video Music").
    *   **Priority Bug Fixes**: Your issues get the "Fast Track" label.

### 🥇 Tier 3: "Production Committee" (金主爸爸) - ¥88.00+/mo (or One-time)
> *"I want a MyGO Exclusive Skin."*
*   **QQ Title**: `Lv3. 实力至上的金主` (Customizable)
*   **The Killer Feature: "Exclusive Skins" (专属皮肤)**
    *   **Context**: The public tool currently only supports *Standard* (White/Clean) styles.
    *   **The Service**: You (the Dev) will code a **Bespoke Visual Theme** for their community.
        *   **Custom Background**: e.g., "Starry Night" for *Hoshino Ai* or "Blue/Black" for *MyGO*.
        *   **Custom Fonts**: e.g., Gothic font for *BanG Dream*.
        *   **Decorative Frame**: e.g., Replace simple black lines with "Thorns" or "Cyberpunk Borders".
    *   **Value**: This requires code changes (`canvasDraw.ts`), so it is a premium service. The sponsor gets credit ("Presented by [Sponsor]") on every export using that skin.

---

## 3. Implementation Plan
1.  **Afdian Page**: Setup the 3 tiers above.
2.  **Tech Prep**: Refactor `canvasDraw.ts` to support a `theme config` object (bgImage, borderColor, font) so you can easily fulfill Tier 3 orders.
3.  **Marketing**: "First 3 Tier-3 Sponsors get a 50% discount on their Custom Skin!"
