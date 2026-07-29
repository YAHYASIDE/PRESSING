/* components/photos.js — Photo capture/compress + thumbnail strip + lightbox (extracted from index.html) */
/* ================= Photos ================= */
let pendingCarBefore=[], pendingCarAfter=[], pendingCpPhotos=[];
function readAndCompress(file,cb){
  const r=new FileReader();
  r.onload=()=>{ const img=new Image();
    img.onload=()=>{ const max=640; let w=img.width,h=img.height;
      if(w>max||h>max){const s=Math.min(max/w,max/h);w=Math.round(w*s);h=Math.round(h*s);}
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      try{cb(c.toDataURL('image/jpeg',0.5));}catch(e){cb(r.result);}
    };
    img.onerror=()=>cb(r.result); img.src=r.result;
  };
  r.readAsDataURL(file);
}
function photoStripHTML(arr,kind){
  return arr.map((src,i)=>`<div class="thumb"><img src="${src}" data-view="${kind}:${i}"><button type="button" class="thumb-x" data-rm="${kind}:${i}">×</button></div>`).join("")
    +`<label class="photo-add">${svg(I.camera)}<span>صورة</span><input type="file" accept="image/*" multiple capture="environment" data-photo="${kind}" style="display:none"></label>`;
}
function openLightbox(src){ const lb=document.getElementById('lightbox'); lb.querySelector('img').src=src; lb.style.display='flex'; }
function bindPhotoStrip(containerId,arr,kind){
  const cont=document.getElementById(containerId); if(!cont) return;
  const redraw=()=>{cont.innerHTML=photoStripHTML(arr,kind);};
  redraw();
  cont.onchange=(e)=>{ const inp=e.target.closest('input[data-photo]'); if(!inp) return;
    let files=[...inp.files]; let left=files.length; if(!left) return;
    files.forEach(f=>readAndCompress(f,(url)=>{arr.push(url); if(--left<=0) redraw();}));
  };
  cont.onclick=(e)=>{
    const rm=e.target.closest('[data-rm]'); if(rm){arr.splice(+rm.dataset.rm.split(':')[1],1);redraw();return;}
    const v=e.target.closest('[data-view]'); if(v){openLightbox(arr[+v.dataset.view.split(':')[1]]);}
  };
}
function recThumbs(photos){
  if(!photos||!photos.length) return '';
  return `<div class="rec-thumbs">${photos.map(src=>`<img class="rec-thumb" src="${src}">`).join("")}</div>`;
}

