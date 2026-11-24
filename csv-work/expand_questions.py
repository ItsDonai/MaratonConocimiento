"""Amplía el CSV de 70 preguntas a 100 con cuatro opciones por pregunta."""
import csv
import random
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parent
source = root / 'preguntas_maraton_70.csv'
with source.open(encoding='utf-8-sig', newline='') as handle:
    reader = csv.DictReader(handle)
    fields = reader.fieldnames
    original = list(reader)
assert len(original) == 70

fourth_options = [
    'Roma', 'Cu', 'Agrabah', 'Salvador Dalí', 'Río Yangtsé', '1521',
    'Pete Sampras', 'Helio', 'Pink Floyd', 'Carlos Fuentes', 'Europa',
    'Trajano', 'Cada 6 años', 'Urano', 'Jurassic Park', 'Museo de Orsay',
    'Brisbane', '1979', 'Italia', 'Los riñones', 'Chris Hemsworth',
    'Lope de Vega', 'Japón', 'Los Olmecas', '36 minutos', '30,000 km/s',
    'Stranger Things', 'Diego Velázquez', 'Kilimanjaro', 'Ada Lovelace',
    'Esgrima', 'Radio', 'Freddie Mercury', 'Sansón Carrasco',
    'Estrecho de Ormuz', 'Boston', 'Azul', '80 °C', 'Po', 'Gian Lorenzo Bernini',
    'Liechtenstein', 'La caída del Muro de Berlín', '8 jugadores', 'Positrón',
    'Flauta', 'Rick Riordan', 'Líbano', 'Itzcóatl', 'Cebra', 'Océano Ártico',
    'Santiago Ixcuintla', 'Como alcalino', 'El Día de la Revolución',
    'Rubén Darío', 'Sur', '1810', '17 puntos', 'Sublimación', 'Microsoft',
    'Aliteración', 'Selva seca de montaña', 'La promulgación de la Constitución de 1917',
    '20 km/h', 'La conductividad eléctrica', 'Animación por rotoscopia',
    'Forma impersonal', '700 pesos', 'El pulpo', '300 kilómetros', 'La cultura zapoteca',
]
assert len(fourth_options) == 70

# Cinco preguntas nuevas por cada una de las seis categorías originales.
# El primer elemento de las opciones es la respuesta correcta; se mezcla al exportar.
new = [
    ('Deportes', '¿En qué deporte se utiliza un volante o pluma en lugar de una pelota?', ['Bádminton', 'Tenis', 'Squash', 'Tenis de mesa']),
    ('Deportes', '¿Cuántos metros mide una piscina olímpica de curso largo?', ['50 metros', '25 metros', '75 metros', '100 metros']),
    ('Deportes', 'En fútbol, ¿cómo se llama anotar tres goles en un mismo partido?', ['Hat-trick', 'Doblete', 'Fuera de juego', 'Tiro de esquina']),
    ('Deportes', 'En ajedrez, ¿qué pieza se mueve en forma de L y puede saltar sobre otras piezas?', ['El caballo', 'El alfil', 'La torre', 'La reina']),
    ('Deportes', 'Una ciclista recorre 18 kilómetros en una hora y media a velocidad constante. ¿Cuál es su velocidad media?', ['12 km/h', '9 km/h', '15 km/h', '27 km/h']),
    ('Ciencias Básicas', '¿Qué orgánulo celular produce la mayor parte del ATP durante la respiración aerobia?', ['La mitocondria', 'El núcleo', 'El ribosoma', 'El aparato de Golgi']),
    ('Ciencias Básicas', 'Una mezcla de agua y arena se pasa por un filtro que retiene la arena. ¿Qué método de separación se utiliza?', ['Filtración', 'Destilación', 'Evaporación', 'Imantación']),
    ('Ciencias Básicas', '¿Cuál es el resultado de sumar 3/4 y 1/2?', ['5/4', '4/6', '3/8', '1/4']),
    ('Ciencias Básicas', '¿Cuál es la unidad de resistencia eléctrica en el Sistema Internacional?', ['Ohmio', 'Voltio', 'Amperio', 'Vatio']),
    ('Ciencias Básicas', 'Si dos progenitores tienen los genotipos Aa y Aa, ¿qué probabilidad hay de que una cría tenga el genotipo aa en un cruce mendeliano simple?', ['25 %', '0 %', '50 %', '75 %']),
    ('Entretenimiento', 'En la saga Star Wars, ¿quién es el padre de Luke Skywalker?', ['Anakin Skywalker', 'Obi-Wan Kenobi', 'Han Solo', 'Yoda']),
    ('Entretenimiento', '¿Qué estudio de animación produjo la película Toy Story de 1995?', ['Pixar', 'DreamWorks', 'Studio Ghibli', 'Illumination']),
    ('Entretenimiento', '¿Quién dirigió la película Jurassic Park estrenada en 1993?', ['Steven Spielberg', 'George Lucas', 'James Cameron', 'Tim Burton']),
    ('Entretenimiento', '¿Qué banda británica grabó la canción Bohemian Rhapsody?', ['Queen', 'The Beatles', 'Oasis', 'Coldplay']),
    ('Entretenimiento', 'En la película El viaje de Chihiro, ¿en qué animales se convierten los padres de la protagonista?', ['Cerdos', 'Gatos', 'Lobos', 'Ratones']),
    ('Arte y Literatura', '¿Quién escribió la novela Pedro Páramo?', ['Juan Rulfo', 'Carlos Fuentes', 'Octavio Paz', 'José Emilio Pacheco']),
    ('Arte y Literatura', '¿Qué pintora mexicana realizó la obra Las dos Fridas?', ['Frida Kahlo', 'Remedios Varo', 'Leonora Carrington', 'María Izquierdo']),
    ('Arte y Literatura', '¿Cómo se llama la repetición de sonidos al final de dos o más versos a partir de la última vocal acentuada?', ['Rima', 'Prosa', 'Estrofa', 'Narración']),
    ('Arte y Literatura', '¿Qué compositor creó la Novena sinfonía, cuyo último movimiento incluye la Oda a la alegría?', ['Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johann Sebastian Bach', 'Antonio Vivaldi']),
    ('Arte y Literatura', 'En la frase «Te lo he dicho un millón de veces», ¿qué recurso literario se utiliza?', ['Hipérbole', 'Onomatopeya', 'Símil', 'Aliteración']),
    ('Geografía', '¿Cuál es la capital del estado de Nayarit?', ['Tepic', 'Compostela', 'San Blas', 'Santiago Ixcuintla']),
    ('Geografía', '¿Qué línea imaginaria divide la Tierra en los hemisferios norte y sur?', ['El ecuador', 'El meridiano de Greenwich', 'El trópico de Cáncer', 'El círculo polar ártico']),
    ('Geografía', '¿Qué país sudamericano tiene costas tanto en el océano Pacífico como en el mar Caribe?', ['Colombia', 'Perú', 'Chile', 'Ecuador']),
    ('Geografía', '¿Qué tipo de movimiento de placas tectónicas ocurre cuando dos placas se separan?', ['Divergente', 'Convergente', 'Transformante', 'De subducción']),
    ('Geografía', 'En un mapa a escala 1:50 000, una carretera mide 4 centímetros. ¿Cuál es su longitud real?', ['2 kilómetros', '200 metros', '20 kilómetros', '500 metros']),
    ('Historia', '¿En qué año comenzó la Revolución mexicana?', ['1910', '1810', '1821', '1917']),
    ('Historia', '¿Qué presidente mexicano encabezó el gobierno republicano durante la intervención francesa y el Segundo Imperio?', ['Benito Juárez', 'Porfirio Díaz', 'Francisco I. Madero', 'Lázaro Cárdenas']),
    ('Historia', '¿Qué civilización de la antigua Mesopotamia desarrolló la escritura cuneiforme?', ['La sumeria', 'La egipcia', 'La fenicia', 'La romana']),
    ('Historia', '¿Qué tratado de 1848 puso fin a la guerra entre México y Estados Unidos?', ['Tratado de Guadalupe Hidalgo', 'Tratado de Córdoba', 'Tratado de Versalles', 'Tratado de Tordesillas']),
    ('Historia', '¿Qué pueblo mesoamericano construyó las cabezas colosales de piedra halladas en sitios como San Lorenzo y La Venta?', ['El olmeca', 'El mexica', 'El purépecha', 'El tolteca']),
]
assert len(new) == 30

rows = []
for row, fourth in zip(original, fourth_options):
    updated = dict(row)
    updated['opcion_d'] = fourth
    rows.append(updated)
for i, (category, question, options) in enumerate(new, 71):
    row = dict.fromkeys(fields, '')
    row.update(id=f'maraton-{i:03}', categoria=category, pregunta=question, correcta='A')
    for letter, option in zip('abcd', options):
        row[f'opcion_{letter}'] = option
    rows.append(row)

rng = random.Random(20261124)
positions = list(range(4)) * 25
rng.shuffle(positions)
for row, correct_position in zip(rows, positions):
    options = [(row[f'opcion_{c}'], row[f'imagen_{c}']) for c in 'abcd']
    correct = options.pop('ABCD'.index(row['correcta']))
    assert len({option[0].casefold() for option in options + [correct]}) == 4
    rng.shuffle(options)
    options.insert(correct_position, correct)
    for letter, (text, image) in zip('abcd', options):
        row[f'opcion_{letter}'], row[f'imagen_{letter}'] = text, image
    row['correcta'] = 'ABCD'[correct_position]

assert len(rows) == len({row['id'] for row in rows}) == len({row['pregunta'] for row in rows}) == 100
assert Counter(row['correcta'] for row in rows) == dict.fromkeys('ABCD', 25)
for old, updated in zip(original, rows):
    assert old[f"opcion_{old['correcta'].lower()}"] == updated[f"opcion_{updated['correcta'].lower()}"]

output = root / 'preguntas_maraton_100.csv'
with output.open('w', encoding='utf-8-sig', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=fields, lineterminator='\r\n')
    writer.writeheader()
    writer.writerows(rows)
print(f'{output}: {len(rows)} preguntas, cuatro opciones, 25 respuestas correctas por letra.')
