/* =========================================================================
   0. UTIL
   ========================================================================= */
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,l,dt)=>lerp(a,b,1-Math.exp(-l*dt));
const smoothstep=t=>t*t*(3-2*t);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let RND=mulberry(0x51ee7);
const rr=(a,b)=>a+RND()*(b-a);
const ri=(a,b)=>Math.floor(a+RND()*(b-a+1));
const pick=a=>a[Math.floor(RND()*a.length)];
const $=id=>document.getElementById(id);

/* =========================================================================
   1. PROCEDURAL TEXTURES  (画像ファイルを一切使わず canvas で生成)
   ========================================================================= */
const TEX={};
(function(){
  function cv(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c;}
  function tex(w,h,draw,rx,ry){
    const c=cv(w,h),x=c.getContext("2d");draw(x,w,h);
    const t=new THREE.CanvasTexture(c);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(rx||1,ry||1);
    t.anisotropy=8; t.encoding=THREE.sRGBEncoding;
    return t;
  }
  function grain(x,w,h,n,min,max,alpha){
    for(let i=0;i<n;i++){
      const g=Math.floor(rr(min,max));
      x.fillStyle="rgba("+g+","+g+","+g+","+(alpha||1)+")";
      x.fillRect(RND()*w|0,RND()*h|0,rr(1,2.4),rr(1,2.4));
    }
  }
  function blob(x,w,h,n,col,rmin,rmax,a){
    for(let i=0;i<n;i++){
      const cx=RND()*w,cy=RND()*h,r=rr(rmin,rmax);
      const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,"rgba("+col+","+a+")");g.addColorStop(1,"rgba("+col+",0)");
      x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
    }
  }
  const JPFONT='"Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","Meiryo",sans-serif';

  /* --- アスファルト --- */
  TEX.asphalt=tex(512,512,(x,w,h)=>{
    x.fillStyle="#3a3b3d";x.fillRect(0,0,w,h);
    grain(x,w,h,26000,28,86,.85);
    grain(x,w,h,5000,90,130,.5);
    blob(x,w,h,26,"22,22,24",40,120,.5);
    blob(x,w,h,14,"78,78,80",30,90,.25);
    x.strokeStyle="rgba(20,20,22,.75)";
    for(let i=0;i<9;i++){
      x.lineWidth=rr(.6,2);x.beginPath();
      let px=RND()*w,py=RND()*h;x.moveTo(px,py);
      for(let j=0;j<12;j++){px+=rr(-38,38);py+=rr(-38,38);x.lineTo(px,py);}
      x.stroke();
    }
  });

  /* --- 側溝／コンクリート --- */
  TEX.gutter=tex(256,256,(x,w,h)=>{
    x.fillStyle="#54534e";x.fillRect(0,0,w,h);
    grain(x,w,h,9000,58,110,.7);
    blob(x,w,h,16,"40,42,38",22,64,.5);
    x.strokeStyle="rgba(34,34,32,.8)";x.lineWidth=3;
    for(let y=0;y<h;y+=64){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();}
  });

  /* --- ブロック塀 --- */
  TEX.block=tex(256,256,(x,w,h)=>{
    x.fillStyle="#6a675f";x.fillRect(0,0,w,h);
    const bw=128,bh=64;
    for(let r=0,y=0;y<h;y+=bh,r++){
      for(let px=-((r%2)*bw/2);px<w;px+=bw){
        x.fillStyle="rgb("+Math.floor(rr(96,116))+","+Math.floor(rr(94,112))+","+Math.floor(rr(86,102))+")";
        x.fillRect(px+2,y+2,bw-4,bh-4);
        x.fillStyle="rgba(48,48,44,.45)";
        x.beginPath();x.arc(px+bw*.3,y+bh*.5,9,0,7);x.fill();
        x.beginPath();x.arc(px+bw*.7,y+bh*.5,9,0,7);x.fill();
      }
    }
    grain(x,w,h,12000,60,140,.35);
    blob(x,w,h,20,"48,46,40",20,70,.45);
    blob(x,w,h,10,"30,36,28",16,50,.4);
  });

  /* --- モルタル外壁 --- */
  TEX.mortar=tex(256,256,(x,w,h)=>{
    x.fillStyle="#8f8a80";x.fillRect(0,0,w,h);
    grain(x,w,h,20000,110,165,.5);
    blob(x,w,h,26,"92,88,80",26,80,.45);
    blob(x,w,h,10,"64,62,56",30,80,.3);
  });

  /* --- サイディング（横板張り） --- */
  TEX.siding=tex(256,256,(x,w,h)=>{
    x.fillStyle="#9a938a";x.fillRect(0,0,w,h);
    grain(x,w,h,9000,120,170,.35);
    for(let y=0;y<h;y+=32){
      const g=x.createLinearGradient(0,y,0,y+32);
      g.addColorStop(0,"rgba(255,255,255,.10)");
      g.addColorStop(.82,"rgba(0,0,0,0)");
      g.addColorStop(1,"rgba(0,0,0,.42)");
      x.fillStyle=g;x.fillRect(0,y,w,32);
    }
    blob(x,w,h,12,"70,66,60",24,66,.3);
  });

  /* --- トタン波板 --- */
  TEX.tin=tex(128,128,(x,w,h)=>{
    for(let px=0;px<w;px+=16){
      const g=x.createLinearGradient(px,0,px+16,0);
      g.addColorStop(0,"#3d4a4c");g.addColorStop(.42,"#6d7c7d");g.addColorStop(1,"#33403f");
      x.fillStyle=g;x.fillRect(px,0,16,h);
    }
    blob(x,w,h,22,"110,62,30",8,30,.55);
    grain(x,w,h,3000,60,120,.3);
  });

  /* --- 瓦屋根 --- */
  TEX.roof=tex(256,256,(x,w,h)=>{
    x.fillStyle="#31373f";x.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=32){
      for(let px=0;px<w;px+=32){
        const g=x.createLinearGradient(px,y,px+32,y);
        g.addColorStop(0,"#232830");g.addColorStop(.4,"#49525d");g.addColorStop(1,"#20242b");
        x.fillStyle=g;x.beginPath();x.moveTo(px,y+32);x.lineTo(px,y+8);
        x.quadraticCurveTo(px+16,y-6,px+32,y+8);x.lineTo(px+32,y+32);x.closePath();x.fill();
      }
    }
    grain(x,w,h,5000,40,90,.35);
  });

  /* --- 畳 --- */
  TEX.tatami=tex(256,256,(x,w,h)=>{
    x.fillStyle="#8d8a5c";x.fillRect(0,0,w,h);
    x.strokeStyle="rgba(120,116,74,.85)";x.lineWidth=1;
    for(let y=0;y<h;y+=3){x.beginPath();x.moveTo(0,y+Math.sin(y*.4)*.6);x.lineTo(w,y);x.stroke();}
    x.strokeStyle="rgba(160,156,110,.35)";
    for(let px=0;px<w;px+=4){x.beginPath();x.moveTo(px,0);x.lineTo(px,h);x.stroke();}
    blob(x,w,h,14,"104,100,64",26,80,.45);
    x.fillStyle="#2f3038";x.fillRect(0,0,w,7);x.fillRect(0,h-7,w,7);
  });

  /* --- 板張り床 --- */
  TEX.wood=tex(256,256,(x,w,h)=>{
    x.fillStyle="#6b5945";x.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=42){
      for(let px=0;px<w;px+=110){
        x.fillStyle="rgb("+Math.floor(rr(88,118))+","+Math.floor(rr(70,94))+","+Math.floor(rr(52,70))+")";
        x.fillRect(px,y,100,40);
        x.strokeStyle="rgba(40,30,22,.7)";x.lineWidth=1.4;x.strokeRect(px,y,100,40);
        x.strokeStyle="rgba(60,46,34,.35)";
        for(let k=0;k<4;k++){const yy=y+rr(4,36);x.beginPath();x.moveTo(px,yy);
          x.bezierCurveTo(px+30,yy+rr(-3,3),px+60,yy+rr(-3,3),px+100,yy+rr(-2,2));x.stroke();}
      }
    }
    grain(x,w,h,4000,60,110,.25);
  });

  /* --- 砂利 --- */
  TEX.gravel=tex(256,256,(x,w,h)=>{
    x.fillStyle="#2e2c28";x.fillRect(0,0,w,h);
    for(let i=0;i<7000;i++){
      const g=Math.floor(rr(40,105));
      x.fillStyle="rgb("+g+","+(g-2)+","+(g-6)+")";
      x.beginPath();x.arc(RND()*w,RND()*h,rr(.7,2.6),0,7);x.fill();
    }
    blob(x,w,h,20,"20,22,18",24,72,.5);
  });

  /* --- 土／雑草混じり --- */
  TEX.dirt=tex(256,256,(x,w,h)=>{
    x.fillStyle="#2a2a22";x.fillRect(0,0,w,h);
    grain(x,w,h,16000,28,66,.7);
    blob(x,w,h,26,"36,46,28",22,74,.45);
    blob(x,w,h,14,"18,18,14",30,84,.5);
  });

  /* --- カーテン（縦のひだ） --- */
  TEX.curtain=tex(128,256,(x,w,h)=>{
    x.fillStyle="#8b8f99";x.fillRect(0,0,w,h);
    for(let px=0;px<w;px+=16){
      const g=x.createLinearGradient(px,0,px+16,0);
      g.addColorStop(0,"rgba(0,0,0,.46)");
      g.addColorStop(.45,"rgba(255,255,255,.16)");
      g.addColorStop(1,"rgba(0,0,0,.40)");
      x.fillStyle=g;x.fillRect(px,0,16,h);
    }
    grain(x,w,h,3000,110,160,.22);
  });

  /* --- コンビニ床（明るいタイル） --- */
  TEX.storefloor=tex(256,256,(x,w,h)=>{
    x.fillStyle="#d9d6cd";x.fillRect(0,0,w,h);
    grain(x,w,h,6000,190,232,.4);
    x.strokeStyle="rgba(150,148,140,.65)";x.lineWidth=2;
    for(let i=0;i<=256;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();
      x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke();}
  });

  /* --- 光のグロー（ビルボード） --- */
  TEX.glow=(function(){
    const c=cv(128,128),x=c.getContext("2d");
    const g=x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,"rgba(255,255,255,1)");
    g.addColorStop(.16,"rgba(255,255,255,.70)");
    g.addColorStop(.42,"rgba(255,255,255,.20)");
    g.addColorStop(1,"rgba(255,255,255,0)");
    x.fillStyle=g;x.fillRect(0,0,128,128);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
  })();

  /* --- CSSフィルムグレイン --- */
  TEX.grainCSS=(function(){
    const c=cv(120,120),x=c.getContext("2d"),d=x.createImageData(120,120);
    for(let i=0;i<d.data.length;i+=4){
      const v=Math.random()*255|0;
      d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;
    }
    x.putImageData(d,0,0);return c.toDataURL();
  })();

  /* --- 飛び出し注意の立て看板（走る子どもの絵入り） --- */
  TEX.kidsSign=function(){
    const c=cv(320,440),x=c.getContext("2d");
    x.fillStyle="#e8d838";x.fillRect(0,0,320,440);
    x.strokeStyle="#23262b";x.lineWidth=10;x.strokeRect(9,9,302,422);
    // 走る子どものピクトグラム
    x.save();x.translate(160,160);
    x.fillStyle="#23262b";
    x.beginPath();x.arc(6,-56,25,0,7);x.fill();                    // 頭
    x.lineCap="round";x.lineJoin="round";x.strokeStyle="#23262b";
    x.lineWidth=22;
    x.beginPath();x.moveTo(2,-28);x.lineTo(-6,26);x.stroke();      // 胴
    x.lineWidth=17;
    x.beginPath();x.moveTo(0,-16);x.lineTo(44,-34);x.lineTo(60,-6);x.stroke();  // 前の腕
    x.beginPath();x.moveTo(0,-14);x.lineTo(-40,-2);x.lineTo(-52,-34);x.stroke();// 後ろの腕
    x.lineWidth=19;
    x.beginPath();x.moveTo(-4,22);x.lineTo(34,52);x.lineTo(30,92);x.stroke();   // 前の脚
    x.beginPath();x.moveTo(-4,22);x.lineTo(-40,44);x.lineTo(-62,26);x.stroke(); // 後ろの脚
    x.restore();
    // 文字
    x.fillStyle="#23262b";x.textAlign="center";x.textBaseline="middle";
    x.font="800 76px "+JPFONT;
    x.fillText("飛び出し",160,332);
    x.fillText("注 意",160,404);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;
  };

  /* --- 汎用：文字看板 --- */
  TEX.sign=function(text,opt){
    opt=opt||{};
    const w=opt.w||512,h=opt.h||128;
    const c=cv(w,h),x=c.getContext("2d");
    x.fillStyle=opt.bg||"#f2efe6";x.fillRect(0,0,w,h);
    if(opt.border){x.strokeStyle=opt.border;x.lineWidth=opt.bw||8;x.strokeRect(4,4,w-8,h-8);}
    x.fillStyle=opt.fg||"#23262b";
    x.font=(opt.weight||"700")+" "+(opt.size||64)+"px "+JPFONT;
    x.textAlign="center";x.textBaseline="middle";
    const lines=String(text).split("\n");
    const lh=(opt.size||64)*1.18;
    lines.forEach((L,i)=>x.fillText(L,w/2,h/2+(i-(lines.length-1)/2)*lh));
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;
  };

  /* --- 縦書き看板 --- */
  TEX.vsign=function(text,opt){
    opt=opt||{};
    const w=opt.w||128,h=opt.h||512;
    const c=cv(w,h),x=c.getContext("2d");
    x.fillStyle=opt.bg||"#c8202a";x.fillRect(0,0,w,h);
    x.fillStyle=opt.fg||"#fff";
    x.font="700 "+(opt.size||72)+"px "+JPFONT;
    x.textAlign="center";x.textBaseline="middle";
    const ch=Array.from(String(text)),lh=(opt.size||72)*1.1;
    ch.forEach((k,i)=>x.fillText(k,w/2,h/2+(i-(ch.length-1)/2)*lh));
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
  };

  /* --- 自販機の前面（商品棚） --- */
  TEX.vendFront=function(dark){
    const c=cv(256,384),x=c.getContext("2d");
    // 本体色
    x.fillStyle=dark?"#14161a":"#8e9aa2";x.fillRect(0,0,256,384);
    // 商品を並べる内側の窓（バックライト）
    x.fillStyle=dark?"#0b0d10":"#cfc9bc";x.fillRect(8,14,240,264);
    // 商品3段
    for(let row=0;row<3;row++){
      const y=26+row*74;
      for(let col=0;col<5;col++){
        const px=16+col*47;
        const hue=[["#c0392b","#8e2b21"],["#1f6f4a","#145034"],["#2b4a8e","#1d3363"],
                   ["#d9a520","#a37a12"],["#4a4a4a","#2a2a2a"],["#a53860","#772845"]][ri(0,5)];
        const g=x.createLinearGradient(px,0,px+34,0);
        g.addColorStop(0,hue[1]);g.addColorStop(.4,hue[0]);g.addColorStop(1,hue[1]);
        x.fillStyle=dark?"#1a1d22":g;x.fillRect(px,y,34,54);
        x.fillStyle=dark?"#22252b":"rgba(255,255,255,.75)";x.fillRect(px,y+18,34,10);
      }
      // 値段の赤ランプ
      for(let col=0;col<5;col++){
        x.fillStyle=dark?"#2a1010":"#d43a2a";
        x.fillRect(16+col*47,y+58,34,9);
      }
    }
    // 下部パネルと取り出し口
    x.fillStyle=dark?"#0a0b0e":"#7d8890";x.fillRect(0,286,256,98);
    x.fillStyle=dark?"#050608":"#20242a";x.fillRect(56,330,144,44);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;
  };

  /* --- コンビニの棚（遠目用） --- */
  TEX.shelfTex=function(){
    const c=cv(256,256),x=c.getContext("2d");
    x.fillStyle="#cfcbc2";x.fillRect(0,0,256,256);
    for(let row=0;row<4;row++){
      const y=8+row*62;
      x.fillStyle="#9a978f";x.fillRect(0,y+52,256,10);
      for(let col=0;col<10;col++){
        x.fillStyle="hsl("+ri(0,360)+",38%,"+ri(40,72)+"%)";
        x.fillRect(4+col*25,y+10,20,42);
      }
    }
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
  };

  /* --- 時計の文字盤（mirror=true で数字と針が反転） --- */
  TEX.clockFace=function(mirror){
    const c=cv(256,256),x=c.getContext("2d");
    x.fillStyle="#efece4";x.beginPath();x.arc(128,128,124,0,7);x.fill();
    x.strokeStyle="#2a2c30";x.lineWidth=6;x.beginPath();x.arc(128,128,120,0,7);x.stroke();
    x.save();
    if(mirror){x.translate(256,0);x.scale(-1,1);}
    x.fillStyle="#2a2c30";x.textAlign="center";x.textBaseline="middle";
    x.font="700 30px "+JPFONT;
    for(let i=1;i<=12;i++){
      const a=(i/12)*Math.PI*2-Math.PI/2;
      x.fillText(String(i),128+Math.cos(a)*92,128+Math.sin(a)*92);
    }
    x.restore();
    const s=mirror?-1:1;
    const hand=(ang,len,wd)=>{x.strokeStyle="#1c1e22";x.lineWidth=wd;x.lineCap="round";
      x.beginPath();x.moveTo(128,128);
      x.lineTo(128+Math.cos(ang)*len*s,128+Math.sin(ang)*len);x.stroke();};
    hand((2/12)*Math.PI*2-Math.PI/2,58,9);
    hand(-Math.PI/2,86,6);
    x.fillStyle="#c0392b";x.beginPath();x.arc(128,128,6,0,7);x.fill();
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
  };

  /* --- カレンダー（mirror で文字反転） --- */
  TEX.calendar=function(mirror){
    const c=cv(256,340),x=c.getContext("2d");
    x.fillStyle="#f4f2ea";x.fillRect(0,0,256,340);
    x.save();
    if(mirror){x.translate(256,0);x.scale(-1,1);}
    x.fillStyle="#c0392b";x.fillRect(0,0,256,74);
    x.fillStyle="#fff";x.font="700 46px "+JPFONT;x.textAlign="center";x.textBaseline="middle";
    x.fillText("9月",128,38);
    x.fillStyle="#33363b";x.font="600 20px "+JPFONT;
    const days=["日","月","火","水","木","金","土"];
    days.forEach((d,i)=>x.fillText(d,20+i*36,96));
    x.font="400 19px "+JPFONT;
    let n=1;
    for(let row=0;row<5;row++)for(let col=0;col<7;col++){
      if(n>30)break;
      x.fillStyle=col===0?"#c0392b":(col===6?"#2b64a5":"#33363b");
      x.fillText(String(n),20+col*36,128+row*38);n++;
    }
    x.restore();
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
  };
})();
