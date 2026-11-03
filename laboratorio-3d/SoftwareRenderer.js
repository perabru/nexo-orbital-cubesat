/**
 * CPU Canvas2D renderer for the same THREE scene used by the WebGL viewer.
 * CPU depth buffer, perspective-correct texture mapping, lighting and instancing;
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
    this._depth = new Float32Array(0); this._pixels = null;
    this._texturePixels = new WeakMap(); this._colorBytesCache = new Map();
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
  dispose() { this._pool=[];this._draw=[];this._ramps.clear();this._geometry=new WeakMap();this._textures=new WeakMap();this._texturePixels=new WeakMap();this._colorBytesCache.clear();this._pixels=null;this._depth=new Float32Array(0); }
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
  _emitFace(r) { this._draw.push(r); }
  _colorBytes(style) {
    let value=this._colorBytesCache.get(style);
    if(!value){
      const normalized=style.startsWith('rgb(')?style:new this.THREE.Color(style).getStyle(this.THREE.SRGBColorSpace);
      const match=normalized.match(/[\d.]+/g);value=match?match.slice(0,3).map(Number):[255,255,255];
      this._colorBytesCache.set(style,value);
    }
    return value;
  }
  _textureData(image) {
    if(!image)return null;
    let cached=this._texturePixels.get(image);if(cached)return cached;
    const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
    try {
      const c=document.createElement('canvas');c.width=width;c.height=height;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      cached={data:ctx.getImageData(0,0,width,height).data,width,height};
      this._texturePixels.set(image,cached);return cached;
    } catch {return null;}
  }
  _rasterFace(r,transparent=false) {
    const W=this.domElement.width,H=this.domElement.height,rgba=this._pixels.data,zbuf=this._depth;
    const area=(r.x1-r.x0)*(r.y2-r.y0)-(r.y1-r.y0)*(r.x2-r.x0);
    if(Math.abs(area)<.001)return;
    const inv=1/area;
    const x0=Math.max(0,Math.ceil(Math.min(r.x0,r.x1,r.x2)-.5)),x1=Math.min(W-1,Math.floor(Math.max(r.x0,r.x1,r.x2)-.5));
    const y0=Math.max(0,Math.ceil(Math.min(r.y0,r.y1,r.y2)-.5)),y1=Math.min(H-1,Math.floor(Math.max(r.y0,r.y1,r.y2)-.5));
    const ax=(r.y1-r.y2)*inv,ay=(r.x2-r.x1)*inv,bx=(r.y2-r.y0)*inv,by=(r.x0-r.x2)*inv;
    const A=((r.y1-r.y2)*(x0+.5-r.x2)+(r.x2-r.x1)*(y0+.5-r.y2))*inv;
    const B=((r.y2-r.y0)*(x0+.5-r.x2)+(r.x0-r.x2)*(y0+.5-r.y2))*inv;
    const rgb=this._colorBytes(r.color),texture=this._textureData(r.image);
    const uq0=r.u0*r.q0,uq1=r.u1*r.q1,uq2=r.u2*r.q2,vq0=r.v0*r.q0,vq1=r.v1*r.q1,vq2=r.v2*r.q2;
    for(let y=y0;y<=y1;y++){
      let a=A+(y-y0)*ay,b=B+(y-y0)*by,offset=y*W+x0;
      for(let x=x0;x<=x1;x++,a+=ax,b+=bx,offset++){
        const c=1-a-b;if(a< -1e-7||b< -1e-7||c< -1e-7)continue;
        const z=a*r.z0+b*r.z1+c*r.z2;
        if(z< -1||z>1||(r.depthTest!==false&&z>zbuf[offset]+.000001))continue;
        let red=rgb[0],green=rgb[1],blue=rgb[2],alpha=r.alpha;
        if(texture){
          const q=a*r.q0+b*r.q1+c*r.q2;
          const u=(a*uq0+b*uq1+c*uq2)/q,v=(a*vq0+b*vq1+c*vq2)/q;
          const tx=Math.max(0,Math.min(texture.width-1,Math.floor(u))),ty=Math.max(0,Math.min(texture.height-1,Math.floor(v)));
          const ti=(ty*texture.width+tx)*4;
          alpha*=texture.data[ti+3]/255;
          if(alpha<.01)continue;
          red=texture.data[ti]*red/255;green=texture.data[ti+1]*green/255;blue=texture.data[ti+2]*blue/255;
        }
        const k=offset*4;
        if(alpha>.998){rgba[k]=red;rgba[k+1]=green;rgba[k+2]=blue;rgba[k+3]=255;}
        else {
          const dst=rgba[k+3]/255,combined=alpha+dst*(1-alpha);
          const keep=dst*(1-alpha);
          rgba[k]=(red*alpha+rgba[k]*keep)/combined;rgba[k+1]=(green*alpha+rgba[k+1]*keep)/combined;rgba[k+2]=(blue*alpha+rgba[k+2]*keep)/combined;rgba[k+3]=combined*255;
        }
        if(!transparent&&r.depthWrite!==false)zbuf[offset]=z;
      }
    }
  }
  _rasterLine(r) {
    const W=this.domElement.width,H=this.domElement.height,rgba=this._pixels.data,rgb=this._colorBytes(r.color);
    const dx=r.x1-r.x0,dy=r.y1-r.y0,steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)));
    for(let i=0;i<=steps;i++){
      const t=steps?i/steps:0,x=Math.round(r.x0+dx*t),y=Math.round(r.y0+dy*t);
      if(x<0||x>=W||y<0||y>=H||(r.dash&&i%7>3))continue;
      const offset=y*W+x,z=r.z0+(r.z1-r.z0)*t;
      if(z>this._depth[offset]+.000015)continue;
      const k=offset*4,a=r.alpha,dst=rgba[k+3]/255,combined=a+dst*(1-a),keep=dst*(1-a);
      if(!combined)continue;
      rgba[k]=(rgb[0]*a+rgba[k]*keep)/combined;rgba[k+1]=(rgb[1]*a+rgba[k+1]*keep)/combined;rgba[k+2]=(rgb[2]*a+rgba[k+2]*keep)/combined;rgba[k+3]=combined*255;
    }
  }
  _paintLine(r) {
    const ctx=this.context;ctx.globalAlpha=r.alpha;ctx.strokeStyle=r.color;ctx.lineWidth=r.width;
    ctx.setLineDash(r.dash||[]);ctx.beginPath();ctx.moveTo(r.x0,r.y0);ctx.lineTo(r.x1,r.y1);ctx.stroke();
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
      const r=this._record();r.type=0;r.x0=x0;r.y0=y0;r.x1=x1;r.y1=y1;r.x2=x2;r.y2=y2;r.z0=p[ia+2];r.z1=p[ib+2];r.z2=p[ic+2];r.q0=1/p[ia+3];r.q1=1/p[ib+3];r.q2=1/p[ic+3];r.depthTest=d.m.depthTest;r.depthWrite=d.m.depthWrite;r.transparent=d.m.transparent||d.opacity<.999;r.depth=(r.z0+r.z1+r.z2)/3;r.order=object.renderOrder||0;r.color=d.ramp[Math.max(0,Math.min(63,Math.round(Math.max(0,dot)*63)))];r.alpha=d.opacity;r.image=d.image;r.wire=d.m.wireframe||false;r.noFill=!!(d.image&&d.m.transparent);r.width=d.m.wireframeLinewidth||1;
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
    for(let i=0;i<count-1;i+=step){const a=(idx?idx[i]:i)*4,b=(idx?idx[i+1]:i+1)*4;if(p[a+3]<=.001||p[b+3]<=.001)continue;const r=this._record();r.type=1;r.x0=p[a];r.y0=p[a+1];r.x1=p[b];r.y1=p[b+1];r.z0=p[a+2];r.z1=p[b+2];r.depthTest=m.depthTest;r.depth=(p[a+2]+p[b+2])/2;r.order=object.type==='GridHelper'?-999:(object.renderOrder||0);const colors=object.geometry.attributes.color,ci=(idx?idx[i]:i);r.color=m.vertexColors&&colors?new this.THREE.Color(colors.getX(ci),colors.getY(ci),colors.getZ(ci)).getStyle(this.THREE.SRGBColorSpace):(m.color?.getStyle(this.THREE.SRGBColorSpace)||'#b4bdcc');r.alpha=m.opacity??1;r.width=Math.max(.65,(m.linewidth||1)*this._ratio);r.dash=m.isLineDashedMaterial?[4*this._ratio,3*this._ratio]:null;this._draw.push(r);}
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
    const opaque=[],transparent=[],lines=[];
    for(const r of this._draw){if(r.type===1||r.wire)lines.push(r);else if(r.transparent)transparent.push(r);else opaque.push(r);}
    // Opaque depth is resolved per pixel. Translucent surfaces are composited only
    // where they are in front of the opaque geometry, preserving PCB occlusion.
    transparent.sort((a,b)=>a.order-b.order||b.depth-a.depth);
    const sorted=performance.now();
    if(this._depth.length!==W*H){this._depth=new Float32Array(W*H);this._pixels=ctx.createImageData(W,H);}
    this._depth.fill(Infinity);this._pixels.data.fill(0);
    opaque.forEach(r=>this._rasterFace(r));transparent.forEach(r=>this._rasterFace(r,true));
    lines.filter(r=>r.order>=0&&r.depthTest!==false).forEach(r=>this._rasterLine(r));
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,W,H);
    const bg=scene.background?.isColor?scene.background.getStyle(this.THREE.SRGBColorSpace):this._clear;
    if(this._alpha){ctx.globalAlpha=this._alpha;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
    ctx.lineJoin='round';ctx.lineCap='round';
    lines.filter(r=>r.order<0).forEach(r=>this._paintLine(r));
    // putImageData replaces pixels, so compose the transparent raster over the grid.
    if(!this._surface){this._surface=document.createElement('canvas');this._surfaceContext=this._surface.getContext('2d');}
    if(this._surface.width!==W||this._surface.height!==H){this._surface.width=W;this._surface.height=H;}
    this._surfaceContext.putImageData(this._pixels,0,0);ctx.globalAlpha=1;ctx.drawImage(this._surface,0,0);
    lines.filter(r=>r.order>=0&&r.depthTest===false).forEach(r=>this._paintLine(r));
    ctx.globalAlpha=1;ctx.setLineDash([]);
    this.info.render={calls:opaque.length+transparent.length+lines.length,triangles:opaque.length+transparent.length,lines:lines.length};
    const finished=performance.now();this.info.render.durationMs=Math.round(finished-started);this.info.render.collectMs=Math.round(collected-started);this.info.render.sortMs=Math.round(sorted-collected);this.info.render.paintMs=Math.round(finished-sorted);
    if(this._reported<3){this._reported++;console.debug('[SoftwareRenderer]',JSON.stringify(this.info.render));}
  }
}
