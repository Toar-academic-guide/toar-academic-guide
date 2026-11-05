// Shader source copied verbatim from the approved 2026-10-30 WebGL mockup.
export const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`;
export const fragment = `precision highp float;
    varying vec2 uv;
    uniform float phase;
    uniform vec2 size;
    uniform vec4 title;
    float bell(float x,float width){return exp(-x*x/(width*width));}
    void main(){
      vec2 p=vec2(uv.x,1.-uv.y);
      float t=phase;
      // Long, low-frequency folds. All time harmonics share a seamless 10s period.
      float x=p.x+.10*sin(p.y*5.5+t)+.045*sin(p.y*10.-t);
      float y=p.y;
      float sweep=.13*sin(t)+.035*sin(2.*t);
      float bend=.10*sin(x*5.1+t)+.065*sin(x*8.-t);
      float q=y-bend;
      float center=.69+.045*cos(t);
      float thickness=.195+.035*sin(x*5.4-t);
      float envelope=bell(q-center,thickness)*(.83+.17*cos((x-.5)*3.));
      envelope*=smoothstep(-.25,.06,x+.09*sin(y*10.+t));
      float warp=.14*sin(x*4.2+t)+.055*sin(x*7.3-2.*t);
      float fold=q-center+warp;
      // Broad sheets of blue and lilac meet; small ridges imply silk, not solid objects.
      float ribbon=bell(fold+.025,.061);
      float second=bell(fold-.15-.04*cos(x*7.+t),.075);
      float ridge=bell(fold+.113,.036);
      vec3 blue=vec3(.561,.737,.976);
      vec3 cyan=vec3(.502,.898,1.);
      vec3 periwinkle=vec3(.655,.710,1.);
      vec3 lilac=vec3(.808,.788,1.);
      vec3 pale=vec3(.929,.878,1.);
      vec3 pink=vec3(.945,.902,.996);
      float across=smoothstep(.18,.82,x+sweep+.10*sin(q*5.+t));
      vec3 ink=mix(mix(pink,lilac,.27),blue,across);
      ink=mix(ink,lilac,.08+.08*sin(x*5.-t));
      ink=mix(ink,periwinkle,ribbon*.38);
      ink=mix(ink,cyan,second*across*.30);
      ink=mix(ink,pale,ridge*.80);
      float density=envelope*(.73+.24*ribbon+.08*second);
      // Pure white around the actual headline rectangle at every animation phase.
      vec2 pixel=p*size;
      vec2 d=max(max(title.xy-pixel,pixel-title.zw),vec2(0.));
      float clearance=smoothstep(22.,150.,length(d));
      density*=clearance;
      density*=smoothstep(.08,.28,y)*(1.-smoothstep(.91,1.08,y));
      gl_FragColor=vec4(mix(vec3(1.),ink,clamp(density,0.,.92)),1.);
    }`;
