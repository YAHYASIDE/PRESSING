/* ui/theme.js — palette + light/dark theme */
const PALETTES=[
  {k:"teal",  name:"أخضر سماوي", b:"#0f9d8f", b2:"#16b8a6"},
  {k:"aqua",  name:"فيروزي",     b:"#0e8fa8", b2:"#22b6cf"},
  {k:"green", name:"أخضر",       b:"#2f9e6b", b2:"#45bd86"},
  {k:"blue",  name:"أزرق",       b:"#1c6ea4", b2:"#2f86c9"},
  {k:"olive", name:"زيتوني",     b:"#6b9e3f", b2:"#8bc45a"}
];
function applyPalette(){
  const pal=PALETTES.find(x=>x.k===state.palette)||PALETTES[0];
  const r=document.documentElement.style;
  r.setProperty("--brand", pal.b);
  r.setProperty("--brand-2", pal.b2);
}
function applyTheme(){
  document.body.classList.toggle("dark", !!state.dark);
  applyPalette();
  const btn=document.getElementById("themeBtn");
  if(btn) btn.innerHTML=svg(state.dark?I.sun:I.moon);
}

/* ---- Commit 4: namespace registration ---- */
Object.assign(App.ui, { PALETTES, applyPalette, applyTheme });
