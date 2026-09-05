/* =========================================================================
   6.5 TOUCH — スマホ・タブレットの操作
   左半分＝指を置いた場所に出る仮想スティックで移動（深く倒すと急ぐ）。
   右半分＝なぞって視点、ほとんど動かさずに離したら「調べる」。
   タッチ側で preventDefault するので合成マウスイベントは飛ばず、
   既存のマウス処理（ドラッグ視点・ポインタロック）と二重に効くことはない。
   ========================================================================= */
const TOUCH={mx:0,mz:0,run:false,moveId:null,lookId:null,
             ox:0,oy:0,lx:0,ly:0,lt:0,lmoved:0};
const STICK_R=58;                       // スティックを倒しきる距離(px)

(function(){
  const stick=$("stick"),knob=$("knob");
  const live=()=>STORY.started&&!paused&&!STORY.ended;

  function hideStick(){
    stick.classList.remove("on");
    TOUCH.mx=0;TOUCH.mz=0;TOUCH.run=false;
  }

  canvas.addEventListener("touchstart",e=>{
    e.preventDefault();
    document.body.classList.add("touch");
    if(!live())return;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.clientX<innerWidth*.5){
        if(TOUCH.moveId!==null)continue;
        TOUCH.moveId=t.identifier;TOUCH.ox=t.clientX;TOUCH.oy=t.clientY;
        stick.style.left=t.clientX+"px";stick.style.top=t.clientY+"px";
        knob.style.transform="translate(0,0)";
        stick.classList.add("on");
      }else{
        if(TOUCH.lookId!==null)continue;
        TOUCH.lookId=t.identifier;TOUCH.lx=t.clientX;TOUCH.ly=t.clientY;
        TOUCH.lt=performance.now();TOUCH.lmoved=0;
      }
    }
  },{passive:false});

  canvas.addEventListener("touchmove",e=>{
    e.preventDefault();
    if(!live())return;
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.identifier===TOUCH.moveId){
        let dx=t.clientX-TOUCH.ox,dy=t.clientY-TOUCH.oy;
        const d=Math.hypot(dx,dy)||1;
        if(d>STICK_R){dx*=STICK_R/d;dy*=STICK_R/d;}
        knob.style.transform="translate("+dx.toFixed(1)+"px,"+dy.toFixed(1)+"px)";
        const m=Math.min(1,d/STICK_R);
        if(m<.16){                       // デッドゾーン
          TOUCH.mx=0;TOUCH.mz=0;TOUCH.run=false;
        }else{
          const k=Math.hypot(dx,dy)||1;
          TOUCH.mx=dx/k*m;               // 画面の上＝前（iz は前が負）
          TOUCH.mz=dy/k*m;
          TOUCH.run=m>.86&&dy<0;
        }
      }else if(t.identifier===TOUCH.lookId){
        const dx=t.clientX-TOUCH.lx,dy=t.clientY-TOUCH.ly;
        if(PL.canLook){
          PL.yaw-=dx*.0040*mouseSens;
          PL.pitch=clamp(PL.pitch-dy*.0040*mouseSens,-1.35,1.35);
        }
        TOUCH.lmoved+=Math.abs(dx)+Math.abs(dy);
        TOUCH.lx=t.clientX;TOUCH.ly=t.clientY;
      }
    }
  },{passive:false});

  const end=e=>{
    e.preventDefault();
    for(let i=0;i<e.changedTouches.length;i++){
      const t=e.changedTouches[i];
      if(t.identifier===TOUCH.moveId){TOUCH.moveId=null;hideStick();}
      else if(t.identifier===TOUCH.lookId){
        // ほとんど動かさずに離した＝タップ。狙っている物があれば調べる
        if(live()&&TOUCH.lmoved<14&&performance.now()-TOUCH.lt<340)tryInteract();
        TOUCH.lookId=null;
      }
    }
  };
  canvas.addEventListener("touchend",end,{passive:false});
  canvas.addEventListener("touchcancel",end,{passive:false});

  $("act").addEventListener("click",()=>tryInteract());
  $("menu").addEventListener("click",()=>{
    if(STORY.started&&!STORY.ended)togglePause(!paused);
  });
})();

/* 全画面＋横向き固定。iPhone の Safari は全画面に入れないので、失敗しても構わない */
function goFullscreen(){
  const el=document.documentElement;
  const rf=el.requestFullscreen||el.webkitRequestFullscreen;
  if(!rf)return;
  try{
    Promise.resolve(rf.call(el)).then(()=>{
      if(screen.orientation&&screen.orientation.lock)
        screen.orientation.lock("landscape").catch(()=>{});
    }).catch(()=>{});
  }catch(e){}
}
