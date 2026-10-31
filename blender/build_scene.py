"""Builds the whole deck scene procedurally (no downloaded models).

    blender -b --factory-startup -P blender/build_scene.py

One dark desk, objects laid out top-to-bottom along the camera path (−Y is "down" the deck):
    phone1   (slides 1–2)   y =  0.00
    keypad   (slide 4)      y = −0.55
    laptop   (slide 7)      y = −1.25
    phone2   (slide 7)      y = −1.75
Saves blender/scene.blend (textures packed).
"""
import math
import os
import re
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEX = os.path.join(HERE, 'textures')
sys.path.insert(0, HERE)
import materials as M  # noqa: E402

U = 0.01905  # keyboard unit (m)
KEY_W = 115.0   # key light power (W); everything else scales from it
RIM_W = 4.0


# ── helpers ──────────────────────────────────────────────────────────────────
def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def rr_points(w, h, r, seg):
    """Rounded rectangle outline, counter-clockwise, centred on the origin."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
                       (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90.0 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def mesh_obj(name, bm, mat=None, smooth=True, sharp_angle=35):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if mat:
        me.materials.append(mat)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
        try:
            me.set_sharp_from_angle(angle=math.radians(sharp_angle))
        except Exception:
            pass
    return ob


def rounded_prism(name, w, h, t, r, seg=8, z0=0.0, top=None, mat=None, xy=(0.0, 0.0)):
    """Rounded-rectangle prism. top=(w, h, r) makes a tapered loft (keycaps)."""
    bm = bmesh.new()
    pb = rr_points(w, h, r, seg)
    pt = rr_points(*top, seg) if top else pb
    ox, oy = xy
    bot = [bm.verts.new((x + ox, y + oy, z0)) for x, y in pb]
    tv = [bm.verts.new((x + ox, y + oy, z0 + t)) for x, y in pt]
    n = len(pb)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], tv[j], tv[i]))
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(tv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, mat)


def rr_plane(name, w, h, r, seg, z, mat, flip=False, uv=None, xy=(0.0, 0.0)):
    """Flat rounded rectangle with a UV map (planar, 0..1 over w×h)."""
    bm = bmesh.new()
    layer = bm.loops.layers.uv.new('UVMap')
    ox, oy = xy
    pts = rr_points(w, h, r, seg)
    vs = [bm.verts.new((x + ox, y + oy, z)) for x, y in pts]
    f = bm.faces.new(list(reversed(vs)) if flip else vs)
    for lp in f.loops:
        x, y = lp.vert.co.x - ox, lp.vert.co.y - oy
        lp[layer].uv = uv(x, y) if uv else (x / w + 0.5, y / h + 0.5)
    return mesh_obj(name, bm, mat, smooth=False)


def bevel(ob, width, seg=3, angle=30):
    m = ob.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = seg
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(angle)
    m.harden_normals = True
    try:
        m.miter_outer = 'MITER_ARC'
    except Exception:
        pass
    return m


def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    e = link(bpy.data.objects.new(name, None))
    e.empty_display_size = 0.02
    e.location = loc
    e.rotation_euler = rot
    if parent:
        e.parent = parent
    return e


def parent_all(parts, p):
    for o in parts:
        o.parent = p


def cylinder(name, radius, depth, segs=128):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=radius, radius2=radius, depth=depth)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    for p in me.polygons:
        p.use_smooth = True
    return ob


def content_value(key, default):
    try:
        src = open(os.path.join(ROOT, 'content.js'), encoding='utf-8').read()
        m = re.search(key + r'\s*:\s*"([^"]*)"', src)
        return m.group(1) if m else default
    except OSError:
        return default


# ── objects ──────────────────────────────────────────────────────────────────
PHONE = dict(w=0.0715, h=0.1475, t=0.0079, r=0.0095)
DISPLAY = dict(w=0.0677, h=0.1437, r=0.0075)


def build_phone(name, screen_img, loc, rotz_deg, mats):
    W, H, T, R = PHONE['w'], PHONE['h'], PHONE['t'], PHONE['r']
    parts = []
    frame = rounded_prism(name + '_frame', W, H, T - 0.0005, R, seg=12, mat=mats['alu'])
    bevel(frame, 0.0006, 3)
    parts.append(frame)
    glass = rounded_prism(name + '_glass', W - 0.0006, H - 0.0006, 0.0006, R - 0.0003, seg=12, z0=T - 0.0006, mat=mats['glass'])
    bevel(glass, 0.00035, 3)
    parts.append(glass)
    scr_mat = M.screen('screen_' + name, os.path.join(TEX, screen_img), strength=1.3)
    scr = rr_plane(name + '_screen', DISPLAY['w'], DISPLAY['h'], DISPLAY['r'], 10, T + 0.00003, scr_mat)
    parts.append(scr)
    scr['display_w'], scr['display_h'], scr['display_r'] = DISPLAY['w'], DISPLAY['h'], DISPLAY['r']
    # buttons on the right edge
    for i, (yy, ln) in enumerate(((0.030, 0.022), (0.002, 0.012))):
        b = rounded_prism(name + '_btn%d' % i, 0.0012, ln, 0.0022, 0.0005, seg=3, z0=T * 0.5 - 0.0011, mat=mats['alu'], xy=(W / 2 + 0.0003, yy))
        parts.append(b)
    # camera bump on the back (rests on the desk side; modelled for completeness)
    bump = rounded_prism(name + '_bump', 0.031, 0.033, 0.0012, 0.008, seg=8, z0=-0.0009, mat=mats['glass'], xy=(-W / 2 + 0.0205, H / 2 - 0.0215))
    parts.append(bump)
    root = empty(name, loc=loc, rot=(0, 0, math.radians(rotz_deg)))
    # back glass rests flat on the desk (the bump sinks into the desk, out of sight)
    parent_all(parts, root)
    return root, parts


def keycap_obj(name, w_units, height, mat, xy, z0, cutter_parent):
    bw = U * w_units - 0.0009
    bd = U - 0.0009
    tw, td = bw - 0.0056, bd - 0.0056
    cap = rounded_prism(name, bw, bd, height, 0.0011, seg=6, top=(tw, td, 0.0021), mat=mat)
    # cylindrical dish, 0.6 mm deep
    rc = 0.034
    cut = cylinder(name + '_dish', rc, tw + 0.01, segs=192)
    cut.rotation_euler = (0, math.radians(90), 0)
    cut.location = (0, 0, height + rc - 0.0006)
    cut.hide_render = True
    cut.display_type = 'WIRE'
    cut.parent = cap
    bo = cap.modifiers.new('dish', 'BOOLEAN')
    bo.operation = 'DIFFERENCE'
    bo.object = cut
    try:
        bo.solver = 'EXACT'
    except Exception:
        pass
    bevel(cap, 0.00045, 3, angle=25)
    wn = cap.modifiers.new('wnormal', 'WEIGHTED_NORMAL')
    wn.keep_sharp = True
    cap.location = (xy[0], xy[1], z0)
    return cap, cut


def build_keypad(loc, rotz_deg, mats):
    legend = content_value('keycapLegend', 'HOLD')
    parts = []
    cw, cd, ch = 3 * U + 0.0128, 2 * U + 0.0128, 0.0118
    case = rounded_prism('pad_case', cw, cd, ch, 0.0032, seg=8, mat=mats['alu_dark'])
    bevel(case, 0.0007, 3)
    parts.append(case)
    plate = rr_plane('pad_plate', 3 * U + 0.0016, 2 * U + 0.0016, 0.0012, 4, ch + 0.00003, mats['plate'])
    parts.append(plate)
    hero_mat = M.keycap('keycap_hero', '#e3ddd2', legend_path=os.path.join(TEX, 'keycap_legend.png'),
                        legend_col='#232325', legend_w=0.0215, legend_h=0.01075, legend_dy=0.0004)
    blank_mat = M.keycap('keycap_blank', '#38393c')
    z_cap = ch + 0.0016
    layout = [  # (name, units, x, y, hero)
        ('pad_key_a', 1.0, -U, U / 2, False), ('pad_key_b', 1.0, 0.0, U / 2, False), ('pad_key_c', 1.0, U, U / 2, False),
        ('pad_key_d', 1.5, -0.75 * U, -U / 2, False), ('pad_key_hold', 1.5, 0.75 * U, -U / 2, True),
    ]
    for nm, u, x, y, hero in layout:
        cap, cut = keycap_obj(nm, u, 0.0082, hero_mat if hero else blank_mat, (x, y), z_cap, None)
        parts.append(cap)
    root = empty('keypad', loc=loc, rot=(0, 0, math.radians(rotz_deg)))
    parent_all(parts, root)
    return root, parts


def build_laptop(loc, rotz_deg, mats):
    LW, LD, LT = 0.304, 0.212, 0.0098
    parts = []
    # printed legends, projected from above (layout matches tools/make_textures.py LAP_BOUNDS)
    pitch_, y0_ = 0.01905, 0.031
    M.add_projected_legend(mats['key'], os.path.join(TEX, 'laptop_legends.png'),
                           (-7 * pitch_, y0_ - 3.0 * pitch_ - 0.0005, 7 * pitch_, y0_ + 3.0 * pitch_), col='#a9aaac')
    base = rounded_prism('lap_base', LW, LD, LT, 0.0095, seg=10, mat=mats['alu_lap'])
    bevel(base, 0.0012, 3)
    parts.append(base)
    well = rr_plane('lap_kbwell', 0.2795, 0.1185, 0.0035, 4, LT + 0.00004, mats['kbwell'], xy=(0, 0.031))
    parts.append(well)
    # keys: 5 rows × 14 via array modifiers, plus a bottom row
    pitch = 0.01905
    k = rounded_prism('lap_keys', 0.0162, 0.0158, 0.0007, 0.0016, seg=3, z0=LT + 0.00006, mat=mats['key'],
                      xy=(-6.5 * pitch, 0.031 + 2.5 * pitch))
    bevel(k, 0.00025, 2)
    a1 = k.modifiers.new('ax', 'ARRAY')
    a1.count = 14
    a1.use_relative_offset = False
    a1.use_constant_offset = True
    a1.constant_offset_displace = (pitch, 0, 0)
    a2 = k.modifiers.new('ay', 'ARRAY')
    a2.count = 5
    a2.use_relative_offset = False
    a2.use_constant_offset = True
    a2.constant_offset_displace = (0, -pitch, 0)
    # move bevel after arrays
    bpy.context.view_layer.objects.active = k
    parts.append(k)
    yb = 0.031 - 2.5 * pitch - 0.0005
    row = [(-6.5, 1), (-5.5, 1), (-4.5, 1), (-3.5, 1)]
    for i, (xu, wu) in enumerate(row + [(2.5, 1), (3.5, 1), (4.5, 1), (5.5, 1), (6.5, 1)]):
        kk = rounded_prism('lap_key_b%d' % i, 0.0162, 0.0158, 0.0007, 0.0016, seg=3, z0=LT + 0.00006, mat=mats['key'], xy=(xu * pitch, yb))
        bevel(kk, 0.00025, 2)
        parts.append(kk)
    space = rounded_prism('lap_space', 5 * pitch - 0.0028, 0.0158, 0.0007, 0.0016, seg=3, z0=LT + 0.00006, mat=mats['key'], xy=(-0.5 * pitch, yb))
    bevel(space, 0.00025, 2)
    parts.append(space)
    pad = rr_plane('lap_pad', 0.125, 0.056, 0.0045, 5, LT + 0.00003, mats['pad'], xy=(0, -0.0655))
    parts.append(pad)
    # lid, built closed with the hinge on the origin, then opened 110°
    hinge = empty('lap_hinge', loc=(0, LD / 2 - 0.0015, LT), rot=(math.radians(-110), 0, 0))
    lid = rounded_prism('lap_lid', LW, LD - 0.002, 0.0046, 0.0095, seg=10, z0=0.0002, mat=mats['alu_lap'], xy=(0, -(LD - 0.002) / 2))
    bevel(lid, 0.0011, 3)
    bez = rr_plane('lap_bezel', LW - 0.0024, LD - 0.0044, 0.0085, 8, 0.00015, mats['glass'], flip=True, xy=(0, -(LD - 0.002) / 2))
    SW, SH = 0.2920, 0.1830
    cy = -(LD - 0.002) + 0.0072 + SH / 2
    scr_mat = M.screen('screen_laptop', os.path.join(TEX, 'laptop_screen.png'), strength=1.0)
    scr = rr_plane('lap_screen', SW, SH, 0.0015, 3, 0.0001, scr_mat, flip=True, xy=(0, cy),
                   uv=lambda x, y: (x / SW + 0.5, 0.5 - y / SH))
    cam_dot = rr_plane('lap_webcam', 0.0024, 0.0024, 0.0012, 6, 0.00009, mats['webcam'], flip=True,
                       xy=(0, -(LD - 0.002) + 0.0036))
    parent_all([lid, bez, scr, cam_dot], hinge)
    root = empty('laptop', loc=loc, rot=(0, 0, math.radians(rotz_deg)))
    hinge.parent = root
    parent_all(parts, root)
    return root, parts + [lid, bez, scr, cam_dot]


# ── scene ────────────────────────────────────────────────────────────────────
def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def area_light(name, loc, target, size, size_y, energy, shape='RECTANGLE', spread=180):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = shape
    ld.size = size
    ld.size_y = size_y
    ld.energy = energy
    try:
        ld.spread = math.radians(spread)
    except Exception:
        pass
    ob = link(bpy.data.objects.new(name, ld))
    ob.location = loc
    look_at(ob, target)
    ob.visible_camera = False
    return ob


def rim_for(name, parts, at, energy, size=(0.5, 0.02)):
    """Thin strip light behind an object, linked to that object only."""
    coll = bpy.data.collections.new('rim_' + name)
    for p in parts:
        coll.objects.link(p)
    ob = area_light('rim_' + name, (at[0] + 0.02, at[1] + 0.28, 0.16), (at[0], at[1], 0.01), size[0], size[1], energy)
    try:
        ob.light_linking.receiver_collection = coll
    except Exception as e:
        print('light linking unavailable:', e)
    return ob


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.name = 'deck'

    mats = {
        'alu': M.aluminium_satin(),
        'alu_lap': M.aluminium_blasted(),
        'alu_dark': M.aluminium_dark(),
        'glass': M.black_glass(),
        'plate': M.black_plastic('pad_plate', 0.6, '#101113'),
        'switch': M.black_plastic('switch', 0.45, '#16171a'),
        'kbwell': M.black_plastic('kbwell', 0.55, '#0c0c0d'),
        'key': M.black_plastic('lap_key', 0.42, '#121314'),
        'pad': M.aluminium_blasted('trackpad'),
        'webcam': M.black_plastic('webcam', 0.08, '#17181b'),
    }
    for n in mats['pad'].node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            n.inputs['Roughness'].default_value = 0.24
            n.inputs['Base Color'].default_value = M.srgb('#b4b6b9')

    # desk
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
    desk = mesh_obj('desk', bm, M.desk(), smooth=False)
    desk.scale = (5.0, 6.0, 1.0)
    desk.location = (0, -1.0, 0)

    p1, p1_parts = build_phone('phone1', 'phone_voice.png', (0.0, 0.0, 0), -5.0, mats)
    kp, kp_parts = build_keypad((0.0, -0.55, 0), 9.0, mats)
    lp, lp_parts = build_laptop((0.0, -1.25, 0), -4.0, mats)
    p2, p2_parts = build_phone('phone2', 'phone_keyboard.png', (0.045, -1.64, 0), 7.0, mats)

    # world: flat near-black, matches the deck background
    w = bpy.data.worlds.new('world')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = M.srgb('#0E0F12')
    bg.inputs['Strength'].default_value = 1.0

    # studio lights: long soft key from the left, weak fill right, rims per object
    key = area_light('key', (-1.6, -0.9, 2.4), (0.1, -0.9, 0.0), 2.0, 5.5, KEY_W)
    # flag the big key light off the screens (its reflection would wash out the UI)
    flag = bpy.data.collections.new('key_excludes')
    for nm in ('phone1_screen', 'phone2_screen', 'lap_screen'):
        flag.objects.link(bpy.data.objects[nm])
    try:
        key.light_linking.receiver_collection = flag
        for co in flag.collection_objects:
            co.light_linking.link_state = 'EXCLUDE'
    except Exception as e:
        print('light linking unavailable:', e)
    area_light('fill', (1.8, -0.9, 1.6), (0.0, -0.9, 0.0), 1.6, 5.5, KEY_W * 0.14)
    rim_for('phone1', p1_parts, (0.0, 0.0), RIM_W)
    rim_for('keypad', kp_parts, (0.0, -0.55), RIM_W * 0.4, size=(0.3, 0.015))
    rim_for('laptop', lp_parts, (0.0, -1.25), RIM_W * 1.5, size=(0.8, 0.03))
    rim_for('phone2', p2_parts, (0.045, -1.64), RIM_W)

    cam_d = bpy.data.cameras.new('cam')
    cam_d.lens = 50
    cam_d.sensor_width = 36
    cam_d.dof.use_dof = False
    cam_d.clip_start = 0.005
    cam_d.clip_end = 50
    cam = link(bpy.data.objects.new('cam', cam_d))
    sc.camera = cam
    cam.location = (-0.1, -0.35, 0.5)
    look_at(cam, (-0.1, 0, 0))

    # render defaults (render_all.py sets device, size and samples per job)
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 128
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.012
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 8
    sc.cycles.glossy_bounces = 4
    sc.cycles.diffuse_bounces = 3
    sc.cycles.transmission_bounces = 4
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.5
    sc.render.use_motion_blur = False
    sc.render.resolution_x = 1920
    sc.render.resolution_y = 1080
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    for look in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Base Contrast', 'None'):
        try:
            sc.view_settings.look = look
            break
        except TypeError:
            continue
    sc.view_settings.exposure = 0.0
    sc.render.dither_intensity = 1.0
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.color_depth = '8'

    out = os.path.join(HERE, 'scene.blend')
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    print('saved', out, 'look =', sc.view_settings.look)


if __name__ == '__main__':
    build()
