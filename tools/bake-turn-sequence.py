"""Bake a transparent, motion-compensated yaw atlas entirely offline.

Requires Pillow, NumPy, pycairo, Node and the official RIFE ncnn 20221029
executable with rife-v4.6. The executable/model are preparation tools only;
the website has no ML or Python dependency. No downloads or uploads here.
Usage: python3 tools/bake-turn-sequence.py --rife /path/to/rife-ncnn-vulkan
"""
import argparse, bisect, json, math, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
COUNT, COLUMNS, WIDTH, HEIGHT = 129, 12, 320, 256

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rife', type=Path, required=True)
    parser.add_argument('--work', type=Path)
    args = parser.parse_args()
    executable = args.rife.resolve()
    model = executable.parent / 'rife-v4.6'
    if not executable.is_file() or not model.is_dir():
        parser.error('Provide the official RIFE executable beside its rife-v4.6 model.')
    work = args.work or Path(tempfile.mkdtemp(prefix='fuchsia-turn-'))
    work.mkdir(parents=True, exist_ok=True)
    subprocess.run(['node', 'tools/capture-turn-source.cjs', str(work)], cwd=ROOT, check=True)
    subprocess.run(['python3', 'tools/replay-canvas.py', str(work / 'ops.json')], cwd=ROOT, check=True)
    angles = json.loads((work / 'angles.json').read_text())
    sources = [Image.open(work / f'frame-{i}.png').convert('RGBA') for i in range(len(angles))]
    # Two mattes preserve the transparent silhouette through an RGB model.
    for i, source in enumerate(sources):
        for color in ('black', 'white'):
            matte = Image.new('RGB', source.size, color)
            matte.paste(source, mask=source.getchannel('A'))
            matte.save(work / f'{color}-{i}.png')
    sheet = Image.new('RGBA', (WIDTH * COLUMNS, HEIGHT * math.ceil(COUNT / COLUMNS)))
    for index in range(COUNT):
        angle = index * 180 / (COUNT - 1)
        left = min(len(angles) - 2, max(0, bisect.bisect_right(angles, angle) - 1))
        fraction = (angle - angles[left]) / (angles[left + 1] - angles[left])
        if fraction < 1e-8:
            frame = sources[left]
        elif fraction > 1 - 1e-8:
            frame = sources[left + 1]
        else:
            mattes = []
            for color in ('black', 'white'):
                output = work / f'{color}-intermediate.png'
                subprocess.run([str(executable), '-0', str(work / f'{color}-{left}.png'),
                    '-1', str(work / f'{color}-{left+1}.png'), '-o', str(output),
                    '-s', str(fraction), '-m', str(model), '-g', '-1', '-j', '1:2:1', '-z'],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                mattes.append(np.asarray(Image.open(output), dtype=np.float32) / 255)
            black, white = mattes
            alpha = np.clip(1 - np.mean(white - black, axis=2), 0, 1)
            rgb = np.clip(black / np.maximum(alpha[:, :, None], 1 / 255), 0, 1)
            rgba = np.dstack((rgb, alpha))
            rgba[alpha < 1 / 255] = 0
            frame = Image.fromarray(np.uint8(np.round(rgba * 255)))
        frame.save(work / f'sample-{index:03}.png')
        sheet.paste(frame, ((index % COLUMNS) * WIDTH, (index // COLUMNS) * HEIGHT))
        if index % 16 == 0:
            print(f'Baked {index + 1}/{COUNT} yaw samples', flush=True)
    sheet.save(ROOT / 'assets/images/fuchsiafish-turn-smooth.webp', quality=92, method=6,
               alpha_quality=100, exact=True)
    # Every crop uses exactly the same native-unit size and pivot. Never fit
    # the current alpha bounding box: that is the cause of turn-time zooming.
    metadata = dict(frameCount=COUNT, columns=COLUMNS, width=WIDTH, height=HEIGHT,
                    pivotX=164, pivotY=112, unitScale=5)
    (ROOT / 'assets/js/campaign/turn-atlas.js').write_text(
        '/* Locally baked yaw samples; all frames share one scale and pivot. */\n'
        "'use strict';\nwindow.FuchsiafishTurnAtlas = " + json.dumps(metadata, indent=2) + ';\n')
    print(f'Saved atlas and registration; review frames in {work}', flush=True)

if __name__ == '__main__':
    main()
