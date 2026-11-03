/**
 * CPU Canvas2D renderer for the same THREE scene used by the WebGL viewer.
 * Original implementation: projected, depth-sorted triangles; lighting; instancing;
 * CanvasTexture UVs; line objects. This is a fallback for environments without WebGL.
 * Contract: new SoftwareRenderer(THREE, {canvas}); setSize(w,h,false),
 * setPixelRatio(r), render(scene,camera), dispose(). No scene/model substitutions.
 */
export class SoftwareRenderer {
  constructor(THREE, {canvas} = {}) {
    this.THREE = THREE;
    this.domElement = canvas || document.createElement('canvas');
    this.context = this.domElement.getContext('2d', {alpha:true});
    if (!this.context) throw new Error('O navegador não disponibilizou o desenho 2D do modelo.');
    this.isSoftwareRenderer = true;
    this.shadowMap = {enabled:false};
    this.info = {render:{calls:0,triangles:0,lines:0},memory:{}};
    this._ratio = 1; this._width = 1; this._height = 1;
    this._geometry = new WeakMap(); this._textures = new WeakMap();
    this._pool = []; this._draw = []; this._used = 0;
    this._projected = new Float64Array(0);
    this._view = new THREE.Matrix4(); this._mvp = new THREE.Matrix4();
    this._instance = new THREE.Matrix4(); this._world = new THREE.Matrix4();
    this._normal = new THREE.Matrix3(); this._light = new THREE.Vector3(.4,.8,.55).normalize();
    this._clear = '#111827'; this._alpha = 1; this._ramps = new Map(); this._reported = 0;
    this.outputColorSpace = THREE.SRGBColorSpace;
  }
  setPixelRatio(value) { this._ratio = Math.max(.5, Math.min(1.5, Number(value)||1)); this.setSize(this._width,this._height,false); }
  getPixelRatio() { return this._ratio; }
  setSize(width,height,updateStyle=true) {
    this._width=Math.max(1,width); this._height=Math.max(1,height);
    this.domElement.width=Math.max(1,Math.round(width*this._ratio));
    this.domElement.height=Math.max(1,Math.round(height*this._ratio));
    if(updateStyle){this.domElement.style.width=width+'px';this.domElement.style.height=height+'px';}
  }
  setClearColor(color,alpha=1) { const c=color?.isColor?color:new this.THREE.Color(color); this._clear=c.getStyle(this.THREE.SRGBColorSpace); this._alpha=alpha; }
  setClearAlpha(alpha) { this._alpha=alpha; }
  clear() { this.context.clearRect(0,0,this.domElement.width,this.domElement.height); }
  dispose() { this._pool=[];this._draw=[];this._ramps.clear();this._geometry=new WeakMap();this._textures=new WeakMap(); }
  _record() { const i=this._used++;return this._pool[i]||(this._pool[i]={}); }
  _getGeometry(geometry) {
    const attr=geometry.attributes.position;if(!attr)return null;
    const key=attr.version+':'+(geometry.index?.version||0)+':'+attr.count;
    const prior=this._geometry.get(geometry);if(prior?.key===key)return prior;
    const pos=attr.array, stride=attr.itemSize, index=geometry.index?.array;
    const count=index?index.length:attr.count, faces=Math.floor(count/3);
    const normals=new Float32Array(faces*3);
    for(let f=0;f<faces;f++){
      const a=(index?index[f*3]:f*3)*stride,b=(index?index[f*3+1]:f*3+1)*stride,c=(index?index[f*3+2]:f*3+2)*stride;
      const ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2],vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
      normals[f*3]=nx/l;normals[f*3+1]=ny/l;normals[f*3+2]=nz/l;
    }
    const materials=new Uint16Array(faces);
    for(const group of geometry.groups||[]){const a=Math.floor(group.start/3),b=Math.min(faces,Math.ceil((group.start+group.count)/3));materials.fill(group.materialIndex||0,a,b);}
    const result={key,pos,stride,index,count,faces,normals,materials,vertices:attr.count,uv:geometry.attributes.uv?.array,uvStride:geometry.attributes.uv?.itemSize||2};
    this._geometry.set(geometry,result);return result;
  }
  _project(data,world) {
    const count=data.vertices*4;if(this._projected.length<count)this._projected=new Float64Array(count);
    const out=this._projected,m=this._mvp.multiplyMatrices(this._view,world).elements,p=data.pos,s=data.stride,W=this.domElement.width/2,H=this.domElement.height/2;
    for(let i=0;i<data.vertices;i++){
      const j=i*s,k=i*4,x=p[j],y=p[j+1],z=p[j+2];
      const w=m[3]*x+m[7]*y+m[11]*z+m[15];
      out[k]=(m[0]*x+m[4]*y+m[8]*z+m[12])/w*W+W;
      out[k+1]=-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*H+H;
      out[k+2]=(m[2]*x+m[6]*y+m[10]*z+m[14])/w;out[k+3]=w;
    }
    return out;
  }
  _ramp(material) {
    const c=material.color||{r:1,g:1,b:1},e=material.emissive||{r:0,g:0,b:0},ei=material.emissiveIntensity??1;
    const key=[c.r,c.g,c.b,e.r,e.g,e.b,ei,material.isMeshBasicMaterial||false].join('/');
    let ramp=this._ramps.get(key);
    if(!ramp){ramp=[];const srgb=n=>Math.round(255*(n<=.0031308?12.92*n:1.055*Math.pow(n,1/2.4)-.055));for(let i=0;i<64;i++){const k=material.isMeshBasicMaterial?1:.34+i/63*.72;const cv=(v,em)=>srgb(Math.max(0,Math.min(1,v*k+em*ei*.65)));ramp.push(`rgb(${cv(c.r,e.r)},${cv(c.g,e.g)},${cv(c.b,e.b)})`);}this._ramps.set(key,ramp);if(this._ramps.size>300)this._ramps.delete(this._ramps.keys().next().value);}
    return ramp;
  }
  _texture(material) {
    const tex=material.map;if(!tex)return null;let image=tex.image;
    if(!image)return null;
    if(image.data && image.width && image.height){let cached=this._textures.get(tex);if(!cached||cached.version!==tex.version){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d'),pixels=context.createImageData(image.width,image.height);if(image.data.length===pixels.data.length)pixels.data.set(image.data);else return null;context.putImageData(pixels,0,0);cached={version:tex.version,image:canvas};this._textures.set(tex,cached);}image=cached.image;}
    return (image.width||image.naturalWidth)>0?image:null;
  }
  _emitFace(r,level=0) {
    // Large flat panels need smaller depth samples: their average triangle depth
    // can otherwise cover a foreground PCB in a painter-style renderer.
    const longest=Math.max(Math.hypot(r.x1-r.x0,r.y1-r.y0),Math.hypot(r.x2-r.x1,r.y2-r.y1),Math.hypot(r.x0-r.x2,r.y0-r.y2));
    const area=Math.abs((r.x1-r.x0)*(r.y2-r.y0)-(r.y1-r.y0)*(r.x2-r.x0));
    if(r.image||r.wire||area<1600*this._ratio*this._ratio||longest<90*this._ratio||level>=4){this._draw.push(r);return;}
    const v=[[r.x0,r.y0,r.z0],[r.x1,r.y1,r.z1],[r.x2,r.y2,r.z2]];
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
    const ab=mid(v[0],v[1]),bc=mid(v[1],v[2]),ca=mid(v[2],v[0]);
    for(const tri of [[v[0],ab,ca],[ab,v[1],bc],[ca,bc,v[2]],[ab,bc,ca]]){
      const q=this._record();Object.assign(q,r);q.x0=tri[0][0];q.y0=tri[0][1];q.z0=tri[0][2];q.x1=tri[1][0];q.y1=tri[1][1];q.z1=tri[1][2];q.x2=tri[2][0];q.y2=tri[2][1];q.z2=tri[2][2];q.depth=(q.z0+q.z1+q.z2)/3;this._emitFace(q,level+1);
    }
  }
  _mesh(object,world) {
    const data=this._getGeometry(object.geometry);if(!data)return;
    const p=this._project(data,world),idx=data.index,W=this.domElement.width,H=this.domElement.height;
    const nm=this._normal.getNormalMatrix(world).elements,light=this._light,n=data.normals;
    const mats=Array.isArray(object.material)?object.material:[object.material];
    const descriptions=mats.map(m=>m?{m,image:this._texture(m),opacity:m.opacity??1,ramp:this._ramp(m)}:null);
    const range=object.geometry.drawRange||{start:0,count:Infinity};
    const first=Math.floor(range.start/3),last=Math.min(data.faces,Math.ceil((range.start+range.count)/3));
    for(let f=first;f<last;f++){
      const a=idx?idx[f*3]:f*3,b=idx?idx[f*3+1]:f*3+1,c=idx?idx[f*3+2]:f*3+2,ia=a*4,ib=b*4,ic=c*4;
      if(p[ia+3]<=.001||p[ib+3]<=.001||p[ic+3]<=.001)continue;
      const x0=p[ia],y0=p[ia+1],x1=p[ib],y1=p[ib+1],x2=p[ic],y2=p[ic+1];
      if(Math.max(x0,x1,x2)<0||Math.min(x0,x1,x2)>W||Math.max(y0,y1,y2)<0||Math.min(y0,y1,y2)>H)continue;
      if(Math.min(p[ia+2],p[ib+2],p[ic+2])>1||Math.max(p[ia+2],p[ib+2],p[ic+2])< -1)continue;
      const d=descriptions[data.materials[f]]||descriptions[0];if(!d||!d.m.visible||d.opacity<=.001||d.m.isShadowMaterial)continue;
      const area=(x1-x0)*(y2-y0)-(y1-y0)*(x2-x0);if(Math.abs(area)<.035)continue;
      const side=d.m.side;if(side===this.THREE.FrontSide&&area>=0)continue;if(side===this.THREE.BackSide&&area<0)continue;
      const k=f*3,nx=n[k],ny=n[k+1],nz=n[k+2];
      let xx=nm[0]*nx+nm[3]*ny+nm[6]*nz,yy=nm[1]*nx+nm[4]*ny+nm[7]*nz,zz=nm[2]*nx+nm[5]*ny+nm[8]*nz;
      if(area>0){xx=-xx;yy=-yy;zz=-zz;}
      const dot=(xx*light.x+yy*light.y+zz*light.z)/(Math.hypot(xx,yy,zz)||1);
      const r=this._record();r.type=0;r.x0=x0;r.y0=y0;r.x1=x1;r.y1=y1;r.x2=x2;r.y2=y2;r.z0=p[ia+2];r.z1=p[ib+2];r.z2=p[ic+2];r.depth=(r.z0+r.z1+r.z2)/3;r.order=object.renderOrder||0;r.color=d.ramp[Math.max(0,Math.min(63,Math.round(Math.max(0,dot)*63)))];r.alpha=d.opacity;r.image=d.image;r.wire=d.m.wireframe||false;r.noFill=!!(d.image&&d.m.transparent);r.width=d.m.wireframeLinewidth||1;
      if(d.image&&data.uv){const uv=data.uv,us=data.uvStride,map=d.m.map,rx=map.repeat?.x??1,ry=map.repeat?.y??1,ox=map.offset?.x||0,oy=map.offset?.y||0,iw=d.image.width||d.image.naturalWidth,ih=d.image.height||d.image.naturalHeight,flip=map.flipY!==false;
        r.u0=(uv[a*us]*rx+ox)*iw;r.v0=(flip?1-(uv[a*us+1]*ry+oy):uv[a*us+1]*ry+oy)*ih;
        r.u1=(uv[b*us]*rx+ox)*iw;r.v1=(flip?1-(uv[b*us+1]*ry+oy):uv[b*us+1]*ry+oy)*ih;
        r.u2=(uv[c*us]*rx+ox)*iw;r.v2=(flip?1-(uv[c*us+1]*ry+oy):uv[c*us+1]*ry+oy)*ih;
      } else r.image=null;
      this._emitFace(r);
    }
  }
  _lines(object) {
    const data=this._getGeometry(object.geometry);if(!data)return;const p=this._project(data,object.matrixWorld),idx=data.index,m=Array.isArray(object.material)?object.material[0]:object.material;if(!m||m.opacity<=0)return;
    const count=idx?idx.length:data.vertices,step=object.isLineSegments?2:1;
    for(let i=0;i<count-1;i+=step){const a=(idx?idx[i]:i)*4,b=(idx?idx[i+1]:i+1)*4;if(p[a+3]<=.001||p[b+3]<=.001)continue;const r=this._record();r.type=1;r.x0=p[a];r.y0=p[a+1];r.x1=p[b];r.y1=p[b+1];r.depth=(p[a+2]+p[b+2])/2;r.order=object.type==='GridHelper'?-999:(object.renderOrder||0);const colors=object.geometry.attributes.color,ci=(idx?idx[i]:i);r.color=m.vertexColors&&colors?new this.THREE.Color(colors.getX(ci),colors.getY(ci),colors.getZ(ci)).getStyle(this.THREE.SRGBColorSpace):(m.color?.getStyle(this.THREE.SRGBColorSpace)||'#b4bdcc');r.alpha=m.opacity??1;r.width=Math.max(.65,(m.linewidth||1)*this._ratio);r.dash=m.isLineDashedMaterial?[4*this._ratio,3*this._ratio]:null;this._draw.push(r);}
  }
  _drawTexture(r) {
    const du1=r.u1-r.u0,dv1=r.v1-r.v0,du2=r.u2-r.u0,dv2=r.v2-r.v0,det=du1*dv2-du2*dv1;if(Math.abs(det)<1e-7)return;
    const dx1=r.x1-r.x0,dy1=r.y1-r.y0,dx2=r.x2-r.x0,dy2=r.y2-r.y0;
    const a=(dx1*dv2-dx2*dv1)/det,b=(dy1*dv2-dy2*dv1)/det,c=(dx2*du1-dx1*du2)/det,d=(dy2*du1-dy1*du2)/det,e=r.x0-a*r.u0-c*r.v0,f=r.y0-b*r.u0-d*r.v0,ctx=this.context;
    ctx.save();ctx.beginPath();ctx.moveTo(r.x0,r.y0);ctx.lineTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);try{ctx.drawImage(r.image,0,0);}catch{}ctx.restore();
  }
  render(scene,camera) {
    const started=performance.now();
    const ctx=this.context,W=this.domElement.width,H=this.domElement.height;
    camera.updateMatrixWorld();scene.updateMatrixWorld();this._view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    this._used=0;this._draw.length=0;
    let directional=null;scene.traverseVisible(o=>{if(!directional&&o.isDirectionalLight&&o.intensity>0)directional=o;});
    if(directional){const target=new this.THREE.Vector3(),position=new this.THREE.Vector3();directional.getWorldPosition(position);directional.target.getWorldPosition(target);this._light.copy(position).sub(target).normalize();}
    scene.traverseVisible(object=>{
      if(object.isMesh){if(object.isInstancedMesh){for(let i=0;i<object.count;i++){object.getMatrixAt(i,this._instance);this._world.multiplyMatrices(object.matrixWorld,this._instance);this._mesh(object,this._world);}}else this._mesh(object,object.matrixWorld);}
      else if(object.isLine)this._lines(object);
    });
    const collected=performance.now();
    this._draw.sort((a,b)=>a.order-b.order||b.depth-a.depth);
    const sorted=performance.now();
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,W,H);
    const bg=scene.background?.isColor?scene.background.getStyle(this.THREE.SRGBColorSpace):this._clear;
    ctx.globalAlpha=this._alpha;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
    ctx.lineJoin='round';ctx.lineCap='round';this.info.render={calls:0,triangles:0,lines:0};
    let batchColor=null,batchCount=0,paintCalls=0;
    const flush=()=>{if(!batchCount)return;ctx.globalAlpha=1;ctx.fillStyle=batchColor;ctx.fill();ctx.strokeStyle=batchColor;ctx.lineWidth=.45;ctx.stroke();paintCalls+=2;batchCount=0;batchColor=null;};
    ctx.setLineDash([]);
    for(const r of this._draw){
      // Consecutive opaque faces of the same shade share one Canvas path.
      // Depth order is unchanged; this avoids thousands of fill/stroke calls.
      const batchable=r.type===0&&!r.image&&!r.wire&&!r.noFill&&r.alpha>.998;
      if(batchable){if(batchCount&&(batchColor!==r.color||batchCount>=256))flush();if(!batchCount){ctx.beginPath();batchColor=r.color;}ctx.moveTo(r.x0,r.y0);ctx.lineTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.closePath();batchCount++;this.info.render.triangles++;continue;}
      flush();ctx.globalAlpha=r.alpha;
      if(r.type===1){ctx.strokeStyle=r.color;ctx.lineWidth=r.width;ctx.setLineDash(r.dash||[]);ctx.beginPath();ctx.moveTo(r.x0,r.y0);ctx.lineTo(r.x1,r.y1);ctx.stroke();ctx.setLineDash([]);paintCalls++;this.info.render.lines++;continue;}
      ctx.beginPath();ctx.moveTo(r.x0,r.y0);ctx.lineTo(r.x1,r.y1);ctx.lineTo(r.x2,r.y2);ctx.closePath();
      if(r.wire){ctx.strokeStyle=r.color;ctx.lineWidth=r.width*this._ratio;ctx.stroke();paintCalls++;}
      else if(!r.noFill){ctx.fillStyle=r.color;ctx.fill();paintCalls++;}
      if(r.image){this._drawTexture(r);paintCalls++;}
      this.info.render.triangles++;
    }
    flush();ctx.globalAlpha=1;ctx.setLineDash([]);this.info.render.calls=paintCalls;
    const finished=performance.now();this.info.render.durationMs=Math.round(finished-started);this.info.render.collectMs=Math.round(collected-started);this.info.render.sortMs=Math.round(sorted-collected);this.info.render.paintMs=Math.round(finished-sorted);
    if(this._reported<3||(this.info.render.durationMs>250&&this._reported<8)){this._reported++;console.debug('[SoftwareRenderer]',JSON.stringify(this.info.render));}
  }
}
