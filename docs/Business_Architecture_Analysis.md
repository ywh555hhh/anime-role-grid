# Business Architecture & Open Source Strategy Analysis

## 1. Architectural Reality Check (现状分析)

### The Architecture
*   **Type**: Static Single Page Application (SPA).
*   **Deployment**: Cloudflare Pages (Frontend) + Functions (Backend-for-frontend).
*   **Drawing**: Client-side Canvas (`canvasDraw.ts`).

### The "Open Source" Paradox
You asked: *"Does selling premium skins mean I can't be Open Source?"*

**Answer: NO.** You can remain Open Source while selling premium services.

#### Why?
1.  **The "Service" vs. "Code" Distinction**:
    *   You are selling the **Hosted Service** (the convenient URL `grid.example.com`), not just the raw code.
    *   99% of your users (ACG fans) cannot compile a Vue project. Even if the code for "MyGO Skin" is on GitHub, they will pay you to use it on your site because it's easier.
2.  **Asset Protection**:
    *   You can open source the *Logic* (`canvasDraw.ts`), but keep the *Assets* (the specific MyGO background images, the expensive fonts) private or unlicensed for commercial use.
    *   Gitignore the `src/assets/premium_themes/` folder if you really want to protect them.

---

## 2. Updated Pricing Strategy (定价方案)

We need to balance **User Value** (what they get) vs. **Dev Cost** (your time).

### 🥉 Tier 1: The "Cloud Tipper" (云股东)
*   **Price**: **¥6.00 / Month** (Price of a cheap milk tea)
*   **Cost to You**: **Zero**.
*   **Value to User**: Emotional satisfaction, Title (`Lv1. 格子守护者`).
*   **Strategy**: This is pure volume. Don't promise features here. Just "Thank You".

### 🥈 Tier 2: The "Insider" (内测玩家)
*   **Price**: **¥18.00 / Month**
*   **Cost to You**: **Low**. (Posting updates you'd write anyway).
*   **Value to User**:
    *   **Influence**: "I voted for the 'Genshin' template, so he made it."
    *   **Early Access**: "I'm using the Video Export feature before it's public."
*   **Strategy**: Use this tier to find your "Super Users" who will moderate your QQ group for free.

### 🥇 Tier 3: The "Sponsor" (金主爸爸)
*   **Price**: **¥68.00+ One-time** (For a specific skin request) OR **¥128/Year**
*   **Cost to You**: **High**. You have to code/draw.
*   **Value to User**: **Exclusivity & Branding**.
    *   "I run the 'MyGO Fan Club'. I paid for a custom MyGO template. Now all my group members use it and see 'Sponsored by MyGO Fan Club' on the export."
*   **Strategy**: **LIMIT THIS**. Only accept 2-3 per month. Treat it as a "Commission" (约稿).

---

## 3. Technical Implementation for "Premium Skins" without Closing Source

You don't need to close source. You just need a **Theme Configuration System**.

### Current vs. Future
*   **Current**: Hardcoded colors in `theme.ts`.
*   **Future**:
    ```typescript
    // src/types.ts
    interface ThemeConfig {
      id: string;
      isPremium: boolean; // Integration point
      colors: {
        background: string; // or Image URL
        text: string;
        accent: string;
      };
      assets: {
        watermarkLogo?: string; // Sponsor's Logo!
        frameImage?: string;
      }
    }
    ```

### How to Monetize Open Source?
1.  **The "config" is public, the "service" is hosted.**
    *   Users *could* self-host to get the skin for free. **Let them.**
    *   Technical users who self-host are not your paying customers anyway.
    *   Your paying customers are mobile users who just want to click "Save".
2.  **Sponsor Logo Integration**:
    *   The biggest value for Tier 3 is **Putting THEIR Logo on the export**.
    *   This is a feature you add to the *Main Site*. Self-hosting doesn't help them advertise to *your* traffic.

## 4. Summary Recommendation

1.  **Keep Open Source**: It builds trust and attracts contributors (free labor!).
2.  **Monetize "Convenience" & "Status"**:
    *   Convenience = Cloud Sync (Future), Hosted App.
    *   Status = Discord/QQ Titles, Sponsor Logos on Templates.
3.  **Action Plan**:
    *   Refactor `canvasDraw` to accept a `ThemeConfig` object.
    *   Create one "Premium Theme" (e.g., Dark/Neon) to demo the capability.
    *   Put a "Sponsor This Template" button on the UI.
