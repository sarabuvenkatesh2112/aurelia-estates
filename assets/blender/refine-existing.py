# Targeted refinement of the saved Aurelia scene. Does not rebuild architecture.
import bpy, random, math, bmesh
from mathutils import Vector
scene=bpy.data.scenes['Aurelia_Residence'];bpy.context.window.scene=scene
obj=bpy.data.objects['Landscape_Foliage']
if not obj.get('leaf_refinement_complete'):
    mesh=obj.data
    adjacency={v.index:set() for v in mesh.vertices}
    for edge in mesh.edges:
        a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
    unseen=set(adjacency);crowns=[]
    while unseen:
        start=unseen.pop();group={start};stack=[start]
        while stack:
            for n in adjacency[stack.pop()]:
                if n in unseen:unseen.remove(n);group.add(n);stack.append(n)
        if len(group)==60:
            points=[mesh.vertices[n].co.copy() for n in group]
            center=sum(points,Vector())/len(points)
            radius=max((p-center).length for p in points)
            crowns.append((center,radius))
    verts=[tuple(v.co) for v in mesh.vertices];faces=[tuple(p.vertices) for p in mesh.polygons]
    random.seed(153)
    for center,radius in crowns:
        for j in range(13):
            direction=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-.45,1))).normalized()
            c=center+direction*radius*.82
            bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=1,radius=radius*random.uniform(.26,.40))
            bm.verts.ensure_lookup_table();offset=len(verts)
            for v in bm.verts:verts.append(tuple(c+Vector((v.co.x,v.co.y,v.co.z*.75))))
            faces.extend(tuple(offset+v.index for v in f.verts) for f in bm.faces);bm.free()
    mesh.clear_geometry();mesh.from_pydata(verts,[],faces);mesh.update()
    for p in mesh.polygons:p.use_smooth=True
    colors=mesh.color_attributes.new(name='Leaf_Tone',type='FLOAT_COLOR',domain='CORNER')
    for p in mesh.polygons:
        tone=random.uniform(.82,1.13)
        for i in p.loop_indices:colors.data[i].color=(.095*tone,.15*tone,.063*tone,1)
    mat=mesh.materials[0];attr=mat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Leaf_Tone'
    mat.node_tree.links.new(attr.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    obj['leaf_refinement_complete']=True
    print('Added botanical canopy detail to',len(crowns),'existing clusters.')
bpy.ops.wm.save_as_mainfile(filepath='D:/aurelia-estates/assets/blender/aurelia-residence.blend')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.collections['Aurelia_Building'].objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath='D:/aurelia-estates/public/models/aurelia-residence.glb',export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
scene.cycles.samples=16
bpy.app.timers.register(lambda:(bpy.ops.render.render(write_still=True),None)[1],first_interval=1)
