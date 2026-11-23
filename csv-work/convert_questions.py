import csv,re,zipfile,xml.etree.ElementTree as E,json
from pathlib import Path
n={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile('preguntas_maraton_50.xlsx') as z:
 ss=[]
 if 'xl/sharedStrings.xml' in z.namelist(): ss=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',n)]
 original=[]
 for row in E.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:sheetData/m:row',n)[1:]:
  d={}
  for c in row.findall('m:c',n):
   v=c.find('m:v',n); ins=c.find('m:is',n)
   val=v.text if v is not None else ''.join(ins.itertext()) if ins is not None else ''
   if c.attrib.get('t')=='s': val=ss[int(val)]
   d[re.sub(r'\d','',c.attrib['r'])]=val
  correct=d['G'][0].upper(); assert d['G'][3:]==d[{'A':'D','B':'E','C':'F'}[correct]]
  original.append([d['B'],d['C'],d['D'],d['E'],d['F'],correct])
new=[
['Geografía','¿En qué municipio de Nayarit se encuentra la zona arqueológica de Los Toriles?','Compostela','Ixtlán del Río','Acaponeta','B'],
['Ciencias Básicas','Si el jugo de limón tiene un pH de 2, ¿cómo se clasifica?','Como neutro','Como básico','Como ácido','C'],
['Entretenimiento','¿Qué celebración mexicana es central en la historia de la película Coco?','El Día de Muertos','El Día de la Independencia','El Día de la Candelaria','A'],
['Arte y Literatura','¿Qué poeta nacido en Tepic escribió el poema En paz?','Octavio Paz','Amado Nervo','Jaime Sabines','B'],
['Geografía','Si observas la puesta del Sol desde una playa de San Blas mirando hacia el mar, ¿hacia qué punto cardinal miras aproximadamente?','Este','Norte','Oeste','C'],
['Historia','¿En qué año se promulgó en Querétaro la Constitución mexicana que estableció derechos laborales y agrarios?','1917','1857','1824','A'],
['Deportes','Un jugador de baloncesto encesta tres tiros de 3 puntos y dos tiros de 2 puntos. ¿Cuántos puntos consigue?','11 puntos','13 puntos','15 puntos','B'],
['Ciencias Básicas','Cuando la ropa mojada se seca al aire sin que el agua hierva, ¿qué cambio de estado ocurre?','Condensación','Solidificación','Evaporación','C'],
['Entretenimiento','¿Qué empresa creó las series de videojuegos Super Mario y The Legend of Zelda?','Nintendo','Sega','Sony','A'],
['Arte y Literatura','En la frase «Tus ojos son dos luceros», ¿qué recurso literario se utiliza?','Hipérbole','Metáfora','Onomatopeya','B'],
['Geografía','¿Qué ecosistema costero caracteriza a Marismas Nacionales Nayarit?','Bosque de pinos','Desierto de dunas sin vegetación','Manglar','C'],
['Historia','¿Cuál de estos acontecimientos ocurrió primero en México?','El inicio de la Independencia','La Batalla de Puebla','El inicio de la Revolución','A'],
['Deportes','Una estudiante corre 5 kilómetros en 25 minutos a ritmo constante. ¿Cuál es su velocidad media?','10 km/h','12 km/h','15 km/h','B'],
['Ciencias Básicas','Cuando un autobús frena de golpe, los pasajeros tienden a seguir moviéndose hacia delante. ¿Qué concepto explica esto?','La inercia','El magnetismo','La flotación','A'],
['Entretenimiento','¿Qué técnica de animación consiste en fotografiar objetos, moverlos un poco y repetir el proceso para simular movimiento?','Captura de movimiento','Animación vectorial','Stop motion','C'],
['Arte y Literatura','Si un relato comienza «Entré al salón y encontré una carta sobre mi mesa», ¿en qué persona está narrado?','Tercera persona','Primera persona','Segunda persona','B'],
['Ciencias Básicas','Una mochila cuesta 800 pesos y tiene 25 % de descuento. ¿Cuánto se paga por ella?','600 pesos','625 pesos','750 pesos','A'],
['Ciencias Básicas','En una cadena alimentaria marina, ¿qué organismo produce su alimento mediante fotosíntesis?','El tiburón','El camarón','El fitoplancton','C'],
['Geografía','En un mapa a escala 1:100 000, la distancia entre dos localidades es de 3 centímetros. ¿Qué distancia real representa?','3 kilómetros','30 kilómetros','300 metros','A'],
['Historia','¿Qué cultura fundó México-Tenochtitlan, ciudad asociada con el águila sobre un nopal del escudo nacional?','La cultura maya','La cultura mexica','La cultura olmeca','B']
]
assert len(original)==50 and len(new)==20
assert len({r[1] for r in original+new})==70
header=['id','categoria','pregunta','opcion_a','imagen_a','opcion_b','imagen_b','opcion_c','imagen_c','opcion_d','imagen_d','correcta']
output=Path('csv-work/preguntas_maraton_70.csv')
with output.open('w',encoding='utf-8-sig',newline='') as f:
 writer=csv.writer(f,lineterminator='\r\n'); writer.writerow(header)
 for i,(cat,q,a,b,c,answer) in enumerate(original+new,1): writer.writerow([f'maraton-{i:03}',cat,q,a,'',b,'',c,'','','',answer])
print(json.dumps({'archivo':str(output.resolve()),'originales':len(original),'nuevas':len(new),'total':len(original+new),'respuestas_nuevas':{a:sum(r[-1]==a for r in new) for a in 'ABC'}},ensure_ascii=True))
