"""Gate 2: generate the four collage stills with a Gemini image model (16:9). Key read from GEMINI_API_KEY."""
import json, os, sys
from pathlib import Path
from google import genai
from google.genai import types

HERE = Path(__file__).parent
spec = json.loads((HERE / "visual-spec.json").read_text())
MODEL = sys.argv[1] if len(sys.argv) > 1 else "gemini-3-pro-image"
only = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
TEMPLATE = """Use case: ads-marketing
Asset type: final still frame for a 16:9 image-to-video B-roll clip
Primary request: Create a finished editorial paper-collage image expressing: {metaphor}.
Scene/backdrop: perfectly flat paper field in {hex} with subtle uncoated paper fiber.
Style/medium: premium editorial stop-motion paper collage; black-and-white halftone photographic cut-outs mixed with selective colored cardstock accents ({accents}).
Composition/framing: horizontal 16:9 locked poster frame; central subject within the middle 70 percent; generous clean color-field negative space; 3-6 large separable paper groups for later assemble-from-empty animation.
Materials/textures: visible printed halftone dots, crisp machine-cut edges, thin warm-cream paper keylines, soft low-opacity physical drop shadows.
Constraints: the relationship must read at a glance: {line}
Avoid: no typography, no readable letters, no numerals, no logos, no watermark, no UI, no subtitles, no glossy 3D, no photoreal environment, no clutter."""
prompts = []
for it in spec["items"]:
    if only and it["id"] not in only:
        continue
    prompt = TEMPLATE.format(metaphor=it["visual_metaphor"], hex=it["color_field"]["background_hex"],
                             accents=", ".join(it["color_field"]["accent_colors"]), line=it["line"])
    prompts.append(f"## {it['id']}\n\n```\n{prompt}\n```\n")
    resp = client.models.generate_content(
        model=MODEL, contents=[prompt],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"],
                                           image_config=types.ImageConfig(aspect_ratio="16:9")))
    saved = False
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None) and part.inline_data.data:
            out = HERE / it["id"] / "frames" / "last-frame-original.png"
            out.write_bytes(part.inline_data.data)
            print("saved", out.relative_to(HERE), len(part.inline_data.data), "bytes")
            saved = True
            break
    if not saved:
        print("NO IMAGE for", it["id"])
if not only:
    (HERE / "imagegen-prompts.md").write_text("# Image prompts (" + MODEL + ")\n\n" + "\n".join(prompts))
