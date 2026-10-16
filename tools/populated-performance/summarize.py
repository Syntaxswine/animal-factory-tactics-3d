import base64
import hashlib
import io
import json
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = root / 'artifacts/populated-performance-2026-10-16'
destination = root / 'docs/tactics/images/populated-rendering-2026-10-16'
destination.mkdir(parents=True, exist_ok=True)

def read(name):
    return json.loads((source / (name + '.json')).read_text(encoding='utf-8'))

def image_compare(a, b):
    def pixels(record):
        return np.array(Image.open(io.BytesIO(base64.b64decode(record['image'].split(',')[1])))).astype(int)
    x, y = pixels(a), pixels(b)
    delta = np.abs(x-y)
    return {'shape':list(x.shape), 'changedPixels':int(np.any(delta != 0, axis=2).sum()), 'maximumChannelDelta':int(delta.max())}

def compact(record):
    keys = ['label','mode','initialSeed','fixtureHash','sourceHashes','browser','gpu','resolution','displayViewport','dpr','duration','ticks','summary','stateHash','fullSaveHash','saveValid','postPresentationStateHash','hiddenFrames','errors','diagnostics','glErrors','warningCount','warnings','contextLost','memory','measurementStartedAt','measurementEndedAt','fullTurnComplete']
    result = {key:record.get(key) for key in keys}
    result['frameColumns'] = ['t','raf','cpu','simulationMs','calls','triangles']
    result['frames'] = [[round(row.get(key, 0), 4) for key in result['frameColumns']] for row in record['rows']]
    result['simulationEvents'] = record['events']
    return result

final_sources = {f:hashlib.sha256((root/'dist/tactics'/f).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest() for f in ['battle-renderer.js','character-batches.js','foliage-obstacles.js','core/visibility.js']}
report = {'baselineRef':'034c0b7','method':'Same packaged 240x240 wetland fixture, four mercs, twelve guards, eight civilians; 5 s warm-up then 20 s/40 fixed ticks. ABBAAB order; DPR 1; GPU timer disabled; no concurrent test/build commands. CPU/RAF callbacks are not a displayed-FPS measurement. Full-turn comparison runs to the next player phase. Saves use frozen gameplay clock and settled presentation for image comparisons.','runs':[], 'comparisons':[]}
for size in ['normal','large']:
    pairs = []
    for number in range(1, 4):
        a, b = [read(f'render-{size}-{version}-{number}') for version in ['baseline','candidate']]
        assert a['resolution'] == b['resolution']
        if size == 'large':
            assert a['resolution'] == [1920,1080], 'Large rendering surface was not applied'
        assert a['fixtureHash'] == b['fixtureHash']
        assert a['fullSave'] == b['fullSave']
        assert a['stateHash'] == b['stateHash']
        assert all(b['sourceHashes'][f] == digest for f, digest in final_sources.items()), 'Stale candidate build'
        for r in [a, b]:
            assert r['saveValid'] and not r['errors'] and not r['diagnostics'] and not r['hiddenFrames'] and not r['contextLost']
            assert r['stateHash'] == r['postPresentationStateHash']
            report['runs'].append(compact(r))
        comparison = {'size':size,'pair':number,'equalFullSave':True,'image':image_compare(a,b)}
        report['comparisons'].append(comparison)
        pairs.append([a['summary']['cpu']['median'], b['summary']['cpu']['median'], a['summary']['simulation']['median'], b['summary']['simulation']['median']])
        if size == 'normal' and number == 1:
            (destination/'after.png').write_bytes(base64.b64decode(b['image'].split(',')[1]))
    print(size, pairs)

a,b = [read(f'full-turn-{version}') for version in ['baseline','candidate']]
assert a['fullTurnComplete'] and b['fullTurnComplete'] and a['ticks'] == b['ticks']
assert a['fullSave'] == b['fullSave']
assert all(b['sourceHashes'][f] == digest for f, digest in final_sources.items()), 'Stale complete-turn candidate'
for r in [a,b]:
    assert r['saveValid'] and not r['errors'] and not r['diagnostics'] and not r['hiddenFrames'] and not r['contextLost']
    assert r['stateHash'] == r['postPresentationStateHash']
report['fullTurn'] = {'baseline':compact(a),'candidate':compact(b),'equalFullSave':True,'image':image_compare(a,b)}
report['finalSourcesLF'] = final_sources
(destination/'measurements.json').write_text(json.dumps(report, separators=(',',':')), encoding='utf-8')
print(json.dumps({'comparisons':report['comparisons'],'fullTurnTicks':a['ticks'],'fullTurnImage':report['fullTurn']['image']}, indent=2))
