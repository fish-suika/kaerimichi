/* =========================================================================
   6. PLAYER / INPUT / UI
   ========================================================================= */
const PL={
  pos:new THREE.Vector3(0,0,0),
  yaw:0,pitch:0,
  vx:0,vz:0,
  height:1.60,eye:1.60,
  bob:0,bobAmt:0,roll:0,
  canMove:true,canLook:true,
  running:false,
  sit:0,
  surface:"asphalt",
  force:null,        // 強制移動 {to:Vector3, spd, done}
  noClip:false,      // 演出中は壁抜けを許す
  lookAt:null        // 強制注視 {v:Vector3, k}
};
const KEY={};
let mouseSens=1, locked=false, paused=false, dragging=false;

/* ---------- 入力 ---------- */
addEventListener("keydown",e=>{
  KEY[e.code]=true;
  if(e.code==="Escape"&&STORY.started&&!STORY.ended)togglePause(true);
  if(e.code==="KeyE")tryInteract();
  if(e.code==="Space")e.preventDefault();
});
addEventListener("keyup",e=>{KEY[e.code]=false;});
addEventListener("blur",()=>{for(const k in KEY)KEY[k]=false;});

/* ポインタロックは使えない環境がある（埋め込みフレーム、data: URL など）。
   新しめの Chrome は Promise を返すので、拒否されても握りつぶす。 */
function lockPointer(){
  if(MOBILE||!canvas.requestPointerLock)return;
  try{
    const p=canvas.requestPointerLock();
    if(p&&p.catch)p.catch(()=>{});
  }catch(e){}
}
canvas.addEventListener("click",()=>{
  if(MOBILE)return;                    // スマホはポインタロックを使わない
  if(!STORY.started||paused||STORY.ended)return;
  if(!locked)lockPointer();
});
document.addEventListener("pointerlockchange",()=>{
  locked=(document.pointerLockElement===canvas);
  if(!locked&&STORY.started&&!paused&&!STORY.ended)togglePause(true);
});
addEventListener("mousemove",e=>{
  if(!PL.canLook)return;
  if(locked){
    PL.yaw-=e.movementX*.0022*mouseSens;
    PL.pitch-=e.movementY*.0022*mouseSens;
  }else if(dragging){
    PL.yaw-=e.movementX*.0030*mouseSens;
    PL.pitch-=e.movementY*.0030*mouseSens;
  }
  PL.pitch=clamp(PL.pitch,-1.35,1.35);
});
// ポインタロックが使えない環境向けのドラッグ操作
canvas.addEventListener("mousedown",()=>{if(!locked)dragging=true;});
addEventListener("mouseup",()=>{dragging=false;});

/* ---------- UI ---------- */
const UI={
  fadeEl:$("fade"),subEl:$("sub"),objEl:$("obj"),objT:$("objt"),
  promptEl:$("prompt"),promptT:$("promptt"),crossEl:$("cross"),hintEl:$("hint"),
  actEl:$("act"),
  q:[],cur:null,curT:0
};
function fadeTo(v,sec){
  UI.fadeEl.style.transition="opacity "+(sec==null?1:sec)+"s linear";
  UI.fadeEl.style.opacity=v;
}
function say(text,dur){UI.q.push({t:text,d:dur||Math.max(2.4,1.6+Array.from(text).length*.13)});}
function sayNow(text,dur){UI.q.length=0;UI.cur=null;UI.subEl.classList.remove("on");say(text,dur);}
function clearSay(){UI.q.length=0;UI.cur=null;UI.subEl.classList.remove("on");}
function updateSay(dt){
  if(UI.cur){
    UI.curT-=dt;
    if(UI.curT<=0){UI.subEl.classList.remove("on");UI.cur=null;UI.curT=.9;}
    return;
  }
  if(UI.curT>0){UI.curT-=dt;return;}
  if(UI.q.length){
    UI.cur=UI.q.shift();
    UI.subEl.textContent=UI.cur.t;
    UI.subEl.classList.add("on");
    UI.curT=UI.cur.d;
  }
}
let objTimer=0;
function setObjective(t){
  if(t===null||t===""){UI.objEl.classList.remove("on");return;}
  UI.objT.textContent=t;
  UI.objEl.classList.add("on");
}
function hint(t){
  UI.hintEl.textContent=t;
  UI.hintEl.classList.add("on");
  clearTimeout(hint._t);
  hint._t=setTimeout(()=>UI.hintEl.classList.remove("on"),5200);
}

/* ---------- インタラクト ---------- */
let curInt=null;
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3();
function updateInteract(){
  let best=null,bd=1e9;
  camera.getWorldDirection(_v1);
  for(let i=0;i<INTERACT.length;i++){
    const it=INTERACT[i];
    if(it.on&&!it.on())continue;
    const d=it.pos.distanceTo(PL.pos);
    if(d>it.r)continue;
    _v2.subVectors(it.pos,camera.position).normalize();
    if(_v1.dot(_v2)<(it.face==null?.5:it.face))continue;
    if(d<bd){bd=d;best=it;}
  }
  if(!PL.canMove&&!(best&&best.always))best=null;
  curInt=best;
  if(best){
    UI.promptT.textContent=best.label||"調べる";
    UI.promptEl.classList.add("on");
    UI.crossEl.classList.add("hot");
    UI.actEl.classList.add("on");          // スマホの「調べる」ボタン
  }else{
    UI.promptEl.classList.remove("on");
    UI.crossEl.classList.remove("hot");
    UI.actEl.classList.remove("on");
  }
}
function tryInteract(){
  if(!curInt||paused||!STORY.started)return;
  const it=curInt;
  UI.promptEl.classList.remove("on");
  UI.crossEl.classList.remove("hot");
  UI.actEl.classList.remove("on");
  curInt=null;
  it.fn(it);
}

/* ---------- 移動 ---------- */
function collideXZ(x,z,r,list){
  for(let pass=0;pass<2;pass++){
    for(let i=0;i<list.length;i++){
      const s=list[i];
      if(x>s.x0-r&&x<s.x1+r&&z>s.z0-r&&z<s.z1+r){
        const dl=x-(s.x0-r),dr=(s.x1+r)-x,dt=z-(s.z0-r),db=(s.z1+r)-z;
        const m=Math.min(dl,dr,dt,db);
        if(m===dl)x=s.x0-r;else if(m===dr)x=s.x1+r;
        else if(m===dt)z=s.z0-r;else z=s.z1+r;
      }
    }
  }
  return [x,z];
}
/* 歩幅は速く動くほど伸びる（実際の歩き〜小走りと同じ）。
   歩数/秒 = 速度 ÷ 歩幅 なので、速度を上げても足音のテンポが暴走しない。
     1.7m/s → 歩幅0.94m・1.8歩/秒（歩き）
     3.3m/s → 歩幅1.15m・2.9歩/秒（小走り）        */
function strideOf(sp){return .72+.13*sp;}
let stepPhase=0,stepFoot=0;
function surfaceAt(){
  if(scene===scIn){
    const rz=PL.pos.z-(G.roomB&&G.roomB.group.visible?-40:0);
    return rz<.8?"tatami":"wood";
  }
  const p=LOC.park;
  if(PL.pos.x>p.x-18&&PL.pos.x<p.x+5&&PL.pos.z>p.z-12&&PL.pos.z<p.z+12)return "gravel";
  return "asphalt";
}
function footstep(){
  const s=surfaceAt();
  const key=s==="tatami"?"stepTatami":(s==="wood"?"stepWood":(s==="gravel"?"stepGravel":"step"));
  stepFoot^=1;                       // 左右で少しだけ音を変える
  const base=s==="asphalt"?.40:.34;
  SND.play(key,{
    vol:base*(stepFoot?1:.88)*rr(.92,1.06),
    rate:(stepFoot?1:.975)*rr(.95,1.05),
    pan:(stepFoot?.20:-.20)
  });
}
function updatePlayer(dt){
  const list=(scene===scIn)?SOLID.in:SOLID.out;

  /* 強制移動（演出用） */
  if(PL.force){
    const f=PL.force;
    _v1.subVectors(f.to,PL.pos);_v1.y=0;
    const d=_v1.length();
    if(d<.12){PL.force=null;if(f.done)f.done();}
    else{
      _v1.normalize().multiplyScalar(Math.min(f.spd*dt,d));
      PL.pos.add(_v1);
      PL.bob+=f.spd*dt*Math.PI/strideOf(f.spd);PL.bobAmt=damp(PL.bobAmt,1,6,dt);
      const ph=Math.floor(PL.bob/Math.PI);
      if(ph!==stepPhase){stepPhase=ph;footstep();}
    }
  }else if(PL.canMove){
    let ix=0,iz=0;
    if(KEY.KeyW||KEY.ArrowUp)iz-=1;
    if(KEY.KeyS||KEY.ArrowDown)iz+=1;
    if(KEY.KeyA||KEY.ArrowLeft)ix-=1;
    if(KEY.KeyD||KEY.ArrowRight)ix+=1;
    // タッチの仮想スティックは倒し幅がそのまま速さになる
    if(TOUCH.mx||TOUCH.mz){ix+=TOUCH.mx;iz+=TOUCH.mz;}
    PL.running=(!!(KEY.ShiftLeft||KEY.ShiftRight)||TOUCH.run)&&iz<=0;
    const len=Math.hypot(ix,iz);
    let tx=0,tz=0;
    if(len>0){
      const amt=Math.min(1,len);        // キーは常に1、スティックは0〜1
      ix/=len;iz/=len;
      const spd=(PL.running?4.20:3.30)*amt;
      const s=Math.sin(PL.yaw),c=Math.cos(PL.yaw);
      tx=(ix*c+iz*s)*spd;
      tz=(-ix*s+iz*c)*spd;
    }
    PL.vx=damp(PL.vx,tx,11,dt);
    PL.vz=damp(PL.vz,tz,11,dt);
    PL.pos.x+=PL.vx*dt;PL.pos.z+=PL.vz*dt;

    const sp=Math.hypot(PL.vx,PL.vz);
    PL.bobAmt=damp(PL.bobAmt,sp>.25?1:0,7,dt);
    PL.bob+=sp*dt*Math.PI/strideOf(sp);
    const ph=Math.floor(PL.bob/Math.PI);
    if(ph!==stepPhase&&sp>.5){stepPhase=ph;footstep();}
    else if(ph!==stepPhase)stepPhase=ph;
  }else{
    PL.vx=damp(PL.vx,0,12,dt);PL.vz=damp(PL.vz,0,12,dt);
    PL.bobAmt=damp(PL.bobAmt,0,6,dt);
  }

  if(!PL.noClip){
    const c=collideXZ(PL.pos.x,PL.pos.z,.36,list);
    PL.pos.x=c[0];PL.pos.z=c[1];
  }

  /* 強制注視 */
  if(PL.lookAt){
    _v1.subVectors(PL.lookAt.v,camera.position);
    const ty=Math.atan2(-_v1.x,-_v1.z);
    const tp=Math.atan2(_v1.y,Math.hypot(_v1.x,_v1.z));
    let dy=ty-PL.yaw;
    while(dy>Math.PI)dy-=Math.PI*2;
    while(dy<-Math.PI)dy+=Math.PI*2;
    PL.yaw+=dy*Math.min(1,PL.lookAt.k*dt);
    PL.pitch+=(tp-PL.pitch)*Math.min(1,PL.lookAt.k*dt);
  }

  /* カメラ */
  PL.eye=damp(PL.eye,PL.height-PL.sit,7,dt);
  const b=Math.sin(PL.bob*2)*.026*PL.bobAmt;
  const sway=Math.cos(PL.bob)*.022*PL.bobAmt;
  PL.roll=damp(PL.roll,sway*.5,8,dt);
  camera.position.set(PL.pos.x+Math.cos(PL.yaw)*sway*.1,PL.pos.y+PL.eye+b,PL.pos.z);
  camera.rotation.set(PL.pitch,PL.yaw,PL.roll,"YXZ");
}

/* ---------- ポーズ ---------- */
function togglePause(on){
  paused=on;
  document.body.classList.toggle("paused",on);
  const el=$("pause");
  if(on){
    el.classList.remove("gone");
    requestAnimationFrame(()=>el.classList.remove("hide"));
    if(document.exitPointerLock)document.exitPointerLock();
    SND.duck(.25,.25);
  }else{
    el.classList.add("hide");
    setTimeout(()=>el.classList.add("gone"),400);
    SND.duck(1,.35);
    lockPointer();
  }
}
$("resumeBtn").onclick=()=>togglePause(false);
function bindSlider(id,out,fn){
  const s=$(id),o=$(out);
  const upd=()=>{o.textContent=s.value;fn(+s.value);};
  s.oninput=upd;upd();
}
