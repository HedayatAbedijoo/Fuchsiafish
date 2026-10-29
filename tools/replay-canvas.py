"""Replay recorded Canvas 2D calls with Cairo for offline asset preparation."""
import json, math, cairo, re, sys, io
from PIL import Image
ops=json.load(open(sys.argv[1]))
objects={}; states={}; stacks={}; sizes={}
def rgba(v):
 if not isinstance(v,str): return (1,1,1,1)
 if v.startswith('#'):
  v=v[1:]
  if len(v) in (3,4): v=''.join(ch*2 for ch in v)
  if len(v)==6:v+='ff'
  return tuple(int(v[i:i+2],16)/255 for i in (0,2,4,6))
 if v.startswith('rgba'):
  a=[float(x) for x in re.findall(r'[\d.]+',v)];return (*[x/255 for x in a[:3]],a[3])
 return (0,0,0,1)
def source(c,v,alpha=1):
 if isinstance(v,dict): c.set_source(objects[v['ref']]);return
 r,g,b,a=rgba(v);c.set_source_rgba(r,g,b,a*alpha)
def setup(key,w,h):
 sf=cairo.ImageSurface(cairo.FORMAT_ARGB32,int(w),int(h));objects[key]=sf;objects[key+'ctx']=cairo.Context(sf)
 states[key]={'fillStyle':'#000','strokeStyle':'#000','globalAlpha':1,'globalCompositeOperation':'source-over','lineWidth':1,'textAlign':'left','font':'10px monospace'};stacks[key]=[]
def fill(c,s,stroke=False):
 source(c,s['strokeStyle' if stroke else 'fillStyle'],s['globalAlpha'])
 c.set_operator({'destination-out':cairo.OPERATOR_DEST_OUT,'lighter':cairo.OPERATOR_ADD}.get(s['globalCompositeOperation'],cairo.OPERATOR_OVER))
 if stroke:c.set_line_width(s['lineWidth']);c.stroke_preserve()
 else:c.fill_preserve()
for op in ops:
 kind,key,*a=op
 if kind=='canvas': sizes[key]=a;setup(key,*a)
 elif kind=='size':
  sizes[key][0 if a[0]=='width' else 1]=a[1];setup(key,*sizes[key])
 elif kind=='image':
  data=io.BytesIO();Image.open(a[0]).save(data,format='PNG');data.seek(0);objects[key]=cairo.ImageSurface.create_from_png(data)
 elif kind=='gradient':
  gid,method,*p=a
  objects[gid]=cairo.LinearGradient(*p) if method=='createLinearGradient' else cairo.RadialGradient(*p)
 elif kind=='stop':objects[key].add_color_stop_rgba(a[0],*rgba(a[1]))
 elif kind=='snapshot':objects[key].write_to_png(a[0])
 elif kind=='set':states[key][a[0]]=a[1]
 elif kind=='call':
  method,*p=a;c=objects[key+'ctx'];s=states[key]
  if method=='save':c.save();stacks[key].append(s.copy())
  elif method=='restore':c.restore();states[key]=stacks[key].pop()
  elif method=='setTransform':c.set_matrix(cairo.Matrix(*p))
  elif method=='transform':c.transform(cairo.Matrix(*p))
  elif method=='translate':c.translate(*p)
  elif method=='rotate':c.rotate(*p)
  elif method=='scale':c.scale(*p)
  elif method=='beginPath':c.new_path()
  elif method=='closePath':c.close_path()
  elif method=='moveTo':c.move_to(*p)
  elif method=='lineTo':c.line_to(*p)
  elif method=='bezierCurveTo':c.curve_to(*p)
  elif method=='quadraticCurveTo':
   x,y=c.get_current_point();cx,cy,ex,ey=p;c.curve_to(x+2*(cx-x)/3,y+2*(cy-y)/3,ex+2*(cx-ex)/3,ey+2*(cy-ey)/3,ex,ey)
  elif method=='arc':c.arc(*p[:5])
  elif method=='ellipse':
   x,y,rx,ry,rot,start,end=p;c.save();c.translate(x,y);c.rotate(rot);c.scale(rx,ry);c.arc(0,0,1,start,end);c.restore()
  elif method=='roundRect':
   x,y,w,h,r=p;c.new_sub_path();c.arc(x+w-r,y+r,r,-math.pi/2,0);c.arc(x+w-r,y+h-r,r,0,math.pi/2);c.arc(x+r,y+h-r,r,math.pi/2,math.pi);c.arc(x+r,y+r,r,math.pi,math.pi*1.5);c.close_path()
  elif method=='clip':c.clip_preserve()
  elif method in ('fill','stroke'):fill(c,s,method=='stroke')
  elif method in ('fillRect','clearRect'):
   oldpath=c.copy_path();c.save();c.new_path();c.rectangle(*p)
   if method=='clearRect':c.set_operator(cairo.OPERATOR_CLEAR);c.fill()
   else:fill(c,s)
   c.restore();c.new_path();c.append_path(oldpath)
  elif method=='fillText':
   txt,x,y=p;font=re.search(r'(\d+(?:\.\d+)?)px',s['font']);c.select_font_face('monospace',cairo.FONT_SLANT_NORMAL,cairo.FONT_WEIGHT_NORMAL);c.set_font_size(float(font[1]));ext=c.text_extents(txt)
   if s['textAlign']=='center':x-=ext.x_advance/2
   elif s['textAlign']=='right':x-=ext.x_advance
   source(c,s['fillStyle'],s['globalAlpha']);c.move_to(x,y);c.show_text(txt)
  elif method=='drawImage':
   im=objects[p[0]['ref']];iw,ih=im.get_width(),im.get_height();p=p[1:]
   if len(p)==2:sx,sy,sw,sh,dx,dy,dw,dh=0,0,iw,ih,*p,iw,ih
   elif len(p)==4:sx,sy,sw,sh,dx,dy,dw,dh=0,0,iw,ih,*p
   else:sx,sy,sw,sh,dx,dy,dw,dh=p
   if not sw or not sh or not dw or not dh:continue
   oldpath=c.copy_path();c.save();c.new_path();c.rectangle(dx,dy,dw,dh);c.clip();c.translate(dx,dy);c.scale(dw/sw,dh/sh);c.set_source_surface(im,-sx,-sy);c.get_source().set_filter(cairo.FILTER_BILINEAR)
   c.set_operator(cairo.OPERATOR_ADD if s['globalCompositeOperation']=='lighter' else cairo.OPERATOR_OVER);c.paint_with_alpha(s['globalAlpha']);c.restore();c.new_path();c.append_path(oldpath)
  else:raise Exception(method)
