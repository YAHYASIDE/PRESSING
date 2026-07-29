/* ui/qrcode.js — tiny self-contained QR encoder (byte mode, ECC level L,
   versions 1–5, fixed mask 0). Enough to encode a short ASCII receipt payload
   with no external dependency. Exposes App.ui.qrSVG(text, opts). */
(function (App) {
  "use strict";
  // GF(256) with primitive polynomial 0x11d
  var EXP=new Array(512), LOG=new Array(256);
  (function(){ var x=1; for(var i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100) x^=0x11d; } for(i=255;i<512;i++) EXP[i]=EXP[i-255]; })();
  function gmul(a,b){ return (a===0||b===0)?0:EXP[LOG[a]+LOG[b]]; }
  function rsGenPoly(n){ var g=[1]; for(var i=0;i<n;i++){ var ng=new Array(g.length+1).fill(0); for(var j=0;j<g.length;j++){ ng[j]^=g[j]; ng[j+1]^=gmul(g[j],EXP[i]); } g=ng; } return g; }
  function rsEncode(data, ecLen){ var g=rsGenPoly(ecLen); var res=data.concat(new Array(ecLen).fill(0)); for(var i=0;i<data.length;i++){ var coef=res[i]; if(coef!==0){ for(var j=0;j<g.length;j++) res[i+j]^=gmul(g[j],coef); } } return res.slice(data.length); }

  // ECC-L single-block tables, versions 1..5
  var DATA_CW=[0,19,34,55,80,108], EC_CW=[0,7,10,15,20,26];
  var ALIGN=[null,null,18,22,26,30]; // single alignment centre for v2..5
  // 15-bit format strings for ECC level L, masks 0..7
  var FMT=["111011111000100","111001011110011","111110110101010","111100010011101","110011000101111","110001100011000","110110001000001","110100101110110"];

  function pickVersion(len){ for(var v=1;v<=5;v++){ if(len <= DATA_CW[v]-2) return v; } return 0; }

  function encode(text){
    var bytes=[]; for(var i=0;i<text.length;i++){ var c=text.charCodeAt(i); if(c<256) bytes.push(c); else { bytes.push(63); } } // ASCII payload
    var ver=pickVersion(bytes.length); if(!ver) { bytes=bytes.slice(0, DATA_CW[5]-2); ver=5; }
    var dcw=DATA_CW[ver], ecw=EC_CW[ver];
    // bit buffer
    var bits=[]; function put(val,len){ for(var b=len-1;b>=0;b--) bits.push((val>>b)&1); }
    put(4,4);            // byte mode
    put(bytes.length,8); // count (8 bits for v1..9)
    for(i=0;i<bytes.length;i++) put(bytes[i],8);
    // terminator + byte align
    var cap=dcw*8; if(bits.length+4<=cap) put(0,4); while(bits.length%8!==0) bits.push(0);
    // to codewords + pad
    var data=[]; for(i=0;i<bits.length;i+=8){ var v=0; for(var k=0;k<8;k++) v=(v<<1)|bits[i+k]; data.push(v); }
    var pad=[0xEC,0x11], pi=0; while(data.length<dcw){ data.push(pad[pi&1]); pi++; }
    var ec=rsEncode(data, ecw);
    var all=data.concat(ec);

    // build matrix
    var n=17+4*ver; var m=[]; for(i=0;i<n;i++){ m.push(new Array(n).fill(null)); }
    function finder(r,c){ for(var i=-1;i<=7;i++) for(var j=-1;j<=7;j++){ var rr=r+i, cc=c+j; if(rr<0||cc<0||rr>=n||cc>=n) continue; var on=(i>=0&&i<=6&&(j===0||j===6))||(j>=0&&j<=6&&(i===0||i===6))||(i>=2&&i<=4&&j>=2&&j<=4); m[rr][cc]=on?1:0; } }
    finder(0,0); finder(0,n-7); finder(n-7,0);
    for(i=8;i<n-8;i++){ m[6][i]=m[6][i]===null?(i%2===0?1:0):m[6][i]; m[i][6]=m[i][6]===null?(i%2===0?1:0):m[i][6]; }
    if(ALIGN[ver]!==null){ var a=ALIGN[ver]; for(i=-2;i<=2;i++) for(var j2=-2;j2<=2;j2++){ var on2=(Math.max(Math.abs(i),Math.abs(j2))!==1); m[a+i][a+j2]=on2?1:0; } }
    m[n-8][8]=1; // dark module
    // reserve format areas (set to 0 temporarily, will overwrite)
    function reserve(r,c){ if(m[r][c]===null) m[r][c]=2; }
    for(i=0;i<=8;i++){ reserve(8,i); reserve(i,8); } for(i=0;i<8;i++){ reserve(8,n-1-i); reserve(n-1-i,8); }

    // place data with zigzag, mask 0 = (r+c)%2==0
    var bitIdx=0, total=all.length*8;
    function bitAt(k){ return (all[k>>3]>>(7-(k&7)))&1; }
    var col=n-1, up=true;
    while(col>0){ if(col===6) col--; for(var rowc=0; rowc<n; rowc++){ var row=up?(n-1-rowc):rowc; for(var cc2=0; cc2<2; cc2++){ var c2=col-cc2; if(m[row][c2]!==null) continue; var dark=0; if(bitIdx<total){ dark=bitAt(bitIdx); bitIdx++; } else dark=0; if(((row+c2)%2)===0) dark^=1; m[row][c2]=dark; } } up=!up; col-=2; }

    // format info (mask 0)
    var f=FMT[0];
    for(i=0;i<15;i++){ var bit=+f[i]; // top-left
      if(i<6) m[8][i]=bit; else if(i<8) m[8][i+1]=bit; else if(i===8) m[7][8]=bit; else m[14-i][8]=bit; }
    for(i=0;i<15;i++){ var bit2=+f[i]; if(i<8) m[n-1-i][8]=bit2; else m[8][n-15+i]=bit2; }
    return { m:m, n:n, ver:ver };
  }

  App.ui.qrMatrix = function(text){ return encode(String(text||"")); };
  App.ui.qrSVG = function(text, opts){
    opts=opts||{}; var q=encode(String(text||"")); var n=q.n; var quiet=(opts.quiet!=null?opts.quiet:2); var dim=n+quiet*2;
    var px=opts.size?(opts.size/dim):8; var size=Math.round(dim*px);
    var rects=""; for(var r=0;r<n;r++){ for(var c=0;c<n;c++){ if(q.m[r][c]&1){ rects+='<rect x="'+((c+quiet)*px).toFixed(1)+'" y="'+((r+quiet)*px).toFixed(1)+'" width="'+px.toFixed(1)+'" height="'+px.toFixed(1)+'"/>'; } } }
    return '<svg class="qr-svg" viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" xmlns="http://www.w3.org/2000/svg"><rect width="'+size+'" height="'+size+'" fill="#fff"/><g fill="#152534">'+rects+'</g></svg>';
  };
})(window.App);
