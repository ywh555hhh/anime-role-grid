# Template Creator (模版创造器) Interaction Specification

> **Scope**: `/create` page.
> **File**: `CreateTemplate.vue`.

## 1. Overview
A wizard-style interface for users to design new grids.

## 2. Step 1: Editor (Drafting)

### 2.1 Configuration
- **Rows/Cols**: Integers (1-6).
  - *Interaction*: Clicking number buttons immediately resizes the `list` array.
  - *Data Loss*: Using `Array.from` with fallback preserves existing labels when growing. Shrinking loses data.
- **Labels**:
  - **Direct Edit**: The `Grid.vue` is passed `:editable="true"`.
  - **Behavior**: Clicking a label turns it into an `<input>`. `blur` or `enter` saves it.

### 2.2 Voting Switch (New Feature)
- **UI**: Switch Toggle.
- **Logic**: Sets `config.voting.enabled`.
- **Backend Impact**: Tells backend to aggregate `saveGrid` calls for this template ID.

### 2.3 Submission
- **Action**: "生成挑战书" (Generate Challenge).
- **Validation**: Title required.
- **API**: `POST /api/templates`. Returns `{ id }`.

## 3. Step 2: Success & Export
- **UI**: Fullscreen Modal overlay.
- **Assets**:
  - **QR Code**: Generated client-side (`qrcode` lib) pointing to `/t/{id}`.
  - **Image**: `exportGridAsImage` called with `mode="challenge"`.
    - Renders Title + Grid + Creator Name + QR Code side-by-side or bottom.
- **Actions**:
  - **Copy Link**: Uses `navigator.clipboard` with `execCommand` fallback.
  - **Download**: Triggers browser download of generated PNG.

## 4. Mobile Spec
- **Layout**: Stacked.
- **Input**: Labels are edited via browser Native Prompt or inline input (focus management is critical for virtual keyboard).
