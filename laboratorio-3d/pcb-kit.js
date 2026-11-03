import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Original parametric PCB illustration. Input coordinates are millimetres;
// the assembled scene uses 10 mm per unit. pcb.json records the same layout.
export function makeCarrier(THREE, kit, spec) {
  const T = THREE, { mesh, label, standoff } = kit, group = new T.Group();
  const u = n => n / 10;
  const surfaces = new Map();
  const material = (color, metalness = 0, roughness = .5) => {
    const key = `${color}:${metalness}:${roughness}`;
    if (!surfaces.has(key)) surfaces.set(key, new T.MeshPhysicalMaterial({
      color, metalness, roughness, clearcoat: metalness < .3 ? .16 : .04,
      clearcoatRoughness: .36, side: T.DoubleSide
    }));
    return surfaces.get(key);
  };
  const gold = material('#c4a151', .83, .28), tin = material('#c1c6ca', .86, .31);
  const polymer = material('#20262a', .02, .56), silk = spec.colors.silkscreen;
  const top = u(spec.outline.thickness / 2);
  const rounded = (w,h,d,r=.2) => new RoundedBoxGeometry(u(w),u(h),u(d),2,u(Math.min(r,w/3,h/3,d/3)));
  const body = (w,h,d,color,x,y,z,r=.2) => mesh(group,rounded(w,h,d,r),typeof color==='string'?material(color):color,u(x),u(y),u(z));
  function pathRect(w,d,r,center=[0,0],Path=T.Shape) {
    const q = new Path(), x=u(center[0]-w/2), z=u(center[1]-d/2), W=u(w), D=u(d), R=u(r);
    q.moveTo(x+R,z); q.lineTo(x+W-R,z); q.quadraticCurveTo(x+W,z,x+W,z+R);
    q.lineTo(x+W,z+D-R); q.quadraticCurveTo(x+W,z+D,x+W-R,z+D);
    q.lineTo(x+R,z+D); q.quadraticCurveTo(x,z+D,x,z+D-R);
    q.lineTo(x,z+R); q.quadraticCurveTo(x,z,x+R,z); q.closePath(); return q;
  }
  const holes = [
    ...spec.mounts.map(p=>({...p,plated:false})),
    ...spec.pads.filter(p=>p.drill).map(p=>({x:p.x,z:p.z,diameter:p.drill,plated:true})),
    ...spec.vias.map(p=>({x:p.x,z:p.z,diameter:p.drill,plated:true}))
  ];
  function outline() {
    const shape=pathRect(spec.outline.width,spec.outline.depth,spec.outline.cornerRadius);
    for(const p of holes){ const hole=new T.Path(); hole.absarc(u(p.x),u(-p.z),u(p.diameter/2),0,Math.PI*2,true); shape.holes.push(hole); }
    for(const p of spec.cutouts) shape.holes.push(pathRect(p.width,p.depth,p.cornerRadius,[p.x,-p.z],T.Path));
    return shape;
  }
  function layer(depth,y,color){
    const geometry=new T.ExtrudeGeometry(outline(),{depth:u(depth),bevelEnabled:false,curveSegments:6,steps:1});
    geometry.rotateX(-Math.PI/2); geometry.translate(0,-u(depth)/2,0);
    return mesh(group,geometry,color,0,u(y),0);
  }
  layer(spec.outline.thickness-.08,0,material('#a68b4e',.04,.79));
  layer(.04,spec.outline.thickness/2-.02,material(spec.colors.mask,.14,.42));
  layer(.04,-spec.outline.thickness/2+.02,material(spec.colors.maskBottom,.12,.48));
  const flatRing=(x,y,z,inside,outside,mat)=>{
    const geometry=new T.RingGeometry(u(inside),u(outside),16);
    geometry.rotateX(-Math.PI/2); return mesh(group,geometry,mat,u(x),u(y),u(z));
  };
  for(const p of holes){
    if(p.plated){
      const geo=new T.CylinderGeometry(u(p.diameter/2),u(p.diameter/2),u(spec.outline.thickness),12,1,true);
      mesh(group,geo,gold,u(p.x),0,u(p.z));
    } else {
      flatRing(p.x,spec.outline.thickness/2+.016,p.z,p.diameter/2+1,p.diameter/2+1.18,material(silk,.02,.6));
      // Insulating washers preserve the copper keepout around the M3 mounting holes.
      const washer=flatRing(p.x,-spec.outline.thickness/2-.03,p.z,p.diameter/2,2.75,polymer);
      standoff(group,u(p.x),-.50,u(p.z),.72);
    }
  }
  for(const p of [...spec.pads,...spec.vias]){
    if(p.drill){
      flatRing(p.x,spec.outline.thickness/2+.02,p.z,p.drill/2,p.diameter/2,gold);
      flatRing(p.x,-spec.outline.thickness/2-.02,p.z,p.drill/2,p.diameter/2,tin);
    } else {
      const disk=new T.CylinderGeometry(u(p.diameter/2),u(p.diameter/2),.003,20);
      mesh(group,disk,gold,u(p.x),top+.003,u(p.z));
    }
  }
  // The traces describe named logical routes, not a fabrication-verified layout.
  for(const route of spec.routes){
    const y=route.layer==='B.Cu'?-top-.0025:top+.0025;
    const m=material(route.layer==='B.Cu'?spec.colors.traceBottom:spec.colors.trace,.48,.46);
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],dx=u(b[0]-a[0]),dz=u(b[1]-a[1]),len=Math.hypot(dx,dz);
      if(!len)continue;
      const o=mesh(group,new T.BoxGeometry(u(route.width),.002,len),m,u((a[0]+b[0])/2),y,u((a[1]+b[1])/2));
      o.rotation.y=Math.atan2(dx,dz); o.userData.net=route.net;
    }
  }
  function text(text,w,d,x,z,size=44,fg=silk){
    return label(group,text,u(w),u(d),u(x),top+.007,u(z),{fg,size});
  }
  for(const p of spec.labels)text(p.text,p.width,p.depth,p.x,p.z,p.size||44,p.color||silk);
  for(const p of spec.testpoints){
    text(p.ref,3.7,1.3,p.x,p.z-2.5,42);
    text(p.net,6,1.3,p.x,p.z+2.5,36);
  }
  // Connector bodies have open square wells with recessed plated contacts.
  for(const c of spec.connectors){
    if(c.type==='socket'){
      const count=c.pins.length,pitch=c.pitch||2.54,vertical=c.axis==='z';
      const width=vertical?2.55:count*pitch,depth=vertical?count*pitch:2.55;
      const cx=c.pins.reduce((s,p)=>s+p.x,0)/count,cz=c.pins.reduce((s,p)=>s+p.z,0)/count;
      const shape=pathRect(width,depth,.32,[cx,-cz]);
      for(const p of c.pins)shape.holes.push(pathRect(.86,.86,.12,[p.x,-p.z],T.Path));
      const geo=new T.ExtrudeGeometry(shape,{depth:u(c.height),bevelEnabled:true,bevelSize:.005,bevelThickness:.005,bevelSegments:1,curveSegments:3});
      geo.rotateX(-Math.PI/2); mesh(group,geo,polymer,0,top+.012,0);
      for(const p of c.pins){
        flatRing(p.x,spec.outline.thickness/2+c.height-.32,p.z,.28,.43,gold);
        // Solder fillets and pin tails are visible on the underside.
        body(.52,1.9,.52,tin,p.x,-spec.outline.thickness/2-.7,p.z,.06);
        flatRing(p.x,-spec.outline.thickness/2-.04,p.z,.28,.62,tin);
      }
      const p=c.pins[0]; text('1',1.3,1.3,p.x+(vertical?-2.2:0),p.z+(vertical?0:-2.1),35);
    } else if(c.type==='jst-sh'){
      // A four-contact I²C expansion socket; no second power-input circuit.
      body(6.2,3.0,4.3,material('#eee6ce',.02,.47),c.x,2.3,c.z,.27);
      body(4.8,1.8,.35,polymer,c.x,2.6,c.z+2.12,.08);
      for(let i=0;i<4;i++)body(.35,.36,1.1,gold,c.x-1.5+i,2.45,c.z+1.7,.06);
      for(const side of [-1,1])body(.55,1.8,3.1,tin,c.x+side*3.05,1.6,c.z,.08);
      for(const p of c.pins)body(.5,.18,2.1,tin,p.x,1.0,p.z,.04);
    } else if(c.type==='pmod-socket'){
      // A raised right-angle 2 × 6 receptacle mates with the model's PMOD pin rows.
      const face=new T.Shape();face.moveTo(-.82,-.29);face.lineTo(.82,-.29);face.lineTo(.82,.29);face.lineTo(-.82,.29);face.closePath();
      for(let row=0;row<2;row++)for(let i=0;i<6;i++){
        const hole=new T.Path(),x=u(-6.35+i*2.54),y=u((row-.5)*2.54),r=.05;
        hole.moveTo(x-r,y-r);hole.lineTo(x+r,y-r);hole.lineTo(x+r,y+r);hole.lineTo(x-r,y+r);hole.closePath();face.holes.push(hole);
      }
      const geo=new T.ExtrudeGeometry(face,{depth:.75,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2});
      mesh(group,geo,polymer,u(c.x),u(c.contactCenterY),u(c.frontZ-7.5));
      for(const p of c.pins){
        body(.62,c.contactCenterY-1.5,.62,tin,p.x,(c.contactCenterY-1.5)/2,p.z,.06);
        body(.62,.62,4.3,tin,p.x,c.contactCenterY+(p.number<=6?-1.27:1.27),c.frontZ-5.9,.06);
      }
      body(2.3,3.9,3.2,polymer,c.x-6.4,2.7,c.frontZ-5.2,.2);
      body(2.3,3.9,3.2,polymer,c.x+6.4,2.7,c.frontZ-5.2,.2);
    }
  }
  for(const p of spec.passives){
    const ceramic=material(p.kind==='resistor'?'#222832':'#b6a079',.04,.6);
    body(1.3,.65,.8,ceramic,p.x,1.2,p.z,.12);
    for(const dir of [-1,1])body(.42,.7,.82,tin,p.x+dir*.73,1.19,p.z,.09);
    text(p.ref,3,1.1,p.x,p.z-1.55,36);
  }
  // A physical coordinate/scale mark makes the custom geometry easy to inspect.
  const ruler=spec.ruler;
  for(let i=0;i<=ruler.length;i++)body(.12,.03,i%5===0?1.6:.8,material(silk),ruler.x+i,.86,ruler.z,.02);
  text(`${ruler.length} mm`,12,1.7,ruler.x+ruler.length/2,ruler.z+2.5,44);
  group.userData.pcb={id:spec.id,revision:spec.revision,units:'mm',width:spec.outline.width,depth:spec.outline.depth,thickness:spec.outline.thickness,document:'pcb.json',status:spec.status};
  return group;
}
