"""Renders the deck stills and camera-move sequences.

    blender -b blender/scene.blend -P blender/render_all.py -- [options]

options
    --preview          960×540, 24 samples, stills only (fast composition check)
    --stills           render stills only
    --seqs             render sequences only
    --only a,b         only these stills / sequences (e.g. slide_04,seq_03_04)
    --frames N         frames per sequence (default 60)
    --seq-size WxH     sequence resolution (default 1600x900)

Writes PNGs to blender/_frames/ (not committed). tools/encode_frames.py turns them into WebP.
Also writes assets/renders/screen_corners.json and copies the corners into content.js.
"""
import json
import math
import os
import re
import sys
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, '_frames')
LOG = os.path.join(OUT, 'render_log.txt')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def opt(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default


PREVIEW = bool(opt('--preview'))
ONLY = set(str(opt('--only', '')).split(',')) - {''}
FRAMES = int(opt('--frames', 60))
SEQ_W, SEQ_H = [int(v) for v in str(opt('--seq-size', '1600x900')).split('x')]
DO_STILLS = not opt('--seqs')
DO_SEQS = not opt('--stills') and not PREVIEW

sc = bpy.context.scene
cam = sc.camera
os.makedirs(OUT, exist_ok=True)


def log(msg):
    print(msg, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')


# ── device: OptiX → CUDA → CPU ───────────────────────────────────────────────
def setup_device():
    used = 'CPU'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for dt in ('OPTIX', 'CUDA'):
            try:
                prefs.compute_device_type = dt
            except TypeError:
                continue
            try:
                prefs.refresh_devices()
            except Exception:
                prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == dt]
            if devs:
                for d in prefs.devices:
                    d.use = (d.type == dt)
                used = dt + ' (' + ', '.join(d.name for d in devs) + ')'
                break
    except Exception as e:
        log('device setup failed: %s' % e)
    sc.cycles.device = 'GPU' if used != 'CPU' else 'CPU'
    try:
        sc.cycles.denoising_use_gpu = sc.cycles.device == 'GPU'
    except Exception:
        pass
    log('render device: ' + used)
    return used


# ── camera shots ─────────────────────────────────────────────────────────────
def obj_loc(name, local=(0, 0, 0)):
    ob = bpy.data.objects[name]
    return ob.matrix_world @ Vector(local)


def fwd(pitch, yaw):
    p, y = math.radians(pitch), math.radians(yaw)
    return Vector((math.sin(y) * math.cos(p), math.cos(y) * math.cos(p), -math.sin(p)))


def shot(target, L, pitch, yaw=0.0, u=0.5, v=0.5, lens=50.0):
    """Camera that sees `target` at screen position (u, v) from distance L.
    Stored as aim point + orbit params so moves between shots interpolate smoothly."""
    target = Vector(target)
    fw = 36.0 / lens * L
    fh = fw * 9.0 / 16.0
    yr = math.radians(yaw)
    right = Vector((math.cos(yr), -math.sin(yr), 0.0))
    ground = Vector((math.sin(yr), math.cos(yr), 0.0))
    aim = target - right * (u - 0.5) * fw + ground * (v - 0.5) * fh / max(0.2, math.sin(math.radians(pitch)))
    return dict(aim=aim, L=L, pitch=pitch, yaw=yaw, lens=lens)


def place(s):
    f = fwd(s['pitch'], s['yaw'])
    cam.location = s['aim'] - f * s['L']
    cam.rotation_euler = f.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = s['lens']


def ease(t):
    # smootherstep: gentle start and stop, no overshoot
    return t * t * t * (t * (t * 6 - 15) + 10)


def lerp_shot(a, b, t):
    e = ease(t)
    return dict(
        aim=a['aim'].lerp(b['aim'], e),
        L=math.exp(math.log(a['L']) * (1 - e) + math.log(b['L']) * e),
        pitch=a['pitch'] * (1 - e) + b['pitch'] * e,
        yaw=a['yaw'] * (1 - e) + b['yaw'] * e,
        lens=a['lens'] * (1 - e) + b['lens'] * e,
    )


U = 0.01905
P1 = obj_loc('phone1')
P2 = obj_loc('phone2')
HOLD = obj_loc('pad_key_hold') + Vector((0, 0, 0.0082))
LAP = obj_loc('laptop', (0, 0.02, 0.06))
SHOTS = {
    'slide_01': shot(P1, 0.66, 52, yaw=0, u=0.735, v=0.50),
    'slide_02': shot(P1, 0.47, 76, yaw=0, u=0.735, v=0.50),
    'slide_03': shot(Vector((0.0, -0.30, 0.0)), 0.62, 70, yaw=0, u=0.5, v=0.5),
    'slide_04': shot(HOLD + Vector((-0.004, 0.006, 0)), 0.25, 40, yaw=-14, u=0.825, v=0.50),
    'slide_06': shot(Vector((0.0, -0.85, 0.0)), 0.62, 76, yaw=0, u=0.5, v=0.5),
    'slide_07': shot(LAP, 1.02, 27, yaw=-8, u=0.73, v=0.52),
    'slide_07b': shot(P2, 0.52, 74, yaw=0, u=0.735, v=0.50),
    'slide_08': shot(Vector((0.03, -1.40, 0.05)), 1.62, 50, yaw=-12, u=0.72, v=0.50, lens=40),
}
# phone1 screen: voice-note UI on (1) or off (0, the screenshot is laid over it in the deck)
SCREEN1 = {'slide_01': 1.0, 'slide_02': 0.0, 'slide_03': 0.0, 'slide_08': 1.0}
SEQS = [  # folder, from, to
    ('seq_01_02', 'slide_01', 'slide_02'),
    ('seq_02_03', 'slide_02', 'slide_03'),
    ('seq_03_04', 'slide_03', 'slide_04'),
    ('seq_06_07', 'slide_06', 'slide_07'),
    ('seq_07a_07b', 'slide_07', 'slide_07b'),
    ('seq_07_08', 'slide_07b', 'slide_08'),
]


def screen_on(v):
    m = bpy.data.materials.get('screen_phone1')
    if m:
        m.node_tree.nodes['screen_on'].outputs[0].default_value = v


def render_to(path):
    sc.render.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    return time.time() - t0


def set_quality(w, h, samples):
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.cycles.samples = samples
    sc.render.use_persistent_data = True


# ── screen corners for the deck overlay (slide 2) ────────────────────────────
def export_corners():
    place(SHOTS['slide_02'])
    bpy.context.view_layer.update()
    scr = bpy.data.objects['phone1_screen']
    w, h, r = scr['display_w'], scr['display_h'], scr['display_r']   # stored by build_scene.py
    z = scr.data.vertices[0].co.z
    local = [(-w / 2, h / 2, z), (w / 2, h / 2, z), (w / 2, -h / 2, z), (-w / 2, -h / 2, z)]  # TL TR BR BL
    pts = []
    for p in local:
        co = world_to_camera_view(sc, cam, scr.matrix_world @ Vector(p))
        pts.append([round(co.x * 1920, 2), round((1 - co.y) * 1080, 2)])
    data = {'corners': pts, 'aspect': round(h / w, 5), 'radius': round(r / w, 5), 'still': 'slide_02'}
    os.makedirs(os.path.join(ROOT, 'assets', 'renders'), exist_ok=True)
    with open(os.path.join(ROOT, 'assets', 'renders', 'screen_corners.json'), 'w') as f:
        json.dump(data, f, indent=2)
    # copy into content.js (only the screenCorners line changes)
    cj = os.path.join(ROOT, 'content.js')
    src = open(cj, encoding='utf-8').read()
    new = 'screenCorners: ' + json.dumps(pts) + ','
    src2, n = re.subn(r'screenCorners:\s*(null|\[[^\n]*\])\s*,', new, src, count=1)
    if n:
        with open(cj, 'w', encoding='utf-8', newline='\n') as f:
            f.write(src2)
    log('screen corners: %s (content.js %s)' % (pts, 'updated' if n else 'NOT updated'))


def main():
    device = setup_device()
    log('=== render_all %s  preview=%s frames=%d' % (time.strftime('%Y-%m-%d %H:%M:%S'), PREVIEW, FRAMES))
    t_all = time.time()
    if DO_STILLS:
        d = os.path.join(OUT, 'preview' if PREVIEW else 'stills')
        os.makedirs(d, exist_ok=True)
        if PREVIEW:
            set_quality(960, 540, 24)
        else:
            set_quality(1920, 1080, 256)
        for name, s in SHOTS.items():
            if ONLY and name not in ONLY:
                continue
            place(s)
            screen_on(SCREEN1.get(name, 1.0))
            t = render_to(os.path.join(d, name + '.png'))
            log('still %-10s %6.1fs' % (name, t))
        if not PREVIEW and (not ONLY or 'slide_02' in ONLY):
            export_corners()
    if DO_SEQS:
        set_quality(SEQ_W, SEQ_H, 128)
        for folder, a, b in SEQS:
            if ONLY and folder not in ONLY:
                continue
            d = os.path.join(OUT, folder)
            os.makedirs(d, exist_ok=True)
            t0 = time.time()
            for i in range(FRAMES):
                t = i / (FRAMES - 1)
                place(lerp_shot(SHOTS[a], SHOTS[b], t))
                s1, s2 = SCREEN1.get(a, 1.0), SCREEN1.get(b, 1.0)
                # the phone screen switches off early in the move, so the deck overlay can take over
                k = min(1.0, t / 0.55)
                screen_on(s1 * (1 - ease(k)) + s2 * ease(k))
                render_to(os.path.join(d, '%04d.png' % (i + 1)))
            log('seq   %-12s %d frames %6.1fs (%.1fs/frame)' % (folder, FRAMES, time.time() - t0, (time.time() - t0) / FRAMES))
    log('total %.1fs on %s' % (time.time() - t_all, device))


main()
