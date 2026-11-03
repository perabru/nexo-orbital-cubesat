// Original procedural educational models. Dimensions and layouts are approximate.
function makeKit(T){
  const mats=new Map();
  const mat=(color,metal=.0,rough=.55)=>{const key=color+'|'+metal+'|'+rough;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough}));return mats.get(key);};
  const mesh=(g,geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,typeof m==='string'?mat(m):m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  const box=(g,w,h,d,c,x=0,y=0,z=0)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z);
  const cyl=(g,r,h,c,x=0,y=0,z=0,n=32)=>mesh(g,new T.CylinderGeometry(r,r,h,n),c,x,y,z);
  function outline(w,d,r){const s=new T.Shape(),x=-w/2,z=-d/2;s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;}
  function slab(g,w,d,h,r,c,x=0,y=0,z=0,holes=[]){const s=outline(w,d,r);for(const q of holes){const p=new T.Path();p.absarc(q[0],q[1],q[2],0,Math.PI*2,true);s.holes.push(p);}const geo=new T.ExtrudeGeometry(s,{depth:h,steps:1,bevelEnabled:true,bevelSize:Math.min(.025,h/5),bevelThickness:Math.min(.02,h/5),bevelSegments:2,curveSegments:8});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2,0);return mesh(g,geo,c,x,y,z);}
  function frame(g,w,d,h,b,c,x=0,y=0,z=0){const s=outline(w,d,.25),hole=outline(w-2*b,d-2*b,.18);s.holes.push(new T.Path(hole.getPoints()));const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,curveSegments:8});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2,0);return mesh(g,geo,c,x,y,z);}
  function instance(g,geo,c,points){const o=new T.InstancedMesh(geo,typeof c==='string'?mat(c):c,points.length),m=new T.Matrix4();points.forEach((p,i)=>{m.makeTranslation(p[0],p[1],p[2]);o.setMatrixAt(i,m);});o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
  function ring(g,r,c,x,y,z,th=.025){const a=mesh(g,new T.TorusGeometry(r,th,8,24),typeof c==='string'?mat(c,.7,.3):c,x,y,z);a.rotation.x=-Math.PI/2;return a;}
  function screw(g,x,y,z,r=.12){cyl(g,r,.065,mat('#bdc7cf',.83,.24),x,y,z,20);box(g,r*1.3,.018,r*.24,'#313a43',x,y+.04,z);box(g,r*.24,.018,r*1.3,'#313a43',x,y+.04,z);}
  function standoff(g,x,y,z,h=.55){cyl(g,.13,h,mat('#c9a64b',.8,.35),x,y,z,6);screw(g,x,y+h/2+.035,z,.105);}
  function label(g,text,w,d,x,y,z,{bg='transparent',fg='#f3f4ec',size=38,rot=0,metal=false}={}){const c=document.createElement('canvas');c.width=1024;c.height=Math.max(96,Math.round(1024*d/w));const a=c.getContext('2d');if(bg!=='transparent'){a.fillStyle=bg;a.fillRect(0,0,c.width,c.height);}a.fillStyle=fg;a.textAlign='center';a.textBaseline='middle';const lines=String(text).split('\n');a.font=`600 ${Math.min(size,c.height/(lines.length+0.8))}px monospace`;lines.forEach((t,i)=>a.fillText(t,512,c.height/2+(i-(lines.length-1)/2)*c.height/(lines.length+1)));const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;const m=new T.MeshStandardMaterial({map:tex,transparent:bg==='transparent',roughness:.65,metalness:metal?.25:0,side:T.DoubleSide,depthWrite:bg!=='transparent'});const o=mesh(g,new T.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-Math.PI/2;o.rotation.z=rot;return o;}
  function trace(g,points,color='#2e725b'){const geo=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const o=new T.Line(geo,new T.LineBasicMaterial({color}));g.add(o);return o;}
  function cable(g,points,c='#272c35',r=.08){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(g,new T.TubeGeometry(curve,36,r,8,false),mat(c,.05,.65));}
  function chip(g,w,d,x,z,txt='IC',h=.13,y=.15){slab(g,w,d,h,.035,'#20262d',x,y+h/2,z);const pts=[];for(let i=0;i<6;i++){pts.push([x-w/2-.04,y+.02,z-d*.38+i*d*.152],[x+w/2+.04,y+.02,z-d*.38+i*d*.152]);}instance(g,new T.BoxGeometry(.13,.055,.055),mat('#b9c1c3',.75,.3),pts);label(g,txt,w*.86,d*.7,x,y+h+.006,z,{size:40,fg:'#a5acaa'});}
  function pcb(g,w,d,c='#15453d',hole=true){const holes=hole?[[-w/2+.2,-d/2+.2,.095],[w/2-.2,-d/2+.2,.095],[-w/2+.2,d/2-.2,.095],[w/2-.2,d/2-.2,.095]]:[];slab(g,w,d,.13,.16,mat(c,.15,.62),0,0,0,holes);holes.forEach(p=>ring(g,p[2]+.025,'#bf9c3f',p[0],.076,-p[1],.018));return g;}
  function headers(g,x,z,n,{dz=.254,y=.15,vertical=true}={}){const pts=[],pads=[];for(let i=0;i<n;i++){pts.push([x,y+.11,z+i*dz]);pads.push([x,.08,z+i*dz]);}box(g,.23,.18,n*dz+.02,'#161b23',x,y,z+(n-1)*dz/2);instance(g,new T.BoxGeometry(.06,.48,.06),mat('#c9ab53',.8,.32),pts);const ringGeo=new T.TorusGeometry(.075,.016,6,12);ringGeo.rotateX(-Math.PI/2);instance(g,ringGeo,mat('#d5b564',.75,.3),pads);}
  function smd(g,x0,z0,n=12){const caps=[],ends=[];for(let i=0;i<n;i++){const x=x0+(i%4)*.21,z=z0+Math.floor(i/4)*.23;caps.push([x,.13,z]);ends.push([x-.065,.13,z],[x+.065,.13,z]);}instance(g,new T.BoxGeometry(.105,.07,.065),'#b49c72',caps);instance(g,new T.BoxGeometry(.035,.075,.07),mat('#a9afb3',.65,.3),ends);}
  function usb(g,x,y,z,type='C'){const w=type==='C'?.9:.8;slab(g,w,.7,.32,.1,mat('#c3cbd0',.85,.25),x,y,z);box(g,w*.8,.18,.035,'#1b2026',x,y,z-.365);box(g,w*.6,.045,.04,'#55606c',x,y,z-.39);for(let i=0;i<5;i++)box(g,.035,.025,.055,mat('#d9b15a',.7,.3),x-w*.2+i*w*.1,y,z-.41);}
  function led(g,x,z,color='#8ee294'){cyl(g,.055,.055,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.8,roughness:.3}),x,.16,z,12);}
  function bme(){const g=new T.Group();pcb(g,2.52,1.8,'#136a83');slab(g,.34,.34,.10,.04,mat('#d1ced1',.85,.28),0,.15,0);cyl(g,.025,.01,'#1f2832',0,.21,0,10);chip(g,.25,.30,-.65,-.08,'U2',.08,.08);smd(g,.35,-.2,4);headers(g,0,-.65,1);for(let i=0;i<6;i++){cyl(g,.07,.02,mat('#d1b055',.75,.3),-.65+i*.254,.09,.65,12);cyl(g,.032,.025,'#152735',-.65+i*.254,.105,.65,12);}for(const x of [-1.08,1.08]){box(g,.30,.25,.47,'#eeeade',x,.19,0);box(g,.035,.12,.30,'#34343a',x+Math.sign(x)*.17,.18,0);}label(g,'BME280',1.25,.22,0,.085,-.52,{size:46});label(g,'VIN 3V GND SCK SDO SDI',1.9,.20,0,.085,.40,{size:32});for(let i=0;i<4;i++)trace(g,[[-.70+i*.36,.079,.6],[-.7+i*.36,.079,.35],[-.25+i*.13,.079,.10]]);return g;}
  return {mat,mesh,box,cyl,slab,frame,instance,ring,screw,standoff,label,trace,cable,chip,pcb,headers,smd,usb,led,bme};
}

export function buildProject(THREE,palette={}){
 const T=THREE,K=makeKit(T),P=[],C=[];
 const {mat,mesh,box,cyl,slab,frame,instance,ring,screw,standoff,label,trace,cable,chip,pcb,headers,smd,usb,led,bme}=K;
 const accent=palette.accent||'#f3b544',dark='#17243a',metal=mat('#8b9cac',.72,.32);
 const part=(id,name,group,pos,explode,description,model,dimensions,category)=>{group.position.set(...pos);P.push({id,name,group,explode,description,model,dimensions,category});return group;};
 const base=new T.Group();slab(base,10,10,.38,.38,metal,0,0,0,[[-4.4,-4.4,.18],[4.4,-4.4,.18],[-4.4,4.4,.18],[4.4,4.4,.18]]);
 for(const x of [-4.2,4.2])for(const z of [-4.2,4.2]){cyl(base,.45,.32,'#1f2630',x,-.33,z);screw(base,x,.23,z,.15);}
 for(let i=0;i<7;i++)box(base,.13,.025,5.8,'#465665',-2.1+i*.7,.21,0);
 label(base,'NEXO ORBITAL  /  BASE 01',7.7,.45,0,.22,3.9,{fg:dark,size:50});
 part('base','Base e apoio de bancada',base,[0,.6,0],[0,-.3,0],'Base rígida com pés, furos de fixação e folga para passagem do cabo. A montagem é um demonstrador educacional em solo.','Estrutura autoral para demonstrador CubeSat','Envelope proposto: 100 × 100 mm; conferir tolerâncias no CAD.','Estrutura');
 const rails=new T.Group();
 for(const x of [-4.6,4.6])for(const z of [-4.6,4.6]){box(rails,.42,9.4,.42,metal,x,4.7,z);box(rails,.54,9.25,.08,dark,x,4.7,z+.24);for(const y of [.5,4.0,8.8])screw(rails,x,y,z,.13);}
 for(const y of [.15,9.1]){box(rails,9.2,.38,.38,metal,0,y,-4.6);box(rails,.38,.38,9.2,metal,-4.6,y,0);box(rails,.38,.38,9.2,metal,4.6,y,0);}
 // The front upper rail is deliberately open for assembly inspection.
 for(const x of [-4.6,4.6]){const beam=box(rails,.20,8.6,.20,mat('#d0aa54',.65,.4),x,4.5,-4.3);beam.rotation.z=x<0?-.14:.14;}
 part('frame','Longarinas e estrutura aberta',rails,[0,.85,0],[0,1.2,-.4],'Quatro longarinas mantêm as plataformas alinhadas. O lado aberto permite estudar o interior sem esconder a eletrônica.','Estrutura didática inspirada no formato CubeSat','Volume de estudo próximo de 100 × 100 × 110 mm; não é padrão de voo.','Estrutura');
 const tray=new T.Group();slab(tray,8.45,7.5,.18,.25,mat('#1c5148',.2,.6),0,0,0,[[-3.8,-3.3,.15],[3.8,-3.3,.15],[-3.8,3.3,.15],[3.8,3.3,.15]]);
 for(const x of [-3.8,3.8])for(const z of [-3.3,3.3])standoff(tray,x,-.50,z,.8);
 for(let i=0;i<8;i++)trace(tray,[[-3.2+i*.8,.105,-2.8],[-3.2+i*.8,.105,2.5]],'#317f66');
 label(tray,'OBC + PAYLOAD  /  3.3V LOGIC',6.8,.36,0,.11,3.1,{size:46});
 part('carrier','Plataforma da eletrônica',tray,[0,4.3,0],[0,2.6,0],'Plataforma de apoio com espaçadores isolantes; organize os cabos e preserve a ventilação do sensor. As trilhas são uma indicação visual, não um projeto de PCB.','Plataforma autoral / protoboard de bancada','Área proposta: 84 × 75 mm.','Montagem');
 const dev=new T.Group();pcb(dev,2.79,5.48,'#183b35');
 headers(dev,-1.25,-2.286,19);headers(dev,1.25,-2.286,19);
 slab(dev,1.8,2.55,.16,.04,'#1c2429',0,.14,.95);
 slab(dev,1.75,1.68,.16,.04,mat('#c4c9cb',.85,.28),0,.30,.68);
 label(dev,'ESPRESSIF\nESP32-WROOM-32E\n2.4 GHz Wi-Fi / BLE',1.58,1.42,0,.39,.68,{fg:'#454e54',size:48});
 const ant=[[-.72,.25,1.86],[-.72,.25,2.06],[-.45,.25,2.06],[-.45,.25,1.87],[-.18,.25,1.87],[-.18,.25,2.08],[.09,.25,2.08],[.09,.25,1.87],[.36,.25,1.87],[.36,.25,2.08],[.7,.25,2.08]];cable(dev,ant,'#c8a659',.025);
 chip(dev,.55,.55,0,-.75,'CP2102');smd(dev,-.75,-1.36,12);usb(dev,0,.22,-2.55,'B');
 for(const x of [-.85,.85]){slab(dev,.45,.45,.09,.05,mat('#a9b0b6',.7,.4),x,.13,-2.05);cyl(dev,.13,.09,'#22272d',x,.23,-2.05,20);}
 led(dev,.71,-1.48,'#ff725e');label(dev,'EN',.45,.2,-.84,.09,-1.68);label(dev,'BOOT',.48,.2,.84,.09,-1.68);label(dev,'DEVKITC V4',1.4,.25,0,.085,-1.69,{size:42});
 const rowsL=['3V3','EN','VP','VN','34','35','32','33','25','26','27','14','12','GND','13','D2','D3','CMD','5V'];
 const rowsR=['GND','23','22','TX','RX','21','GND','19','18','5','17','16','4','0','2','15','D1','D0','CLK'];
 for(let i=0;i<19;i++){label(dev,rowsL[i],.24,.13,-.96,.084,2.286-i*.254,{size:34,rot:Math.PI/2});label(dev,rowsR[i],.24,.13,.96,.084,2.286-i*.254,{size:34,rot:Math.PI/2});}
 for(let i=0;i<8;i++)trace(dev,[[-1.08,.078,-.7+i*.26],[-.75,.078,-.7+i*.26],[-.55,.078,.1+i*.13]],'#487459');
 part('esp32','ESP32-DevKitC V4',dev,[-1.8,4.65,.0],[-1.5,4.7,.2],'Controla o sensor e envia telemetria por USB ou Wi-Fi. Modelo com blindagem WROOM, antena impressa, 38 pinos, micro-USB e botões EN/BOOT.','Espressif ESP32-DevKitC V4 / WROOM-32E','Proporções aproximadas: placa 54,8 × 27,9 mm.','Controlador');
 const sensor=bme();part('bme280','Sensor BME280',sensor,[2.25,4.68,1.6],[2.5,6.3,1.2],'Mede temperatura, umidade e pressão. Na montagem proposta, use alimentação e lógica de 3,3 V e mantenha a abertura do sensor desobstruída.','Breakout Adafruit BME280 #2652, referência proposta','25,2 × 18,0 × 4,6 mm (referência do fabricante).','Sensor');
 const top=new T.Group();frame(top,10,10,.30,.7,metal);for(let i=0;i<5;i++)box(top,7.4,.14,.12,metal,0,0,-2+i);label(top,'NEXO / DEMONSTRADOR EM SOLO',8,.42,0,.18,4.25,{fg:dark,size:43});for(const x of [-4.35,4.35])for(const z of [-4.35,4.35])screw(top,x,.19,z,.15);
 part('top','Tampa de inspeção',top,[0,10.25,0],[0,8.1,0],'Tampa vazada removível. A vista desmontada mostra a ordem de fixação e deixa a eletrônica acessível para conferência.','Tampa autoral','Envelope proposto: 100 × 100 mm.','Estrutura');
 for(const side of [-1,1]){const g=new T.Group();slab(g,8.2,8.6,.16,.16,'#243249');for(let a=0;a<2;a++)for(let b=0;b<4;b++){const x=-1.95+a*3.9,z=-3.1+b*2.06;slab(g,3.65,1.85,.055,.08,mat('#133978',.5,.24),x,.12,z);for(let k=0;k<6;k++)box(g,3.55,.006,.012,'#7197bb',x,.155,z-.7+k*.28);box(g,.035,.014,1.75,'#b8c5d0',x,.16,z);}label(g,'PAINEL CONCEITUAL',6.7,.28,0,.17,3.9,{size:42,fg:'#e9d6a1'});g.rotation.z=side*Math.PI/2;part(side<0?'panel-left':'panel-right',side<0?'Painel lateral esquerdo':'Painel lateral direito',g,[side*5.0,5.5,0],[side*6.2,1.8,0],'Representação visual de um subsistema solar para explicar um CubeSat. O MVP de bancada usa USB; esta peça não integra um circuito fotovoltaico validado.','Painel didático conceitual, opcional','Superfície proposta: 82 × 86 mm.','Conceito');}
 const supply=new T.Group();slab(supply,2.4,3.3,.8,.28,'#202b3c');label(supply,'USB\n5 V',1.7,1.5,0,.42,0,{size:66,fg:'#f2bd54'});box(supply,1.2,.36,.38,mat('#c0c8d0',.7,.28),0,.0,-1.8);box(supply,.82,.19,.03,'#1d2632',0,0,-2.01);for(let i=0;i<4;i++)box(supply,.1,.03,.10,mat('#d8b65c',.75,.3),-.3+i*.2,.06,-2.03);cable(supply,[[0,0,1.5],[.5,0,2.5],[2,0,3]],'#2c3746',.10);
 part('usb','USB de alimentação e dados',supply,[-7.2,1.0,5.3],[-3.3,.7,2.2],'O cabo USB de dados fornece energia e permite gravar o firmware e ler a porta serial. Use somente uma via de alimentação por vez.','USB-A para micro-USB / computador de bancada','Conectores e cabo em representação aproximada.','Energia');
 const wire=(id,from,to,fromPoint,toPoint,color,label,detail,kind)=>C.push({id,from,to,fromPoint,toPoint,color,label,detail,kind});
 wire('usb-power','usb','esp32',[2,0,3],[0,.2,-2.95],'#aeb9c9','USB · 5 V + serial','Cabo único de alimentação e dados; o regulador da placa fornece 3,3 V.','power');
 wire('bme-vcc','esp32','bme280',[-1.25,.4,2.286],[-.65,.2,.65],'#ee6958','3V3 → VIN','Alimentação de 3,3 V para o breakout escolhido.','power');
 wire('bme-gnd','esp32','bme280',[1.25,.4,2.286],[-.142,.2,.65],'#687686','GND → GND','Referência elétrica comum.','ground');
 wire('bme-sda','esp32','bme280',[1.25,.4,1.016],[.62,.2,.65],'#3bd3dc','GPIO21 → SDI / SDA','Linha de dados I²C. O breakout configura o sensor para o barramento I²C.','data');
 wire('bme-scl','esp32','bme280',[1.25,.4,1.778],[.112,.2,.65],'#f3ba51','GPIO22 → SCK / SCL','Relógio I²C. Configure Wire.begin(21, 22) na placa escolhida.','data');
 return {parts:P,connections:C,camera:{position:[18,16,21],target:[0,5,0],minDistance:8,maxDistance:65},note:'Modelo didático autoral com referências de dispositivos reais. A estrutura e os detalhes são aproximados; não é CAD certificado, desenho para fabricação nem equipamento qualificado para voo.'};
}
