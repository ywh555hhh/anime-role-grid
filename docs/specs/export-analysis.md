# Image Export Failure Analysis

## 1. html2canvas (Standard)
- **Issue**: Fails with `Attempting to parse an unsupported color function "oklch"`.
- **Cause**: This library uses a custom, outdated CSS parser that doesn't understand modern CSS color formats (like `oklch`) which are increasingly used by default in modern UI frameworks (UnoCSS/Tailwind) and browsers.
- **Verdict**: Too fragile for modern CSS stacks.

## 2. html2canvas-pro
- **Issue**: Caused page to crash/blank screen.
- **Cause**: Likely a module compatibility issue or runtime conflict when imported at the top level.
- **Verdict**: Unstable in this environment.

## 3. html-to-image (The "Smart" Choice)
- **Issue**: Also caused page to crash/blank screen.
- **Cause**: Similar to above, top-level importing of this library might be causing issues with the Vite/Vue build process or initialization.
- **Verdict**: This IS the correct technical solution (uses native browser rendering via SVG), but we need to load it safely.

## The Solution: Dynamic Import
We will use `html-to-image` but import it **dynamically** only when the user clicks the button.
- **Benefit 1**: It cannot crash the page on load because it's not loaded yet.
- **Benefit 2**: It uses the browser's native rendering, solving the `oklch` issue permanently.
