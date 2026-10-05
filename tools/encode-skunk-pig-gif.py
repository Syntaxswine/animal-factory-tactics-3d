"""Encode the actual deterministic captures; requires Pillow, no repainting."""
from pathlib import Path
from PIL import Image
import json

root=Path(__file__).resolve().parent.parent
directory=root/'artifacts/tank-blast/skunk-pig-gif'
paths=sorted((directory/'frames').glob('*.png'))
frames=[Image.open(p).convert('RGB') for p in paths]
assert len(frames)==121 and all(f.size==(960,540) for f in frames)
samples=[frames[i] for i in range(0,len(frames),3)]
sheet=Image.new('RGB',(240*len(samples),135))
for i,frame in enumerate(samples):
    sheet.paste(frame.resize((240,135),Image.Resampling.LANCZOS),(i*240,0))
palette=sheet.quantize(colors=256,method=Image.Quantize.MEDIANCUT)
indexed=[f.quantize(palette=palette,dither=Image.Dither.FLOYDSTEINBERG) for f in frames]
durations=[50]*len(indexed)
durations[0]=300
durations[-1]=750
output=root/'docs/tactics/tank-blast/evidence/skunk-vs-red-hat-pig.gif'
indexed[0].save(output,save_all=True,append_images=indexed[1:],duration=durations,loop=0,optimize=True,disposal=1)
with Image.open(output) as gif:
    total=0
    for i in range(gif.n_frames):
        gif.seek(i);gif.load();duration=gif.info.get('duration',0)
        for t,name in [(1200,'gif-hit'),(1700,'gif-blast'),(2350,'gif-ground-fire')]:
            if total<=t<total+duration:gif.convert('RGB').save(directory/(name+'.png'))
        total+=duration
    assert gif.size==(960,540) and gif.info.get('loop')==0 and total==7000
    gif.convert('RGB').save(directory/'gif-aftermath.png')
    report={'file':str(output.relative_to(root)).replace('\\','/'),'bytes':output.stat().st_size,'size':gif.size,'frames':gif.n_frames,'duration_ms':total,'loop':0,'source_fps':20,'intro_hold_ms':300,'outro_hold_ms':750,'operator':'skunk/normal/flamethrower','target':'pig-foreman/red-hats/flamethrower','staged':True}
    (directory/'export.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))
