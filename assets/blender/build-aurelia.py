# Aurelia / original fictional architecture. Run once in Blender via MCP.
import bpy, math, random, json, os
from mathutils import Vector
ROOT = 'D:/aurelia-estates'
if bpy.data.scenes.get('Aurelia_Residence'):
    raise RuntimeError('Aurelia scene already exists; refine it instead of rebuilding.')
scene = bpy.data.scenes.new('Aurelia_Residence')
bpy.context.window.scene = scene
collection = bpy.data.collections.new('Aurelia_Building')
scene.collection.children.link(collection)
root = bpy.data.objects.new('Aurelia_Building', None)
collection.objects.link(root)
materials = {}
def material(name, color, rough=.5, metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    materials[name]=m
    return m
material('Travertine',(.64,.56,.43),.72)
material('Limestone',(.82,.77,.65),.64)
material('Bronze',(.23,.16,.09),.32,.65)
material('Glazing',(.105,.20,.22),.20,.62)
material('Shadow_Metal',(.045,.056,.052),.44,.5)
material('Timber',(.30,.16,.075),.6)
material('Foliage',(.095,.15,.063),.88)
material('Meadow',(.19,.23,.12),.95)
material('Water',(.12,.29,.27),.15,.35)
material('Paving',(.40,.39,.33),.9)
material('Floor_Gold',(.65,.44,.19),.4,.5)
groups={}
def box(group,mat,center,size):
    v,f=groups.setdefault((group,mat),([],[])); n=len(v)
    x,y,z=center; a,b,c=[s/2 for s in size]
    v.extend([(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),(x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)])
    f.extend([tuple(n+i for i in face) for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
def rounded(group,mat,x,y,z,w,d,h,r=.8):
    v,f=groups.setdefault((group,mat),([],[])); n=len(v); points=[]
    for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for j in range(5):
            t=math.radians(start+j*22.5)
            points.append((x+cx+r*math.cos(t),y+cy+r*math.sin(t)))
    count=len(points)
    v.extend([(px,py,z-h/2) for px,py in points]+[(px,py,z+h/2) for px,py in points])
    f.append(tuple(n+i for i in reversed(range(count))));f.append(tuple(n+count+i for i in range(count)))
    for i in range(count):
        j=(i+1)%count;f.append((n+i,n+j,n+count+j,n+count+i))
# Landscaped island and arrival podium.
rounded('Ground','Paving',0,0,-.65,90,72,1.2,6)
rounded('Podium','Travertine',0,1,1.2,53,37,2.4,3)
rounded('Podium','Limestone',0,1,2.55,54,38,.4,3)
box('Building_Core','Travertine',(0,2,47),(19,13,88))
# A lower companion volume creates a stepped silhouette.
box('Building_Core','Travertine',(13,6,36),(10,12,66))
for floor in range(26):
    z=3+floor*3.4
    terrace= floor in (9,17,21,25)
    width=24 if floor<22 else 21
    depth=19 if terrace else 17
    rounded('Balconies','Limestone',0,0,z,width,depth,.34,.95)
    if floor<25:
        box('Facade_Main','Glazing',(0,-6.65,z+1.65),(19,.15,2.92))
        box('Facade_Secondary','Glazing',(-9.58,0,z+1.65),(.15,13,2.92))
        box('Facade_Secondary','Glazing',(9.58,0,z+1.65),(.15,13,2.92))
        # Translucent-look opaque glass avoids sorting and transmission passes.
        box('Glass','Glazing',(0,-depth/2+.24,z+.9),(width-1,.08,1.05))
        box('Glass','Glazing',(-width/2+.24,0,z+.9),(.08,depth-1,1.05))
        box('Glass','Glazing',(width/2-.24,0,z+.9),(.08,depth-1,1.05))
        box('Balconies','Bronze',(0,-depth/2+.24,z+1.46),(width-.8,.10,.065))
        for x in [-8,-4,0,4,8]:
            box('Facade_Main','Shadow_Metal',(x,-6.78,z+1.6),(.09,.12,2.92))
        for y in [-4,0,4]:
            box('Facade_Secondary','Shadow_Metal',(-9.68,y,z+1.6),(.12,.08,2.92))
    if floor<20:
        rounded('Balconies','Limestone',13,6,z,12.2,14.2,.32,.6)
        box('Facade_Secondary','Glazing',(18.1,6,z+1.6),(.12,11.5,2.9))
        box('Facade_Secondary','Glazing',(13,-.08,z+1.6),(9.8,.12,2.9))
    if terrace:
        for x in [-8,8]:
            box('Landscape','Travertine',(x,-7.6,z+.5),(3.2,1.3,.6))
            box('Landscape','Foliage',(x,-7.6,z+.87),(3,1.15,.25))
# Vertical fins run over multiple storeys, with warm recessed shadow lines.
for x in [-9.8,-6.3,6.3,9.8]:
    box('Architectural_Fins','Travertine',(x,-7.05,46.3),(.32,.85,86.5))
    box('Architectural_Fins','Bronze',(x-.2,-7.48,46.3),(.10,.14,86.5))
for y in [-5.4,-2.7,0,2.7,5.4]:
    box('Architectural_Fins','Bronze',(-9.9,y,46.3),(.55,.13,86.5))
# Crown and sky terrace: flat floating cornice, pergola and planted retreat.
rounded('Sky_Terrace','Travertine',0,0,89.8,21,17,1.2,.9)
box('Sky_Terrace','Glazing',(0,1,91.3),(13,9,2.4))
rounded('Sky_Terrace','Limestone',0,1,93,18,13,.42,1)
for x in range(-8,9,2): box('Sky_Terrace','Timber',(x,0,93.6),(.16,14,.28))
for x in [-8,8]: box('Sky_Terrace','Bronze',(x,0,91.7),(.18,.18,3.6))
# Arrival porte-cochere, club pavilion, colonnade and reflecting water.
box('Private_Club','Glazing',(-16,-5,5.5),(12,14,5.5))
rounded('Private_Club','Limestone',-16,-5,8.5,14,16,.5,.9)
for x in [-22,-18,-14,-10]: box('Private_Club','Bronze',(x,-12,5.5),(.18,.3,5.5))
box('Podium','Timber',(0,-13,6.5),(13,9,.35))
for x in [-6,6]: box('Podium','Travertine',(x,-16,4.6),(.45,.45,4))
for i in range(6): box('Podium','Limestone',(0,-19-i*.7,2.45-i*.4),(15,.8,.4))
rounded('Landscape','Water',17,-12,2.82,10,21,.12,.6)
for x,y,w,d in [(-32,6,16,39),(31,15,13,23),(0,27,55,8),(-17,-23,15,7),(27,-24,18,8)]:
    rounded('Landscape','Meadow',x,y,.12,w,d,.4,2)
# Low-poly canopy clusters; topology is consolidated per material.
random.seed(28)
def crown(x,y,z,r):
    v,f=groups.setdefault(('Landscape','Foliage'),([],[])); n=len(v)
    seg=10;rings=5
    for j in range(rings+1):
        phi=math.pi*j/rings
        for i in range(seg):
            a=i*2*math.pi/seg
            v.append((x+math.sin(phi)*math.cos(a)*r,y+math.sin(phi)*math.sin(a)*r,z+math.cos(phi)*r*.82))
    for j in range(rings):
        for i in range(seg): f.append((n+j*seg+i,n+j*seg+(i+1)%seg,n+(j+1)*seg+(i+1)%seg,n+(j+1)*seg+i))
for x,y in [(-34,-10),(-33,0),(-32,12),(-30,23),(-19,28),(-7,29),(7,29),(22,27),(32,19),(34,5),(30,-23),(-21,-23)]:
    h=random.uniform(5.5,8)
    box('Landscape','Timber',(x,y,h/2),(.35,.35,h))
    for dx,dy,dz,r in [(0,0,0,2.5),(-1.2,.6,-.6,1.7),(1.1,-.5,-.3,1.9)]: crown(x+dx,y+dy,h+dz,r)
for x,y,z in [(-22,4,3),(-24,-8,3),(20,13,3),(-7,3,90),(7,3,90)]:
    box('Landscape','Travertine',(x,y,z+.3),(2.2,2.2,.6));box('Landscape','Timber',(x,y,z+1.7),(.18,.18,3));crown(x,y,z+3.1,1.6)
for level in [18,22]:
    z=3+(level-1)*3.4
    box('Floor_%d_Highlight'%level,'Floor_Gold',(0,-8.62,z+.18),(23.5,.12,.16))
    box('Floor_%d_Highlight'%level,'Floor_Gold',(-11.86,0,z+.18),(.12,17,.16))
# Material-batched named meshes: predictable objects without hundreds of draws.
for (name,mat),(vertices,faces) in groups.items():
    mesh=bpy.data.meshes.new(name+'_'+mat);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name+'_'+mat,mesh);collection.objects.link(obj);obj.parent=root
    mesh.materials.append(materials[mat])
    if name.startswith('Floor_'): obj.name=name
for name,xyz in {'Hotspot_PrivateClub':(-22,-12,8),'Hotspot_SkyTerrace':(0,0,93),'Hotspot_Residences':(-11,-8,67),'Hotspot_Landscape':(24,-16,3)}.items():
    obj=bpy.data.objects.new(name,None);collection.objects.link(obj);obj.parent=root;obj.location=xyz;obj.empty_display_size=1
# Golden-hour source scene, with editable lighting and a wide matching camera.
world=bpy.data.worlds.new('Aurelia_Dusk');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.58,.61,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
sun_data=bpy.data.lights.new('Golden_Hour','SUN');sun_data.energy=2.4;sun_data.angle=.15
sun=bpy.data.objects.new('Golden_Hour',sun_data);scene.collection.objects.link(sun);sun.rotation_euler=(math.radians(35),math.radians(-30),math.radians(-35))
light_data=bpy.data.lights.new('Sky_Fill','AREA');light_data.energy=18000;light_data.shape='DISK';light_data.size=65
light=bpy.data.objects.new('Sky_Fill',light_data);scene.collection.objects.link(light);light.location=(-40,-20,110);light.rotation_euler=(Vector((0,0,35))-light.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Camera_Arrival');cam=bpy.data.objects.new('Camera_Arrival',cam_data);scene.collection.objects.link(cam)
cam.location=(122,-158,111);target=Vector((-23,0,45));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.lens=47;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=ROOT+'/assets/blender/aurelia-arrival.png'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/blender/aurelia-residence.blend')
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/aurelia-residence.glb',export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in collection.objects if o.type=='MESH')
metrics={'triangles':triangles,'materials':len(materials),'meshObjects':sum(o.type=='MESH' for o in collection.objects),'glbBytes':os.path.getsize(ROOT+'/public/models/aurelia-residence.glb'),'textures':0,'heightMeters':93.74}
with open(ROOT+'/assets/blender/metrics.json','w') as f: json.dump(metrics,f,indent=2)
print(json.dumps(metrics))
