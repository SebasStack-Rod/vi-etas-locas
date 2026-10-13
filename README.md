# Viñetas Locas 🎰

Juego de cartas online (reglas de Joking Hazard) para jugar con amigos usando un código de 4 dígitos. Sin servidor: usa PeerJS (conexión directa entre navegadores).

## Cómo jugar
1. Abrí la página, escribí tu nombre y tocá **Crear sala**. Te da un código de 4 números.
2. Tus amigos abren la misma página, ponen su nombre y el código, y tocan **Unirse**.
3. El anfitrión elige el primer juez y toca **¡Repartir!** (mínimo 3 jugadores, máximo 8).

## Ver las cartas en grande
En la computadora, al pasar el mouse sobre cualquier carta aparece grande en el panel de la izquierda (como en Yu-Gi-Oh). Tu mano se acomoda en una fila con todas las cartas visibles.
En el celular, mantené apretada cualquier carta (de tu mano o de la mesa) y aparece en tamaño completo en el centro; al soltar desaparece. Un toque corto la selecciona.

## Modos de juego (los elige el anfitrión al repartir)
- **Normal**: reglas clásicas, gana quien llegue a los puntos elegidos.
- **Modo cabrón**: si la primera carta es roja, el juez se queda 1 punto y le quita 1 a otro jugador.
- **Maratón**: se juega hasta acabar el mazo; gana el que tenga más puntos. En empate, el jugador con menos puntos es juez, juega 2 cartas y los empatados juegan la tercera.
- **La historia interminable**: sin cartas rojas, 10 cartas cada uno. Cada turno se suma una viñeta a la historia y los demás votan si tiene sentido (mayoría que rechaza = vuelve a la mano). Si no podés jugar, cambiás 1 carta por 2 y perdés el turno. Gana quien se queda sin cartas.

## Conexión y reconexión
- Si alguien pierde internet o recarga la página, vuelve a entrar con el **mismo código y el mismo nombre** y sigue en su lugar con sus cartas.
- Si se cae el anfitrión, otro jugador (al azar) toma la sala automáticamente y los demás se reconectan solos en unos segundos.
- El anfitrión ve una ✖ en cada jugador para sacar a quien se fue; la ronda en curso se reinicia.

## Poner tus imágenes
- Cartas normales → `imagenes/normales/` nombradas `1.jpg`, `2.jpg`, `3.jpg`…
- Cartas con borde rojo → `imagenes/rojas/` nombradas `1.jpg`, `2.jpg`…
- Abrí `cartas.js` y poné cuántas imágenes hay de cada tipo (y la extensión si no es jpg).

Mientras no haya imágenes, el juego muestra cartas de prueba con emojis.

## Publicar en GitHub Pages
1. Creá un repositorio nuevo en github.com (público).
2. Subí todo el contenido de esta carpeta (**Add file → Upload files**), incluidas las carpetas `imagenes`.
3. **Settings → Pages → Branch: main / (root) → Save**.
4. En un minuto tu juego queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`. Ese link es el que compartís.
