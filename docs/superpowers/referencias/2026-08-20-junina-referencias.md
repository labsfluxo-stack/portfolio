# Festa Junina hero — density and iconography brief

Scope: same constraints as the balão brief already on file (`docs/superpowers/referencias/2026-08-20-arte-junina.md`
in the portfolio repo) — Canvas 2D only, SVG path data → `Path2D`, rasterized once to an offscreen sprite, blitted
per frame, no `shadowBlur`/`filter`, no images over the network. House palette: bg `#08090C`, text `#F5F3EF`, cool
accent `#38BDF8`, warm accent `#FFB020`. That brief solved the balloon's own shape. **This one is scoped to
everything around it** — the owner's complaint ("too little festa junina") is a density and cast-of-elements
problem, not a balloon problem, and the current hero (one balloon, one thin row of bunting, a handful of embers)
under-fills the frame by design intent that was correct for the balloon and is not sufficient for the scene.

Reference implementation read for this brief: `components/ativacoes/temas/junino.ts` and `CapaJogo.tsx` in the
portfolio repo — so the specifics below (bandeirinha spacing, ember spawn bias, gradient technique) build on the
actual code rather than a generic canvas.

### Addendum — movement is now permitted (added mid-draft)

Everything above and below was drafted under an assumption — mine, not a constraint the owner stated — that the
background should stay close to still so it never competes with the DOM text. That assumption is lifted: bunting
can sway, embers can be denser and livelier, a fogueira can flicker, elements can drift. This changes three things
concretely, each addressed inline in its section below (§1, §3, §4, §5), and summarized here so the change is
visible rather than silently folded in:

- **Fogueira is re-ranked.** In §1's static-recognition table it sits at #3, deliberately kept as glow-and-embers
  rather than a drawn flame because a *static* campfire shape reads as cheap and competes with the HUD (this was
  the existing balão brief's finding, not new). Motion removes that penalty and adds one nothing else on the list
  has: flicker is a recognition signature in its own right, independent of shape. §5 now proposes an actual small
  animated fogueira (logs + 2–3 independently-oscillating flame-tongue sprites, same rasterize-once/transform-blit
  technique the balão already uses for its sway), and ranks it #2 by recognition-per-cost, right behind the
  bunting-row expansion — ahead of chapéu de palha and milho, which stay static-only and don't get a motion boost.
- **Bunting gets real per-flag sway, not a static raster.** §4 is amended with the mechanics and an explicit cost
  read: independent flag motion turns out to be *cheap*, not expensive, once you see that each flag is already a
  tiny pre-rasterized sprite — sway is a matrix transform per blit, not new pixel work.
- **The frame budget is a gate, not a vibe, so every motion proposal below is tagged cheap / moderate / expensive**
  and reasoned from what actually costs fill-rate (re-rasterizing, per-frame gradients, large alpha-blended
  overdraw) versus what's nearly free (transforming an already-rasterized sprite: translate, rotate, scale, blit).
  The route's own gate — median 59.88fps under 4× CPU throttling today, hard floor 45fps — is sitting at the
  display's 60fps ceiling even throttled, which means today's canvas work isn't the bottleneck yet. That's real
  headroom, not infinite headroom: it should be spent on cheap-class techniques first, and moderate-class ones
  only where §1's re-ranking says the recognition payoff justifies it (the fogueira).
- **Reduced motion still has to read as festa junina, and one existing gap is worth fixing while this is open.**
  `desenharFundo` already passes `parado ? 0 : agora` into `desenharBrasas`, which is the right pattern — but
  freezing `tempo` at `0` runs each ember's alpha formula at its own `faseMs`, and the *current* seed list happens
  to freeze one ember (the `faseMs: 0` entry) at alpha `0` — invisible — purely because nobody chose `faseMs`
  values with the frozen frame in mind. Not a crisis (the other nine seeds freeze mid-life, mostly visible), but
  it's an accident, not a design, and it should stop being one before the seed list grows (see §5).

---

## 1. Iconography ranked by how fast a Brazilian reads it

Ranked by recognition speed alone (silhouette/color at a glance, no context needed), then flagged for whether the
element carries the meaning **alone** or only **in combination**.

| Rank | Element | Reads alone? | Why |
|---|---|---|---|
| 1 | **Bandeirinha** (triangular paper-flag bunting, strung overhead) | Yes | The one element present in essentially every activation, every municipal identity, every packaging cue found in research (Ambev-adjacent campaigns, Caruaru/Campina Grande municipal work, retail POS). Nothing else on this list is as consistent across sources. |
| 2 | **Xadrez/gingham textile** (red-white check, on clothing or tablecloth) | Yes, on its own | This is arguably *more* primal than bandeirinha for a Brazilian eye because it's worn, not just decorative: "estampa xadrez, chapéu e bota viraram roupa junina" — the checked shirt is shorthand for "caipira/junino" even divorced from any other festival cue ([Alô Alô Bahia](https://aloalobahia.com/notas/veja-por-que-estampa-xadrez-chapeu-e-bota-viraram-roupa-junina)). Risk: at small scale a checked pattern can misread as "picnic" or "Americana diner" without a second cue nearby — rank it just under bandeirinha for that reason, not because it's weaker in isolation. |
| 3 | **Fogueira (bonfire) glow** — warm light + rising embers, not a drawn flame pile | Combination only | Universally present as *ambience* in every source surveyed, never as a literal campfire competing for KV space (see the existing balão brief §1 for why — sourced from *xilogravura* and activation coverage). Alone, a warm glow reads as "cozy," not specifically junino — it needs bunting or gingham nearby to close the read. This is already implemented in `junino.ts` (`desenharBrasas`) but at a density (8–14 particles, "well under ~8% of pixels") tuned for a balloon-only scene, not a full arraiá. |
| 4 | **Chapéu de palha (straw hat) silhouette** | Yes, alone | A single conical straw-hat silhouette is read instantly as "roça/caipira" independent of color — it's a shape cue, which is exactly what survives compression to 24px. Confirmed as one of the three canonical "look" markers alongside xadrez and boots ([Alô Alô Bahia](https://aloalobahia.com/notas/veja-por-que-estampa-xadrez-chapeu-e-bota-viraram-roupa-junina)). |
| 5 | **Milho (corn-on-the-cob)**, whole or husked, often paired with **pamonha/canjica** wrapping | Combination-leaning | Strongly coded but slower than the top four — a single corn cob silhouette can read as "harvest/autumn" generically before it reads as junino specifically; it closes the read fast when placed near bunting or a checked strip, per confirmation in packaging/coloring-page sources ([daquidali.com.br](https://daquidali.com.br/colorir-festa-junina/)). |
| 6 | **Sanfona (accordion)** silhouette | Combination only | Musically central (forró's signature instrument, alongside triangle and zabumba — [Toda Matéria](https://www.todamateria.com.br/quadrilha/)) but visually ambiguous: an accordion silhouette alone can read as generic "music/folk" of many traditions. Useful as a small supporting mark, not a lead signifier. |
| 7 | **Quadrilha figure** (paired dancers, checkered dress + straw hat, arms crossed) | Combination only, and expensive | The richest single scene if you can afford it (dance formation is *the* named centerpiece of the festival), but as a silhouette it needs enough detail (two figures, specific arm pose) to not collapse into "two people standing" — costly for a background element that has to work at 24–48px. Reserve for a static footer/corner illustration, not an animated background layer. |
| 8 | **Barraca (quermesse stall)** — striped/gathered fabric canopy over a counter | Combination only | Reads as "fair/market" broadly before it reads as junino specifically; the striped canopy in the traditional red/white or yellow/white register is the fast cue, plain canvas is not. |
| 9 | **Bandeira de São João / bandeira do Brasil bunting flags (large, not triangular)** | Weak alone | Present in official municipal decoration but slower-reading than triangular bandeirinha because "flag on a pole" is a broader visual category (national holidays, other festivals). Skip unless doing a literal replica of a town square. |
| 10 | **"Arraiá" / "São João" hand-lettered type mark** | Fast, but it's text not iconography | Extremely fast to read for a literate audience (near-instant, no decoding), but it's a typographic solution, not a drawable icon — cheap to add as a static watermark/badge, not a Path2D "element" in the density sense this brief is about. Worth having as a corner mark (see §5) precisely because it's nearly free. |

**What this ranking implies for the hero:** bandeirinha is already there and correctly prioritized — the fix is
density (§4), not the choice of first element. The single highest-leverage *addition* is not another balloon or
more embers, it's **xadrez and chapéu de palha**, because they're rank 2 and 4, they're cheap as flat vector shapes
(a triangle-topped cone and a repeating two-color check need no gradient), and neither is present in the scene
today at all.

**Re-ranked for motion (see addendum above):** the table above ranks *static* recognition — shape and color read
with no time axis. Once flicker and sway are allowed, treat it as two independent axes rather than reshuffling the
numbers: bandeirinha (rank 1) and fogueira (rank 3) both get a motion boost that xadrez, chapéu, milho and the
lettering mark cannot get without becoming a different, more expensive kind of asset (an animated character/cloth
sim, out of scope). Practically: **bunting sway compounds an already-#1 signal — do that first.** A **flickering
fogueira** is the one place motion turns a third-place, combination-only cue into something closer to a
standalone anchor, at low cost (§5), which is why it moves up the "what to add next" priority in §5 even though
its *static*-recognition rank here doesn't change.

Real examples looked at: Meio & Mensagem's roundup of Ambev/Santa Helena/Beats/LUX June activations, Mundo do
Marketing's coverage of Nordeste brand territory plays, Promoview's 2026 Caruaru/Campina Grande activation survey,
municipal "Maior São João do Mundo" (Campina Grande) 2026 program materials, and Behance search results for
"Festa Junina"/"São João" identity case studies (Cidade Junina, Junina Chama Ardente, Key Visual São João Itaju do
Colônia) — the same source set the existing balão brief used, cross-checked against decoration/craft sources
(Westwing, DecorFácil, Sympla) for what real physical arraiás visually prioritize.

---

## 2. Palettes that actually get used

Two registers show up in real work, and campaigns commit to one rather than blending them (this matches what the
existing balão brief already found — the reinforcement here is the specific hex families and the dark-ground
question, which that brief didn't need to answer because it was styling one object, not a ground).

### Register A — bright commercial (what this hero should use)

The set already partially in `junino.ts` is correct; here it is as a complete family, including two hexes not yet
in the code that close real gaps (§5):

| Role | Hex | Use |
|---|---|---|
| Red | `#D93A2B` | bandeirinha, gore, xadrez check |
| Gold/mustard | `#FFB020` | bandeirinha, gore, corn, house warm accent (already `--color-warn`) |
| Verde-bandeira green | `#1E8F5F` | bandeirinha, gore, foliage accents |
| House cool blue | `#38BDF8` | sparing brand tie-in only — never more than ~1/6 of any element set |
| Off-white/cream | `#F5F3EF` | bandeirinha, xadrez ground, house text color reused |
| Straw/tan | `#C79A56` | new — chapéu de palha, sanfona body, barraca frame wood |
| Ember orange | `#FF6B35` | already in code, brasa aura only |

Explicitly excluded, confirmed by every source surveyed: purple, magenta/pink, neon, saturated cyan beyond the
house accent. A full-spectrum palette is the fastest way to read as generic-party rather than specifically junino.

### Register B — earthy/heritage (not recommended here, but worth knowing why)

Terracotta, mustard, moss-green, tobacco-brown, off-white, often paired with bold black *xilogravura* linework —
used by municipal identities and brands leaning into cultural authenticity over mass-market "festa" ([blog.blocksrvt.com
2026 trend piece](https://blog.blocksrvt.com/ideias-de-decoracao-para-festa-junina/), [rvb.com.br](https://rvb.com.br/decoracao-sao-joao-ideias-criativas/)).
This register reads slower to a general audience inside a 15-second interactive game — it's the right choice for
a slow-scroll heritage brand piece, wrong for a hero that has to close the read in under a second. Its one
transferable contribution, already folded into the balão brief, is **line weight**: bold, slightly uneven strokes
instead of hairlines, which register A can borrow without borrowing the palette.

### Is near-black a hostile base?

**No, conditionally** — near-black is not hostile to *this* palette, it's hostile to a specific mistake: treating
`#08090C` as neutral photography-black instead of giving it a hue. Reasoning:

- Register A's colors are all high-chroma against `#08090C` (contrast ratios: red ~4.2:1, gold ~9.5:1, green
  ~5.8:1 — all comfortably legible as fill, well above the 3:1 non-text threshold). The traditional light/kraft
  ground (cream `#F5F3EF` or raw kraft-paper tan) is *lower* contrast against these same warm hues — red-on-cream
  sits around 3.8:1, which is why craft/print junina material leans on black linework to separate shapes, a crutch
  a dark ground doesn't need.
- The actual risk with `#08090C` is not the darkness, it's the **temperature**: a true near-black reads as
  "night club" or "tech dashboard" faster than "arraiá at dusk" unless something nearby establishes warmth. The
  fix already exists in the codebase's own instinct — the balloon's internal glow and the ember aura — it's just
  under-deployed. Two concrete levers, both compatible with the no-filter constraint because they're plain fills:
  1. **A very subtle warm vignette**, not a background color change: a large, mostly-transparent radial
     `createRadialGradient` centered low in the frame, `rgba(255,107,53,0.05)` fading to transparent, painted once
     into the same offscreen background sprite `desenharFundo` already rasterizes. This nudges the *undertone* of
     the black toward ember-lit without touching the hex the rest of the design system depends on.
  2. **A near-black with the hue already baked in**, if the vignette isn't enough: `#0C0806` (a near-black with a
     warm/brown bias) reads identically to `#08090C` in isolation but sits measurably warmer once red/gold shapes
     are on top of it. This is a design-system-level decision (touches every screen that uses `--color-bg`), so
     treat it as the fallback, not the first move — the vignette gets most of the same effect for zero systemic
     risk.
- Verdict: keep the dark UI. Near-black is workable and arguably *better* for this palette's contrast math than
  the traditional light ground — the fix the owner is asking for is density and cast, not a background swap.

---

## 3. Density and composition

Real Festa Junina graphic work is busy **by construction**, not by accident — the craft tradition it draws from
(hand-strung decorations covering every surface of a physical arraiá) has no empty-space convention to begin with.
The professional move is not to thin that out for a digital layout, it's to **zone** the density so it never
competes with the one region that has to stay clean: the DOM text block.

Concrete zoning for this hero, in the coordinate space `CapaJogo.tsx` already uses (normalized 0–1, `largura`/`altura`):

- **Top band, 0–14% of height** — bunting, already implemented as `FRACAO_FAIXA_BANDEIRINHAS`. This is the single
  highest-value density move because it's furthest from both the headline's cap-height and the game's active play
  area (targets spawn mid-frame). Expand this to the multi-row treatment in §4.
- **Bottom band, 82–100% of height** — where fogueira glow and the tallest embers already spawn
  (`SEMENTES_BRASA` biases `yFrac0` 0.86–0.97). This is also where a **ground silhouette strip** belongs: a low,
  flat frieze of small dark shapes — a barraca canopy corner, a chapé-de-palha silhouette, a corn stack — sitting
  right at the bottom edge, mostly below where body text ever reaches. Treat it like a **horizon line**: everything
  in this strip can be denser and lower-contrast (closer to `#08090C` than to the saturated palette) because it's
  read peripherally, not focally.
- **Outer 20–25% margins, left and right, full height** — where embers already spawn (`xFrac` 0.04–0.21 and
  0.79–0.97 in the current seed list). Extend this column to carry **static vertical accents**: a folded strip of
  xadrez pattern along the very edge, or a single straw-hat silhouette anchored low-left/low-right. This is the
  "corner cluster" composition move real KVs use — mass pushed to the frame edges so the eye's first read of the
  center is still "headline," not "pattern."
- **Center 40% width × full height** — stays close to empty of new elements, and now that movement is allowed
  elsewhere, this rule is about **motion, not just density**: a single drifting ember or a swaying flag crossing
  behind the headline is a worse failure than the same shape sitting there frozen, because motion is what a reader's
  peripheral vision is tuned to notice first — it pulls the eye off the headline even when the shape itself is
  small and dim. This is already the de facto game play area (targets spawn here) and the headline/subtitle
  column. Do not add a background layer here at all, moving or not; let the game's own targets be the only motion
  in this zone.
- **Vignette** — a soft radial darkening toward the frame edges (again, a plain gradient fill, not a CSS/canvas
  filter) does two jobs at once: it's the "foreground/background separation" real posters use to keep dense edge
  material from fighting the clean center, and it reinforces the warm-undertone fix from §2.

**Foreground/background separation without blur:** the no-`shadowBlur`/no-`filter` constraint rules out depth-of-field,
so fake it the way the balão brief already fakes 3D — through **scale, saturation, and paint order**, not optics.
Background-band elements (bottom frieze, far bunting row) get drawn first, smaller, and desaturated 15–20% toward
`#08090C` (mix toward the neutral, exactly the technique `junino.ts`'s `misturar()` helper already implements for
gore edge-darkening — reuse it, don't invent a second technique). Foreground elements (near bunting row, embers)
get drawn last, at full saturation, slightly larger. This is depth cued by hierarchy, which costs nothing per frame
beyond draw order.

**How much is "busy enough" without being noise:** the existing brief's "well under ~8% of pixels" instantaneous
coverage figure was calibrated for a balloon-only scene and is too conservative for a full cast. A workable target
for the *edges and bands combined* (bunting + frieze + corner accents + embers, excluding the clean center 40%) is
**18–25% instantaneous pixel coverage within those zones**, while the center 40% column stays under 5% (game
targets only). That asymmetry — dense edges, clean center — is the entire trick; it is not a global density number.

**What motion costs, concretely.** The route's own frame gate (`tests/e2e/ativacoes-quadros.spec.ts`) measures
59.88fps median under 4× CPU throttling against a 45fps floor — today's canvas work sits at the display's own
60fps ceiling even throttled, so there's real headroom, but it's not free and it doesn't scale with how "busy" a
technique looks to the eye. What matters is fill-rate and re-computation, not element count:

| Cost class | What's in it | Why |
|---|---|---|
| **Cheap** | Transforming an already-rasterized sprite per frame — `translate`/`rotate`/`scale` + one `drawImage` — for bunting flags, embers, a second small balão, a flame-tongue sprite. Increasing a particle *count* (more embers) when each particle is a tiny flat-fill circle. | The pixel work (rasterizing, computing a gradient) happened once, at sprite-creation time. Per-frame cost is a handful of matrix multiplies plus a blit whose pixel footprint is tiny (a flag is ~20×26px, an ember's aura ~10px radius) relative to the canvas. This is the entire reason the balão's sway and the embers' drift are already cheap in the current code — the pattern already exists, it's just under-used. |
| **Moderate** | Adding a genuinely new animated composite element built from 2–4 cheap sprites layered with `globalCompositeOperation = 'lighter'` (an animated fogueira: logs + independently-oscillating flame tongues + an aura, all pre-rasterized once, transformed per frame) — the same technique class as "cheap," just more draw calls per element. | Still no per-frame rasterization or gradient recomputation, so it scales the same way cheap elements do; it's "moderate" only in the sense of being a new subsystem to build and profile once, not in ongoing per-frame cost. |
| **Expensive — avoid** | Re-rasterizing a `Path2D`/gradient inside the per-frame loop (recomputing the bunting's sagging Bézier path and refilling it every frame instead of transforming a static raster); large semi-transparent shapes covering a big fraction of the canvas recomputed with new geometry each frame (not just a new alpha value on an existing gradient object, which is cheap); any per-frame `createLinearGradient`/`createRadialGradient` call inside the animation loop rather than at sprite-build time. | This is exactly the class of cost the existing code already avoids everywhere (every gradient in `junino.ts` is built once, at `rasterizarBalao`/sprite-build time) — the new motion proposals below need to keep that discipline, not break it the first time something is asked to move. |

Every motion proposal in §4 and §5 below is cheap-class or explicitly flagged moderate; nothing here proposes
expensive-class motion.

---

## 4. Bandeirinhas, properly

The current implementation (`rasterizarBandeirinhas` in `junino.ts`) has the right *mechanics* — sagging string via
quadratic Bézier, 5-hue rotation, non-random fixed layout — and the wrong *quantity*: one row. Real physical
decoration density gives a concrete ratio to calibrate against: **8–10 flags per meter of string at 15×20cm flag
size, with a 2cm gap** — i.e. gap ≈ 13% of flag width ([Westwing](https://www.westwing.com.br/guiar/bandeirinha-festa-junina/)),
close to and validating the code's existing `passo = larguraBandeira * 1.18` (an 18% gap). Keep that spacing ratio;
the fix is rows, not tightness.

Specification for the expanded treatment:

- **Rows: 2, not 1.** A back row and a front row, not more. Real arraiás string bunting across the *entire*
  ceiling, but a hero has to stop before it starts reading as a texture fill rather than as counted strings —
  two rows is the point where the eye registers "layered decoration" without yet losing the individual triangles.
  A third row is legitimate on a wide desktop viewport (see the "how many rows" note below) but should never be
  the mobile default.
- **Row placement:** back row anchored at `y = altura × 0.02` (near the very top edge, partially cropped — real
  bunting photographed from below is always cropped by the frame, which is itself a legibility cue that this is
  a "look up" composition), front row at `y = altura × 0.09`, sagging into `y = altura × 0.14` at each span's
  midpoint. This reuses `FRACAO_FAIXA_BANDEIRINHAS = 0.12` as the *center* of the band rather than its edge.
- **Shape: triangular, apex down, 1.3:1 height\:width — keep this, do not switch to swallowtail.** The code's own
  comment already gets this right ("an equilateral triangle reads as a generic pennant icon"). Swallowtail
  (forked/pointed-notch flags) is a different craft tradition (nautical signal flags, some European fairs) and
  is nearly absent from the Brazilian junina reference set surveyed — introducing it would cost recognition, not
  add it. Rectangular flags are even further off — they read as "national flags on a string," not bandeirinha.
- **Scale relative to viewport:** keep `clamp(20px, 5vw, 34px)` for the front row; make the back row **62% of
  front-row width** (not a separate clamp — derive it, so the two rows never invert on an unusual viewport). At
  the stated 24px phone floor this puts the back row at ~15px, still legible as triangles, not yet a blur.
- **Colour rotation:** keep the existing 5-hue cycle (`#D93A2B → #FFB020 → #38BDF8 → #1E8F5F → #F5F3EF`) for the
  front row. Offset the back row's starting index by 2 in the same array (not a second palette) so the two rows
  are never in phase — two rows starting on the same color at the same x-position is the tell of "one row
  duplicated," not "two strings." Since both rows share one color set, this is a one-line change (index offset),
  not new state.
- **Sag:** keep the quadratic-Bézier sag already implemented; increase the back row's sag fraction slightly
  (16% of span vs. the front row's current implicit ~14%) — a row further from the viewer sagging *slightly* more
  reads as "further back, longer unsupported span," a cheap depth cue consistent with §3's foreground/background
  logic.
- **Sway — new, now that motion is permitted, cost: cheap.** The current implementation rasterizes the whole row
  (string + every flag) into one static offscreen bitmap and blits it — correct for a still scene, wrong once
  motion is allowed, because the whole row moving as one rigid image would look like a banner, not hung fabric.
  The fix is **per-flag sprites, not per-row**: rasterize each flag once (still a flat two-color fill, no
  gradient), then in the per-frame draw call each flag with its own small rotation about its string-attachment
  point, `θᵢ(t) = A · sin(t / Pᵢ + φᵢ)`, `A ≈ 4–6°`, `Pᵢ` randomized once per flag in the 1.6–2.4s range, `φᵢ`
  staggered by flag index so neighbors are visibly out of phase (uniform-phase sway across every flag is the same
  "one sprite reused" tell the pop-animation brief already flags for the balão's gore spin — the fix is identical:
  vary the rate per instance). This is **cheap**, not moderate: for a full-width row at desktop scale (~30–40
  flags), each frame does 30–40 `save/translate/rotate/drawImage/restore` calls against sprites of ~20×26px —
  trivial next to a 60fps budget, per §3's cost table. The string itself can sway too, at near-zero cost: it's
  already recomputed as a stroked path (not rasterized), so shifting the Bézier midpoint by a small
  `sin(t/2200) × passo × 0.03` term is pure arithmetic, not new pixel work.
- **Overlap:** none needed between rows — vertical separation (0.02 vs 0.09 of height) already prevents collision;
  do not overlap flags within a single row (the current `passo` spacing already prevents this correctly).
- **When it stops helping:** two rows is the ceiling for the *phone* viewport (the 24px element floor means a
  third row of ~9px triangles stops reading as triangles at all — it degrades straight to noise/moiré, especially
  once the canvas is also drawing embers and game targets in the same frame). On desktop, where the front row
  already scales to 34px, a third back-back row at ~13px width is defensible **only** if it is rendered fully
  desaturated per the §3 background technique — treat it as an extension of the frieze, not a third "real" row of
  bunting.
- **Reduced motion:** freeze every flag at `θᵢ = 0` (rest angle) and the string at its un-shifted Bézier midpoint
  — this is a strict subset of the existing draw call (skip the `sin()` term, keep everything else identical), the
  same `parado` pattern `desenharElemento`/`desenharBrasas` already use elsewhere in `junino.ts`. The still frame
  reads as correctly as it does today, because two static rows of triangles is still the §1-rank-1 signal with or
  without motion — sway is additive, not load-bearing.

---

## 5. What's missing beyond bunting, ranked by recognition-per-cost

Cost is measured two ways now: **art cost** (Path2D complexity, per §1's original bar — a flat two-tone fill is
cheap, a multi-stop gradient is one tier up, anything past ~6 discrete path pieces is expensive relative to what
it buys) and, where relevant, **motion cost** against the §3 taxonomy (cheap / moderate / expensive). Every item
below is tagged `[cheap]` or `[moderate]` for motion; nothing here is motion-expensive.

1. **Xadrez/gingham strip, static, in the frieze band (§3). `[no motion]`.** Cheapest possible addition: a
   repeating two-color checkerboard is `N×N` flat rects (or one `Path2D` with alternating fill via even-odd,
   drawn once to the offscreen sprite same as bunting). Ranked #2 in §1's recognition table, effectively free
   here because it never touches the per-frame loop at all — a pattern doesn't need to move to read correctly,
   and animating a checkerboard (a moiré-inducing idea in any case) would spend motion budget for no
   recognition gain. Highest recognition-per-cost on this entire list.
2. **Animated fogueira — logs + 2–3 flame-tongue sprites + aura, low in frame, off-center. `[moderate]`, promoted
   by the motion re-ranking in §1.** Build it exactly like the balão: author each flame tongue as SVG path data
   (a lens/petal shape, the same family the balão's *bico* already uses), rasterize once per tongue at build time,
   then in the per-frame loop apply an independent `scaleY(t) = 0.85 + 0.3 · |sin(t/Pᵢ + φᵢ)|` and a small `±3°`
   sway per tongue, plus the aura as a `globalCompositeOperation = 'lighter'` circle exactly like `desenharBrasas`
   already does. Logs are two or three static flat-fill capsule shapes underneath, never moving. This is the
   single highest-payoff addition under the new permission: §1's re-ranking argues flicker is a recognition
   signature nothing else on this list has, and the technique is a straight reuse of two patterns already proven
   in the code (sprite-transform-blit from the balão's sway, additive glow from the embers) — it's "moderate" only
   because it's 4–5 new sprites and a new draw call sequence to write once, not because any single frame is
   expensive. Placement: bottom band (§3), off-center — bottom-left or bottom-right corner of the frieze, never
   centered under the headline, both because §3's center rule now explicitly forbids motion there and because a
   centered fire would compete with the CTA button directly above it.
3. **Chapéu de palha silhouette(s), 1–2, anchored in the outer-margin columns (§3). `[cheap]` if given any
   motion at all, `[no motion]` acceptable too.** A cone + circular brim is two `Path2D` arcs, flat straw-tan
   fill (`#C79A56`), no gradient needed at this scale — it's a silhouette, not a lit object. Ranked #4 in §1, and
   unlike the balloon it carries meaning even fully static. If motion budget allows a touch more, a slow vertical
   drift (a few px over several seconds, like the embers') is cheap or acceptable — but §1's re-ranking is explicit
   that this element doesn't get a *recognition* boost from moving the way fogueira does, so treat any motion here
   as optional polish, not a priority claim on the budget.
4. **A second, smaller balão. `[cheap]` — reuses `deslocamentoBalanco` verbatim.** Not a second style of object —
   the same sprite the balão brief already rasterized, blitted a second time, smaller, in a background band, with
   its own already-existing sway function called at a smaller amplitude. Zero new art cost and zero new motion
   code — it's the existing `garantirSpriteBalao` sprite plus the existing swing math, reused. This is the single
   cheapest way to add "more festa" to the scene in either art or motion terms, because both the shape and the
   motion are already paid for; it also reinforces the theme's own centerpiece rather than diluting it. Should be
   smaller and desaturated per §3 — a background balão, not a second focal one.
5. **More embers — raise the seed count, not the technique. `[cheap]`, and fixes a real gap while you're in the
   file.** "Plentiful and lively" embers are cheap to add: `SEMENTES_BRASA` is already a flat array of tiny
   flat-fill circles with additive blend, so going from 10 seeds to ~24–28 costs a linear, small amount of
   fill-rate (each ember's footprint, aura included, is roughly a 10px-radius circle — even 28 of them is a small
   fraction of a typical hero's canvas area) — no new technique, just more entries in the same table, still biased
   to the outer-margin/bottom zones per §3, never into the clean center. **While extending the list, fix the
   reduced-motion freeze:** today `desenharBrasas(pincel, largura, altura, parado ? 0 : agora)` runs each ember's
   alpha formula at `tempo=0`, which evaluates to that ember's own `faseMs` — and the alpha ramp
   (`t < 0.1 ? t/0.1 : t > 0.8 ? (1-t)/0.2 : 1`) means any seed whose `faseMs` lands in the first 10% or last 20%
   of `VIDA_BRASA_MS` (4200ms) freezes dim or invisible. One current seed (`faseMs: 0`) freezes at alpha `0` by
   accident. New seeds should have `faseMs` chosen deliberately inside the `0.15 × 4200`–`0.75 × 4200` window
   (≈630–3150ms) so every ember's `parado` frame lands in the `alpha = 1` plateau — a one-line constraint to keep
   in mind while picking the new values, not a code change to the formula itself.
6. **Milho (corn) accent, 1–2 instances, frieze band. `[no motion]`.** A husk shape is 2–3 simple curves plus rows
   of small ovals for kernels — moderate art cost (more path pieces than the hat, still no gradient required if
   drawn flat-shaded in two tones). Ranked #6 in §1; worth it mainly as frieze-band texture, not a standalone
   focal element, and gets no motion boost (corn doesn't flicker or sway in any convention this brief found).
7. **"Arraiá" or "São João" lettering mark, static, small, one corner. `[no motion]`.** Not a Path2D icon at all —
   it's a `fillText` or a pre-rasterized wordmark in a display/script webfont already loaded by the page (check
   whether the design system already has a display face; if not, a system serif at a bold weight does the job
   without a new font request). Costs almost nothing and closes the read instantly for anyone who somehow missed
   every visual cue above it — but it's a garnish, not a structural fix, so it sits last despite being cheap:
   adding it without also adding items 1–4 would not move the "too little festa junina" complaint.
8. **Sanfona/quadrilha figures** — deliberately not recommended for this canvas, motion or not. Both need enough
   path detail (sanfona's bellows folds, quadrilha's paired-figure pose) to read correctly that they stop being
   cheap in art-cost terms, and animating either properly (bellows compressing, dancers stepping) is squarely
   `[expensive]` — it's articulated-figure animation, a different problem class than transforming a rigid sprite.
   Both rank lower in §1's recognition table than everything above. If the owner wants either, they belong in a
   static corner illustration (drawn once, never animated, never scaled down to the 24px floor), not in the
   per-frame background system.

---

## 6. Assets and templates — survey

Checked for what exists, whether it's usable commercially, and whether its licence is compatible with shipping
inside a public static site (a site whose whole HTML/JS/CSS ships to every visitor, so "redistribution" concerns
that don't matter for an internal tool matter here).

| Source | What's there | Licence | Fit for this project |
|---|---|---|---|
| [Flaticon](https://www.flaticon.com/packs/festa-junina-11) — multiple "Festa Junina" packs (lineal, lineal-color, color; dozens to 80 icons each) | Bandeirinha, fogueira, sanfona, milho, chapéu, quadrilha figures, all as flat/lineal icon sets | **Free tier requires visible attribution** (a credit link) per icon/pack used; premium subscription removes attribution but the terms still forbid redistributing the *pack* itself, only embedding the content in a product ([flaticon.com/legal](https://www.flaticon.com/legal)) | Attribution-required free tier is the wrong fit for a clean marketing hero (no attribution footer exists or is wanted here). Premium is usable but still generic-icon-style — see verdict below. |
| [IconScout](https://iconscout.com/icon-packs/festa-junina) — 226+ Festa Junina packs | Same category of assets as Flaticon, same market | Same shape of licence: free tier attribution-gated, paid tiers remove it but are per-seat/subscription | Same conclusion as Flaticon. |
| [Vecteezy](https://www.vecteezy.com/free-vector/festa-junina) — 2,300+ junina vectors | Broader illustration style, less icon-grid, more "scene" art | **Free licence mandates attribution**, caps commercial use (no resale products, limited print runs, low production budgets), and enforcement is active — they monitor for missing attribution ([vecteezy.com/licensing-agreement](https://www.vecteezy.com/licensing-agreement)) | Attribution requirement is again the blocker; the usage caps also don't cleanly map to "unlimited page views on a public site" the way a purchased Pro licence would. |
| Freepik/Magnific gingham & xadrez sets | Pattern backgrounds, some junina-specific | Same family of licence as Flaticon (same parent company) — free-with-attribution, premium removes it | Fine for a one-off internal deck; same attribution friction for a public site's free tier. |
| Pattern generators — [Gingham Pattern Generator](https://www.semanticpen.com/tools/gingham-pattern-generator), [Vondy](https://www.vondy.com/gingham-pattern-generator--CANNNjV4) | Generate custom-color gingham/xadrez SVG/PNG on demand | Output ownership varies by tool, generally usable, but these are **raster or opaque SVG exports** — not path data you author or can hand-tune to the exact house hex family | Useful for prototyping a look fast; not for the final asset, because the deliverable here is hand-authored `Path2D` data matching exact project hexes, which a generator's output won't do without redrawing anyway. |
| [FreeSVG.org](https://freesvg.org/) | General SVG library, CC0/public-domain | **CC0 — no attribution, no redistribution restriction** | The one genuinely clean-licence source found, but its junina-specific coverage is thin/generic clip-art style — usable as a geometry *reference* to trace from, not as drop-in production art (style clashes with the balão's stylized-premium register, same reasoning §4.2 of the balão brief already gives for why mixed asset provenance "brigam" instead of "combinam"). |
| Kenney / Quaternius (already used elsewhere in this codebase's sibling `pescaria` project, per its own spec) | CC0 3D/2D game asset packs | CC0 | Not festa-junina-specific — no coverage of bandeirinha/xadrez/chapéu at all. Relevant only as a precedent for how this team already prefers CC0-sourced assets when available. |

**Verdict: hand-authored paths beat every downloadable set for this use, and it isn't close.** Three independent
reasons, not one:

1. **Licence friction is real, not theoretical.** Every commercially-relevant source found (Flaticon, IconScout,
   Vecteezy, Freepik) gates its free tier behind attribution that this page has no design slot for, and their
   paid tiers are subscriptions, not one-time buys — an ongoing cost for a handful of static shapes that, once
   drawn as path data, cost nothing again.
2. **Style coherence, not just legal cleanliness.** The balão brief already made this case for the balloon itself
   ("asset de banco e modelo gerado por IA combinam em estilizado e brigam em realista") — the same logic applies
   across a whole scene assembled from multiple stock packs: different illustrators' stroke weight, corner
   radius, and shading convention don't agree with each other, and the tell is immediate to exactly the "agency
   professional" audience this brief's bar names. A downloaded bandeirinha icon next to a hand-drawn balão next to
   a gingham generator's pattern is three visual dialects in one frame.
3. **The project already has the pipeline, and it composes.** `junino.ts`'s SVG-path-string → `Path2D` →
   rasterize-once discipline is already built, tested, and paid for; every new element (hat, corn, xadrez strip)
   is a few more path strings and one more sprite cache entry in the same file, using the same `misturar()`
   gradient helper and the same defensive Node/jsdom fallback the balão already has. A downloaded asset would
   need to be redrawn as path data anyway to fit this pipeline (SVG import at runtime is explicitly out of scope
   per the constraints), which means the "shortcut" of using a stock pack still ends at hand-authoring the paths
   — it just adds a licence to track first.

---

## 7. Three things to avoid

1. **Filling the new density with repeated single elements instead of a cast.** The fastest way to make "more
   festa junina" look cheap is to solve it by cloning the one thing that already works — three more balloons, a
   longer bunting row, more embers — rather than adding the different-shaped elements §5 ranks. Repetition of one
   silhouette reads as "we only drew one thing" no matter how many copies are on screen; a small cast of 3–4
   distinct shapes (bunting + xadrez strip + a hat or two + a second small balão) reads as a *scene* at a fraction
   of the per-element cost of six copies of one sprite.
2. **Letting the frieze/edge density — or motion — creep toward the center.** The zoning in §3 only works if the
   boundary holds: the moment a hat or a corn accent drifts into the middle 40% "clean" column — even once, even
   small — it starts competing with the headline and the game's own targets, and the fix the owner asked for turns
   into the problem the current restrained version was built to avoid. Now that movement is permitted, this rule
   is sharper, not softer: a moving element reads as a bigger intrusion than a static one of the same size and
   position, because motion is what peripheral vision is tuned to catch first. Treat the center column as a hard
   rule for both density and motion during implementation, not a lower probability of either.
3. **Adding warmth by brightening the background instead of by adding warm shapes.** The instinct to fix "reads
   as night, not arraiá" is often to lighten or warm the base fill (`#08090C` → some lighter brown). That trades
   away the exact thing that makes register A's palette pop (§2's contrast math), and it's a design-system-wide
   change for a one-page problem. The warmth this scene needs comes from more gold/red/tan *shapes* and the subtle
   vignette in §2 — not from repainting the ground everything else in the product sits on.

---

## Sources consulted (new to this brief; the balão-shape sources are already listed in the existing reference doc)

- [Alô Alô Bahia — "Veja por que estampa xadrez, chapéu e bota viraram roupa junina"](https://aloalobahia.com/notas/veja-por-que-estampa-xadrez-chapeu-e-bota-viraram-roupa-junina) — clothing-as-signifier ranking (§1, §5)
- [Toda Matéria — Quadrilha](https://www.todamateria.com.br/quadrilha/) — instrumentation, dance-figure detail (§1)
- [Escola Educação — Quadrilha Junina](https://escolaeducacao.com.br/quadrilha-junina-musicas-passos-roupas-e-origem/) — clothing/dance description
- [blog.blocksrvt.com — 2026 decoration trends](https://blog.blocksrvt.com/ideias-de-decoracao-para-festa-junina/) — register B (earthy) 2026 palette shift
- [rvb.com.br — São João 2026 decoration + brand activation](https://rvb.com.br/decoracao-sao-joao-ideias-criativas/) — register A/B split confirmation
- [daquidali.com.br — 83 colour ideas for festa junina](https://daquidali.com.br/colorir-festa-junina/) — commercial-register palette conventions, milho/pamonha pairing
- [Westwing — Bandeirinha festa junina](https://www.westwing.com.br/guiar/bandeirinha-festa-junina/) — real-world flag size/spacing ratio (8–10 per metre, 2cm gap) used to validate §4
- [DecorFácil — 70 ideias de bandeirinhas](https://www.decorfacil.com/bandeirinhas-festa-junina/) — material/construction cross-check
- [Flaticon terms of use](https://www.flaticon.com/legal) and [Flaticon Festa Junina packs](https://www.flaticon.com/packs/festa-junina-11) — licence survey (§6)
- [IconScout Festa Junina packs](https://iconscout.com/icon-packs/festa-junina) — licence survey (§6)
- [Vecteezy licensing agreement](https://www.vecteezy.com/licensing-agreement) and [Vecteezy Festa Junina vectors](https://www.vecteezy.com/free-vector/festa-junina) — licence survey (§6)
- [Gingham Pattern Generator (semanticpen)](https://www.semanticpen.com/tools/gingham-pattern-generator) and [Vondy gingham generator](https://www.vondy.com/gingham-pattern-generator--CANNNjV4) — pattern-tool survey (§6)
- [FreeSVG.org](https://freesvg.org/) — CC0 baseline check (§6)
- [Promoview — Ativações de marca no São João de Caruaru e Campina Grande 2026](https://www.promoview.com.br/ativacoes-marca-sao-joao-nordestino-2026/) — activation composition reference (also in the existing balão brief)
- [Prefeitura de Campina Grande — Maior São João do Mundo 2026](https://campinagrande.pb.gov.br/o-maior-sao-joao-do-mundo-2026-reune-mais-de-110-atracoes-e-reforca-identidade-nordestina-com-presenca-nacional/) — checked for official palette; none published in accessible form, noted as a gap rather than assumed

Code read for grounding (not sources, but load-bearing context): `components/ativacoes/temas/junino.ts`,
`components/ativacoes/CapaJogo.tsx`, `docs/superpowers/specs/2026-08-20-dobra-tematica-design.md`, and
`docs/superpowers/referencias/2026-08-20-arte-junina.md`, all in the portfolio repo (`g:\documentos\portfolio`).
