"""Shared materials for the deck scene (Cycles, Principled BSDF, Blender 4.4+)."""
import bpy


def srgb(h):
    """'#RRGGBB' -> linear RGBA tuple."""
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


def _new(name):
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (600, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (300, 0)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m, nt, bsdf


def _set(bsdf, **kw):
    names = {
        'base': 'Base Color', 'metal': 'Metallic', 'rough': 'Roughness', 'ior': 'IOR',
        'spec': 'Specular IOR Level', 'coat': 'Coat Weight', 'coat_rough': 'Coat Roughness',
        'emit': 'Emission Color', 'emit_strength': 'Emission Strength',
    }
    for k, v in kw.items():
        sock = bsdf.inputs.get(names[k])
        if sock is not None:
            sock.default_value = v


def _micro_bump(nt, bsdf, scale, strength, distance=0.0002, rough_var=None):
    """Very fine surface texture: noise -> bump (object space, metres)."""
    tc = nt.nodes.new('ShaderNodeTexCoord')
    tc.location = (-900, -200)
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.location = (-650, -200)
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 6.0
    nz.inputs['Roughness'].default_value = 0.6
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.location = (-300, -250)
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = distance
    nt.links.new(nz.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if rough_var:
        lo, hi = rough_var
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.location = (-300, 50)
        mr.inputs['To Min'].default_value = lo
        mr.inputs['To Max'].default_value = hi
        nz2 = nt.nodes.new('ShaderNodeTexNoise')
        nz2.location = (-650, 100)
        nz2.inputs['Scale'].default_value = scale / 9.0
        nz2.inputs['Detail'].default_value = 3.0
        nt.links.new(tc.outputs['Object'], nz2.inputs['Vector'])
        nt.links.new(nz2.outputs['Fac'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], bsdf.inputs['Roughness'])


def desk():
    m, nt, b = _new('desk')
    _set(b, base=srgb('#1b1a19'), rough=0.74, spec=0.12)
    _micro_bump(nt, b, scale=1800.0, strength=0.06, distance=0.0003, rough_var=(0.7, 0.8))
    return m


def aluminium_satin():
    """Phone frame: satin (lightly brushed look without anisotropy)."""
    m, nt, b = _new('alu_satin')
    _set(b, base=srgb('#b9bbbe'), metal=1.0, rough=0.3)
    _micro_bump(nt, b, scale=9000.0, strength=0.03, distance=0.00005)
    return m


def aluminium_blasted(name='alu_blasted'):
    """Laptop: bead-blasted aluminium, roughness ~0.35, no anisotropy."""
    m, nt, b = _new(name)
    _set(b, base=srgb('#c4c6c8'), metal=1.0, rough=0.36)
    _micro_bump(nt, b, scale=12000.0, strength=0.04, distance=0.00004)
    return m


def aluminium_dark():
    """Macropad case: dark anodised aluminium."""
    m, nt, b = _new('alu_dark')
    _set(b, base=srgb('#3a3b3e'), metal=1.0, rough=0.42)
    _micro_bump(nt, b, scale=12000.0, strength=0.04, distance=0.00004)
    return m


def black_glass():
    m, nt, b = _new('black_glass')
    _set(b, base=srgb('#050506'), rough=0.035, ior=1.52, spec=0.5)
    return m


def black_plastic(name='black_plastic', rough=0.5, col='#0f1011'):
    m, nt, b = _new(name)
    _set(b, base=srgb(col), rough=rough, spec=0.4)
    _micro_bump(nt, b, scale=6000.0, strength=0.05, distance=0.00005)
    return m


def screen(name, image_path, strength=1.0):
    """Display: emissive image under a glossy glass top. Emission strength is exposed
    through a Value node called 'screen_on' (0 = off, 1 = on) so renders can switch it."""
    m, nt, b = _new(name)
    _set(b, base=srgb('#020203'), rough=0.04, ior=1.52, spec=0.5)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    tc.location = (-800, 200)
    img = nt.nodes.new('ShaderNodeTexImage')
    img.location = (-550, 200)
    img.image = bpy.data.images.load(image_path, check_existing=True)
    img.interpolation = 'Cubic'
    img.extension = 'EXTEND'
    nt.links.new(tc.outputs['UV'], img.inputs['Vector'])
    on = nt.nodes.new('ShaderNodeValue')
    on.name = 'screen_on'
    on.label = 'screen_on'
    on.location = (-550, -100)
    on.outputs[0].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.location = (-300, -100)
    mul.inputs[1].default_value = strength
    nt.links.new(on.outputs[0], mul.inputs[0])
    nt.links.new(img.outputs['Color'], b.inputs['Emission Color'])
    nt.links.new(mul.outputs[0], b.inputs['Emission Strength'])
    return m


def keycap(name, col, legend_path=None, legend_col='#26272a', legend_w=0.020, legend_h=0.010, legend_dy=0.0):
    """PBT keycap: matte, fine grain. Optional dye-sub legend projected from the top (object XY)."""
    m, nt, b = _new(name)
    _set(b, base=srgb(col), rough=0.58, spec=0.4)
    _micro_bump(nt, b, scale=7000.0, strength=0.12, distance=0.00003)
    if legend_path:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        tc.location = (-1100, 350)
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.location = (-900, 350)
        mp.vector_type = 'POINT'
        mp.inputs['Scale'].default_value = (1.0 / legend_w, 1.0 / legend_h, 1.0)
        mp.inputs['Location'].default_value = (0.5, 0.5 - legend_dy / legend_h, 0.0)
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        img = nt.nodes.new('ShaderNodeTexImage')
        img.location = (-650, 350)
        img.image = bpy.data.images.load(legend_path, check_existing=True)
        img.extension = 'CLIP'
        img.interpolation = 'Cubic'
        nt.links.new(mp.outputs['Vector'], img.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.location = (-300, 350)
        mix.inputs['A'].default_value = srgb(col)
        mix.inputs['B'].default_value = srgb(legend_col)
        nt.links.new(img.outputs['Alpha'], mix.inputs['Factor'])
        nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m


def add_projected_legend(m, image_path, bounds, col='#bdbdbd'):
    """Print a legend texture onto material m, projected from above in object XY.
    bounds = (x0, y0, x1, y1) in object-local metres covered by the image."""
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    x0, y0, x1, y1 = bounds
    tc = nt.nodes.new('ShaderNodeTexCoord')
    tc.location = (-1100, 450)
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.location = (-900, 450)
    mp.vector_type = 'POINT'
    mp.inputs['Scale'].default_value = (1.0 / (x1 - x0), 1.0 / (y1 - y0), 1.0)
    mp.inputs['Location'].default_value = (-x0 / (x1 - x0), -y0 / (y1 - y0), 0.0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    img = nt.nodes.new('ShaderNodeTexImage')
    img.location = (-650, 450)
    img.image = bpy.data.images.load(image_path, check_existing=True)
    img.extension = 'CLIP'
    img.interpolation = 'Cubic'
    nt.links.new(mp.outputs['Vector'], img.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.location = (-300, 450)
    mix.inputs['A'].default_value = tuple(b.inputs['Base Color'].default_value)
    mix.inputs['B'].default_value = srgb(col)
    nt.links.new(img.outputs['Alpha'], mix.inputs['Factor'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m
