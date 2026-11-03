#!/usr/bin/env python3
"""Build the six TCC 2027 identity manuals from their vector brand systems."""
from pathlib import Path
import json, re, math, html, io, shutil, zipfile, hashlib, base64
from functools import lru_cache
import fitz
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = next((p for p in Path(__file__).resolve().parents if (p/'identidade-visual'/'brand.json').exists()), Path(__file__).resolve().parents[1])
STANDALONE = (ROOT/'identidade-visual'/'brand.json').exists()
REPOS = ROOT.parent if STANDALONE else ROOT / 'repos'
OUT = ROOT / 'output' / 'pdf'
TEMP = ROOT / 'tmp' / 'pdfs'
W, H = 841.8898, 595.2756
DATE = '3 de novembro de 2026'
REF = 'https://www.sjc.sp.gov.br/media/aqpbdbrj/14448_e_s7_identidade-visual-psjc.pdf'
WCAG = 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'
ORDER = ['nexo-orbital-cubesat','koma-animes-mangas','coro-amazonia','ionolab-ionosfera','mesaar-cardapio-ar','biogeolab-esp32']
TITLES = [
 'A identidade começa aqui', 'Como usar este manual', 'O que a marca representa',
 'A assinatura principal', 'As versões da marca', 'Malha de construção',
 'Área de proteção', 'Redução e legibilidade', 'Paleta principal',
 'Cores de apoio', 'Reprodução monocromática', 'Fundos e contraste da marca',
 'Tipografia de expressão', 'Tipografia de leitura', 'Elementos gráficos',
 'Imagens e composição', 'Usos incorretos', 'Acessibilidade digital',
 'Interface e produto', 'Apresentações', 'Pôster científico',
 'Redes sociais', 'Documentos e identificação', 'Convivência com outras marcas',
 'Voz e escrita', 'Arquivos e produção', 'Revisão e referências']

def rgb(h):
    s=h.lstrip('#');return tuple(int(s[i:i+2],16) for i in (0,2,4))
def luminance(h):
    v=[x/255 for x in rgb(h)]
    v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v]
    return sum(x*w for x,w in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):
    a,b=sorted([luminance(a),luminance(b)]);return (b+.05)/(a+.05)
def fg(bg): return '#FFFFFF' if contrast(bg,'#FFFFFF')>=contrast(bg,'#172019') else '#172019'
def mix(a,b,t):return '#'+''.join(f'{round(x*(1-t)+y*t):02X}' for x,y in zip(rgb(a),rgb(b)))
def cmyk(h):
    r,g,b=[x/255 for x in rgb(h)];k=1-max(r,g,b)
    if k>=1:return (0,0,0,100)
    return tuple(round(x*100) for x in ((1-r-k)/(1-k),(1-g-k)/(1-k),(1-b-k)/(1-k),k))
def esc(s):return html.escape(str(s),quote=False)
def regular_text(value):return ' '.join(value) if isinstance(value,list) else str(value)
def pdf_svg_bytes(path):
    raw=Path(path).read_bytes()
    with fitz.open(stream=raw,filetype='svg') as doc:return doc.convert_to_pdf()

class Manual:
    def __init__(self,repo):
        self.repo=repo;self.dir=repo/'identidade-visual';self.assets=self.dir/'assets'
        self.b=json.loads((self.dir/'brand.json').read_text());self.col=self.b['colors']
        self.name=self.b['name'];self.slug=self.b['slug'];self.count=0;self.overlays=[];self.issues=[]
        self.paper=self.col['paper'];self.dark=self.col['dark'];self.accent=self.col['accent'];self.second=self.col['second']
        self.f={}
        for role,path in self.b['font_files'].items():
            name=self.slug+'-'+role
            pdfmetrics.registerFont(TTFont(name,str(self.dir/path)))
            self.f[role]=name
        self.raw=TEMP/(self.slug+'-base.pdf');self.final=self.dir/'guia-identidade-visual.pdf'
        for source,target in [('simbolo-monocromatico.svg','simbolo-monocromatico-negativo.svg'),('marca-monocromatica.svg','marca-monocromatica-negativa.svg')]:
            (self.assets/target).write_text(re.sub(r'#[0-9A-Fa-f]{6}',self.paper,(self.assets/source).read_text()))
        self.c=canvas.Canvas(str(self.raw),pagesize=(W,H),pageCompression=1)
        self.c.setTitle(self.name+' | Guia de identidade visual 2027')
        self.c.setAuthor('Bruno Michel Pera | TCCs 2027')
        self.c.setSubject('Marca, cores, tipografia, regras de uso e aplicações')
        self.c.setCreator('Sistema editorial TCCs 2027')

    def rect(self,x,y,w,h,fill,stroke=None,r=0):
        self.c.setFillColor(HexColor(fill));self.c.setStrokeColor(HexColor(stroke or fill))
        if r:self.c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
        else:self.c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))
    def line(self,x1,y1,x2,y2,color=None,width=1,dash=None):
        self.c.setStrokeColor(HexColor(color or self.dark));self.c.setLineWidth(width)
        self.c.setDash(dash or [])
        self.c.line(x1,H-y1,x2,H-y2);self.c.setDash([])
    def text(self,s,x,y,size=12,font='body_regular',color=None):
        self.c.setFillColor(HexColor(color or self.dark));self.c.setFont(self.f[font],size)
        self.c.drawString(x,H-y-size*.8,str(s))
    def para(self,s,x,y,w,size=11.2,color=None,font='body_regular',leading=None):
        style=ParagraphStyle('p',fontName=self.f[font],fontSize=size,leading=leading or size*1.45,textColor=HexColor(color or self.dark),spaceAfter=0)
        p=Paragraph(esc(s).replace('\n','<br/>'),style);a,h=p.wrap(w,1000)
        if y+h>H-43:self.issues.append((self.count,'overflow',str(s)[:50],y+h))
        p.drawOn(self.c,x,H-y-h);return h
    def tag(self,s,x,y,color=None):
        self.text(s.upper(),x,y,8.2,'mono_regular',color or self.accent)
    def bullets(self,items,x,y,w,size=11,step=13,color=None):
        for i,s in enumerate(items):
            self.rect(x,y+5,4,4,self.accent)
            h=self.para(s,x+17,y,w-17,size,color=color);y+=h+step
        return y
    def svg(self,name,x,y,w,h,keep=True,variant=None):
        path=self.assets/name
        self.overlays.append((self.count-1,str(path),[x,y,x+w,y+h],keep,variant))
    def logo(self,x,y,w,h,negative=False):self.svg('marca-negativa.svg' if negative else 'marca-horizontal.svg',x,y,w,h)
    def pattern(self,x,y,w,h,opacity=.12):
        self.c.saveState();self.c.setStrokeColor(HexColor(mix(self.accent,self.paper,.7)))
        self.c.setLineWidth(1)
        if self.repo.name.startswith('nexo'):
            for i in range(5):self.c.ellipse(x+i*14,H-y-h+i*14,x+w-i*14,H-y-i*14,fill=0,stroke=1)
        elif self.repo.name.startswith('koma'):
            for i in range(10):self.line(x+i*w/10,y,x+(i+1)*w/10,y+h,mix(self.accent,self.paper,.6),2)
        elif self.repo.name.startswith('coro'):
            for i in range(5):
                self.c.ellipse(x+i*18,H-y-h*.7+i*5,x+w-i*13,H-y-h*.25+i*5,fill=0,stroke=1)
        elif self.repo.name.startswith('ionolab'):
            for j in range(6):
                p=self.c.beginPath()
                for i in range(80):
                    xx=x+i*w/79;yy=y+h*.5+math.sin(i*.095+j*.36)*h*.22+j*7
                    (p.moveTo if i==0 else p.lineTo)(xx,H-yy)
                self.c.drawPath(p,stroke=1,fill=0)
        elif self.repo.name.startswith('mesaar'):
            for i in range(4):self.c.circle(x+w/2,H-y-h/2,min(w,h)*(.45-i*.075),fill=0,stroke=1)
            for xx,yy,dx,dy in [(x,y,1,1),(x+w,y,-1,1),(x,y+h,1,-1),(x+w,y+h,-1,-1)]:
                self.line(xx,yy,xx+dx*20,yy,self.accent,2);self.line(xx,yy,xx,yy+dy*20,self.accent,2)
        else:
            for j in range(4):
                p=self.c.beginPath()
                for i in range(60):
                    xx=x+i*w/59;yy=y+h*.5+math.sin(i*.2)*10+(abs(math.sin(i*.115))**14)*h*.3+j*8
                    (p.moveTo if i==0 else p.lineTo)(xx,H-yy)
                self.c.drawPath(p,stroke=1,fill=0)
        self.c.restoreState()
    def start(self,title,subtitle='',section='Sistema visual',dark=False):
        if self.count:self.c.showPage()
        self.count+=1;self.page_dark=dark;back=self.dark if dark else self.paper
        self.rect(0,0,W,H,back)
        ink=self.paper if dark else self.dark;muted=mix(ink,back,.35)
        self.tag(self.name,48,28,self.accent if contrast(self.accent,back)>3 else ink)
        self.text('TCC 2027 / MANUAL DE IDENTIDADE',458,29,8,'mono_regular',muted)
        self.line(48,51,W-48,51,mix(ink,back,.82),.6)
        self.text(section.upper(),48,72,8.5,'mono_regular',muted)
        self.text(title,48,97,29,'display_bold',ink)
        if subtitle:self.para(subtitle,48,141,W-96,11,color=muted)
        self.line(48,H-47,W-48,H-47,mix(ink,back,.82),.6)
        self.text('VERSÃO 1.0  •  03.11.2026',48,H-32,7.5,'mono_regular',muted)
        self.text(f'{self.count:02d} / 28',W-102,H-32,8,'mono_regular',muted)
        self.c.bookmarkPage('page-'+str(self.count));self.c.addOutlineEntry(title,'page-'+str(self.count),level=0)
    def panel(self,x,y,w,h,bg=None):self.rect(x,y,w,h,bg or '#FFFFFF',mix(self.dark,self.paper,.86),r=8)
    def label(self,s,x,y,w=300,color=None):self.para(s,x,y,w,9.5,color=color or mix(self.dark,self.paper,.25))
    def model_slide(self,x,y,w,h,cover=True):
        self.rect(x,y,w,h,self.dark,r=4)
        if cover:
            self.logo(x+22,y+20,w*.5,32,True)
            self.para(self.b['tagline'],x+22,y+h*.43,w*.73,w*.065,self.paper,'display_bold',w*.078)
            self.text('TCC 2027 • APRESENTAÇÃO DO PROJETO',x+23,y+h-24,w*.019,'mono_regular',self.paper)
        else:
            self.rect(x,y,w,h,self.paper,self.dark,r=4)
            self.text('O projeto em três movimentos',x+20,y+20,w*.045,'display_bold')
            for i,t in enumerate(['Investigar','Construir','Validar']):
                self.rect(x+20+i*(w-40)/3,y+65,(w-57)/3,h-92,mix(self.second,self.paper,.86),r=3)
                self.text('0'+str(i+1),x+30+i*(w-40)/3,y+78,w*.029,'mono_regular')
                self.text(t,x+30+i*(w-40)/3,y+111,w*.031,'display_bold')
    def build(self):
        b=self.b;cols=b['palette'];display=b['fonts']['display'];body=b['fonts']['body'];mono=b['fonts']['mono']
        # 01 Cover
        self.start('Manual de\nidentidade visual'.replace('\n',' '),'','Identidade / 2027',True)
        self.rect(48,179,458,281,self.paper,r=0)
        self.logo(78,210,396,89)
        self.para(b['tagline'],79,333,368,24,font='display_bold',leading=30)
        self.tag(b['domain'],79,431,self.dark)
        self.svg('simbolo-negativo.svg',545,198,220,220)
        self.text('MARCA  /  LINGUAGEM  /  APLICAÇÕES',48,492,8.5,'mono_regular',self.paper)
        self.text('BRUNO MICHEL PERA',535,492,8.5,'mono_regular',self.paper)
        # 02 Overview
        self.start('A identidade começa aqui',b['domain'],'01 / Fundamentos')
        y=191
        for p in b['concept'][:2]:y+=self.para(p,48,y,350,12)+16
        self.text('Personalidade',48,428,14,'display_bold')
        self.para(' / '.join(b['personality']),48,455,360,13,font='display_bold')
        self.panel(445,190,349,297,self.dark);self.svg('simbolo-negativo.svg',551,210,134,134)
        self.para(b['tagline'],471,367,290,21,color=self.paper,font='display_bold',leading=27)
        # 03 Index
        self.start('Como usar este manual','Consulte a regra antes de adaptar a marca a uma nova peça.','01 / Fundamentos')
        groups=[('Fundamentos','02–03','Conceito, personalidade e navegação.'),('Marca','04–09','Assinaturas, malha, proteção e redução.'),('Cores e letras','10–15','Paletas, fundos, reprodução e tipografia.'),('Linguagem','16–19','Grafismos, imagens, usos e acessibilidade.'),('Aplicações','20–25','Produto, slides, pôster, redes e documentos.'),('Entrega','26–28','Voz, arquivos, produção e revisão.')]
        for i,(t,n,d) in enumerate(groups):
            x=48+(i%2)*381;y=193+(i//2)*104
            self.text(n,x,y,12,'mono_regular',mix(self.dark,self.paper,.25));self.text(t,x+70,y-3,17,'display_bold')
            self.para(d,x+70,y+25,282,10.5);self.line(x,y+78,x+356,y+78,mix(self.dark,self.paper,.8),.6)
        # 04 rationale
        self.start('O que a marca representa','O símbolo deve ser reconhecido antes de ser explicado.','02 / Marca')
        self.panel(48,185,310,320);self.svg('simbolo.svg',106,220,195,195)
        self.text('Ideia central',405,194,16,'display_bold')
        self.para(b['logo']['concept'],405,227,377,13)
        self.text('Forma e intenção',405,366,16,'display_bold')
        self.para(b['motif'],405,398,377,11.5)
        self.label('Símbolo original • versão vetorial',78,463,260)
        # 05 main
        self.start('A assinatura principal','Use o arquivo oficial: a relação entre símbolo e nome faz parte da marca.','02 / Marca')
        self.panel(48,185,W-96,214)
        self.logo(99,240,W-198,108)
        self.line(100,370,W-100,370,mix(self.dark,self.paper,.8),.6)
        self.bullets(['A assinatura horizontal é a primeira escolha para cabeçalhos, capas e rodapés.', 'O nome está convertido em curvas nos SVGs. Não redigite o logotipo com uma fonte semelhante.', 'Altere apenas o tamanho total, mantendo a proporção do arquivo.'],62,426,W-124,11,8)
        # 06 variants
        self.start('As versões da marca','Escolha a assinatura de acordo com o espaço disponível e o reconhecimento do público.','02 / Marca')
        self.panel(48,188,449,129);self.logo(77,210,391,81)
        self.label('Horizontal • uso preferencial',48,331,420)
        self.panel(527,188,267,250);self.svg('marca-vertical.svg',559,211,204,202)
        self.label('Vertical • peças estreitas',527,452,267)
        self.panel(48,378,115,118);self.svg('simbolo.svg',69,398,73,73)
        self.para('Símbolo isolado\nAvatar, ícone ou identificação curta. Na primeira apresentação ao público, acompanhe do nome por perto.',184,389,306,11)
        # 07 grid
        self.start('Malha de construção','A malha explica a geometria; o SVG oficial continua sendo a matriz de reprodução.','02 / Marca')
        gx,gy,s=61,191,282
        for i in range(11):
            self.line(gx+i*s/10,gy,gx+i*s/10,gy+s,mix(self.dark,self.paper,.82),.55)
            self.line(gx,gy+i*s/10,gx+s,gy+i*s/10,mix(self.dark,self.paper,.82),.55)
        self.svg('simbolo.svg',gx,gy,s,s)
        self.text('10 x',177,486,10,'mono_regular')
        self.text('x = 10 unidades',397,196,18,'display_bold')
        self.para(regular_text(b['logo']['grid']),397,236,383,12)
        self.para('A prancheta do símbolo tem 100 × 100 unidades. Uma unidade modular x corresponde a 1/10 da prancheta. A assinatura completa usa a mesma escala proporcional do símbolo.',397,326,383,11.5)
        self.label('Não redesenhe a marca a partir desta página. Utilize as matrizes em assets/.',397,447,370)
        # 08 clear space
        self.start('Área de proteção','Reserve uma margem livre em todos os lados da assinatura.','02 / Marca')
        vbw=b['logo']['horizontal_viewbox'][2];ph=140;pw=vbw*ph/100;mod=ph/10;px=(W-pw)/2;py=220
        self.rect(px-mod,py-mod,pw+2*mod,ph+2*mod,mix(self.accent,self.paper,.77))
        self.rect(px,py,pw,ph,self.paper)
        self.logo(px,py,pw,ph)
        for xx in [px-mod,px,px+pw,px+pw+mod]:
            self.line(xx,py-2*mod,xx,py+ph+2*mod,mix(self.dark,self.paper,.6),.5,[2,2])
        for yy in [py-mod,py,py+ph,py+ph+mod]:
            self.line(px-2*mod,yy,px+pw+2*mod,yy,mix(self.dark,self.paper,.6),.5,[2,2])
        self.text('x',px-mod-5,py-3*mod,12,'mono_regular');self.text('x',px+pw/2,py-2*mod,12,'mono_regular')
        self.para(regular_text(b['logo']['clear_space']),61,423,703,12)
        self.para('A margem vale para texto, borda, outra marca ou área de corte. Dentro do arquivo há respiro técnico: conte a proteção a partir do limite externo da prancheta da assinatura.',61,468,703,10.5)
        # 09 minimums
        minpx=b['logo']['min_width_digital_px'];minmm=b['logo']['min_width_print_mm'];spx=b['logo']['symbol_min_px']
        self.start('Redução e legibilidade','Os limites se referem ao arquivo completo, sem comprimir ou cortar as margens.','02 / Marca')
        for i,(n,title,unit) in enumerate([(str(minmm),'Assinatura impressa','mm de largura'),(str(minpx),'Assinatura digital','px CSS de largura'),(str(spx),'Símbolo digital','px CSS por lado')]):
            x=48+i*254;self.panel(x,195,236,147)
            self.text(n,x+20,215,47,'display_bold');self.text(unit,x+20,275,10,'mono_regular');self.text(title,x+20,307,11,'body_bold')
        samplew=minmm*72/25.4;sampleh=samplew*100/b['logo']['horizontal_viewbox'][2]
        self.logo(66,381,samplew,sampleh);self.svg('simbolo.svg',280,384,10*72/25.4,10*72/25.4)
        self.label(str(minmm)+' mm (escala 100%)',61,445,200);self.label('Símbolo: 10 mm',260,445,165)
        self.para('Se o nome deixar de ser lido, passe ao símbolo e deixe o nome em texto acessível ao lado. Favicons de 16 px usam um recorte simplificado apenas quando criado e validado; não reduza automaticamente esta matriz.',438,374,343,11)
        self.label('Imprima esta página em 100% para conferir as amostras físicas. Em bordado, gravação e corte, teste uma amostra: os limites não garantem cada processo.',61,489,718)
        # 10 palette
        self.start('Paleta principal','Cores de reconhecimento. Os valores digitais são a referência do sistema.','03 / Cor')
        maincols=cols[:3]
        for i,col in enumerate(maincols):
            x=48+i*254;self.rect(x,189,236,158,col['hex'])
            self.text(col['name'],x+16,207,15,'display_bold',fg(col['hex']))
            self.text(col['hex'].upper(),x+16,309,15,'mono_regular',fg(col['hex']))
            self.text('RGB  '+' / '.join(map(str,rgb(col['hex']))),x,365,9.3,'mono_regular')
            self.text('CMYK  '+' / '.join(map(str,cmyk(col['hex']))),x,389,9.3,'mono_regular')
            self.para(col['role'],x,420,229,10.8)
        self.label('CMYK: conversão matemática aproximada, sem perfil ICC. Aprove a prova da gráfica no papel final; não equivale a cor especial Pantone.',48,508,741)
        # 11 supporting
        self.start('Cores de apoio','A hierarquia cromática organiza a peça e preserva o protagonismo da marca.','03 / Cor')
        rest=cols[3:] or cols[:3]
        for i,col in enumerate(rest[:3]):
            y=187+i*90;self.rect(48,y,108,66,col['hex'])
            self.text(col['name'],177,y+3,15,'display_bold');self.text(col['hex'],177,y+29,10,'mono_regular')
            self.para(col['role'],343,y+4,436,10.8)
        self.text('Proporção sugerida para composições',48,469,12,'body_bold')
        bar=[(self.paper,.6),(self.dark,.25),(self.accent,.1),(self.second,.05)];x=48
        for color,part in bar:self.rect(x,496,745*part,20,color,mix(self.dark,self.paper,.8));x+=745*part
        # 12 monochrome
        self.start('Monocromática e negativa','Use as versões fornecidas para uma cor de tinta, gravação ou fundos escuros.','03 / Cor')
        self.panel(48,187,361,178);self.svg('marca-monocromatica.svg',70,230,315,94)
        self.panel(433,187,361,178,self.dark);self.logo(456,230,315,94,True)
        self.text('Positiva • uma cor',48,386,15,'display_bold');self.text('Negativa • fundo escuro',433,386,15,'display_bold')
        self.para('Preserve os vazios e a espessura dos traços. Na produção de uma cor, use o arquivo monocromático e configure a tinta na gráfica.',48,420,355,11)
        self.para('A versão negativa foi desenhada para fundos escuros. Não aplique contornos artificiais nem transforme a marca em um adesivo com borda.',433,420,355,11)
        self.label(b['logo']['color_rules'],48,494,741)
        # 13 backgrounds
        self.start('Fundos e contraste da marca','Escolha a versão com melhor leitura e mantenha uma área visualmente tranquila.','03 / Cor')
        samples=[(self.paper,'marca-horizontal.svg','Fundo claro'),(self.dark,'marca-negativa.svg','Fundo escuro'),(self.second,'marca-negativa.svg' if luminance(self.second)<.3 else 'marca-monocromatica.svg','Cor de apoio')]
        for i,(color,file,title) in enumerate(samples):
            x=48+i*254;self.rect(x,191,236,135,color)
            self.svg(file,x+17,222,202,72);self.text(title,x,345,13,'body_bold')
        self.bullets(['Sobre fotografia, use uma placa sólida da paleta com área de proteção.', 'Não coloque a marca sobre rostos, texturas densas ou dados do experimento.', 'Aplique a marca em sua versão completa ou monocromática; não use transparência.'],57,392,717,11.5,12)
        # 14 typography display
        self.start('Tipografia de expressão',display+' dá personalidade aos títulos; a marca usa o desenho vetorial fornecido.','04 / Tipografia')
        self.text('Aa',48,185,124,'display_bold')
        self.text(display,298,201,28,'display_bold')
        self.para('Títulos, chamadas e frases curtas. Use peso forte nas aberturas e peso regular nos subtítulos. Preserve espaço em branco e evite títulos inteiros em caixa alta quando forem longos.',299,252,472,12)
        self.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ',48,355,20,'display_bold')
        self.text('abcdefghijklmnopqrstuvwxyz',48,393,20,'display_regular')
        self.text('0123456789  ÁÉÍÓÚ ÂÊÔ ÃÕ Ç',48,432,20,'display_regular')
        self.label('Escala digital sugerida: H1 40–64 px / H2 28–36 px / H3 20–24 px. Entrelinha de 1,1–1,25. Ajuste responsivamente para evitar cortes.',48,490,739)
        # 15 reading
        self.start('Tipografia de leitura','Hierarquia clara para conteúdo, interface e medidas.','04 / Tipografia')
        self.text(body,48,192,23,'body_bold');self.text(mono,461,192,19,'mono_regular')
        self.para('O projeto ganha clareza quando cada informação encontra seu lugar. Textos curtos apresentam a ideia; parágrafos organizam o contexto; legendas mostram a origem do que se observa.',48,239,356,15,leading=23)
        self.para('ID: TCC-2027\nVERSÃO: 1.0\nAMOSTRA: 012\nESTADO: EM REVISÃO',461,242,312,14,font='mono_regular',leading=24)
        self.bullets(['Corpo digital: 16–18 px; entrelinha entre 1,5 e 1,7.', 'Textos extensos: coluna de aproximadamente 55–75 caracteres.', 'Não use a monoespaçada em longos parágrafos.'],48,403,373,10.7,10)
        self.para('Na monografia e no artigo, siga as fontes e a diagramação exigidas pela instituição e pelo evento. A identidade aparece na apresentação do projeto e nas peças em que a aplicação é permitida.',461,405,320,11)
        # 16 graphic language
        self.start('Elementos gráficos','A forma do símbolo se estende ao restante do sistema.','05 / Linguagem')
        self.panel(48,186,352,299);self.svg('padrao.svg',69,207,310,257)
        self.bullets(b['graphic_rules'][:4],441,192,344,11.3,15)
        self.label('Padrão de apoio. Nunca substitui a marca nem deve competir com a leitura.',48,500,730)
        # 17 images
        self.start('Imagens e composição','Enquadramento, evidência e tratamento visual com a linguagem de '+self.name+'.','05 / Linguagem')
        self.rect(48,186,352,207,self.dark);self.pattern(70,205,304,169)
        self.svg('simbolo-negativo.svg',171,233,94,94)
        self.tag('Exemplo de composição gráfica',62,371,self.paper)
        self.text('Uma mensagem por área',439,189,17,'display_bold')
        self.para(b['motif'],439,225,344,11.5)
        self.bullets(['Prefira imagens do próprio projeto, com autoria e autorização identificadas.', 'Legende simulações e protótipos; diferencie dado observado de demonstração.', 'Reserve espaço limpo para a informação principal e evite filtros sobre evidências científicas.'],439,324,343,10.5,10)
        self.para('Aplicações prioritárias: '+'; '.join(b['applications'][:3])+'.',48,431,352,10.7)
        # 18 incorrect
        self.start('Usos incorretos','Estas alterações comprometem o reconhecimento ou a legibilidade.','05 / Linguagem')
        bad=[('Distorcer','stretch'),('Girar','rotate'),('Recolorir livremente','recolor'),('Baixo contraste','low'),('Cortar o símbolo','crop'),('Criar sombra','shadow')]
        for i,(title,variant) in enumerate(bad):
            x=48+(i%3)*254;y=187+(i//3)*157
            self.panel(x,y,235,113)
            self.svg('marca-horizontal.svg',x+22,y+24,190,61,keep=variant!='stretch',variant=variant)
            self.text('×',x+9,y+7,17,'body_bold','#A1252D');self.text(title,x,y+125,11,'body_bold')
        # 19 accessibility
        self.start('Acessibilidade digital','Contraste deve ser medido por combinação de texto e fundo, não pela cor isolada.','05 / Linguagem')
        pairs=[('Texto / papel',self.dark,self.paper),('Texto claro / escuro',self.paper,self.dark),('Ação / fundo de ação',fg(self.accent),self.accent),('Destaque / fundo escuro',self.accent,self.dark)]
        for i,(label,t,bg) in enumerate(pairs):
            y=187+i*67;self.rect(48,y,180,48,bg,r=3);self.text('Aa  2027',64,y+10,23,'body_bold',t)
            self.text(label,249,y+3,12,'body_bold');ratio=contrast(t,bg)
            self.text(f'{ratio:.2f}:1',575,y+5,17,'mono_regular')
            self.text('AA texto' if ratio>=4.5 else ('Só texto grande' if ratio>=3 else 'Decorativo'),688,y+8,9,'body_regular')
        self.para('Para texto corrente: pelo menos 4,5:1. Para texto grande: 3:1 (a partir de 18 pt regular ou 14 pt em negrito). Use foco visível e estado também por texto/ícone, sem depender só da cor. Os valores acima são calculados em sRGB.',48,473,742,10.5)
        # 20 product
        self.start('Interface e produto','Exemplo visual de aplicação. Números e elementos são demonstrativos.','06 / Aplicações')
        self.rect(48,186,745,273,self.col['bg'],r=8)
        self.rect(48,186,171,273,self.col['panel'],r=8)
        self.logo(67,209,132,39,contrast(self.paper,self.col['panel'])>contrast(self.dark,self.col['panel']))
        for i,t in enumerate(['Visão geral','Projeto','Evidências','Documentação']):
            yy=274+i*34
            if i==0:self.rect(64,yy-4,139,27,self.accent,r=4)
            self.text(t,77,yy,10,'body_bold' if i==0 else 'body_regular',fg(self.accent) if i==0 else self.col['ink'])
        self.text(b['tagline'][:53],242,211,16,'display_bold',self.col['ink'])
        for i,(val,lab) in enumerate([('01','Ciclo de pesquisa'),('03','Frentes do projeto'),('2027','Apresentação')]):
            x=240+i*176;self.rect(x,257,162,86,self.col['panel'],r=5)
            self.text(val,x+13,271,26,'display_bold',self.col['ink']);self.text(lab,x+13,315,9,'body_regular',self.col['ink'])
        self.rect(242,365,516,63,self.col['panel'],r=5)
        self.text('Planejar  →  Construir  →  Registrar  →  Revisar',258,386,12,'body_regular',self.col['ink'])
        self.label('A marca, os tokens de cor e os grafismos também foram aplicados ao site do cronograma e ao briefing existente.',48,482,740)
        # 21 slides
        self.start('Apresentações','Formato sugerido 16:9. Preserve a marca e deixe o conteúdo conduzir cada slide.','06 / Aplicações')
        self.model_slide(48,188,360,202,True);self.model_slide(433,188,360,202,False)
        self.text('Capa',48,410,14,'display_bold');self.text('Slide de conteúdo',433,410,14,'display_bold')
        self.para('Título curto, marca, autoria e ano. Deixe uma margem externa de pelo menos 5% da largura. O símbolo pode ampliar a identidade sem virar fundo de texto.',48,443,350,10.8)
        self.para('Uma ideia principal, até três blocos, imagens legíveis e fonte das evidências. Sugestão: títulos a partir de 32 pt e texto a partir de 22 pt, ajustados à sala.',433,443,350,10.8)
        # 22 poster
        self.start('Pôster científico','Modelo de organização para 90 × 120 cm; adapte às regras oficiais do evento.','06 / Aplicações')
        x,y,pw,ph=81,184,225,300;self.rect(x,y,pw,ph,'#FFFFFF',mix(self.dark,self.paper,.6))
        self.rect(x,y,pw,59,self.dark);self.logo(x+12,y+9,pw-24,30,True)
        self.text('TÍTULO DA PESQUISA',x+12,y+45,8,'body_bold',self.paper)
        for i,title in enumerate(['Questão e objetivo','Método','Resultados','Conclusão / referências']):
            yy=y+73+i*51;self.text(title,x+13,yy,8.2,'body_bold')
            for j in range(3):self.line(x+13,yy+17+j*5,x+pw-13-(j%2)*21,yy+17+j*5,mix(self.dark,'#FFFFFF',.75),1)
        self.rect(x+178,y+260,29,29,self.dark);self.text('QR',x+183,y+267,11,'mono_regular',self.paper)
        self.bullets(['Priorize título, objetivo, método e evidências.', 'Separe identidade do projeto e autoria científica.', 'Use gráficos com unidades, legenda e origem dos dados.', 'QR ilustrativo: substitua por um código testado para o link final.', 'A marca do evento e da instituição segue o manual do respectivo titular.'],361,190,424,11.2,14)
        # 23 social
        self.start('Redes sociais','Composição editorial consistente, com espaço para a mensagem e a autoria.','06 / Aplicações')
        self.rect(64,188,201,251,self.dark);self.logo(81,208,166,46,True)
        self.para(b['tagline'],83,290,158,17,self.paper,'display_bold',22)
        self.text('CONHEÇA O PROJETO',83,411,7.5,'mono_regular',self.paper)
        self.rect(321,188,141,251,self.accent);self.svg('simbolo-monocromatico-negativo.svg' if contrast(self.paper,self.accent)>contrast(self.dark,self.accent) else 'simbolo-monocromatico.svg',347,213,90,90)
        self.para('Pesquisa\nem movimento.',336,337,111,17,fg(self.accent),'display_bold',21)
        self.text('TCC 2027',337,415,8,'mono_regular',fg(self.accent))
        self.text('Feed 4:5',64,459,13,'display_bold');self.label('1080 × 1350 px',64,484,200)
        self.text('Story 9:16',321,459,13,'display_bold');self.label('1080 × 1920 px',321,484,190)
        self.bullets(['Margem interna sugerida: 80 px nas peças de feed.', 'Em stories, mantenha títulos e marca longe das áreas ocupadas pela interface.', 'Uma chamada central e texto alternativo descritivo.', 'O post divulga o projeto; resultados exigem fonte e contexto.'],508,195,270,11,16)
        # 24 documents
        self.start('Documentos e identificação','A marca acompanha o trabalho sem ocupar o espaço da informação.','06 / Aplicações')
        self.rect(65,185,212,300,'#FFFFFF',mix(self.dark,self.paper,.7));self.logo(84,202,172,45)
        self.text('RELATÓRIO DE ATIVIDADE',84,277,9,'body_bold')
        for j in range(13):self.line(84,305+j*10,254-(j%4)*7,305+j*10,mix(self.dark,'#FFFFFF',.8),.6)
        self.text('PROJETO 2027 • REGISTRO DE VERSÃO',84,462,5.4,'mono_regular')
        self.panel(336,198,438,142,self.dark);self.logo(357,214,229,58,True)
        self.text('TCC 2027',362,300,13,'mono_regular',self.paper)
        self.svg('simbolo-negativo.svg',669,229,65,65)
        self.para('Documentos internos: cabeçalho compacto e rodapé com versão. Identificação de equipamento, material ou equipe: marca, nome do projeto e código legível. Dados pessoais só quando necessários.',335,376,434,12)
        self.label('O timbre ilustrado não substitui a capa e a formatação acadêmica exigidas pela instituição.',335,470,432)
        # 25 cobrand
        self.start('Convivência com outras marcas','A proximidade visual deve deixar claro quem realiza e quem apoia o projeto.','06 / Aplicações')
        self.panel(48,189,746,162)
        self.logo(75,223,333,91);self.line(441,221,441,322,mix(self.dark,self.paper,.6),1)
        self.rect(481,229,268,78,mix(self.dark,self.paper,.92),r=2)
        self.text('MARCA INSTITUCIONAL',501,247,14,'body_bold');self.text('arquivo oficial autorizado',501,276,10,'body_regular')
        self.bullets(['Mantenha área de proteção independente para cada marca.', 'Equilibre a altura óptica; marcas com proporções diferentes não precisam ter a mesma largura.', 'Use o logotipo oficial da instituição ou apoiador e observe as regras do titular.', 'Não transforme a assinatura do projeto em selo de certificação, homologação ou endosso.'],59,389,725,11,10)
        # 26 voice
        self.start('Voz e escrita','O texto também é parte da identidade. Seja específico, compreensível e verificável.','07 / Uso e entrega')
        self.text('Como escrever',48,190,17,'display_bold');self.bullets(b['voice']['do'][:3],48,228,349,11,15)
        self.text('Evite',438,190,17,'display_bold');self.bullets(b['voice']['dont'][:3],438,228,349,11,15)
        self.rect(48,402,746,95,self.dark,r=6)
        self.tag('Exemplo de chamada',68,417,self.paper)
        self.para(b['voice']['example'],68,442,701,16,self.paper,'display_bold',22)
        # 27 files
        self.start('Arquivos e produção','Use os originais para manter a identidade consistente entre ferramentas.','07 / Uso e entrega')
        rows=[('SVG','Marcas em curvas e símbolos. Ampliação sem perda; impressão e interface.'),('PNG','Versões transparentes em 512 e 1600 px. Slides, documentos e redes.'),('PDF','Este manual em A4 horizontal, com texto pesquisável e marcas vetoriais.'),('HTML','Manual navegável, paletas e downloads, com fontes locais.'),('JSON / CSS','Tokens de marca e paleta para continuidade no desenvolvimento.'),('Fontes','Famílias licenciadas, arquivos locais e licenças OFL preservadas.')]
        for i,(t,d) in enumerate(rows):
            y=186+i*49;self.text(t,48,y+4,12,'mono_regular');self.para(d,161,y+2,624,10.6)
            self.line(48,y+41,793,y+41,mix(self.dark,self.paper,.83),.6)
        self.label('O kit reúne fontes, marcas, manual e modelos SVG editáveis de slide, post e documento. Antes da impressão, confirme sangria, perfil de cor e acabamento com a gráfica.',48,492,741)
        # 28 closure
        self.start('Revisão e referências','Uma identidade bem aplicada mantém a mesma lógica em cada nova entrega.','07 / Uso e entrega')
        checks=['Marca oficial e proporção preservadas.', 'Proteção, tamanho mínimo e versão de fundo conferidos.', 'Cores e fontes do sistema, com contraste de texto verificado.', 'Imagens, dados e simulações identificados com clareza.', 'Links, QR codes e arquivos finais abertos e revisados.']
        self.bullets(checks,48,190,385,11,11)
        self.text('Referências do sistema',472,190,15,'display_bold')
        y=225
        refs=[('Estrutura de manual', 'Prefeitura de São José dos Campos. Manual de identidade visual, versão 1.0, 26/10/2026. Referência de organização editorial; não há vínculo institucional.',REF),('Contraste de texto','W3C. WCAG 2.2, entendimento do critério 1.4.3. Combinações calculadas em sRGB.',WCAG),('Projeto e fontes','Briefing deste repositório, fontes SIL Open Font License e arquivos vetoriais desta entrega.','https://github.com/perabru/'+self.repo.name)]
        for title,txt,url in refs:
            self.text(title,472,y,10.5,'body_bold');y+=21
            hh=self.para(txt,472,y,312,9.7);y+=hh+8
            self.text('Abrir referência ↗',472,y,9.3,'body_bold')
            self.c.linkURL(url,(472,H-y-12,620,H-y+2),relative=0,thickness=0);y+=31
        self.para('Responsável pelo projeto: Bruno Michel Pera.\nEdição 1.0 • '+DATE+'.\nAs peças ilustradas são modelos de aplicação da identidade.',48,441,380,10.5)
        self.finish()

    def finish(self):
        if self.count!=28:raise ValueError(f'Expected 28 pages, got {self.count}')
        if self.issues:raise ValueError(str(self.issues))
        self.c.save();doc=fitz.open(self.raw);cache={}
        for page_no,path,rect,keep,variant in self.overlays:
            key=(path,variant)
            if key not in cache:
                raw=Path(path).read_text()
                if variant:
                    m=re.search(r'viewBox="([^"]+)"',raw);v=list(map(float,m.group(1).split())) if m else [0,0,700,150]
                    inner=re.sub(r'^.*?<svg[^>]*>','',raw,flags=re.S);inner=re.sub(r'</svg>\s*$','',inner)
                    if variant=='rotate':inner=f'<g transform="rotate(-12 {v[2]/2} {v[3]/2})">{inner}</g>'
                    elif variant=='recolor':inner=re.sub(r'#[0-9A-Fa-f]{6}','#C62283',inner)
                    elif variant=='low':inner=re.sub(r'#[0-9A-Fa-f]{6}',mix(self.paper,'#FFFFFF',.7),inner)
                    elif variant=='crop':inner=f'<g transform="translate(-55 0)">{inner}</g>'
                    elif variant=='shadow':inner=f'<g transform="translate(10 10)">'+re.sub(r'#[0-9A-Fa-f]{6}','#A3A3A3',inner)+'</g>'+inner
                    raw=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{v[0]} {v[1]} {v[2]} {v[3]}" width="{v[2]}" height="{v[3]}">{inner}</svg>'
                s=fitz.open(stream=raw.encode(),filetype='svg');pd=s.convert_to_pdf();s.close();cache[key]=fitz.open(stream=pd,filetype='pdf')
            doc[page_no].show_pdf_page(fitz.Rect(rect),cache[key],0,keep_proportion=keep,overlay=True)
        doc.save(self.final,garbage=4,deflate=True);doc.close()
        for d in cache.values():d.close()
        OUT.mkdir(parents=True,exist_ok=True)
        copy=OUT/(self.slug+'_Guia_Identidade_Visual_2027.pdf');shutil.copy2(self.final,copy)
        self.make_assets();self.make_html();self.make_templates();self.make_docs();self.make_kit()
        return copy

    def make_assets(self):
        for name,width in [('marca-horizontal',1600),('marca-negativa',1600),('marca-monocromatica',1600),('simbolo',512),('simbolo-negativo',512)]:
            d=fitz.open(stream=(self.assets/(name+'.svg')).read_bytes(),filetype='svg')
            p=d[0];pix=p.get_pixmap(matrix=fitz.Matrix(width/p.rect.width,width/p.rect.width),alpha=True)
            pix.save(self.assets/(name+'.png'));d.close()

    def make_templates(self):
        folder=self.dir/'modelos';folder.mkdir(exist_ok=True)
        b=self.b
        def embedded(name,x,y,w,h):
            raw=(self.assets/name).read_text()
            view=list(map(float,re.search(r'viewBox="([^"]+)"',raw).group(1).split()))
            scale=min(w/view[2],h/view[3]);tx=x+(w-view[2]*scale)/2;ty=y+(h-view[3]*scale)/2
            inner=re.sub(r'^.*?<svg[^>]*>','',raw,flags=re.S);inner=re.sub(r'</svg>\s*$','',inner)
            return f'<g transform="translate({tx} {ty}) scale({scale})">'+inner+'</g>'
        font_style='<style>'
        for family,role,weight in [(b['fonts']['display'],'display_bold',700),(b['fonts']['body'],'body_regular',400)]:
            encoded=base64.b64encode((self.dir/b['font_files'][role]).read_bytes()).decode()
            font_style+=f'@font-face{{font-family:&quot;{html.escape(family,quote=True)}&quot;;font-weight:{weight};src:url(data:font/ttf;base64,{encoded}) format(&quot;truetype&quot;)}}'
        font_style+='</style>'
        def svg(width,height,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'+font_style+body+'</svg>'
        font=html.escape(b['fonts']['display'],quote=True)
        slide=f'<rect width="1920" height="1080" fill="{self.dark}"/>'+embedded('marca-negativa.svg',110,95,1050,190)+f'<text x="110" y="600" fill="{self.paper}" font-family="{font},sans-serif" font-weight="700" font-size="96">Título da apresentação</text><text x="115" y="700" fill="{self.paper}" font-family="{html.escape(b["fonts"]["body"],quote=True)},sans-serif" font-size="42">Subtítulo / autores / orientação</text><text x="115" y="980" fill="{self.paper}" font-family="sans-serif" font-size="26">TCC 2027 • '+esc(self.name)+'</text>'
        (folder/'slide-capa-1920x1080.svg').write_text(svg(1920,1080,slide))
        post=f'<rect width="1080" height="1350" fill="{self.dark}"/>'+embedded('marca-negativa.svg',80,90,920,200)+embedded('simbolo-negativo.svg',355,450,370,370)+f'<text x="80" y="1070" fill="{self.paper}" font-family="{font},sans-serif" font-size="64" font-weight="700">Uma ideia para investigar.</text><text x="80" y="1250" fill="{self.paper}" font-family="sans-serif" font-size="30">TCC 2027 • CONHEÇA O PROJETO</text>'
        (folder/'post-1080x1350.svg').write_text(svg(1080,1350,post))
        sheet=f'<rect width="794" height="1123" fill="#ffffff"/>'+embedded('marca-horizontal.svg',65,60,480,100)+f'<path d="M65 185H729M65 1045H729" stroke="{self.dark}"/><text x="65" y="255" fill="{self.dark}" font-family="{font},sans-serif" font-size="29" font-weight="700">Registro do projeto</text><text x="65" y="310" fill="{self.dark}" font-family="sans-serif" font-size="17">Data • Atividade • Responsáveis • Evidências • Próximos passos</text><text x="65" y="1080" fill="{self.dark}" font-family="sans-serif" font-size="13">'+esc(self.name)+' • TCC 2027</text>'
        (folder/'documento-a4.svg').write_text(svg(794,1123,sheet))
        import xml.etree.ElementTree as ET
        from fontTools.ttLib import TTFont as OutlineFont
        from fontTools.pens.svgPathPen import SVGPathPen
        ns='{http://www.w3.org/2000/svg}'
        for model in ['slide-capa-1920x1080','post-1080x1350','documento-a4']:
            root=ET.fromstring((folder/(model+'.svg')).read_text())
            for element in list(root):
                if element.tag==ns+'style':root.remove(element);continue
                if element.tag!=ns+'text':continue
                family=element.get('font-family','').split(',')[0]
                role='display_bold' if family==b['fonts']['display'] else 'body_regular'
                fontobj=OutlineFont(self.dir/b['font_files'][role]);glyphs=fontobj.getGlyphSet();cmap=fontobj.getBestCmap()
                scale=float(element.get('font-size','20'))/fontobj['head'].unitsPerEm
                group=ET.Element(ns+'g',{'fill':element.get('fill',self.dark),'transform':f'translate({element.get("x","0")} {element.get("y","0")}) scale({scale} {-scale})'})
                cursor=0
                for char in element.text or '':
                    gname=cmap.get(ord(char),'.notdef');pen=SVGPathPen(glyphs);glyphs[gname].draw(pen)
                    ET.SubElement(group,ns+'path',{'d':pen.getCommands(),'transform':f'translate({cursor} 0)'})
                    cursor+=fontobj['hmtx'].metrics[gname][0]
                index=list(root).index(element);root.remove(element);root.insert(index,group);fontobj.close()
            dd=fitz.open(stream=ET.tostring(root),filetype='svg');page=dd[0];width=800 if model.startswith('slide') else 500
            page.get_pixmap(matrix=fitz.Matrix(width/page.rect.width,width/page.rect.width),alpha=False).save(folder/(model+'.png'));dd.close()
        (folder/'LEIA-ME.md').write_text('# Modelos editáveis\n\nAbra os SVGs em um editor vetorial. Instale as fontes de ../fontes/ antes de editar textos. As marcas estão em curvas; os textos de exemplo são editáveis. Substitua títulos, autores e conteúdo. O modelo A4 é para registros internos, não substitui o modelo acadêmico da instituição. Confira contraste e área de proteção no manual.\n')

    def make_docs(self):
        c=self.col
        tokens=':root {\n'+''.join(f'  --brand-{k}: {v};\n' for k,v in c.items())+'}\n'
        (self.dir/'tokens.css').write_text(tokens)
        md=f'# {self.name} — identidade visual 2027\n\n{self.b["tagline"]}\n\n[Manual online](index.html) · [Guia PDF](guia-identidade-visual.pdf) · [Kit completo](kit-identidade-visual.zip)\n\n## Sistema\n\n'+'\n\n'.join(self.b['concept'])+'\n\n## Cores\n\n| Cor | HEX | Uso |\n| --- | --- | --- |\n'+''.join(f'| {p["name"]} | `{p["hex"]}` | {p["role"]} |\n' for p in self.b['palette'])+'\n## Tipografia\n\n'+''.join(f'- **{k}**: {v}\n' for k,v in self.b['fonts'].items())+'\n## Arquivos\n\n- `assets/`: marcas e padrões SVG; PNGs transparentes.\n- `fontes/`: fontes locais, variantes estáticas e licenças.\n- `modelos/`: slide 16:9, post 4:5 e documento A4 em SVG editável.\n- `brand.json` e `tokens.css`: especificação do sistema.\n- `guia-identidade-visual.pdf`: 28 páginas em A4 paisagem.\n\n## Produção e direitos\n\nAs marcas foram criadas para estes projetos. O manual de São José dos Campos é uma referência de estrutura e não foi redistribuído. Não há vínculo ou endosso da Prefeitura. A reprodução das marcas institucionais de terceiros depende dos respectivos arquivos e orientações. Fontes: licenças SIL OFL incluídas. Valores CMYK são aproximações sem perfil ICC: a gráfica deve validar prova, perfil e suporte.\n\n## Referências\n\n- [Manual de São José dos Campos]('+REF+'), versão 1.0, 26/10/2026.\n- [W3C — contraste mínimo]('+WCAG+').\n- [Briefing do projeto](../README_BRIEFING.md).\n\nEdição 1.0 — '+DATE+'. Responsável pelo projeto: Bruno Michel Pera.\n'
        (self.dir/'README.md').write_text(md)

    def make_html(self):
        b=self.b;C=self.col
        palette=''.join(f'<button class="swatch" data-copy="{p["hex"]}" aria-label="Copiar cor {esc(p["name"])} {p["hex"]}"><span style="background:{p["hex"]};color:{fg(p["hex"])}"><b>{esc(p["name"])}</b><code>{p["hex"]}</code></span><small>{esc(p["role"])}</small><small>RGB {" / ".join(map(str,rgb(p["hex"])))}</small><small>CMYK aproximado {" / ".join(map(str,cmyk(p["hex"])))}</small></button>' for p in b['palette'])
        def li(xs):return '<ul>'+''.join('<li>'+esc(x)+'</li>' for x in xs)+'</ul>'
        def section(id,n,title,body,cls=''):return f'<section id="{id}" class="section {cls}"><div class="section-head"><span>{n}</span><h2>{title}</h2></div>{body}</section>'
        content=''
        content+=section('conceito','01','Uma marca com intenção','<div class="two"><div>'+''.join('<p>'+esc(x)+'</p>' for x in b['concept'])+'<p class="traits">'+' · '.join(map(esc,b['personality']))+'</p></div><div class="symbol-board"><img src="assets/simbolo.svg" alt="Símbolo de '+esc(self.name)+'"><p>'+esc(b['logo']['concept'])+'</p></div></div>')
        content+=section('marca','02','Assinaturas e construção','<div class="logo-stage"><img src="assets/marca-horizontal.svg" alt="Marca principal '+esc(self.name)+'"></div><div class="two"><div class="card"><img class="vertical" src="assets/marca-vertical.svg" alt="Assinatura vertical"><h3>Versão vertical</h3><p>Para espaços estreitos, sem redigitar nem reorganizar a marca.</p></div><div class="card"><img class="symbol" src="assets/simbolo.svg" alt="Símbolo isolado"><h3>Símbolo</h3><p>Para avatar e ícone. Na primeira apresentação ao público, o nome deve aparecer por perto.</p></div></div><h3>Malha modular</h3><p>'+esc(regular_text(b['logo']['grid']))+'</p><p>Prancheta do símbolo: 100 × 100 unidades. Módulo x: 10 unidades. A malha explica o desenho; use sempre a matriz SVG.</p>')
        content+=section('regras','03','Proteção, redução e versões','<div class="protection"><span>x</span><img src="assets/marca-horizontal.svg" alt="Área livre em volta da marca"></div><p>'+esc(regular_text(b['logo']['clear_space']))+'</p><div class="metrics"><article><strong>'+str(b['logo']['min_width_print_mm'])+' mm</strong><span>assinatura impressa</span></article><article><strong>'+str(b['logo']['min_width_digital_px'])+' px</strong><span>assinatura digital</span></article><article><strong>'+str(b['logo']['symbol_min_px'])+' px</strong><span>símbolo digital</span></article></div><p>Medidas mínimas para o arquivo completo. Símbolo impresso: pelo menos 10 mm. Abaixo do limite de leitura, use o símbolo com o nome em texto acessível. Bordado e gravação precisam de amostra física.</p><div class="two"><div class="logo-stage"><img src="assets/marca-monocromatica.svg" alt="Marca monocromática"></div><div class="logo-stage inverse"><img src="assets/marca-negativa.svg" alt="Marca negativa"></div></div>'+li(['Não distorcer, girar, recortar ou trocar as cores.','Não aplicar sombras, contornos nem transparência na marca.','Sobre fotografia, usar uma placa sólida com área de proteção.','Preservar os vazios internos da versão monocromática.']))
        content+=section('cores','04','Paleta e contraste','<p>Clique em uma cor para copiar seu código. RGB é a referência digital; CMYK é aproximação matemática sem perfil ICC.</p><div class="palette">'+palette+'</div><p>'+esc(b['logo']['color_rules'])+'</p><p>Proporção editorial sugerida: 60% fundo neutro, 25% cor escura, 10% destaque principal e 5% apoio. Ajuste à peça preservando legibilidade.</p><div class="contrast-table"><table><caption>Combinações calculadas em sRGB</caption><thead><tr><th>Uso</th><th>Texto / fundo</th><th>Razão</th><th>Resultado</th></tr></thead><tbody>'+''.join(f'<tr><td>{label}</td><td><code>{a} / {bg}</code></td><td>{contrast(a,bg):.2f}:1</td><td>{"AA texto" if contrast(a,bg)>=4.5 else "Somente texto grande" if contrast(a,bg)>=3 else "Decorativo"}</td></tr>' for label,a,bg in [('Texto no papel',self.dark,self.paper),('Texto no escuro',self.paper,self.dark),('Ação',fg(self.accent),self.accent)])+'</tbody></table></div><p>Para textos comuns: 4,5:1. Para texto grande: 3:1 (18 pt regular ou 14 pt negrito). Inclua foco visível, rótulos e estados por texto ou ícone. <a href="'+WCAG+'">Referência W3C</a>.</p>')
        content+=section('tipografia','05','Letras que fazem parte da identidade','<div class="type-sample"><span>Aa</span><div><h3>'+esc(b['fonts']['display'])+'</h3><p>Títulos e chamadas. H1: 40–64 px; H2: 28–36 px; H3: 20–24 px. Entrelinha de 1,1–1,25.</p></div></div><div class="two"><div class="card"><h3>'+esc(b['fonts']['body'])+'</h3><p>Textos, botões e interfaces. Corpo de 16–18 px; entrelinha de 1,5–1,7; colunas com cerca de 55–75 caracteres.</p></div><div class="card mono"><h3>'+esc(b['fonts']['mono'])+'</h3><p>Valores, código, IDs e medidas.<br>VERSÃO 1.0 / TCC 2027</p></div></div><p>Em monografias e artigos, prevalece o modelo da instituição ou do evento. As licenças das fontes acompanham o kit.</p>')
        content+=section('linguagem','06','Forma, imagem e composição','<div class="two"><div class="pattern"><img src="assets/padrao.svg" alt="Padrão gráfico da identidade"></div><div><p>'+esc(b['motif'])+'</p>'+li(b['graphic_rules'])+'</div></div><h3>Imagens e evidências</h3>'+li(['Usar imagens do próprio projeto com autoria e autorização.','Identificar simulações, protótipos e dados demonstrativos.','Reservar áreas limpas para marca e texto; evitar filtros que alterem evidências.']+b['cautions']))
        content+=section('aplicacoes','07','Da pesquisa para a apresentação','<div class="application-grid"><a class="application" href="modelos/slide-capa-1920x1080.svg"><img src="modelos/slide-capa-1920x1080.png" alt="Modelo de slide"><h3>Apresentação 16:9</h3><p>Modelo SVG editável • 1920 × 1080</p></a><a class="application" href="modelos/post-1080x1350.svg"><img class="portrait" src="modelos/post-1080x1350.png" alt="Modelo de publicação"><h3>Post 4:5</h3><p>Modelo SVG editável • 1080 × 1350</p></a><a class="application" href="modelos/documento-a4.svg"><img class="portrait" src="modelos/documento-a4.png" alt="Modelo de documento"><h3>Registro A4</h3><p>Modelo SVG editável • uso interno</p></a></div>'+li(b['applications'])+'<p>O PDF traz também aplicações em interface, pôster científico de 90 × 120 cm, story 9:16, identificação e convivência com marcas institucionais. Siga as exigências do evento e os manuais dos titulares. Os exemplos de interface e dados são demonstrativos.</p>')
        content+=section('voz','08','A voz do projeto','<blockquote>'+esc(b['voice']['example'])+'</blockquote><div class="two"><div><h3>Como escrever</h3>'+li(b['voice']['do'])+'</div><div><h3>Evite</h3>'+li(b['voice']['dont'])+'</div></div>')
        content+=section('arquivos','09','Tudo pronto para aplicar','<div class="download-grid"><a class="download" href="guia-identidade-visual.pdf" download><strong>Guia completo</strong><span>PDF • 28 páginas</span></a><a class="download" href="kit-identidade-visual.zip" download><strong>Kit da identidade</strong><span>SVG, PNG, fontes e modelos</span></a><a class="download" href="assets/marca-horizontal.svg" download><strong>Marca vetorial</strong><span>SVG com letras em curvas</span></a><a class="download" href="brand.json" download><strong>Especificação</strong><span>JSON e tokens CSS</span></a></div><p>Antes de enviar: confira proporção, área de proteção, contraste, fontes e links. Teste o QR real e a prova física de impressão. SVGs dos modelos têm textos editáveis: instale as fontes do kit.</p>')
        content+=section('referencias','10','Referências e continuidade','<p>Responsável pelo projeto: <strong>Bruno Michel Pera</strong>. Edição 1.0, '+DATE+'.</p><p>A estrutura foi inspirada no <a href="'+REF+'">Manual de identidade visual de São José dos Campos, versão 1.0 de 26/10/2026</a>. As marcas e as aplicações foram desenvolvidas para os TCCs. Não há vínculo ou endosso da Prefeitura.</p><p><a href="'+WCAG+'">W3C: contraste mínimo</a> · <a href="../README_BRIEFING.md">Briefing do projeto</a> · <a href="https://github.com/perabru/'+self.repo.name+'/tree/main/identidade-visual">Arquivos no GitHub</a></p>')
        fontcss=''
        for role in ['display_regular','display_bold','body_regular','body_bold','mono_regular']:
            fontcss+=f'@font-face{{font-family:iv-{role.split("_")[0]};font-style:normal;font-weight:{700 if "bold" in role else 400};font-display:swap;src:url("{b["font_files"][role]}") format("truetype")}}'
        css=fontcss+f':root{{--paper:{self.paper};--dark:{self.dark};--accent:{self.accent};--second:{self.second};--action:{fg(self.accent)};}}'+'''
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;color:var(--dark);background:var(--paper);font:17px/1.7 iv-body,Arial,sans-serif}a{color:inherit;text-underline-offset:4px}img{max-width:100%;display:block}button{font:inherit}a:focus-visible,button:focus-visible{outline:3px solid currentColor;outline-offset:5px}::selection{background:var(--accent);color:var(--action)}h1,h2,h3{font-family:iv-display,Arial,sans-serif;line-height:1.15}h1{font-size:clamp(42px,6.4vw,86px);letter-spacing:-.05em;margin:20px 0 28px;max-width:900px}h2{font-size:clamp(28px,3.2vw,42px);margin:0;letter-spacing:-.035em}h3{font-size:23px;margin:0 0 17px}p{margin:0 0 22px}ul{padding-left:22px}li{margin:0 0 13px}.mono,code{font-family:iv-mono,monospace}.skip{position:absolute;left:16px;top:-70px;padding:9px 17px;background:var(--paper);z-index:100}.skip:focus{top:12px}header{position:sticky;top:0;z-index:20;background:var(--paper);border-bottom:1px solid color-mix(in srgb,var(--dark) 20%,transparent)}.topbar{max-width:1280px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:15px 32px}.topbar img{width:180px;height:auto}.topbar nav{display:flex;gap:22px;align-items:center;font-size:14px}.topbar a{text-decoration:none}.topbar .button{padding:8px 15px}.button{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-weight:700;background:var(--accent);color:var(--action);padding:14px 24px;border-radius:4px;border:1px solid transparent}.button.secondary{background:transparent;color:inherit;border-color:currentColor}.hero{background:var(--dark);color:var(--paper);padding:80px max(32px,calc((100vw - 1152px)/2)) 70px;position:relative;overflow:hidden}.hero .kicker{font:12px iv-mono,monospace;letter-spacing:.12em}.hero p{font-size:21px;max-width:770px}.hero .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:35px}.hero-mark{position:absolute;right:-30px;top:45px;width:350px;opacity:.08;pointer-events:none}.layout{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:205px minmax(0,1fr);gap:45px;padding:0 32px}.toc{position:sticky;top:100px;height:calc(100vh - 125px);overflow:auto;padding:50px 0}.toc a{display:block;text-decoration:none;padding:8px 0;font-size:13px}.toc b{font:11px iv-mono,monospace;display:block;margin-bottom:18px}.section{padding:66px 0;border-bottom:1px solid color-mix(in srgb,var(--dark) 20%,transparent);scroll-margin-top:25px}.section-head{display:flex;gap:20px;align-items:baseline;margin-bottom:33px}.section-head>span{font:12px iv-mono,monospace}.two{display:grid;grid-template-columns:1fr 1fr;gap:29px}.traits{font-family:iv-display;font-size:22px;font-weight:700}.symbol-board{padding:30px;background:#fff;border-radius:5px}.symbol-board img{width:150px;margin:0 auto 28px}.symbol-board p{font-size:14px}.logo-stage{background:#fff;padding:40px;margin-bottom:25px;min-height:170px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--dark) 12%,transparent)}.logo-stage img{width:100%;height:150px;object-fit:contain}.logo-stage.inverse{background:var(--dark)}.card{padding:26px;background:color-mix(in srgb,var(--dark) 4%,var(--paper));margin-bottom:25px}.card img{height:170px;object-fit:contain;width:100%;margin-bottom:25px}.card img.symbol{height:140px}.protection{padding:34px;background:color-mix(in srgb,var(--accent) 25%,var(--paper));margin-bottom:27px;position:relative}.protection img{background:var(--paper);padding:15px}.protection>span{position:absolute;top:7px;left:50%;font:14px iv-mono}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:30px 0}.metrics article{border-top:3px solid var(--dark);padding-top:20px}.metrics strong{font:700 32px iv-display;display:block}.metrics span{font-size:14px}.palette{display:grid;grid-template-columns:repeat(3,1fr);gap:21px;margin:30px 0}.swatch{text-align:left;border:1px solid color-mix(in srgb,var(--dark) 20%,transparent);background:transparent;padding:0;color:var(--dark);cursor:pointer}.swatch>span{display:flex;min-height:150px;flex-direction:column;justify-content:space-between;padding:16px}.swatch b{font:700 19px iv-display}.swatch small{display:block;padding:5px 13px;font-size:12px;line-height:1.5}.swatch small:last-child{padding-bottom:15px}.contrast-table{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px;text-align:left;margin:28px 0}th,td{padding:12px;border-bottom:1px solid color-mix(in srgb,var(--dark) 20%,transparent)}caption{text-align:left;font-weight:700;margin-bottom:8px}td code{white-space:nowrap;font-size:11px}.type-sample{display:flex;gap:32px;align-items:center;margin-bottom:30px}.type-sample>span{font:700 125px iv-display}.pattern{background:#fff;display:grid;place-items:center;min-height:270px;padding:22px}.pattern img{width:100%;height:260px;object-fit:contain}.application-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-bottom:32px}.application{text-decoration:none;display:block}.application img{height:200px;width:100%;object-fit:contain;background:color-mix(in srgb,var(--dark) 7%,var(--paper));margin-bottom:20px}.application h3{font-size:18px}.application p{font-size:12px}blockquote{font:700 30px/1.3 iv-display;margin:0 0 35px;background:var(--dark);color:var(--paper);padding:36px}.download-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px;margin-bottom:30px}.download{border:1px solid var(--dark);padding:23px;text-decoration:none}.download:hover{background:var(--dark);color:var(--paper)}.download strong,.download span{display:block}.download span{font-size:13px;margin-top:5px}footer{max-width:1280px;margin:auto;padding:38px 32px;font-size:13px}.toast{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);padding:13px 23px;border-radius:4px;background:var(--dark);color:var(--paper);box-shadow:0 5px 25px #0003;z-index:50}.toast:empty{display:none}@media(max-width:1000px){.layout{grid-template-columns:150px minmax(0,1fr);gap:26px}.palette{grid-template-columns:1fr 1fr}.topbar nav{gap:12px}.topbar nav>a:first-child{display:none}.two{gap:20px}.hero{padding-top:60px}}@media(max-width:760px){body{font-size:16px}.topbar{padding:12px 18px}.topbar img{width:40px;height:40px;object-fit:contain}.topbar nav{font-size:12px}.topbar nav>a:nth-child(2){display:none}.hero{padding:48px 22px}.hero p{font-size:18px}.layout{display:block;padding:0 22px}.toc{position:static;height:auto;display:flex;gap:18px;overflow:auto;padding:20px 0;border-bottom:1px solid}.toc b{display:none}.toc a{white-space:nowrap;font-size:12px}.section{padding:43px 0}.two{grid-template-columns:1fr}.palette{gap:12px}.metrics strong{font-size:25px}.metrics span{font-size:12px}.logo-stage{padding:25px;min-height:125px}.application-grid{grid-template-columns:1fr}.application img{height:240px}.download-grid{grid-template-columns:1fr}.type-sample{display:block}.type-sample>span{font-size:90px}.section-head{gap:12px}blockquote{font-size:25px;padding:27px}.hero-mark{width:250px}.protection{padding:26px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{header,.toc,.actions,.download-grid,footer{display:none}.layout{display:block;padding:0}.hero{padding:25px}.section{break-inside:avoid;padding:25px 0}body{font-size:11pt}.section h2{font-size:22pt}.palette{grid-template-columns:repeat(3,1fr)}}
'''
        toc=[('conceito','01 Conceito'),('marca','02 Marca'),('regras','03 Regras'),('cores','04 Cores'),('tipografia','05 Tipografia'),('linguagem','06 Linguagem'),('aplicacoes','07 Aplicações'),('voz','08 Voz'),('arquivos','09 Downloads'),('referencias','10 Referências')]
        js='''document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const value=button.dataset.copy;const status=document.getElementById('status');try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);status.textContent='Cor copiada: '+value;}else{status.textContent='Código da cor: '+value;}}catch(e){status.textContent='Código da cor: '+value;}clearTimeout(window.copyTimer);window.copyTimer=setTimeout(()=>status.textContent='',3500);}));'''
        out='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Manual de identidade visual de '+esc(self.name)+': marca, cores, tipografia, regras e aplicações. TCC 2027."><meta name="theme-color" content="'+self.dark+'"><title>'+esc(self.name)+' • Identidade visual 2027</title><link rel="icon" type="image/svg+xml" href="assets/simbolo.svg"><style>'+css+'</style></head><body><a class="skip" href="#conceito">Pular para o conteúdo</a><header><div class="topbar"><a href="../index.html" aria-label="Voltar ao projeto"><picture><source media="(max-width:760px)" srcset="assets/simbolo.svg"><img src="assets/marca-horizontal.svg" alt="'+esc(self.name)+'"></picture></a><nav aria-label="Ações principais"><a href="../index.html">Projeto</a><a href="#arquivos">Arquivos</a><a class="button" href="guia-identidade-visual.pdf">Baixar guia PDF</a></nav></div></header><main><div class="hero"><img class="hero-mark" src="assets/simbolo-negativo.svg" alt=""><span class="kicker">'+esc(self.name).upper()+' / TCC 2027 / EDIÇÃO 1.0</span><h1>'+esc(b['tagline'])+'</h1><p>Guia de identidade visual de '+esc(self.name)+'. '+esc(b['domain'])+'</p><div class="actions"><a class="button" href="#conceito">Explorar a identidade</a><a class="button secondary" href="kit-identidade-visual.zip" download>Baixar kit completo</a></div></div><div class="layout"><aside class="toc" aria-label="Índice do manual"><b>MANUAL DA MARCA</b>'+''.join('<a href="#'+id+'">'+label+'</a>' for id,label in toc)+'</aside><div>'+content+'</div></div></main><footer>'+esc(self.name)+' · Bruno Michel Pera · TCCs 2027 · <a href="../index.html">Voltar ao projeto</a></footer><div id="status" class="toast" role="status" aria-live="polite"></div><script>'+js+'</script></body></html>'
        (self.dir/'index.html').write_text(out)

    def make_kit(self):
        target=self.dir/'kit-identidade-visual.zip'
        files=[f for f in sorted(self.dir.rglob('*')) if f.is_file() and f.name not in ['kit-identidade-visual.zip','SHA256SUMS.txt'] and '__pycache__' not in f.parts]
        manifest=''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(self.dir))+'\n' for f in files)
        (self.dir/'SHA256SUMS.txt').write_text(manifest)
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
            for f in files+[self.dir/'SHA256SUMS.txt']:z.write(f,f.relative_to(self.dir))

def overview(manuals):
    out=ROOT/'output';out.mkdir(exist_ok=True)
    im=Image.new('RGB',(1800,1560),'#F0EDE5');draw=ImageDraw.Draw(im)
    fallback='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    ft=ImageFont.truetype(fallback,48);small=ImageFont.truetype(fallback,23)
    draw.text((65,44),'TCCs 2027 | Seis identidades',fill='#202520',font=ft)
    for i,m in enumerate(manuals):
        x=60+(i%2)*870;y=145+(i//2)*455
        draw.rounded_rectangle((x,y,x+810,y+405),radius=18,fill=m.paper)
        logo=Image.open(m.assets/'marca-horizontal.png').convert('RGBA');logo.thumbnail((690,180))
        im.paste(logo,(x+(810-logo.width)//2,y+53+(180-logo.height)//2),logo)
        draw.text((x+38,y+252),m.b['domain'],fill=m.dark,font=small)
        width=734/len(m.b['palette'])
        for j,p in enumerate(m.b['palette']):draw.rectangle((x+38+j*width,y+316,x+38+(j+1)*width,y+357),fill=p['hex'])
    im.save(out/'TCCs_2027_Identidades_Visuais.png')
    with zipfile.ZipFile(out/'TCCs_2027_Guias_e_Identidades.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for m in manuals:
            for f in m.dir.rglob('*'):
                if f.is_file() and f.name!='kit-identidade-visual.zip':z.write(f,Path(m.repo.name)/f.relative_to(m.dir))
        z.write(out/'TCCs_2027_Identidades_Visuais.png','TCCs_2027_Identidades_Visuais.png')

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--repo',nargs='*');args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True);TEMP.mkdir(parents=True,exist_ok=True)
    manuals=[]
    for name in args.repo or ([ROOT.name] if STANDALONE else ORDER):
        m=Manual(REPOS/name);m.build();manuals.append(m)
        print(json.dumps({'repo':name,'pages':m.count,'pdf':str(m.final),'bytes':m.final.stat().st_size},ensure_ascii=False))
    if len(manuals)==6:overview(manuals)
