(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const shell = document.querySelector('.game-shell');
  const W = 2600, H = 1800;
  const foods = [];
  const bots = [];
  const colors = ['#d98c72','#7d9a83','#a187b7','#d1a459','#7488a3','#c77988','#91a65d','#d28455','#8390a9','#ba8d68','#7ba39e','#b8838c','#9e9a63','#c48b68'];
  const names = ['Pip','Moss','Poppy','Juniper','Bramble','Fig','Clover','Miso','Wren','Dandelion','Biscuit','Fern','Otto','Pearl'];
  const kinds = [
    {name:'berry',color:'#bd6370',r:7,growth:2}, {name:'clover',color:'#8da76d',r:8,growth:2},
    {name:'peach',color:'#e6a16e',r:10,growth:3}, {name:'mushroom',color:'#d8b779',r:9,growth:3},
    {name:'starfruit',color:'#e3c855',r:8,growth:4}
  ];
  let dpr=1, vw=innerWidth, vh=innerHeight, last=0, active=false, dead=false, soundOn=false, toastTimer;
  let camera={x:W/2,y:H/2}, pointer={x:0,y:0,active:false}, joy={x:0,y:0,down:false};
  const player={x:W/2,y:H/2,r:22,mass:22,color:'#e79572',name:'You',alive:true,dir:0,speed:0};
  let particles=[];
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function seed(){
    foods.length=0;bots.length=0;
    for(let i=0;i<320;i++) foods.push(makeFood());
    const masses=[31,36,43,51,59,68,78,88,100,114,128,145,164,188];
    for(let i=0;i<14;i++) bots.push({x:rand(140,W-140),y:rand(140,H-140),mass:masses[i],r:radius(masses[i]),color:colors[i],name:names[i],phase:rand(0,8),target:null,dir:rand(0,6.28),speed:0,alive:true});
  }
  function makeFood(){const k=kinds[Math.floor(Math.random()*kinds.length)];return{x:rand(35,W-35),y:rand(35,H-35),r:k.r,color:k.color,type:k.name,growth:k.growth,phase:rand(0,6.28)}}
  function radius(m){return 12+Math.sqrt(m)*3.25}
  function resize(){vw=innerWidth;vh=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(vw*dpr);canvas.height=Math.floor(vh*dpr);canvas.style.width=vw+'px';canvas.style.height=vh+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
  function start(){player.x=rand(W*.38,W*.62);player.y=rand(H*.38,H*.62);player.mass=22;player.r=radius(player.mass);player.alive=true;active=true;dead=false;camera.x=player.x;camera.y=player.y;document.querySelector('#startScreen').classList.add('hidden');document.querySelector('#respawnScreen').classList.add('hidden');document.querySelector('#mobileTip').style.display=matchMedia('(max-width:700px)').matches?'block':'none';updateHud()}
  function showToast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1700)}
  function move(ent,dt,isPlayer=false){
    let dx=0,dy=0;
    if(isPlayer){
      if(joy.down){dx=joy.x;dy=joy.y}
      else if(pointer.active){const sx=vw/2,sy=vh/2;dx=(pointer.x-sx)/Math.max(1,Math.min(vw,vh)*.31);dy=(pointer.y-sy)/Math.max(1,Math.min(vw,vh)*.31);const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l}}
      else {if(keys.has('ArrowLeft')||keys.has('a'))dx-=1;if(keys.has('ArrowRight')||keys.has('d'))dx+=1;if(keys.has('ArrowUp')||keys.has('w'))dy-=1;if(keys.has('ArrowDown')||keys.has('s'))dy+=1}
      const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l}
    } else {
      ent.phase+=dt*.001;
      if(!ent.target||Math.random()<.008){
        let nearest=null,nd=420;
        for(const f of foods){const d=Math.hypot(ent.x-f.x,ent.y-f.y);if(d<nd){nd=d;nearest=f}}
        let prey=null,pd=320;
        for(const other of bots){if(other!==ent&&other.alive&&ent.mass>other.mass*1.22){const d=dist(ent,other);if(d<pd){pd=d;prey=other}}}
        if(player.alive&&ent.mass>player.mass*1.25&&dist(ent,player)<pd){prey=player}
        ent.target=prey||nearest;
      }
      if(ent.target){const tx=ent.target.x,ty=ent.target.y;dx=tx-ent.x;dy=ty-ent.y;const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;if(ent.target.mass&&l>350)ent.target=null}
      if(Math.random()<.006){ent.target=null;dx=Math.cos(ent.phase*1.4);dy=Math.sin(ent.phase*1.7)}
    }
    let magnitude=Math.hypot(dx,dy);if(magnitude>.04){ent.dir=Math.atan2(dy,dx)}
    const speed=(isPlayer?190:165)/(1+Math.max(0,ent.mass-25)*.0019);
    ent.speed+=(magnitude*speed-ent.speed)*Math.min(1,dt*.008);
    ent.x=clamp(ent.x+dx*ent.speed*dt/1000,ent.r,W-ent.r);ent.y=clamp(ent.y+dy*ent.speed*dt/1000,ent.r,H-ent.r);
  }
  const keys=new Set();
  function simulate(dt){
    for(const b of bots){if(!b.alive)continue;move(b,dt);b.r=radius(b.mass)}
    if(active&&player.alive){move(player,dt,true);player.r=radius(player.mass);camera.x+=(player.x-camera.x)*Math.min(1,dt*.0032);camera.y+=(player.y-camera.y)*Math.min(1,dt*.0032)}
    const eat=(e,food)=>{if(Math.hypot(e.x-food.x,e.y-food.y)<e.r+food.r*.65){e.mass+=food.growth;e.r=radius(e.mass);food.x=rand(35,W-35);food.y=rand(35,H-35);const k=kinds[Math.floor(Math.random()*kinds.length)];food.color=k.color;food.type=k.name;food.r=k.r;food.growth=k.growth;if(e===player){updateHud();if(e.mass%10<3)showToast(['A little bigger!','Good find!','Lovely nibble!'][Math.floor(Math.random()*3)])}return true}return false};
    for(const f of foods){if(active&&player.alive)eat(player,f);for(const b of bots)if(b.alive)eat(b,f)}
    const everyone=[...bots,...(active&&player.alive?[player]:[])];
    for(let i=0;i<everyone.length;i++)for(let j=i+1;j<everyone.length;j++){
      const a=everyone[i],b=everyone[j];if(!a.alive||!b.alive)continue;const d=dist(a,b);if(d<a.r+b.r*.55){let eater,smaller;if(a.mass>b.mass*1.16){eater=a;smaller=b}else if(b.mass>a.mass*1.16){eater=b;smaller=a}else continue;eater.mass+=Math.max(5,Math.round(smaller.mass*.68));eater.r=radius(eater.mass);smaller.alive=false;if(smaller===player){die(eater.name)}else if(eater===player){showToast(`${smaller.name} joined your little world`);updateHud()}else{setTimeout(()=>{smaller.x=rand(100,W-100);smaller.y=rand(100,H-100);smaller.mass=rand(28,85);smaller.r=radius(smaller.mass);smaller.alive=true},2500)}}
    }
    if(!foods.length||foods.length<320) foods.push(makeFood());
    if(particles.length>80)particles.splice(0,particles.length-80);
  }
  function die(name){if(!player.alive)return;player.alive=false;active=false;dead=true;document.querySelector('#mobileTip').style.display='none';document.querySelector('#respawnCopy').textContent=`${name} was a little bigger this time. The meadow is still yours to explore.`;document.querySelector('#respawnScreen').classList.remove('hidden')}
  function updateHud(){document.querySelector('#scoreValue').textContent=active||dead?Math.floor(player.mass):'—';let label=player.mass<38?'a tiny seed':player.mass<65?'a little sprout':player.mass<105?'a meadow roamer':player.mass<160?'a mighty wanderer':'a whole little world';document.querySelector('#scoreCaption').textContent=active||dead?label:'start with a nibble';document.querySelector('#scoreTrack').style.width=`${Math.min(100,Math.max(8,((player.mass-20)/180)*100))}%`;let all=[...bots,...(active||dead?[player]:[])].filter(x=>x.alive).sort((a,b)=>b.mass-a.mass).slice(0,5);const list=document.querySelector('#leaderList');list.innerHTML=all.map((e,i)=>`<li class="${e===player?'is-you':''}"><span class="rank">0${i+1}</span><span class="avatar" style="background:${e.color}"></span><span>${e===player?'You':e.name}</span><span class="size">${Math.floor(e.mass)}</span></li>`).join('');const mx=clamp(player.x/W*100,5,95),my=clamp(player.y/H*100,10,90);document.querySelector('#mapYou').style.left=mx+'%';document.querySelector('#mapYou').style.top=my+'%'}
  function paintBackground(){ctx.fillStyle='#e9e7d8';ctx.fillRect(0,0,vw,vh);ctx.save();ctx.translate(vw/2-camera.x,vh/2-camera.y);
    // soft painted land and meadow pools
    ctx.fillStyle='#d9e2ca';ctx.beginPath();ctx.ellipse(1110,805,1210,730,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dfe6d2';ctx.beginPath();ctx.ellipse(1530,940,920,610,.17,0,Math.PI*2);ctx.fill();
    for(let i=0;i<18;i++){let x=(i*371+120)%W,y=(i*619+170)%H;ctx.fillStyle=i%3?'rgba(246,239,210,.43)':'rgba(183,202,158,.28)';ctx.beginPath();ctx.ellipse(x,y,randSeed(i,60,145),randSeed(i+8,28,69),i*.5,0,Math.PI*2);ctx.fill()}
    // hand-painted wandering tracks
    ctx.lineCap='round';ctx.lineJoin='round';for(let j=0;j<5;j++){ctx.strokeStyle=`rgba(235,224,190,${.33-j*.035})`;ctx.lineWidth=34-j*6;ctx.beginPath();ctx.moveTo(-100,430+j*275);ctx.bezierCurveTo(600,280+j*260,820,850+j*100,1500,650+j*205);ctx.bezierCurveTo(1900,500+j*230,2200,800+j*200,2700,610+j*260);ctx.stroke()}
    // fine grass dots and flower doodles
    for(let i=0;i<240;i++){const x=(i*197+43)%W,y=(i*313+71)%H;ctx.strokeStyle='rgba(101,129,88,.19)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-3,y-5,x+1,y-9);ctx.stroke();if(i%4===0){ctx.fillStyle='rgba(224,175,125,.42)';ctx.beginPath();ctx.arc(x+5,y-7,1.8,0,6.28);ctx.fill()}}
    ctx.strokeStyle='rgba(113,131,99,.23)';ctx.lineWidth=2;ctx.setLineDash([6,9]);ctx.strokeRect(0,0,W,H);ctx.setLineDash([]);
    ctx.restore()}
  function randSeed(i,a,b){let v=Math.sin(i*78.23)*43758.5453;return a+(v-Math.floor(v))*(b-a)}
  function blob(e,isYou=false){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.dir||0);const r=e.r;ctx.shadowColor='rgba(67,74,55,.15)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;ctx.fillStyle=e.color;ctx.beginPath();const wobble=isYou?0.035:.025;for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;const bump=1+Math.sin(a*3+(e.phase||0))*wobble+Math.cos(a*5+(e.phase||0)*.7)*wobble*.5;const x=Math.cos(a)*r*bump,y=Math.sin(a)*r*bump;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fill();ctx.shadowColor='transparent';ctx.shadowOffsetY=0;ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1.3,r*.055);ctx.beginPath();ctx.ellipse(-r*.12,-r*.19,r*.62,r*.44,-.3,Math.PI*1.08,Math.PI*1.72);ctx.stroke();ctx.fillStyle='rgba(255,247,224,.18)';ctx.beginPath();ctx.ellipse(-r*.25,-r*.24,r*.46,r*.22,-.35,0,Math.PI*2);ctx.fill();
    ctx.rotate(-(e.dir||0));ctx.fillStyle='#fff9e9';ctx.font=`600 ${Math.max(10,Math.min(19,r*.55))}px 'DM Sans',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(Math.floor(e.mass)),0,1);if(isYou){ctx.font=`500 ${Math.max(8,r*.28)}px 'DM Sans',sans-serif`;ctx.fillStyle='rgba(59,73,55,.75)';ctx.fillText('you',0,r*.58)}ctx.restore()}
  function drawFood(f,t){ctx.save();ctx.translate(f.x,f.y+Math.sin(t*.002+f.phase)*1.5);ctx.shadowColor='rgba(63,73,48,.15)';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.fillStyle=f.color;const r=f.r;ctx.beginPath();if(f.type==='starfruit'){for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.62:r*1.18;let x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()}else if(f.type==='clover'){for(let i=0;i<4;i++){ctx.moveTo(0,0);ctx.arc(Math.cos(i*Math.PI/2)*r*.43,Math.sin(i*Math.PI/2)*r*.43,r*.55,i*Math.PI/2-1,i*Math.PI/2+1)}ctx.closePath()}else if(f.type==='mushroom'){ctx.ellipse(0,0,r*.92,r*.72,0,Math.PI,0);ctx.lineTo(r*.52,r*.7);ctx.quadraticCurveTo(0,r*.98,-r*.52,r*.7);ctx.closePath()}else{ctx.arc(0,0,r,0,Math.PI*2)}ctx.fill();ctx.shadowColor='transparent';ctx.fillStyle='rgba(255,248,223,.72)';ctx.beginPath();ctx.arc(-r*.28,-r*.28,Math.max(1.2,r*.18),0,Math.PI*2);ctx.fill();if(f.type==='peach'){ctx.strokeStyle='rgba(255,238,206,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-r*.55);ctx.quadraticCurveTo(r*.15,0,0,r*.58);ctx.stroke()}if(f.type==='clover'){ctx.strokeStyle='#7d9664';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,r*.1);ctx.lineTo(1,r*1.15);ctx.stroke()}ctx.restore()}
  function render(t){ctx.setTransform(dpr,0,0,dpr,0,0);paintBackground();ctx.save();ctx.translate(vw/2-camera.x,vh/2-camera.y);for(const f of foods)if(f.x>camera.x-vw*.65&&f.x<camera.x+vw*.65&&f.y>camera.y-vh*.65&&f.y<camera.y+vh*.65)drawFood(f,t);for(const b of bots)if(b.alive&&b.x>camera.x-vw*.7&&b.x<camera.x+vw*.7&&b.y>camera.y-vh*.7&&b.y<camera.y+vh*.7)blob(b);if(player.alive&&(active||!dead)){if(!active&&!dead){player.x+=(camera.x-player.x)*.02;player.y+=(camera.y-player.y)*.02;player.phase=t*.002}blob(player,true)}ctx.restore();if(active||dead)updateHud();requestAnimationFrame(render)}
  function frame(t){const dt=Math.min(40,t-last||16);last=t;simulate(dt);requestAnimationFrame(frame)}
  const joyEl=document.querySelector('#joystick'),knob=document.querySelector('#joyKnob');
  function setJoy(ev){const rect=joyEl.querySelector('.joy-ring').getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;let dx=ev.clientX-cx,dy=ev.clientY-cy;const max=rect.width*.31,l=Math.hypot(dx,dy);if(l>max){dx*=max/l;dy*=max/l}joy.x=dx/max;joy.y=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}
  joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.down=true;joyEl.setPointerCapture(e.pointerId);setJoy(e)});joyEl.addEventListener('pointermove',e=>{if(joy.down)setJoy(e)});for(const event of ['pointerup','pointercancel','lostpointercapture'])joyEl.addEventListener(event,()=>{joy.down=false;joy.x=joy.y=0;knob.style.transform='translate(0,0)'});
  canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true});canvas.addEventListener('pointerleave',()=>pointer.active=false);
  addEventListener('keydown',e=>{keys.add(e.key);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault()});addEventListener('keyup',e=>keys.delete(e.key));
  document.querySelector('#startButton').addEventListener('click',start);document.querySelector('#respawnButton').addEventListener('click',start);
  document.querySelector('#soundButton').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♪';e.currentTarget.style.color=soundOn?'#718858':'';showToast(soundOn?'Meadow sounds on':'Meadow sounds off')});
  addEventListener('resize',resize);seed();resize();updateHud();requestAnimationFrame(frame);requestAnimationFrame(render);
})();
