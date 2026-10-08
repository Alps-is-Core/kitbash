# Contributing to Kitbash

Thanks for helping. Kitbash has no build step, so getting started takes a minute.

## Setup

```bash
git clone https://github.com/Alps-is-Core/kitbash.git
cd kitbash
npm run dev     # http://localhost:5173
```

Edit files in `src/` and reload the page.

## Before you open a pull request

1. `npm test` passes.
2. You tried the change in the browser, including dark mode and a narrow window if you touched the editor UI.
3. Exported code still looks right (open **Get code** and check HTML and React).

## Adding components

- Components live in `src/components.js`. Each `add(kit, category, name, html)` call adds one.
- Write original Tailwind markup. You may follow a kit's visual style, but don't paste copyrighted markup from paid kits.
- Keep one root element, no `<script>` tags and no remote images (use `ph()` placeholders).
- Use `data-drop` on containers that should accept nested components and `data-free` for freeform frames.
- Realistic copy beats lorem ipsum.

## Editor code

- `src/app.js` is organised in sections (canvas, gestures, commands, layers, design panel, export). Search for the `═══` banners.
- Builder-only state lives in `data-*` attributes and must be stripped in `cleanClone()` before export.
- Prefer Tailwind classes over inline styles for anything the user creates, so exports stay portable.

## Reporting bugs

Open an issue with steps to reproduce, your browser, and if possible a project file (**Main menu › Save project file**).
