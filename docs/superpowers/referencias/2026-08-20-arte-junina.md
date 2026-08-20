# Art direction brief — Festa Junina reskin (balão de São João)

Scope: Canvas 2D, SVG path data → `Path2D`, rasterized once to an offscreen canvas, blitted per frame. No images, no WebGL, no animation library, no `shadowBlur`/`filter`. House palette: bg `#08090C`, text `#F5F3EF`, cool accent `#38BDF8`, warm accent `#FFB020`.

Bar: has to read as work an agency produced for a brand's live activation, in under a second, to someone who does that work professionally.

---

## 0. The one decision everything else depends on

The brief's own phrase — "paper hot-air balloon" — is a trap. Translated literally, or fed to an image search, it returns a **Montgolfier balloon: round canopy, wicker basket, ropes.** That object has no connection to Festa Junina and no Brazilian viewer would read it as one.

The correct object is the **balão de São João / balão junino**: a hand-built paper lantern made of tissue-paper gores glued edge to edge into an onion/teardrop volume, gathered into a knot at the top, tapering to a point at the bottom, traditionally with a small paper "mouth" (*bico*) at the base where a candle sits. It is also **not** a round rubber party balloon with a tied knot — that's the second wrong default a generic "balloon" prompt produces.

Everything below assumes the balão de São João silhouette: **tapered at both ends, wide at the equator, seamed into gores.** Get this one shape right and most of the "amateur" risk is already gone; get it wrong and no amount of correct color fixes it.

---

## 1. What actually distinguishes professional Brazilian Festa Junina brand art

Findings from agency/activation coverage, official São João visual-identity case studies, and Brazilian craft/cultural sources (full list in §6):

- **The balão is always stylized as a static decorative craft object** — strung in clusters, hanging from a line, sitting on a table, held — **never shown mid-flight actively burning.** This isn't a style preference, it's legal: releasing a lit paper balloon (*soltar balão*) is a named environmental crime in Brazil (Lei 9.605/98, Art. 42 — up to 3 years detention plus fines), a recurring cause of wildfires and urban fires reported every June, and every real Festa Junina campaign I found treats the object accordingly. This is the most Brazil-specific, most easily-missed convention in the whole brief — see §5.
- **Bunting (*bandeirinhas*)** — triangular paper flags strung overhead — is present in essentially every activation and every official São João visual identity referenced. It is the single most universal signifier, more consistent across sources than any specific color rule.
- **Palette runs in two registers**, and real campaigns pick one rather than blending them: (a) a **bright commercial/primary register** — red, yellow, blue, verde-bandeira green, white, "vivid and contrasting," per Ambev-adjacent and mass-retail coverage — used by brands selling "party"; (b) an **earthy/heritage register** — burnt orange, brown, verde-bandeira, off-white, plus bold black *xilogravura* (Nordeste woodcut) linework — used by brands and municipal identities (Caruaru, Campina Grande) leaning into cultural authenticity. Given this page needs to read as "festive" inside a 15-second game to a general audience, register (a) is the correct default: it's faster to parse and doesn't risk getting heritage cues wrong. Register (b)'s contribution worth keeping is the **line weight** (below), not its palette.
- **Line weight is never a thin uniform hairline.** Sourced from *xilogravura* practice (hand-cut into soft wood with knife/gouge — direct, slightly irregular strokes): shapes are either defined by a **value shift** (no stroke at all — see the gore gradients below) or, where a stroke is used, it's **bold and a little uneven**, never a crisp 1px vector-icon hairline. A thin uniform outline is one of the fastest "made in Figma by someone who's never seen the real thing" tells.
- **Fogueira (bonfire) shows up as ambience, not as a drawn campfire.** Warm glow and sparks, far more often than a literal flame-pile competing for attention in a KV. Supports treating fire as *embers*, not as a scene element, in §3.
- **Fabric/material references recur constantly** — *chita* (small-floral print, red/pink ground), gingham/*xadrez de fogão* (red-white check), straw, lace trim — but these are raster-texture conventions (packaging, tablecloths) that don't translate to flat-fill Path2D and are out of scope here; noted only because they explain why the checked-gingham pattern, if used anywhere, belongs on a static footer strip, never on the animated balloon or background.
- **Never present in any reference examined:** Halloween-coded imagery, Christmas red-and-green-with-white, glossy rubber-balloon material with a big white specular blob, black cartoon outlines, or — per the legal point above — a balloon shown aloft and burning.

---

## 2. The balloon

### Proportions
- Body (gores only, excluding cap and tail): **width : height = 0.72 : 1.**
  A real craft mold runs more elongated — one documented pattern uses 4 diamond gores at 28cm × 54cm, ≈ **0.52 : 1**. At the target render sizes (24px phone / 48px desktop) that ratio produces a ~12px-wide sliver that stops reading as "round-bodied lantern" and starts reading as "line." Fatten it to 0.72:1 for legibility; keep the tapered-both-ends signature, which is the identity-bearing part, not the exact ratio.
- **Cap knot** on top: a small dark disc where the gores gather, ~8% of body width, ~6% of body height. This is what reads as "gathered paper," distinguishing the top from a rubber balloon's smooth dome.
- **Flame/tail** hangs below the lowest point of the gores: ~18% of body height (see shape below).
- Total sprite height (cap + body + tail) = **1.24×** body height.

### Gores
- **6 gores**, built as separate `Path2D` pieces (this pays off directly in the pop, §4 — they're already discrete objects).
- Each gore is a lens/vesica shape: two cubic Bézier arcs sharing a start point (the cap) and end point (the tail attachment), each arc bulging outward **0.14 × body-width** at its midpoint. Place that midpoint (the gore's "equator") at **42% down** the body height, not 50% — a dead-center bulge reads as a rubber balloon; a slightly-high bulge reads as gathered fabric/paper.
- This is a 2D fan of gores, not a 3D revolve, so fake the wraparound: make the **two outermost gores ~60% the width** of the four camera-facing ones, rendered mostly in their shadow stop. That narrowing is what sells "this curves away from the viewer" without any actual 3D.

### Color
Six gores, front-to-back: **red, gold, green, red, house-blue, gold** — i.e. 2× red, 2× gold, 1× green, 1× house-blue. No purple, pink, or neon; stay inside the culturally-coded set. The single house-blue gore is a deliberate, sparing brand tie-in — one cool note in a warm field, not another primary.

Each gore is filled with a **linear gradient along its own local width** (not a global canvas gradient), 4 stops simulating cylindrical shading from an upper-left light:

| Stop | Position | Role | Red gore | Gold gore | Green gore | House-blue gore |
|---|---|---|---|---|---|---|
| 1 | 0% (left/far edge) | shadow, recedes toward bg | `#5C1A12` | `#7A4A08` | `#0E4A30` | `#155F80` |
| 2 | 35% | base hue | `#D93A2B` | `#FFB020` | `#1E8F5F` | `#38BDF8` |
| 3 | 60% | highlight | `#F08A63` | `#FFE08A` | `#6FD9A6` | `#A8E4FF` |
| 4 | 100% (right/near edge) | shadow, lighter than stop 1 | `#7A2A1E` | `#A06A12` | `#155F3E` | `#1F6E90` |

Stop 4 is deliberately **less dark than stop 1** — a symmetric mirror gradient reads as a computed sphere; the asymmetry (dark-left, lighter-right) is what sells "light from one side" instead of "procedural shading."

### Seams and light
- Stroke gore boundaries at 1px (48px scale only, drop at 24px) using the gore's own stop-1 shadow color at ~70% opacity. **Never pure black** — a black outline over paper-and-glue construction is a coloring-book tell, not a craft one.
- Implied light source: **30% width, 20% height** of the sprite's bounding box (upper-left). Keep this consistent with whatever light convention the rest of the game's props already use, if one exists.

### Flame / tail
Real balloons have a candle mouth (*bico*) — but per §1/§5, agency work essentially never depicts it lit. Build it as a **decorative paper appliqué**, not rendered fire: two nested flat shapes, no third hot-core layer (a third yellow-white tongue layer is what tips this into "actual flame" territory).
- Outer shape: lens/petal, apex down, twisted ~15° off vertical, ~30% body width × 18% body height, fill `#B23A1F` (a dusty, dried-blood orange-red — visibly *not* the same hue as a lit flame, which is the point).
- Inner shape: same silhouette, offset up and scaled to ~55%, fill `#FFB020` (house warm accent — reused on purpose, so the one "hot" note in the sprite is on-brand).

### What to drop at 24px
- Drop gore seam strokes entirely (let the gradient carry the boundary).
- Drop to **4 rendered gores**: merge the two side slivers into their neighbor's shadow stop rather than drawing them separately.
- Cap knot becomes a single flat dot, no gradient.
- Flame tail becomes the outer shape only (flat fill, no nested highlight) — two sub-4px overlapping shapes just alias into a blob at this size.
- **Never drop:** the both-ends taper (the single highest-value silhouette cue) and at least 2 distinct gore hues — a monochrome silhouette at 24px reads as "dark blob," not "festival balloon."

---

## 3. The background

### Bunting (bandeirinhas)
- Triangular flags, apex down, strung along the **top 10–14% of viewport height**, hanging into frame ~1.4× flag height.
- Flag width: `clamp(20px, 5vw, 34px)`. Flag height = **1.3× width** — a perfect equilateral triangle reads as a generic "pennant" icon; the slight elongation reads as fabric cut on the bias, which is closer to the real thing.
- Gap between flags ≈ 18% of flag width.
- String is **never straight**: model each span as a quadratic Bézier sagging **12–16% of the span length** at its midpoint. A taut ruler-straight line is one of the fastest "generated," not "hung," tells (gravity is free to draw and its absence is conspicuous).
- Color rotation, 5-hue repeating sequence: red `#D93A2B` → gold `#FFB020` → house-blue `#38BDF8` → verde-bandeira `#1E8F5F` → cream `#F5F3EF` (reuses the house text color, which also keeps the string itself legible against the near-black bg). Cap at 5 hues on screen — more starts reading as generic rainbow.
- Render once to the offscreen canvas as a **static strip** — it doesn't need to animate, which is free performance and also correct: real bunting doesn't flap on a page.

### Embers
Stand in for the *fogueira* (bonfire) without drawing one — a campfire shape would compete with the HUD, and realistic fire needs the blur this stack forbids.
- 8–14 particles live at once, 1–3px core.
- Two-stop fake glow, no `shadowBlur`: solid core `#FFB020`, plus a second larger, more transparent circle drawn **under** it at `#FF6B35`, alpha 0.35–0.5, composited with `globalCompositeOperation = 'lighter'` for that circle only (compositing, not a filter — allowed and cheap).
- Motion: drift upward 8–14px/s, slow horizontal sine wobble (amplitude 3–6px, period 2–4s). Fade alpha in over the first 10% of life, out over the last 20%.
- Spawn bias: lower third of the canvas, x-position biased toward the outer 25% margins on each side — keep the center clear, where copy and the game itself sit.

### How much to draw
Combined bunting + embers should cover **well under ~8% of pixels** at any instant. The hero copy and the 15-second game are the subject; the junina layer frames them, it doesn't compete texturally. Whenever a parameter above has a range, the answer that best serves this page is the sparse end of it — this is the one place where "less" is unambiguously the correct professional call, not a compromise.

---

## 4. The pop

Paper coming apart at glued seams, not a particle-system explosion. Timings below assume 60fps; they translate directly to ms at any frame rate.

**Phase A — seam-burst, 0–120ms (~7 frames).** The balloon's 6 gore `Path2D` pieces — already discrete objects from construction — individually translate outward from the vertical centerline by 4–8px and rotate ±6–10°, at full opacity, no new shapes drawn. Because the viewer already parsed these as separate pieces during the idle/float state (visible seams), this alone reads as "the panels came apart," with no burst effect needed.

**Phase B — fall, continuing to ~400–500ms total.** Each gore, the cap knot, and the flame tail become independent falling bodies:
- Initial outward velocity **proportional to each piece's distance from the vertical axis** — side gores fly wider/faster than the near-center ones.
- Gravity: **900–1100px/s²**.
- Constant per-piece angular velocity, ±180–360° over the fall, **a different rate per piece** — uniform spin across all pieces is the tell of one sprite reused six times rather than six separate scraps.
- Alpha fades from full to 0 starting at **60% of the phase duration**. Pieces dissolve mid-air; they never reach or hit a floor. This is also the practical win: no collision/ground-plane code needed, and it's the correct read for a tapped game object — it doesn't need to "land," it needs to resolve.

**Secondary detail:** 3–5 small torn confetti scraps — **irregular quadrilaterals, not circles or stars** — smaller (3–5px), lighter, one of the gore's colors, ejected with more random velocity, shorter life (~250–350ms). Keep this to a handful; it's texture, not a spray.

**What never appears:** no radial flash at the tap point, no ring/shockwave, no circular confetti dots, no starburst "bang" shape. Those are generic UI-particle vocabulary. The read is "panels came apart and fluttered," never "an explosion happened here."

---

## 5. Three things to avoid

1. **The wrong object.** A Montgolfier hot-air balloon (basket, ropes, round canopy) or a round rubber party balloon with a tied knot, instead of the balão de São João's gored, both-ends-tapered lantern silhouette. Given the brief's own English phrasing, this is the single highest-probability failure — and the one an agency professional clocks fastest, per the owner's own bar.

2. **Balloon aloft, on fire, against open sky.** Releasing a lit paper balloon is a specifically named crime in Brazil (Lei 9.605/98, Art. 42 — up to 3 years detention, fines), and a widely-reported cause of wildfires every June. No real brand campaign depicts it that way — the balão is always shown as strung, sitting, or held. The game mechanic can absolutely have it airborne (that's an abstraction everyone accepts), but giving it a licking, multi-tongue flame while airborne crosses from "stylized game object" into an image that reads as either naive or faintly alarming to the intended audience. Keep the flame element the flat decorative appliqué from §2 — never rendered fire.

3. **Rainbow confetti and a circular particle-shatter on pop.** Real Festa Junina palettes are culturally coded — red, gold, verde-bandeira green, royal blue, off-white — and pointedly exclude purple, magenta, neon. A full-spectrum burst reads as a generic party-confetti stock asset, not this specific festival. Likewise, popping into uniform circular dots is the default "particle burst" primitive from every UI effects library — it reads as an effect, not as paper. Use the seam-based pop in §4 instead.

---

## 6. Sources consulted

- [As marcas que mantêm acesas as maiores festas juninas do Brasil](https://www.meioemensagem.com.br/marketing/as-marcas-que-mantem-acesas-as-maiores-festas-juninas-do-brasil) — Meio & Mensagem, brand investment and activation strategy (Ambev, Santa Helena, Beats, LUX)
- [Marcas ampliam presença nas festas juninas e reforçam disputa por território cultural no Nordeste](https://mundodomarketing.com.br/marcas-ampliam-presenca-nas-festas-juninas-e-reforcam-disputa-por-territorio-cultural-no-nordeste) — Mundo do Marketing
- [Ativações de marca no São João de Caruaru e Campina Grande 2026](https://www.promoview.com.br/ativacoes-marca-sao-joao-nordestino-2026/) — Promoview
- [Balão de São João: Como Fazer, Molde](https://www.artesanatopassoapassoja.com.br/balao-de-sao-joao/) — Artesanato Passo a Passo (construction materials)
- [Como Fazer Balão de Festa Junina: 5 Moldes com Passo a Passo](https://www.revistaartesanato.com.br/como-fazer-balao-de-festa-junina/) — Revista Artesanato (source of the 4-gore, 28cm×54cm proportion reference)
- [Moldes de balão de São João](https://comofazeremcasa.net/moldes-de-balao-de-sao-joao/) — construction materials cross-check
- [Festa junina: entenda por que soltar balão é crime no Brasil](https://www.correiobraziliense.com.br/revista-do-correio/2026/06/7436602-festa-junina-entenda-por-que-soltar-balao-e-crime-no-brasil.html) — Correio Braziliense, Lei 9.605/98 Art. 42
- [Balões caem em parque do Rio e são apreendidos; prática é crime](https://agenciabrasil.ebc.com.br/meio-ambiente/noticia/2025-05/baloes-caem-em-parque-do-rio-e-sao-apreendidos-pratica-e-crime) — Agência Brasil
- [Faça você mesmo: Decoração para Festas Juninas inspirada na xilogravura nordestina](https://followthecolours.com.br/follow-decora/festas-juninas-xilogravura-nordestina) — Follow the Colours
- [Xilogravura nordestina: o encontro do tradicional e do contemporâneo](https://followthecolours.com.br/xilogravura-nordestina/) — Follow the Colours (line/cut characteristics)
- [Xilogravura Nordestina](https://www.ctb.org.br/2011/03/30/xilogravura-nordestina/) — CTB
- [Festa junina de cordel: uma decoração 100% brasileira para seu arraiá!](https://blog.ricafesta.com.br/festa-junina/festa-junina-de-cordel/) — Rica Festa (black/white + earth-tone palette convention for the cordel register)
- [83 ideias de cores para colorir festa junina e arrasar na pintura](https://daquidali.com.br/colorir-festa-junina/) — Daquidali (commercial-register palette conventions)
- Behance search results for "Festa Junina" / "São João" identidade visual, campaign case studies (Cidade Junina, Junina Chama Ardente, São João de Itapecuru, Key Visual São João Itaju do Colônia) — used as confirmation that municipal/agency identities converge on bunting + balão + fogueira as the recurring element set

Proportions and color values not directly lifted from a single source (the gradient stop table, the 0.72:1 body ratio, the gore count, the pop timings) are original specification decisions made to satisfy the Canvas 2D/no-blur/24px-legibility constraints, reasoned from the conventions above — flagged inline with their rationale rather than presented as sourced facts.
