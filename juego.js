const $=s=>document.querySelector(s);
const h=(t,c,...k)=>{const e=document.createElement(t);if(c)e.className=c;k.flat().forEach(x=>e.append(x));return e};
const btn=(t,f,d,c)=>{const b=h('button','btn'+(c?' '+c:''),t);b.onclick=f;b.disabled=!!d;return b};
const EMO=['🐔','🦆','🍌','🤡','💩','🧀','🦄','👽','🍕','🔪','🧸','🦖'],AV=['🤠','👻','🤖','🐸','🦊','🐙','👹','🐵'];
const MODOS={normal:'Normal',cabron:'Modo cabrón',maraton:'Maratón',infinita:'La historia interminable'};
const DESC={normal:'Reglas clásicas. Gana quien llegue primero a los puntos elegidos.',
 cabron:'Si la primera carta es roja, el juez se queda 1 punto y le quita 1 a otro jugador.',
 maraton:'Se juega hasta que se acabe el mazo. Gana quien tenga más puntos (con desempate).',
 infinita:'Sin cartas rojas, 10 cartas cada uno. Todos suman viñetas a una historia larga; los demás pueden rechazarlas votando. Gana quien se quede sin cartas.'};
let me=localStorage.jhId||(localStorage.jhId=Math.random().toString(36).slice(2,10));
let isHost=false,peer,conn,code,V,S,SN,K,sel=[],myName=localStorage.jhName||'',out=false;
const aviso=m=>{const a=$('#aviso');a.textContent=m;a.classList.add('on');clearTimeout(a.t);a.t=setTimeout(()=>a.classList.remove('on'),5000)};
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};

/* ---------- CARTAS ---------- */
// Mantener apretada una carta (o clic sostenido) = verla en grande en el centro de la pantalla
let held=false,tm,px=0,py=0;
const vista=h('div');vista.id='vista';document.body.append(vista);
const lupa=h('div');lupa.id='lupa';document.body.append(lupa);
const lupaVacia=()=>{lupa.innerHTML='';lupa.append(h('div','vacio','Pasá el mouse sobre una carta para verla en grande'))};lupaVacia();
const ocultar=()=>{clearTimeout(tm);tm=0;vista.style.display='none';vista.innerHTML='';if(held)setTimeout(()=>held=false,120)};
['pointerup','pointercancel','blur'].forEach(e=>addEventListener(e,ocultar));
addEventListener('pointermove',e=>{if(tm&&!held&&Math.hypot(e.clientX-px,e.clientY-py)>10){clearTimeout(tm);tm=0}});
addEventListener('click',e=>{if(held){e.stopPropagation();e.preventDefault()}},true);
function card(id,cls='',big){
  const red=id[0]=='r',n=id.slice(1),d=h('div','carta '+(red?'roja ':'')+cls),i=new Image();
  i.src=`imagenes/${red?'rojas':'normales'}/${n}.${CONFIG.ext}`;i.draggable=false;
  i.onerror=()=>{i.remove();d.prepend(h('div','ph',h('b','',EMO[n%EMO.length]),h('span','','#'+n)))};
  d.dataset.id=id;d.append(i,h('i','brillo'));
  if(!big){
    d.oncontextmenu=e=>e.preventDefault();
    d.onpointerenter=e=>{if(e.pointerType=='mouse'){lupa.innerHTML='';lupa.append(card(id,'xl2',true))}};
    d.onpointerdown=e=>{px=e.clientX;py=e.clientY;held=false;clearTimeout(tm);
      tm=setTimeout(()=>{held=true;vista.append(card(id,'xl',true));vista.style.display='flex'},320)};
  }
  return d;
}

/* ---------- LÓGICA (solo el anfitrión) ---------- */
const newState=()=>({phase:'lobby',mode:'normal',players:[],hands:{},deck:[],disc:[],j:0,first:null,jc:null,jp:'despues',plays:{},order:[],flip:[],win:null,res:'',target:3,red:false,tb:null,hist:[],pend:null,votes:{},succ:[],host:me});
function mkDeck(){const d=[];for(let i=1;i<=CONFIG.normales;i++)d.push('n'+i);if(S.mode!='infinita')for(let i=1;i<=CONFIG.rojas;i++)d.push('r'+i);return shuf(d)}
const has=()=>S.deck.length||(S.mode!='maraton'&&S.disc.length);
function draw(){if(!S.deck.length&&S.mode!='maraton'){S.deck=shuf(S.disc);S.disc=[]}return S.deck.pop()}
function fill(n){S.players.forEach(p=>{const l=S.hands[p.id];while(l.length<n&&has())l.push(draw())})}
function startRound(){
  S.plays={};S.order=[];S.flip=[];S.win=null;S.res='';S.jc=null;S.tb=null;S.first=draw();
  const r=S.first[0]=='r';S.red=r&&S.mode!='cabron';S.phase=r&&S.mode=='cabron'?'cabron':S.red?'jugar':'juez';
}
function endGame(){
  const m=Math.max(...S.players.map(p=>p.score)),t=S.players.filter(p=>p.score==m);
  if(t.length==1){S.win=t[0].id;S.phase='fin';return}
  const low=S.players.filter(p=>!t.includes(p)).sort((a,b)=>a.score-b.score)[0];
  if(!low||S.hands[low.id].filter(c=>c[0]!='r').length<2||t.some(p=>!S.hands[p.id].length)){S.win=null;S.res='¡Empate final!';S.phase='fin';return}
  S.tb=t.map(p=>p.id);S.j=S.players.indexOf(low);S.plays={};S.order=[];S.flip=[];S.jc=null;S.first=null;S.red=false;S.phase='juez';
}
const use=(pid,cs)=>{S.hands[pid]=S.hands[pid].filter(c=>!cs.includes(c))};
const pname=id=>S.players.find(p=>p.id==id).name;
const story=(id,hide)=>{const p=hide?(S.plays[id]||[]).map(()=>null):S.plays[id]||[];return S.red?[...p,S.first]:S.jp=='antes'?[S.jc,S.first,...p]:[S.first,S.jc,...p]};
const advance=()=>{S.j=(S.j+1)%S.players.length;S.pend=null;S.votes={};S.phase='hist'};
const snap=()=>({...S,players:S.players.map(({c,...p})=>p)});

function join(id,name,c){
  let p=S.players.find(p=>p.id==id)||S.players.find(p=>name&&p.name==name&&p.id!=me&&!(p.c&&p.c.open));
  if(p){p.name=name||p.name;if(c)p.c=c}
  else if(S.phase=='lobby'&&S.players.length<8){p={id,name,score:0,c};S.players.push(p);S.hands[id]=[];S.succ.splice(Math.random()*(S.succ.length+1)|0,0,id)}
  else{c&&c.send({t:'err',m:'La partida ya empezó o la sala está llena'});return}
  if(c)c.pid=p.id;bc();
}
function kick(id){
  const i=S.players.findIndex(p=>p.id==id);if(i<0||id==me)return;
  const p=S.players[i];
  S.disc.push(...S.hands[id],...Object.values(S.plays).flat(),S.first,S.jc,S.pend);S.disc=S.disc.filter(Boolean);
  delete S.hands[id];S.players.splice(i,1);S.succ=S.succ.filter(x=>x!=id);
  if(i<S.j)S.j--;S.j%=S.players.length;
  if(p.c){p.c.send({t:'kick'});setTimeout(()=>p.c.close(),400)}
  if(S.phase=='lobby'||S.phase=='fin')return;
  if(S.players.length<3)S.phase='lobby';
  else if(S.mode=='infinita'){S.pend=null;S.votes={};S.phase='hist'}
  else{fill(CONFIG.mano);startRound()}
}
function handle(pid,a){
  const P=S.players.find(p=>p.id==pid);if(!P)return;
  const J=S.players[S.j],jg=J.id==pid,host=pid==me,ph=S.phase,exp=p=>S.tb?S.tb.includes(p.id):p.id!=J.id;
  if(a.t=='kick'&&host)kick(a.id);
  else if(a.t=='start'&&host&&ph=='lobby'&&S.players.length>=3){
    S.mode=MODOS[a.mode]?a.mode:'normal';S.target=a.target||3;S.tb=null;S.hist=[];
    S.j=Math.max(0,S.players.findIndex(p=>p.id==a.first));S.deck=mkDeck();S.disc=[];
    S.players.forEach(p=>{p.score=0;S.hands[p.id]=[]});
    if(S.mode=='infinita'){fill(10);S.hist=[draw()];S.pend=null;S.votes={};S.phase='hist'}else{fill(CONFIG.mano);startRound()}
  }else if(a.t=='jplay'&&ph=='juez'&&jg){
    const cs=S.tb?a.cards||[]:[a.card],k=S.tb?2:1;
    if(cs.length!=k||new Set(cs).size!=k||!cs.every(c=>S.hands[pid].includes(c)&&c[0]!='r'))return;
    use(pid,cs);S.first=S.tb?cs[0]:S.first;S.jc=S.tb?cs[1]:cs[0];S.jp=S.tb||a.pos!='antes'?'despues':'antes';S.phase='jugar';
  }else if(a.t=='play'&&ph=='jugar'&&exp(P)&&!S.plays[pid]){
    const k=S.red?2:1,cs=a.cards||[];
    if(cs.length!=k||new Set(cs).size!=k||!cs.every(c=>S.hands[pid].includes(c))||(S.red&&cs.some(c=>c[0]=='r')))return;
    use(pid,cs);S.plays[pid]=cs;
    if(S.players.filter(exp).every(p=>S.plays[p.id])){S.order=shuf(Object.keys(S.plays));S.phase='juzgar'}
  }else if(a.t=='reveal'&&ph=='juzgar'&&jg){const i=a.i;if(S.order[i]&&!S.flip.includes(i))S.flip.push(i)}
  else if(a.t=='pick'&&ph=='juzgar'&&jg&&S.flip.length==S.order.length&&S.order[a.i]){
    S.win=S.order[a.i];const w=S.players.find(p=>p.id==S.win);
    if(!S.tb)w.score+=S.red?2:1;
    S.phase=S.tb||(S.mode!='maraton'&&w.score>=S.target)?'fin':'resultado';
  }else if(a.t=='cabron'&&ph=='cabron'&&jg){
    const v=S.players.find(p=>p.id==a.id);if(!v||v==P)return;
    P.score++;v.score=Math.max(0,v.score-1);S.res=`${P.name} se queda la carta roja (+1) y ${v.name} pierde 1 punto.`;
    if(P.score>=S.target&&S.mode!='maraton'){S.win=P.id;S.phase='fin'}else S.phase='resultado';
  }else if(a.t=='next'&&ph=='resultado'&&(jg||host)){
    S.disc.push(...[S.first,S.jc,...Object.values(S.plays).flat()].filter(Boolean));
    S.j=(S.j+1)%S.players.length;fill(CONFIG.mano);
    if(S.mode=='maraton'&&!has())endGame();else startRound();
  }else if(a.t=='hplay'&&ph=='hist'&&jg&&S.hands[pid].includes(a.card)){S.pend=a.card;S.votes={};S.phase='voto'}
  else if(a.t=='hpass'&&ph=='hist'&&jg&&S.hands[pid].includes(a.card)){
    use(pid,[a.card]);S.disc.push(a.card);for(let i=0;i<2&&has();i++)S.hands[pid].push(draw());advance();
  }else if(a.t=='vote'&&ph=='voto'&&!jg&&!S.votes[pid]){
    S.votes[pid]=a.ok?1:-1;
    const vs=S.players.filter(p=>p!=J),yes=vs.filter(p=>S.votes[p.id]==1).length,no=vs.filter(p=>S.votes[p.id]==-1).length;
    if(yes*2>=vs.length){
      use(J.id,[S.pend]);S.hist.push(S.pend);
      if(!S.hands[J.id].length){S.win=J.id;S.phase='fin'}else advance();
    }else if(no*2>vs.length)advance();
  }else if(a.t=='again'&&host&&ph=='fin'){S.phase='lobby';S.deck=[];S.disc=[];S.tb=null;S.hist=[]}
  else return;
  bc();
}
function view(pid){
  const J=S.players[S.j],v={ph:S.phase,mode:S.mode,code,me:pid,target:S.target,red:S.red,first:S.first,judge:J.id,jc:S.jc,jp:S.jp,tb:S.tb,
    pl:S.players.map(p=>({id:p.id,n:p.name,s:p.score,on:p.id==me||!!(p.c&&p.c.open),d:S.phase=='voto'?!!S.votes[p.id]:!!S.plays[p.id]})),
    hand:S.hands[pid]||[],mine:!!S.plays[pid],win:S.win,res:S.res,hist:S.hist,pend:S.pend,voted:!!S.votes[pid],left:S.deck.length};
  if(S.order.length&&['juzgar','resultado','fin'].includes(S.phase)){
    const r=S.phase!='juzgar';v.n=S.order.length;v.st=S.order.map((id,i)=>{const f=r||S.flip.includes(i);return{c:story(id,!f),f}});
    if(r){v.own=S.order.map(pname);v.wi=S.order.indexOf(S.win)}
  }
  return v;
}
function bc(){const sn=snap();S.players.forEach(p=>{if(p.id==me)render(view(me));else if(p.c&&p.c.open)p.c.send({t:'v',v:view(p.id),sn})})}

/* ---------- RED ---------- */
const act=a=>isHost?handle(me,a):conn&&conn.open&&conn.send({t:'a',a});
function serve(c,st,fail){
  conn=null;if(peer)peer.destroy();code=c;localStorage.jhCode=c;peer=new Peer('jh-'+c);const mine=peer;
  peer.on('open',()=>{isHost=true;S=st||newState();S.host=me;S.players.forEach(p=>p.c=null);if(!S.succ.includes(me))S.succ.push(me);join(me,myName)});
  peer.on('error',e=>{
    if(!isHost)return fail&&fail(e);
    if(e.type=='unavailable-id'){isHost=false;SN=snap();reconectar()}else aviso('Error de conexión: '+e.type);
  });
  peer.on('disconnected',()=>{if(isHost&&peer===mine&&!mine.destroyed)mine.reconnect()});
  peer.on('connection',c=>{
    c.on('data',m=>{if(m.t=='join')join(m.id,m.name,c);else if(m.t=='a'&&c.pid&&isHost)handle(c.pid,m.a)});
    c.on('close',()=>isHost&&bc());
  });
}
const crear=()=>serve(String(1000+Math.random()*9000|0),null,crear);
function unirse(c4,fail){
  code=c4;localStorage.jhCode=c4;conn=null;if(peer)peer.destroy();peer=new Peer();let ok=false;
  const bad=m=>{if(ok)return;if(fail){const f=fail;fail=null;f()}else if(m)aviso(m)};
  peer.on('open',()=>{
    const c=conn=peer.connect('jh-'+c4,{reliable:true});
    c.on('open',()=>{ok=true;c.send({t:'join',id:me,name:myName})});
    c.on('data',m=>{
      if(m.t=='v'){SN=m.sn;if(m.v.me!=me){me=m.v.me;localStorage.jhId=me}render(m.v)}
      else if(m.t=='err')aviso(m.m);
      else if(m.t=='kick'){out=true;aviso('El anfitrión te sacó de la sala');home()}
    });
    c.on('close',()=>{if(conn===c&&!out)reconectar()});
    setTimeout(()=>bad('No se pudo conectar con la sala'),7000);
  });
  peer.on('error',e=>bad(e.type=='peer-unavailable'?'No existe una sala con ese código':'Error de conexión: '+e.type));
}
// Si se cae el anfitrión: todos intentan volver; los jugadores, en orden aleatorio, intentan quedarse con la sala.
function reconectar(){
  if(out||isHost||!SN)return;aviso('Reconectando…');
  const cand=SN.succ.filter(x=>x!=SN.host),k=Math.max(0,cand.indexOf(me));
  unirse(code,()=>setTimeout(()=>{if(conn&&conn.open)return;serve(code,SN,()=>setTimeout(reconectar,2000))},1500+k*3500));
}

/* ---------- ANIMACIONES Y EXTRAS ---------- */
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
let T={},LP={};
const resetT=()=>{T={hand:null,sel:[],pos:new Map(),score:{},players:new Set(),ok:new Set(),judge:null,ph:null,turn:'',txt:'',acc:''}};resetT();
const copiar=c=>(navigator.clipboard?navigator.clipboard.writeText(c):Promise.reject()).then(()=>aviso('Código copiado: '+c),()=>aviso('Código de la sala: '+c));

// Sello tipo explosión de historieta
function sello(t,c=''){
  if(RM)return;
  const s=h('div','sello '+c,h('span','',t));document.body.append(s);setTimeout(()=>s.remove(),1600);
}
// Confeti en canvas
function confeti(n=120){
  if(RM)return;
  const c=h('canvas');c.id='confeti';c.width=innerWidth;c.height=innerHeight;document.body.append(c);
  const g=c.getContext('2d'),cols=['#ffcf33','#ff3d5a','#35e0d0','#fff6dc','#b57bff'];
  const ps=Array.from({length:n},()=>({x:innerWidth/2+(Math.random()-.5)*240,y:innerHeight*.45,vx:(Math.random()-.5)*18,vy:-Math.random()*17-4,
    s:6+Math.random()*8,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[Math.random()*cols.length|0]}));
  let t=0;
  (function f(){
    g.clearRect(0,0,c.width,c.height);t++;
    ps.forEach(p=>{p.vy+=.36;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);g.restore()});
    if(t<140)requestAnimationFrame(f);else c.remove();
  })();
}
// Inclinación 3D + brillo de las cartas de la mano (solo mouse)
addEventListener('pointermove',e=>{
  if(e.pointerType!='mouse')return;
  const c=e.target.closest&&e.target.closest('.mia');if(!c||c.classList.contains('off'))return;
  const r=c.getBoundingClientRect(),x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
  c.style.setProperty('--ty',((x-.5)*16).toFixed(1)+'deg');c.style.setProperty('--tx',((.5-y)*14).toFixed(1)+'deg');
  c.style.setProperty('--mx',(x*100).toFixed(0)+'%');c.style.setProperty('--my',(y*100).toFixed(0)+'%');
});
addEventListener('pointerout',e=>{
  const c=e.target.closest&&e.target.closest('.mia');
  if(c&&!c.contains(e.relatedTarget)){c.style.removeProperty('--tx');c.style.removeProperty('--ty')}
});
// "..." animados en los textos de espera
function puntos(t){const s=t.textContent;if(/…$/.test(s)){t.textContent=s.slice(0,-1);t.append(h('span','pts',h('i','','.'),h('i','','.'),h('i','','.')))}}
// Las cartas que se jugaron vuelan desde la mano hacia el centro de la mesa
function fantasmas(old,hand){
  if(RM)return;
  const c=$('.centro'),cr=c?c.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight};
  const tx=cr.left+cr.width/2,ty=cr.top+cr.height/2;
  old.filter(o=>!hand.includes(o.id)).forEach((o,k)=>{
    const g=o.el.cloneNode(true),rot=o.sel?0:o.fr;
    g.className='carta fantasma'+(o.id[0]=='r'?' roja':'');
    g.style.cssText=`left:${o.x-o.w/2}px;top:${o.y-o.h/2}px;width:${o.w}px;height:${o.h}px`;
    g.querySelectorAll('.num').forEach(n=>n.remove());
    document.body.append(g);
    const dx=tx-o.x+k*14,dy=ty-o.y;
    g.animate([
      {transform:`rotate(${rot}deg) scale(${o.sel?1.08:1})`,opacity:1,offset:0},
      {transform:`translate(${dx*.8}px,${dy*.8}px) rotate(${rot+14}deg) scale(.9)`,opacity:1,offset:.7},
      {transform:`translate(${dx}px,${dy}px) rotate(${rot+22}deg) scale(.7)`,opacity:0,offset:1}
    ],{duration:650,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).onfinish=()=>g.remove();
  });
}
// Cartas nuevas del centro: caen sobre la mesa; las que estaban boca abajo se dan vuelta
function animarCentro(){
  const c=$('.centro');if(!c)return;
  const cur=new Map();let k=0;
  [...c.children].forEach((row,ri)=>{
    [...row.querySelectorAll(':scope>.carta')].forEach((el,ci)=>{
      if(el.classList.contains('hueco'))return;
      const pos=ri+'.'+ci,id=el.dataset.id||'back',prev=T.pos.get(pos);cur.set(pos,id);
      if(prev===id||RM)return;
      if(prev==='back'&&id!=='back')el.classList.add('voltea');
      else{el.classList.add('entra');el.style.setProperty('--d',(k++*110)+'ms');el.style.setProperty('--rot0',(Math.random()*30-15|0)+'deg')}
    });
  });
  T.pos=cur;
}

/* ---------- PANTALLAS ---------- */
function home(){
  resetT();K='';document.body.classList.remove('juego');
  const app=$('#app');app.innerHTML='';
  const nom=h('input');nom.placeholder='Tu nombre';nom.maxLength=14;nom.value=myName;
  const cod=h('input','cod');cod.placeholder='0000';cod.maxLength=4;cod.inputMode='numeric';cod.value=localStorage.jhCode||'';
  const ok=()=>{myName=nom.value.trim();if(!myName){aviso('Escribí tu nombre');return false}localStorage.jhName=myName;out=false;return true};
  const entrar=btn('Unirse',()=>{if(!ok())return;if(!/^\d{4}$/.test(cod.value))return aviso('El código tiene 4 números');unirse(cod.value)},false,'alt');
  const crearB=btn('Crear sala',()=>ok()&&crear());
  nom.onkeydown=e=>{if(e.key=='Enter')crearB.click()};cod.onkeydown=e=>{if(e.key=='Enter')entrar.click()};
  let li=0;const tit=h('h1','',...'VIÑETAS LOCAS'.split(' ').map(w=>h('span','pal',...[...w].map(ch=>{const s=h('span','letra',ch);s.style.setProperty('--i',li++);return s}),' ')));
  tit.setAttribute('aria-label','Viñetas Locas');
  const ids=[0,1,2,3,4].map(i=>i==2&&CONFIG.rojas?'r'+(1+Math.random()*CONFIG.rojas|0):'n'+(1+Math.random()*CONFIG.normales|0));
  const fan=h('div','abanico',ids.map((id,i)=>{const c=card(id,'',true);c.style.setProperty('--i',i);c.style.setProperty('--fr',(i-2)*12+'deg');return c}));
  app.append(h('div','home',fan,tit,h('p','texto','Armá historias absurdas con tus amigos. El juez elige la mejor.'),nom,h('br'),
    crearB,h('hr'),h('p','texto chico','¿Ya tenés un código?'),cod,entrar));
}
function render(v){
  V=v;document.body.classList.add('juego');const key=v.ph+v.first+v.jc+v.pend;if(key!=K){K=key;sel=[];T.sel=[]}
  const jg=v.judge==v.me,ph=v.ph,jn=v.pl.find(p=>p.id==v.judge),inf=v.mode=='infinita',app=$('#app');
  const handNow=ph!='lobby'&&ph!='fin';
  // fotos de la mano anterior (para animar las cartas que se juegan)
  const old=handNow?[...document.querySelectorAll('.mano .mia')].map(e=>{const r=e.getBoundingClientRect();
    return{id:e.dataset.id,x:r.left+r.width/2,y:r.top+r.height/2,w:e.offsetWidth,h:e.offsetHeight,sel:e.classList.contains('sel'),fr:parseFloat(e.style.getPropertyValue('--fr'))||0,el:e}}):[];
  const scroll=app.scrollTop;app.innerHTML='';
  const max=(ph=='jugar'&&v.red)||(ph=='juez'&&v.tb)?2:1;
  const turno=ph=='jugar'&&!jg&&!v.mine&&(!v.tb||v.tb.includes(v.me));
  // sello "¡TU TURNO!" cuando te toca
  const lab=(ph=='juez'&&jg)||turno||(ph=='hist'&&jg)?'¡TU TURNO!':ph=='cabron'&&jg?'¡ELEGÍ VÍCTIMA!':ph=='juzgar'&&jg?'¡A JUZGAR!':ph=='voto'&&!jg&&!v.voted?'¡A VOTAR!':'';
  const tsig=lab?ph+v.first+v.jc+v.pend+v.hist.length:'';
  if(tsig&&tsig!=T.turn)sello(lab,'cian');
  T.turn=tsig;
  const sala=h('div','sala',h('span','','SALA'),h('b','cod',v.code),h('span','m',v.mode=='maraton'?'Maratón, quedan '+v.left:inf?'Historia interminable':v.target+' pts'+(v.mode=='cabron'?', cabrón':'')));
  sala.title='Tocá para copiar el código';sala.onclick=()=>copiar(v.code);
  app.append(h('div','top',h('h1','','VIÑETAS LOCAS'),sala));
  const mesa=h('div','mesa'),centro=h('div','centro'),acc=h('div','acciones'),txt=h('p','texto');
  const okSet=new Set();
  mesa.append(h('div','asientos',v.pl.map((p,i)=>{
    const esp=ph=='juez'||ph=='cabron'||ph=='hist'||ph=='juzgar'||ph=='resultado'?p.id==v.judge
      :ph=='jugar'?p.id!=v.judge&&!p.d&&(!v.tb||v.tb.includes(p.id)):ph=='voto'?p.id!=v.judge&&!p.d:false;
    const prev=T.score[p.id],up=!inf&&prev!==undefined&&p.s>prev,dn=!inf&&prev!==undefined&&p.s<prev;
    const s=h('div','asiento'+(p.id==v.judge&&ph!='lobby'?' juez':'')+(p.on?'':' off')+(esp?' espera'+(p.id==v.me?' tuya':''):'')+(T.players.has(p.id)?'':' llega'),
      h('div','av',AV[i%8]),h('b','',p.n+(p.id==v.me?' (vos)':'')),h('div'),
      h('div','ficha'+(up?' sube':dn?' baja':''),String(inf?v.hand.length&&p.id==v.me?v.hand.length:'·':p.s)));
    if(up||dn)s.append(h('span','plus'+(dn?' menos':''),up?'+'+(p.s-prev):'−'+(prev-p.s)));
    if(esp&&p.id!=v.me)s.append(h('span','pensando',h('i'),h('i'),h('i')));
    if((ph=='jugar'||ph=='voto')&&p.id!=v.judge&&p.d){const k=K+p.id;okSet.add(k);s.append(h('i','ok'+(T.ok.has(k)?'':' nuevo'),'✔'))}
    if(ph!='lobby'&&p.id==v.judge)s.append(h('i','corona'+(T.judge===v.judge?'':' nueva'),'👑'));
    if(isHost&&p.id!=v.me){const x=h('button','kick','✖');x.title='Sacar de la sala';x.onclick=()=>confirm('¿Sacar a '+p.n+' de la sala?')&&act({t:'kick',id:p.id});s.append(x)}
    return s})),centro);
  const hueco=()=>h('div','carta hueco','?');
  if(ph=='lobby'){
    const sf=h('select'),st=h('select'),md=h('select'),dsc=h('p','texto');
    v.pl.forEach(p=>sf.append(new Option(p.n,p.id)));[3,5,7,10].forEach(n=>st.append(new Option(n+' puntos',n)));
    Object.entries(MODOS).forEach(([k,t])=>md.append(new Option(t,k)));
    // recordar lo elegido aunque entre alguien más a la sala
    st.value=LP.target||CONFIG.puntosPorDefecto;md.value=LP.mode||'normal';if(LP.first&&v.pl.some(p=>p.id==LP.first))sf.value=LP.first;
    dsc.textContent=DESC[md.value];
    md.onchange=()=>{LP.mode=md.value;dsc.textContent=DESC[md.value]};st.onchange=()=>LP.target=+st.value;sf.onchange=()=>LP.first=sf.value;
    const cd=h('div','codigo',[...v.code].map((d,i)=>{const s=h('span','dig',d);s.style.setProperty('--i',i);return s}));
    cd.title='Tocá para copiar el código';cd.onclick=()=>copiar(v.code);
    centro.append(cd,h('p','texto','Pasales este código a tus amigos (tocalo para copiarlo). Hacen falta al menos 3 jugadores.'));
    if(isHost)acc.append(h('label','texto','Modo: ',md),dsc,h('label','texto','Primer juez / primero en jugar: ',sf),h('br'),h('label','texto','Puntos para ganar: ',st),h('br'),
      btn('¡Repartir!',()=>act({t:'start',first:sf.value,target:+st.value,mode:md.value}),v.pl.length<3));
    else txt.textContent='Esperando a que el anfitrión reparta las cartas…';
  }else if(ph=='juez'||ph=='jugar'){
    const row=h('div','historia');
    if(v.red)row.append(hueco(),hueco(),card(v.first));
    else if(ph=='juez')row.append(v.first?card(v.first):hueco(),hueco(),hueco());
    else row.append(...(v.jp=='antes'?[card(v.jc),card(v.first),hueco()]:[card(v.first),card(v.jc),hueco()]));
    centro.append(row);
    if(ph=='juez')txt.textContent=jg?(v.tb?'Desempate: elegí 2 cartas (sin borde rojo) para empezar la historia.':'Sos el juez: elegí una carta (sin borde rojo) y decidí si va antes o después de la primera.'):jn.n+' está eligiendo su carta…';
    else if(v.tb&&!v.tb.includes(v.me)&&!jg)txt.textContent='Desempate entre los empatados. Esperá…';
    else if(jg)txt.textContent='Los jugadores están armando sus historias…';
    else if(v.mine)txt.textContent='Carta jugada. Esperando a los demás…';
    else txt.textContent=v.red?'¡Carta roja! Elegí 2 cartas, en orden, que lleguen hasta la roja (vale doble).':'Elegí la 3ª viñeta para terminar la historia. Las de borde rojo van solo acá.';
    if(ph=='juez'&&jg&&v.tb)acc.append(btn('Jugar estas 2',()=>act({t:'jplay',cards:sel}),sel.length!=2));
    else if(ph=='juez'&&jg&&sel.length)acc.append(btn('Ponerla ANTES',()=>act({t:'jplay',card:sel[0],pos:'antes'}),false,'alt'),btn('Ponerla DESPUÉS',()=>act({t:'jplay',card:sel[0],pos:'despues'})));
    if(turno)acc.append(btn('Jugar',()=>act({t:'play',cards:sel}),sel.length!=max));
  }else if(ph=='cabron'){
    centro.append(h('div','historia',card(v.first)));
    if(jg){txt.textContent='Carta roja en modo cabrón: te quedás 1 punto. Elegí a quién le sacás 1.';v.pl.filter(p=>p.id!=v.me).forEach(p=>acc.append(btn(p.n,()=>act({t:'cabron',id:p.id}))))}
    else txt.textContent=jn.n+' está eligiendo a quién quitarle un punto…';
  }else if(ph=='hist'||ph=='voto'){
    centro.append(h('div','historia',v.hist.map(c=>card(c))));
    if(ph=='voto')centro.append(h('div','historia gana',card(v.pend),h('small','',jn.n+' propone esta viñeta')));
    if(ph=='hist'){
      txt.textContent=jg?'Tu turno: sumá una viñeta con sentido o cambiá 1 carta por 2 y perdé el turno.':'Turno de '+jn.n+'…';
      if(jg)acc.append(btn('Jugar carta',()=>act({t:'hplay',card:sel[0]}),sel.length!=1),btn('No puedo: cambiar 1 por 2',()=>act({t:'hpass',card:sel[0]}),sel.length!=1,'alt'));
    }else if(jg)txt.textContent='Los demás están votando tu viñeta…';
    else if(v.voted)txt.textContent='Voto enviado. Esperando…';
    else{txt.textContent='¿La viñeta tiene sentido en la historia?';acc.append(btn('👍 Sí',()=>act({t:'vote',ok:true})),btn('👎 Rechazar',()=>act({t:'vote',ok:false}),false,'alt'))}
  }else{
    const todas=(v.st||[]).every(s=>s.f),pick=ph=='juzgar'&&jg&&todas;
    if(inf)centro.append(h('div','historia',v.hist.map(c=>card(c))));
    if(!v.st&&v.first&&ph!='fin')centro.append(h('div','historia',card(v.first)));
    (v.st||[]).forEach((s,i)=>{
      const r=h('div','historia'+(pick?' click':'')+(ph!='juzgar'&&i==v.wi?' gana':'')+(ph!='juzgar'&&v.wi!=null&&i!=v.wi?' perdio':''),s.c.map(c=>{
        if(c)return card(c);
        const d=h('div','carta dorso'+(jg&&!s.f?' voltear':''),'?');
        if(jg&&!s.f)d.onclick=()=>act({t:'reveal',i});return d}));
      if(pick)r.onclick=()=>act({t:'pick',i});
      if(v.own)r.append(h('small','',(i==v.wi?'⭐ ':'')+v.own[i]));centro.append(r);
    });
    const w=v.pl.find(p=>p.id==v.win);
    if(ph=='juzgar'){
      if(!jg)txt.textContent=jn.n+' está dando vuelta las historias…';
      else if(!todas){txt.textContent='Tocá las cartas boca abajo para darlas vuelta de a una.';const k=v.st.findIndex(s=>!s.f);acc.append(btn('Voltear siguiente',()=>act({t:'reveal',i:k}),false,'alt'))}
      else txt.textContent='Tocá la historia que más te hizo reír.';
    }else if(ph=='fin'){
      centro.prepend(h('div','grande trofeo',w?'🏆 ¡Ganó '+w.n+'! 🏆':'🤝 '+v.res));
      if(isHost)acc.append(btn('Jugar otra vez',()=>act({t:'again'})));
    }else{
      txt.textContent=v.res||w.n+' gana '+(v.red?'2 puntos':'1 punto')+'.';
      if(jg||isHost)acc.append(btn('Siguiente ronda',()=>act({t:'next'})));
    }
  }
  const raw=txt.textContent;if(raw!==T.txt)txt.classList.add('cambia');puntos(txt);
  const sg=[...acc.children].map(b=>b.textContent).join('|');if(sg!==T.acc)acc.classList.add('nuevo');
  mesa.append(txt,acc);app.append(mesa);
  if(handNow){
    const can=(ph=='juez'&&jg)||turno||(ph=='hist'&&jg);let nk=0;
    app.append(h('div','mano',v.hand.map(id=>{
      const ok=can&&!(id[0]=='r'&&(v.red||ph=='juez')),i=sel.indexOf(id),nuevo=!T.hand||!T.hand.has(id),was=T.sel.includes(id);
      const el=card(id,'mia'+(ok?'':' off')+(i>=0?' sel':'')+(nuevo?' reparte':i>=0&&!was?' sube':i<0&&was?' baja':''));
      if(nuevo)el.style.setProperty('--d',(nk++*80)+'ms');
      if(i>=0&&max==2)el.append(h('span','num',String(i+1)));
      if(ok)el.onclick=()=>{if(i>=0)sel.splice(i,1);else{sel.push(id);if(sel.length>max)sel.shift()}render(V)};
      return el})));
    ajustarMano();
  }
  app.scrollTop=scroll;
  ajustarCentro();
  animarCentro();
  if(handNow)fantasmas(old,v.hand);
  // sellos y confeti al cambiar de fase
  if(T.ph&&T.ph!=ph){
    const w=v.pl.find(p=>p.id==v.win);
    if(ph=='resultado'){sello(w?'¡'+w.n+' gana!':'¡Cabrón!',w?'':'rojo');if(w)confeti(70)}
    else if(ph=='fin'){sello(w?'¡Ganó '+w.n+'!':'¡Empate!',w?'':'cian');confeti(w?220:60)}
    else if(T.ph=='voto'&&ph=='hist'){const ok=v.hist.length>(T.hist||0);sello(ok?'¡Aceptada!':'¡Rechazada!',ok?'verde':'rojo')}
  }
  // recordar lo dibujado para animar solo lo que cambia
  T.hand=handNow?new Set(v.hand):null;T.sel=sel.slice();T.players=new Set(v.pl.map(p=>p.id));T.ok=okSet;
  T.score=ph=='lobby'?{}:Object.fromEntries(v.pl.map(p=>[p.id,p.s]));T.judge=ph=='lobby'?null:v.judge;
  T.ph=ph;T.txt=raw;T.acc=sg;T.hist=v.hist.length;
}
function ajustarMano(){
  const m=$('.mano');if(!m||!m.children.length)return;
  const n=m.children.length,W=m.clientWidth-28,cs=[...m.children];
  if(W<640){
    m.classList.add('grid');m.style.setProperty('--cw',Math.min(Math.floor((W-24)/4),Math.floor(innerHeight*.34/Math.ceil(n/4)*.6786))+'px');m.style.setProperty('--sp','0px');
    cs.forEach(c=>{c.style.setProperty('--fr','0deg');c.style.setProperty('--fy','0px')});
  }else{
    m.classList.remove('grid');
    const cw=Math.min(200,Math.floor(innerHeight*.25*.6786),Math.max(70,Math.floor(W/n)-10)),step=n>1?Math.min(cw+10,(W-cw)/(n-1)):0;
    m.style.setProperty('--cw',cw+'px');m.style.setProperty('--sp',(step-cw)+'px');
    // abanico: las cartas se abren como en la mano de un jugador de truco
    const ang=Math.min(8,n*1.3),caida=Math.min(16,n*2);
    cs.forEach((c,i)=>{const t=n>1?i/(n-1)*2-1:0;c.style.setProperty('--fr',(t*ang).toFixed(2)+'deg');c.style.setProperty('--fy',(t*t*caida).toFixed(1)+'px')});
  }
}
function ajustarCentro(){
  const c=$('.centro');if(!c)return;let w=Math.min(150,innerHeight*.26*.6786);c.style.setProperty('--w',w+'px');
  for(let i=0;i<16&&w>40&&(c.scrollHeight>c.clientHeight+1||c.scrollWidth>c.clientWidth+1);i++){w*=.9;c.style.setProperty('--w',w+'px')}
}
addEventListener('resize',()=>{ajustarMano();ajustarCentro()});
home();
