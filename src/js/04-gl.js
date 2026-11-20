/* ================= GPU color + effect pass (WebGL) ================= */
const FILTERS = {
  none: { n: 'None', g: {} },
  vivid: { n: 'Vivid', g: { saturation: .35, contrast: .15 } },
  warm: { n: 'Warm', g: { temperature: .5, saturation: .08 } },
  cool: { n: 'Cool', g: { temperature: -.5, tint: -.05 } },
  tealorange: { n: 'Teal & Orange', g: { contrast: .15, saturation: .12 }, sh: [.05, .45, .5], hi: [1, .62, .3], split: .7 },
  film: { n: 'Film', g: { fade: .45, contrast: -.1, saturation: -.15, grain: .25, temperature: .15 } },
  matte: { n: 'Matte', g: { fade: .6, contrast: -.15, saturation: -.1 } },
  noir: { n: 'Noir', g: { saturation: -1, contrast: .45, vignette: .5 } },
  mono: { n: 'Mono', g: { saturation: -1 } },
  sepia: { n: 'Sepia', g: { saturation: -1, contrast: .05 }, sh: [.32, .2, .1], hi: [1, .86, .62], split: .9 },
  vintage: { n: 'Vintage', g: { fade: .4, temperature: .35, saturation: -.25, vignette: .35, grain: .2 } },
  dreamy: { n: 'Dreamy', g: { brightness: .12, contrast: -.2, saturation: .1, highlights: .3 }, sh: [.45, .35, .55], hi: [1, .8, .85], split: .5 },
  cyber: { n: 'Cyber', g: { contrast: .25, saturation: .3, tint: .3 }, sh: [.25, .05, .6], hi: [.2, 1, 1], split: .8 },
  sunset: { n: 'Sunset', g: { temperature: .6, tint: .25, saturation: .2 }, sh: [.4, .1, .35], hi: [1, .7, .3], split: .5 },
  arctic: { n: 'Arctic', g: { temperature: -.7, brightness: .08, saturation: -.2 } },
  bleach: { n: 'Bleach', g: { saturation: -.55, contrast: .4 } },
  forest: { n: 'Forest', g: { tint: -.3, saturation: .1 }, sh: [.05, .3, .2], hi: [.9, 1, .75], split: .5 },
  pastel: { n: 'Pastel', g: { fade: .4, saturation: -.2, brightness: .1, contrast: -.25 } },
  night: { n: 'Night', g: { exposure: -.4, temperature: -.5, contrast: .2 } },
  golden: { n: 'Golden hour', g: { temperature: .45, highlights: .2 }, sh: [.35, .2, .1], hi: [1, .8, .45], split: .45 },
  moody: { n: 'Moody', g: { saturation: -.3, shadows: -.3, contrast: .2, vignette: .35, temperature: -.15 } }
};
const EFFECTS = {
  rgb: { n: 'RGB split', gl: 1 }, glitch: { n: 'Glitch', gl: 1 }, vhs: { n: 'VHS', gl: 1 }, pixel: { n: 'Pixelate', gl: 1 },
  wave: { n: 'Wave', gl: 1 }, mirror: { n: 'Mirror', gl: 1 }, film: { n: 'Old film', gl: 1 }, bulge: { n: 'Fisheye', gl: 1 },
  poster: { n: 'Posterize', gl: 1 }, invert: { n: 'Invert', gl: 1 }, edge: { n: 'Sketch', gl: 1 }, dots: { n: 'Halftone', gl: 1 },
  shake: { n: 'Camera shake' }, zoom: { n: 'Zoom pulse' }, flash: { n: 'Flash' }, strobe: { n: 'Strobe' }, blur: { n: 'Blur' }, leak: { n: 'Light leak' }
};
const GL = { ok: null };
function glInit() {
  if (GL.ok !== null) return GL.ok;
  const cv = document.createElement('canvas'); cv.width = cv.height = 4;
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
  if (!gl) { GL.ok = false; return false; }
  const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const fs = `precision highp float;varying vec2 v;uniform sampler2D T;uniform vec2 R;uniform float tm;
uniform float bri,con,sat,ex,tem,tin,hue,hil,shd,fad,vig,grn,shp;uniform vec3 shC,hiC;uniform float spl;
uniform float key;uniform vec3 keyC;uniform float kSim,kSm,kSp;
uniform float eRgb,eGl,eVhs,ePix,eWav,eMir,eFilm,eBul,ePos,eInv,eEdge,eDot;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float lu(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec2 cbcr(vec3 c){return vec2(-.1687*c.r-.3313*c.g+.5*c.b,.5*c.r-.4187*c.g-.0813*c.b);}
vec4 S(vec2 u){return texture2D(T,clamp(u,0.,1.));}
void main(){vec2 u=v;
 if(eMir>0.){u.x=u.x>.5?1.-u.x:u.x;}
 if(eBul!=0.){vec2 d=u-.5;float r=length(d);u=.5+d*(1.-eBul*.6*(1.-r*r*2.));}
 if(eWav>0.){u.x+=sin(u.y*18.+tm*4.)*.012*eWav;u.y+=cos(u.x*14.+tm*3.)*.008*eWav;}
 if(eGl>0.){float row=floor(u.y*24.);float t=floor(tm*12.);float h=hs(vec2(row,t));if(h>1.-eGl*.45)u.x+=(hs(vec2(t,row))-.5)*.18*eGl;}
 if(eVhs>0.){u.x+=(hs(vec2(floor(u.y*200.),floor(tm*30.)))-.5)*.003*eVhs;float band=step(.985,fract(u.y*1.3-tm*.3));u.x+=band*.02*eVhs;}
 if(ePix>1.){vec2 px=R/ePix;u=(floor(u*px)+.5)/px;}
 vec4 c=S(u);
 if(eRgb>0.||eVhs>0.){vec2 o=vec2(.004*eRgb+.003*eVhs,0.);vec4 a=S(u+o),b=S(u-o);c=vec4(a.r,c.g,b.b,max(c.a,max(a.a,b.a)));}
 if(shp>0.){vec2 e=1./R;vec4 bl=(S(u+vec2(e.x,0))+S(u-vec2(e.x,0))+S(u+vec2(0,e.y))+S(u-vec2(0,e.y)))*.25;c.rgb+=(c.rgb-bl.rgb)*shp*2.;}
 if(eEdge>0.){vec2 e=1.5/R;float gx=lu(S(u+vec2(e.x,0)).rgb)-lu(S(u-vec2(e.x,0)).rgb);float gy=lu(S(u+vec2(0,e.y)).rgb)-lu(S(u-vec2(0,e.y)).rgb);float ed=1.-clamp(length(vec2(gx,gy))*4.,0.,1.);c.rgb=mix(c.rgb,vec3(ed)*vec3(.98,.96,.92),eEdge);}
 float a=c.a;vec3 k=c.rgb;
 if(key>0.){float d=distance(cbcr(k),cbcr(keyC));float m=smoothstep(kSim,kSim+max(kSm,.001),d);a*=m;float sp=clamp(1.-(d-kSim)/max(kSm*2.+.05,.001),0.,1.)*kSp;k=mix(k,vec3(lu(k)),sp);}
 k*=exp2(ex);
 k+=bri*.25;
 float l=lu(k);
 k+=hil*.3*smoothstep(.45,1.,l);k+=shd*.3*(1.-smoothstep(0.,.55,l));
 k=(k-.5)*(1.+con)+.5;
 k.r+=tem*.09;k.b-=tem*.09;k.g-=tin*.07;k.r+=tin*.025;k.b+=tin*.025;
 if(hue!=0.){float cs=cos(hue),sn=sin(hue);mat3 m=mat3(.299+.701*cs+.168*sn,.299-.299*cs-.328*sn,.299-.3*cs+1.25*sn,.587-.587*cs+.33*sn,.587+.413*cs+.035*sn,.587-.588*cs-1.05*sn,.114-.114*cs-.497*sn,.114-.114*cs+.292*sn,.114+.886*cs-.203*sn);k=m*k;}
 l=lu(k);k=mix(vec3(l),k,1.+sat);
 if(spl>0.){l=clamp(lu(k),0.,1.);k=mix(k,k*(shC*2.),spl*(1.-l)*.55);k=mix(k,1.-(1.-k)*(1.-(hiC-.5)*.9),spl*l*.6);}
 if(fad>0.){k=fad*.16+k*(1.-fad*.28);}
 if(ePos>0.){float n=mix(24.,3.,ePos);k=floor(clamp(k,0.,1.)*n+.5)/n;}
 if(eDot>0.){vec2 g=v*R/mix(4.,14.,eDot);vec2 f=fract(g)-.5;float r=sqrt(1.-clamp(lu(k),0.,1.))*.62;float dt=1.-smoothstep(r-.08,r+.08,length(f));k=mix(k,vec3(1.-dt)*mix(vec3(1.),k*1.2,.5),eDot);}
 if(eFilm>0.){float s=lu(k);k=mix(k,vec3(s*1.08,s*.94,s*.76),eFilm*.85);k*=1.-eFilm*.12*hs(vec2(floor(tm*18.),1.));float ln=step(.9985,hs(vec2(floor(v.x*400.),floor(tm*8.))));k=mix(k,vec3(.95),ln*eFilm*.6);float dust=step(.9993,hs(floor(v*R*.5)+floor(tm*14.)));k=mix(k,vec3(.08),dust*eFilm);}
 if(eVhs>0.){k*=1.-.12*eVhs*step(.5,fract(v.y*R.y*.5));k+=(hs(v*R+tm)-.5)*.08*eVhs;}
 if(eInv>0.){k=mix(k,1.-k,eInv);}
 if(vig!=0.){float d=length((v-.5)*vec2(1.,R.y/R.x)*1.4);k*=1.-vig*smoothstep(.35,1.05,d);}
 if(grn>0.){k+=(hs(v*R+fract(tm*7.3)*91.)-.5)*grn*.28;}
 gl_FragColor=vec4(clamp(k,0.,1.)*a,a);}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  try {
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const U = {}; const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(pr, i); U[a.name] = gl.getUniformLocation(pr, a.name); }
    Object.assign(GL, { ok: true, gl, cv, U });
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); GL.ok = null; });
  } catch (e) { console.warn('WebGL off:', e); GL.ok = false; }
  return GL.ok;
}
// collect shader parameters for a clip at time t (seconds since clip start)
function gradeParams(c, lt) {
  const g = Object.assign(defGrade(), c.grade || {});
  const out = { g, sh: [.5, .5, .5], hi: [.5, .5, .5], split: 0, fx: {}, key: null };
  const f = c.filter && FILTERS[c.filter.id];
  if (f && c.filter.id !== 'none') {
    const k = (c.filter.amount == null ? 100 : c.filter.amount) / 100;
    for (const n in f.g) if (n in g) g[n] += f.g[n] * k * 100;
    if (f.split) { out.sh = f.sh; out.hi = f.hi; out.split = f.split * k; }
  }
  for (const e of c.effects || []) { if (e.off) continue; const d = EFFECTS[e.id]; if (d && d.gl) out.fx[e.id] = (out.fx[e.id] || 0) + (e.amt == null ? 50 : e.amt) / 100; }
  if (c.chroma && c.chroma.on) out.key = c.chroma;
  return out;
}
function gradeIsIdentity(q) {
  for (const n in q.g) if (Math.abs(q.g[n]) > 1e-4) return false;
  return !q.split && !q.key && !Object.keys(q.fx).length;
}
// grade scale: UI values are -100..100, shader expects -1..1
function glProcess(src, sw, sh_, ow, oh, q, time) {
  if (!glInit()) return null;
  const { gl, cv, U } = GL;
  ow = Math.max(1, Math.round(ow)); oh = Math.max(1, Math.round(oh));
  if (cv.width !== ow || cv.height !== oh) { cv.width = ow; cv.height = oh; }
  gl.viewport(0, 0, ow, oh);
  try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return null; }
  const g = q.g, s = v => v / 100;
  gl.uniform2f(U.R, ow, oh); gl.uniform1f(U.tm, time || 0);
  gl.uniform1f(U.bri, s(g.brightness)); gl.uniform1f(U.con, s(g.contrast)); gl.uniform1f(U.sat, s(g.saturation)); gl.uniform1f(U.ex, s(g.exposure) * 2);
  gl.uniform1f(U.tem, s(g.temperature)); gl.uniform1f(U.tin, s(g.tint)); gl.uniform1f(U.hue, g.hue * Math.PI / 180);
  gl.uniform1f(U.hil, s(g.highlights)); gl.uniform1f(U.shd, s(g.shadows)); gl.uniform1f(U.fad, s(g.fade)); gl.uniform1f(U.vig, s(g.vignette)); gl.uniform1f(U.grn, s(g.grain)); gl.uniform1f(U.shp, s(g.sharpen));
  gl.uniform3fv(U.shC, q.sh); gl.uniform3fv(U.hiC, q.hi); gl.uniform1f(U.spl, q.split || 0);
  if (q.key) { const [r, gg, b] = hexToRgba(q.key.color); gl.uniform1f(U.key, 1); gl.uniform3f(U.keyC, r / 255, gg / 255, b / 255); gl.uniform1f(U.kSim, q.key.sim / 100 * 0.45); gl.uniform1f(U.kSm, q.key.smooth / 100 * 0.3); gl.uniform1f(U.kSp, q.key.spill / 100); }
  else gl.uniform1f(U.key, 0);
  const fx = q.fx;
  gl.uniform1f(U.eRgb, (fx.rgb || 0) * 3); gl.uniform1f(U.eGl, fx.glitch || 0); gl.uniform1f(U.eVhs, fx.vhs || 0);
  gl.uniform1f(U.ePix, fx.pixel ? 2 + fx.pixel * 60 * Math.max(ow, oh) / 1920 : 0); gl.uniform1f(U.eWav, (fx.wave || 0) * 1.5); gl.uniform1f(U.eMir, fx.mirror ? 1 : 0);
  gl.uniform1f(U.eFilm, Math.min(1, fx.film || 0)); gl.uniform1f(U.eBul, (fx.bulge || 0)); gl.uniform1f(U.ePos, Math.min(1, fx.poster || 0)); gl.uniform1f(U.eInv, Math.min(1, fx.invert || 0));
  gl.uniform1f(U.eEdge, Math.min(1, fx.edge || 0)); gl.uniform1f(U.eDot, Math.min(1, fx.dots || 0));
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return cv;
}
