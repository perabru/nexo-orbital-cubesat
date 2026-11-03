import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = (id) => document.getElementById(id);
const config = JSON.parse($('project-data').textContent);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
const focusIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/></svg>';
let toastTimer;
function toast(message) { const box=$('toast'); box.textContent=message; box.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>box.classList.remove('show'),3100); }

// The written guide stays usable independently of WebGL and model loading.
const progressKey = `tcc-2027-lab-${config.slug}-v1`;
let completed=[];
try { completed=JSON.parse(localStorage.getItem(progressKey)||'[]'); if(!Array.isArray(completed))completed=[]; } catch { completed=[]; }
function updateProgress() {
  const valid=[...document.querySelectorAll('[data-step-check]')];
  const count=valid.filter(el=>el.checked).length;
  $('progress-text').textContent=`${count} de ${valid.length} etapas`;
  $('progress-bar').style.width=`${valid.length ? count/valid.length*100 : 0}%`;
  try { localStorage.setItem(progressKey,JSON.stringify(valid.filter(el=>el.checked).map(el=>el.dataset.stepCheck))); } catch { /* Guide remains usable without browser storage. */ }
}
document.querySelectorAll('[data-step-check]').forEach(el=>{el.checked=completed.includes(el.dataset.stepCheck);el.addEventListener('change',updateProgress);});
updateProgress();
$('reset-progress').addEventListener('click',()=>{document.querySelectorAll('[data-step-check]').forEach(el=>el.checked=false);updateProgress();toast('Etapas desmarcadas neste navegador.');});
$('menu-toggle').addEventListener('click',()=>{const open=$('nav-links').classList.toggle('open');$('menu-toggle').setAttribute('aria-expanded',String(open));});
$('nav-links').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{$('nav-links').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');}));
document.querySelectorAll('[data-copy-code]').forEach(button=>button.addEventListener('click',async()=>{
  const code=$(button.dataset.copyCode).textContent;
  try { await navigator.clipboard.writeText(code); toast('Código copiado.'); }
  catch { const selection=getSelection(); const range=document.createRange();range.selectNodeContents($(button.dataset.copyCode));selection.removeAllRanges();selection.addRange(range);toast('Código selecionado. Use Ctrl+C ou a opção Copiar.'); }
}));

let canvas=$('scene');
const stage=$('stage'), message=$('viewer-message');
let scene, renderer, camera, controls, model, parts=[], connections=[], ground, grid;
let selected=null, selectedConnection=null, isolated=false, wireVisible=true, labelsVisible=false;
let explosion=0, targetExplosion=0, ready=false, suspended=false;
let cameraTween=null, focusBox=null, secondaryBox=null, floorY=-1;
let autoRotate=false, lastTick=performance.now(), lastWireExplosion=-1, lastTime=0;
let isSoftware=false, renderDirty=true, lastRenderAt=0;
const byId=new Map(), wires=[], labels=[];
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
const partsRoot=new THREE.Group(), connectionsRoot=new THREE.Group();
let defaultDirection=new THREE.Vector3(1,.65,1).normalize();

function setPressed(id, value) { $(id).setAttribute('aria-pressed',String(value)); }
function partBox(part) { return new THREE.Box3().setFromObject(part.group); }
function sceneBox() { const box=new THREE.Box3(); parts.forEach(p=>{if(p.group.visible)box.union(partBox(p));});return box; }
function smoothCamera(position,target,duration=550) {
  if(reducedMotion||!duration){camera.position.copy(position);controls.target.copy(target);controls.update();return;}
  cameraTween={start:performance.now(),duration,fromP:camera.position.clone(),toP:position.clone(),fromT:controls.target.clone(),toT:target.clone()};
}
function fitAll(preset='perspective', animate=true) {
  if(!ready)return;
  const box=sceneBox(), sphere=box.getBoundingSphere(new THREE.Sphere());
  const aspect=Math.min(camera.aspect,1);
  const distance=sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov*.5)) / aspect * 1.13;
  let direction=defaultDirection.clone();
  if(preset==='front')direction.set(0,.13,1).normalize();
  if(preset==='top')direction.set(.001,1,.001).normalize();
  if(preset==='side')direction.set(1,.12,0).normalize();
  const position=sphere.center.clone().addScaledVector(direction,distance);
  smoothCamera(position,sphere.center,animate?550:0);
  controls.minDistance=Math.max(.4,sphere.radius*.18);
  controls.maxDistance=Math.max(model.camera?.maxDistance||0,distance*3.5);
  document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===preset)));
}
function focusPart() {
  if(!selected)return;
  const sphere=partBox(selected).getBoundingSphere(new THREE.Sphere());
  const direction=camera.position.clone().sub(controls.target).normalize();
  controls.minDistance=Math.max(.15,sphere.radius*.25);
  const distance=Math.max(sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov*.5)) / Math.min(camera.aspect,1)*1.3,2.2);
  smoothCamera(sphere.center.clone().addScaledVector(direction,distance),sphere.center);
  autoRotate=false; controls.autoRotate=false; setPressed('spin',false);
}
function setExplosion(value, fit=true) {
  targetExplosion=Math.max(0,Math.min(1,value));
  $('explode').value=Math.round(targetExplosion*100);
  $('explode-output').value=`${Math.round(targetExplosion*100)}%`;
  $('explode-output').textContent=`${Math.round(targetExplosion*100)}%`;
  $('explode-label').textContent=targetExplosion>.5?'Montar':'Desmontar';
  $('assembly-value').textContent=targetExplosion===0?'Montado':`${Math.round(targetExplosion*100)}%`;
  $('assembly-caption').textContent=targetExplosion===0?'VISTA DE CONJUNTO':'VISTA DESMONTADA';
  if(fit){
    // Frame the final assembled or exploded positions before animating the parts.
    const old=parts.map(p=>p.group.position.clone());
    parts.forEach(p=>p.group.position.copy(p.home).addScaledVector(p.offset,targetExplosion));
    partsRoot.updateMatrixWorld(true);fitAll('perspective');
    parts.forEach((p,i)=>p.group.position.copy(old[i]));partsRoot.updateMatrixWorld(true);
  }
}
function clearBoxes() { if(focusBox){scene.remove(focusBox);focusBox.geometry.dispose();focusBox.material.dispose();focusBox=null;}if(secondaryBox){scene.remove(secondaryBox);secondaryBox.geometry.dispose();secondaryBox.material.dispose();secondaryBox=null;} }
function makeBox(part,color) { const helper=new THREE.Box3Helper(partBox(part),color);helper.material.depthTest=false;helper.material.transparent=true;helper.material.opacity=.65;helper.renderOrder=8;scene.add(helper);return helper; }
function selectPart(id, focus=false) {
  const p=byId.get(id); if(!p)return;
  renderDirty=true;selected=p;selectedConnection=null;clearBoxes();focusBox=makeBox(p,config.stageAccent);
  if(isolated){parts.forEach(q=>q.group.visible=q===p);updateWires();focusPart();}
  document.querySelectorAll('.part-item,.part-label').forEach(el=>{const active=el.dataset.part===id;el.setAttribute('aria-pressed',String(active));el.classList.toggle('active',active);});
  document.querySelectorAll('.connection-item').forEach(el=>el.setAttribute('aria-pressed','false'));
  $('part-detail').innerHTML=`<span class="detail-kicker">${esc(p.category||'Componente')} · ${String(parts.indexOf(p)+1).padStart(2,'0')}</span><h4>${esc(p.name)}</h4><p>${esc(p.description)}</p>${p.model?`<p class="part-spec">${esc(p.model)}${p.dimensions?`<br>${esc(p.dimensions)}`:''}</p>`:''}<div class="part-actions"><button class="control-button" id="focus-part">${focusIcon}Aproximar</button><button class="control-button" id="isolate-part" aria-pressed="${isolated}">${isolated?'Ver conjunto':'Isolar peça'}</button></div>`;
  $('focus-part').addEventListener('click',focusPart);
  $('isolate-part').addEventListener('click',()=>{isolated=!isolated;parts.forEach(q=>q.group.visible=!isolated||q===selected);$('isolate-part').textContent=isolated?'Ver conjunto':'Isolar peça';$('isolate-part').setAttribute('aria-pressed',String(isolated));updateWires();fitAll();});
  $('tour-position').textContent=`${String(parts.indexOf(p)+1).padStart(2,'0')} / ${String(parts.length).padStart(2,'0')}`;
  $('selection-announcement').textContent=`${p.name}. ${p.description}`;
  wires.forEach(w=>{w.mesh.material.opacity=.86;});
  if(focus&&!isolated)focusPart();
}
function selectConnection(id) {
  const c=connections.find(x=>x.id===id);if(!c)return;
  renderDirty=true;selectedConnection=c;isolated=false;parts.forEach(p=>p.group.visible=true);
  clearBoxes();focusBox=makeBox(byId.get(c.from),c.color||config.colors.second);secondaryBox=makeBox(byId.get(c.to),c.color||config.colors.second);
  wireVisible=true;setPressed('wires',true);connectionsRoot.visible=true;updateWires();
  wires.forEach(w=>{w.mesh.material.opacity=w.connection===c?1:.15;});
  document.querySelectorAll('.connection-item').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.connection===id)));
  document.querySelectorAll('.part-item').forEach(el=>el.setAttribute('aria-pressed','false'));
  $('part-detail').innerHTML=`<span class="detail-kicker">${esc(kindName(c.kind))}</span><h4>${esc(c.label)}</h4><p>${esc(c.detail||'')}</p><p class="part-spec">${esc(byId.get(c.from)?.name)}<br>↓<br>${esc(byId.get(c.to)?.name)}</p><p>O traçado acompanha as peças durante a desmontagem. Consulte a tabela abaixo para o sinal e o destino.</p>`;
  $('selection-announcement').textContent=`${c.label}. ${c.detail||''}`;
}
function kindName(kind) {return ({power:'Alimentação',ground:'Terra / GND',data:'Dados / sinal',network:'Fluxo de rede',optical:'Caminho óptico'})[kind]||'Conexão';}
function updateWires() {
  if(!ready)return;renderDirty=true;
  partsRoot.updateMatrixWorld(true);
  wires.forEach(w=>{
    const c=w.connection,from=byId.get(c.from),to=byId.get(c.to);
    w.mesh.visible=from.group.visible&&to.group.visible;
    const a=from.group.localToWorld(new THREE.Vector3(...(c.fromPoint||[0,0,0])));
    const b=to.group.localToWorld(new THREE.Vector3(...(c.toPoint||[0,0,0])));
    const midpoint=a.clone().add(b).multiplyScalar(.5);
    const length=a.distanceTo(b),lift=Math.min(4,Math.max(.25,length*.15));
    midpoint.y+=lift;
    if(c.kind==='network')midpoint.y+=.5;
    // Slight lane separation keeps multiple conductors individually inspectable.
    midpoint.z+=(w.index%4-1.5)*Math.min(.12,length*.02);
    const curve=new THREE.CatmullRomCurve3([a,a.clone().lerp(midpoint,.6),midpoint,midpoint.clone().lerp(b,.4),b]);
    const geo=new THREE.TubeGeometry(curve,24,c.kind==='network'?.038:.025,5,false);
    if(w.mesh.geometry)w.mesh.geometry.dispose();w.mesh.geometry=geo;
    w.start.position.copy(a);w.end.position.copy(b);w.start.visible=w.end.visible=w.mesh.visible;
  });
  connectionsRoot.visible=wireVisible;
  lastWireExplosion=explosion;
}
function updateLabels() {
  if(!labelsVisible)return;
  const width=stage.clientWidth,height=stage.clientHeight;
  const used=[];
  labels.forEach(({part,element})=>{
    if(!part.group.visible){element.hidden=true;return;}
    const box=partBox(part),v=box.getCenter(new THREE.Vector3());v.y=box.max.y+.15;v.project(camera);
    let x=(v.x*.5+.5)*width,y=(-v.y*.5+.5)*height;
    if(v.z>1||v.z< -1||x<8||x>width-8||y<60||y>height-55){element.hidden=true;return;}
    for(const q of used){if(Math.abs(q.x-x)<100&&Math.abs(q.y-y)<23)y=q.y-25;}
    if(y<60)y=65;
    used.push({x,y});element.hidden=false;element.style.left=`${x}px`;element.style.top=`${y}px`;
  });
}
function buildInspector() {
  $('part-list').innerHTML=parts.map((p,i)=>`<button class="part-item" data-part="${esc(p.id)}" aria-pressed="false"><span class="part-number">${String(i+1).padStart(2,'0')}</span><span>${esc(p.name)}<small>${esc(p.category||'Componente')}</small></span>${arrow}</button>`).join('');
  $('part-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectPart(b.dataset.part)));
  $('connection-list').innerHTML=connections.map(c=>`<button class="connection-item" data-connection="${esc(c.id)}" aria-pressed="false"><span class="wire-dot" style="background:${esc(c.color||config.colors.second)}"></span><span>${esc(c.label)}<small>${esc(kindName(c.kind))}</small></span></button>`).join('');
  $('connection-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectConnection(b.dataset.connection)));
  $('parts-count').textContent=`${parts.length} peças`;
  $('connections-count').textContent=`${connections.length} ligações`;
  $('part-counter').textContent=`${String(parts.length).padStart(2,'0')} COMPONENTES`;
  $('viewer-status').textContent='3D PRONTO PARA EXPLORAR';
  parts.forEach(p=>{const el=document.createElement('button');el.className='part-label';el.textContent=p.name;el.dataset.part=p.id;el.setAttribute('aria-pressed','false');el.hidden=true;el.addEventListener('click',()=>selectPart(p.id));$('label-layer').append(el);labels.push({part:p,element:el});});
  if(model.note){$('model-note-text').textContent=model.note;}
}
function setTab(name) {
  ['parts','connections'].forEach(x=>{$(`tab-${x}`).setAttribute('aria-selected',String(name===x));$(`tab-${x}`).tabIndex=name===x?0:-1;});
  $('part-list').hidden=name!=='parts';$('connection-list').hidden=name!=='connections';
}
['parts','connections'].forEach(name=>{$(`tab-${name}`).addEventListener('click',()=>setTab(name));$(`tab-${name}`).addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=name==='parts'?'connections':'parts';setTab(next);$(`tab-${next}`).focus();}});});
function bindControls() {
  $('explode').addEventListener('input',e=>setExplosion(Number(e.target.value)/100));
  $('explode-button').addEventListener('click',()=>setExplosion(targetExplosion>.5?0:1));
  $('spin').addEventListener('click',()=>{autoRotate=!autoRotate;controls.autoRotate=autoRotate;setPressed('spin',autoRotate);});
  $('wires').addEventListener('click',()=>{wireVisible=!wireVisible;connectionsRoot.visible=wireVisible;renderDirty=true;setPressed('wires',wireVisible);});
  $('labels').addEventListener('click',()=>{labelsVisible=!labelsVisible;setPressed('labels',labelsVisible);labels.forEach(({element})=>element.hidden=!labelsVisible);});
  $('reset-view').addEventListener('click',()=>{isolated=false;parts.forEach(p=>p.group.visible=true);updateWires();autoRotate=false;controls.autoRotate=false;setPressed('spin',false);selectedConnection=null;clearBoxes();setExplosion(0);if(selected)selectPart(selected.id);});
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>fitAll(button.dataset.camera)));
  $('zoom-in').addEventListener('click',()=>{camera.position.lerp(controls.target,.15);controls.update();});
  $('zoom-out').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.18).add(controls.target);controls.update();});
  const expandViewer=()=>{const expanded=$('lab-frame').classList.toggle('is-expanded');document.body.classList.toggle('viewer-expanded',expanded);setPressed('fullscreen',expanded);resize();fitAll('perspective',false);};
  $('fullscreen').addEventListener('click',expandViewer);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('lab-frame').classList.contains('is-expanded'))expandViewer();});
  $('save-image').addEventListener('click',()=>{try{renderer.render(scene,camera);const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download=`${config.slug}-modelo-3d.png`;link.click();toast('Imagem da vista atual salva.');}catch{toast('Não foi possível salvar a imagem neste navegador.');}});
  const next=(delta)=>{let i=selected?parts.indexOf(selected):delta>0?-1:0;i=(i+delta+parts.length)%parts.length;setTab('parts');selectPart(parts[i].id);const button=$('part-list').querySelector(`[data-part="${parts[i].id}"]`);button?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});};
  $('tour-next').addEventListener('click',()=>next(1));$('tour-prev').addEventListener('click',()=>next(-1));
  document.querySelectorAll('[data-view-parts]').forEach(button=>button.addEventListener('click',()=>{
    const ids=button.dataset.viewParts.split(',').filter(x=>byId.has(x));
    $('explorar').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});
    isolated=false;parts.forEach(p=>p.group.visible=true);updateWires();setExplosion(.75);setTab('parts');
    if(ids.length)selectPart(ids[0]);
  }));
  $('show-connections').addEventListener('click',()=>{wireVisible=true;setPressed('wires',true);connectionsRoot.visible=true;setTab('connections');setExplosion(.65);$('explorar').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});if(connections[0])selectConnection(connections[0].id);});
  let down=null;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,time:performance.now()};cameraTween=null;});
  canvas.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||performance.now()-down.time>700)return;
    const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(parts.filter(p=>p.group.visible).map(p=>p.group),true);
    const hit=hits.find(h=>h.object.visible&&h.object.userData.partId);if(hit){setTab('parts');selectPart(hit.object.userData.partId);}
  });
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0','e','E'].includes(e.key))return;
    e.preventDefault();cameraTween=null;autoRotate=false;controls.autoRotate=false;setPressed('spin',false);
    const offset=camera.position.clone().sub(controls.target);
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')offset.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.12:-.12);
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){const axis=new THREE.Vector3().crossVectors(offset,new THREE.Vector3(0,1,0)).normalize();offset.applyAxisAngle(axis,e.key==='ArrowUp'?.08:-.08);}
    if(['+','='].includes(e.key))offset.multiplyScalar(.87);
    if(e.key==='-')offset.multiplyScalar(1.15);
    camera.position.copy(controls.target).add(offset);controls.update();
    if(e.key==='0')fitAll();if(e.key.toLowerCase()==='e')setExplosion(targetExplosion>.5?0:1);
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspended=true;message.hidden=false;message.innerHTML='<div><h3>A visualização foi pausada</h3><p>O navegador liberou a memória gráfica. Recarregue a página para voltar ao 3D. O roteiro abaixo continua disponível.</p><button class="primary-button" id="reload-3d">Recarregar 3D</button></div>';$('reload-3d').addEventListener('click',()=>location.reload());});
}
function resize() {if(!renderer)return;const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderDirty=true;}
function animate(now) {
  requestAnimationFrame(animate);if(!ready||suspended||document.hidden)return;
  const delta=Math.min((now-lastTime)/1000,.08);lastTime=now;
  const change=Math.abs(explosion-targetExplosion)>.0005;
  if(change){explosion=reducedMotion?targetExplosion:THREE.MathUtils.lerp(explosion,targetExplosion,Math.min(1,delta*9));parts.forEach(p=>p.group.position.copy(p.home).addScaledVector(p.offset,explosion));partsRoot.updateMatrixWorld(true);}
  if(Math.abs(lastWireExplosion-explosion)>.002 || (change&&Math.abs(explosion-targetExplosion)<.003)){updateWires();}
  if(cameraTween){const t=Math.min((now-cameraTween.start)/cameraTween.duration,1);const ease=1-Math.pow(1-t,3);camera.position.lerpVectors(cameraTween.fromP,cameraTween.toP,ease);controls.target.lerpVectors(cameraTween.fromT,cameraTween.toT,ease);if(t===1)cameraTween=null;}
  if(controls.update(delta)||change||cameraTween||autoRotate)renderDirty=true;
  if(focusBox){const p=selectedConnection?byId.get(selectedConnection.from):selected;if(p)focusBox.box.copy(partBox(p));}
  if(secondaryBox&&selectedConnection)secondaryBox.box.copy(partBox(byId.get(selectedConnection.to)));
  if(labelsVisible&&now-lastTick>50){updateLabels();lastTick=now;}
  if(!isSoftware || (renderDirty && now-lastRenderAt>45)){renderer.render(scene,camera);renderDirty=false;lastRenderAt=now;}
}

async function init() {
  try {
    const { buildProject }=await import('./models.js');
    try { const context=canvas.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!context)throw new Error('WebGL 2 indisponível');renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'}); }
    catch { const {SoftwareRenderer}=await import('./SoftwareRenderer.js');const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;renderer=new SoftwareRenderer(THREE,{canvas});isSoftware=true; }
    renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<720?1.5:1.8));
    if(isSoftware)renderer.setClearAlpha(0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.05,2000);
    if(!isSoftware){const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.8;}
    scene.add(new THREE.HemisphereLight('#e6f0ff','#73839d',2.3));
    const light=new THREE.DirectionalLight('#fff4df',3.1);light.position.set(18,30,24);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-30;light.shadow.camera.right=30;light.shadow.camera.top=30;light.shadow.camera.bottom=-30;light.shadow.normalBias=.06;light.shadow.bias=-.0001;scene.add(light);
    const rim=new THREE.DirectionalLight('#a4c8ff',2);rim.position.set(-20,15,-15);scene.add(rim);
    const front=new THREE.DirectionalLight('#ffffff',1.2);front.position.set(-15,5,25);scene.add(front);
    controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.07;controls.autoRotateSpeed=.6;controls.maxPolarAngle=Math.PI*.94;controls.screenSpacePanning=true;
    controls.addEventListener('start',()=>cameraTween=null);
    model=buildProject(THREE,{...config.colors,fonts:config.fonts});
    if(!model?.parts?.length)throw new Error('O modelo não contém componentes.');
    parts=model.parts;connections=(model.connections||[]).filter(c=>parts.some(p=>p.id===c.from)&&parts.some(p=>p.id===c.to));
    parts.forEach(p=>{
      if(byId.has(p.id))throw new Error(`ID duplicado: ${p.id}`);
      byId.set(p.id,p);p.home=p.group.position.clone();p.offset=new THREE.Vector3(...(p.explode||[0,0,0]));
      p.group.traverse(obj=>{obj.userData.partId=p.id;if(obj.isMesh){const mats=Array.isArray(obj.material)?obj.material:[obj.material];obj.castShadow=!mats.some(m=>m.transparent&&m.opacity<.5);obj.receiveShadow=true;}});partsRoot.add(p.group);
    });
    scene.add(partsRoot,connectionsRoot);partsRoot.updateMatrixWorld(true);
    const box=sceneBox();floorY=box.min.y-.12;
    ground=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.ShadowMaterial({opacity:.22}));ground.rotation.x=-Math.PI/2;ground.position.y=floorY;ground.receiveShadow=true;scene.add(ground);
    const size=box.getSize(new THREE.Vector3()).length()*2.8;
    grid=new THREE.GridHelper(Math.max(size,40),40,'#72819c','#72819c');grid.position.y=floorY+.01;grid.material.transparent=true;grid.material.opacity=.1;scene.add(grid);
    const endpointGeometry=new THREE.SphereGeometry(.065,8,6);
    connections.forEach((c,index)=>{const mat=new THREE.MeshBasicMaterial({color:c.color||config.colors.second,transparent:true,opacity:.86,depthWrite:false});const mesh=new THREE.Mesh(new THREE.BufferGeometry(),mat);mesh.renderOrder=3;const endMat=new THREE.MeshBasicMaterial({color:c.color||config.colors.second});const start=new THREE.Mesh(endpointGeometry,endMat),end=new THREE.Mesh(endpointGeometry,endMat);connectionsRoot.add(mesh,start,end);wires.push({connection:c,index,mesh,start,end});});
    if(model.camera?.position){const pos=new THREE.Vector3(...model.camera.position),target=new THREE.Vector3(...(model.camera.target||[0,0,0]));defaultDirection=pos.sub(target).normalize();}
    ready=true;resize();fitAll('perspective',false);updateWires();buildInspector();bindControls();
    new ResizeObserver(()=>{resize();}).observe(stage);
    const observer=new IntersectionObserver(entries=>{suspended=!entries[0].isIntersecting;lastTime=performance.now();},{rootMargin:'120px'});observer.observe(stage);
    message.hidden=true;canvas.setAttribute('aria-label',`Modelo 3D interativo de ${config.name}: ${parts.length} componentes. Arraste para girar, use dois dedos para ampliar. Com foco, use as setas para girar, mais e menos para ampliar e E para desmontar.`);
    canvas.dataset.ready='true';selectPart(parts[0].id);lastTime=performance.now();requestAnimationFrame(animate);
  } catch(error) {
    console.error('Falha ao preparar o laboratório 3D:',error);
    $('viewer-status').textContent='ROTEIRO DISPONÍVEL';
    message.hidden=false;message.innerHTML='<div><h3>O 3D não pôde ser iniciado</h3><p>Recarregue a página para tentar novamente. As etapas, os componentes e as ligações continuam disponíveis abaixo.</p><a class="primary-button" href="#como-fazer">Abrir o passo a passo</a></div>';
    document.querySelectorAll('.viewer-controls button,.camera-tools button,.explosion-control button,.explosion-control input,.tour-nav button').forEach(el=>el.disabled=true);
  }
}
init();
