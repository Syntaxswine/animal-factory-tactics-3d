"""Encode the unaltered rendered matte frames as a GIF review clip."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
asset_dir = root / 'dist/assets/effects/painted-blood'
manifest_file = asset_dir / 'manifest.json'
manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
times = manifest['flipbook']['times']
frame_dir = Path(sys.argv[1])
frames = [Image.open(frame_dir / f'{i:02}.png').convert('RGB') for i in range(len(times))]
durations = [max(10, round((times[i+1]-times[i])*100)*10) for i in range(len(times)-1)] + [500]
output = asset_dir / 'spray-preview.gif'
frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
manifest['preview'] = {'file': output.name, 'width': 256, 'height': 256, 'loopDurationMs': sum(durations), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'purpose': 'Matte review GIF only; use transparent PNGs in the game.'}
manifest_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(json.dumps({'output': str(output), 'frames': len(frames), 'durationsMs': durations, 'bytes': output.stat().st_size}))
