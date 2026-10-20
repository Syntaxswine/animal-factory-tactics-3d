# Painted conversation terminal

The existing Conversation modal now uses worn olive enamel and ivory message stock. Chipped paint, dull exposed metal and oily edge wear give the terminal a used military communications-console finish. The center stays quieter behind live text. The portraits, conversation data, speech, choices and checkpoint behavior remain the existing dialogue implementation.

This art branch starts from the coder's `c29241a` (`work/editor-3d`), the terminal version shown in the user's screenshot. It is not a merge of that dialogue feature into canonical. Integrate the skin after the dialogue dependency, or cherry-pick it onto that feature branch.

![The painted terminal in the live dialogue fixture](review-images/painted-dialogue-terminal.png)

## Delivered materials

| File | Use | Dimensions | Transfer size |
| --- | --- | --- | --- |
| `dist/assets/ui/dialogue-terminal/field-terminal.webp` | Nine-slice outer shell; sampled paint on controls and inset panels | 1254 × 1254 | 240,362 bytes |
| `dist/assets/ui/dialogue-terminal/message-paper.webp` | Quiet paper for incoming and outgoing message cards | 1254 × 1254 | 252,780 bytes |

Both textures were created with the built-in `image_gen` tool. [The asset manifest](../../dist/assets/ui/dialogue-terminal/manifest.json) contains the complete prompts, original generation filenames, dimensions, SHA-256 hashes and processing record. The generated PNG originals remain in Codex's generated-image directory. The delivered images retain the entire generated composition, encoded as WebP at quality 90; no text or controls are baked into them.

The two textures total **493,142 bytes (482 KiB)** on disk and approximately **12 MiB** if both are decoded into RGBA surfaces. This is not a measurement of browser memory consumption. They are shared by all cards and buttons, not unique per message.

## Integration

- `dist/tactics/battle-dialogue.css` applies the materials to the existing component. The shell slices at 7%, with an 18px desktop rim and 10px narrow-screen rim so hardware does not stretch with the panel.
- Message surfaces use pale solid-color fallbacks. Controls retain hover, disabled and visible keyboard-focus states. Portrait canvases remain unobstructed.
- The narrow layout wraps the “Replying as” label and gives the speaker selector a nonshrinking width.
- `tools/build-tactics-pages.mjs` copies the asset directory; the 3D packaging build uses this path too.
- No dialogue rules, speaker selection logic, saved state or gameplay rules were modified.

## Review

- 43 focused dialogue and packaging tests passed.
- Asset audit and `build:tactics-3d` passed.
- The real `battle-3d.html?study=dialogue` fixture was inspected at desktop, 390px and 320px widths, and at a 640 × 360 CSS viewport equivalent to 200% zoom on a 1280 × 720 display.
- Browser checks exercised a real reply, Replay, options, keyboard focus, Leave and Escape. The clock stayed paused during dialogue, and closing released portrait resources.
- Packaged output was loaded separately. A failed-texture-decode run retained usable solid-color surfaces and live text.
- Disposable browser processes exited and released their automation ports. Captures and receipts are under `artifacts/painted-dialogue/review/`.
- Independent visual review: **9/10, approved with no remaining blocker**, including the corrected narrow speaker selector and both zoom-equivalent captures. The reply button was hit-tested after scrolling to confirm it remained reachable.

The browser review is reproducible with `tools/review-dialogue-paint.mjs` and Playwright (`PLAYWRIGHT_PATH` may point at a local installation). Set `REVIEW_PACKAGED=1` after building to include the packaged route.

## Local preview lifecycle

`tools/serve-dialogue-paint.mjs` provides read-only source and `/packaged/` routes with `.mjs`, WebAssembly and WebP MIME types. The earlier hedge preview lacked `.mjs` support, which prevented the new speech dependency from loading; that was a preview-server problem, not a skin or asset failure.

The retained preview on port 4476 replaces verified task-owned PID 33172. Its original deadline remains **October 20, 2026 at 12:03 PM Eastern**. It stops automatically at that deadline or when its private `artifacts/painted-dialogue/server/STOP` marker is created. The new process lifetime is registered with helper lifecycle cleanup. Restart deliberately using a fresh record directory; the script never extends a running helper's deadline.
