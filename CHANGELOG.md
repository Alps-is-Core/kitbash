# Changelog

## 1.1.0 (2026-10-08)

- Fixed: double-clicking text didn't start editing (pointer capture retargeted the event), and typing went to the editor instead of the canvas
- Canva-style selection: click selects the whole component, double-click goes straight to the element under the cursor, text edits immediately
- Text with icons (buttons, links with arrows) is now editable; icons are protected while typing
- Ungroup turns any component into free, absolutely positioned pieces that keep their exact look, with the container's styling kept as a background layer
- Children of frames are selectable with a single click
- New kits: daisyUI (17) and Tailblocks (12); new "Agency site" template. 187 components in total

## 1.0.0 (2026-10-08)

First public release.

- Figma-style canvas: frames with freeform positioning, 8-handle resize, smart guides, rotation
- Drawing tools: frame, rectangle, ellipse, text, image
- Zoom and pan, responsive canvas widths, ⌥-hover measuring
- Multi-select, marquee, align and distribute, group and ungroup
- Layers panel with rename, hide, lock and drag reorder; multiple pages
- Auto layout controls, design panel for fill, stroke, effects and typography
- Save your own components; project files; local autosave
- 158 components across Core, shadcn/ui, Flowbite, HyperUI, Preline, Meraki UI and Effects kits
- Export to HTML, React, Vue and full HTML pages
