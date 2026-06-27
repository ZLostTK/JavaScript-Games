# Sistema Online Multijugador

El módulo `Online` es un wrapper de [PeerJS](https://peerjs.com/) para juegos multijugador P2P (WebRTC).

**Compatible con todos los motores:** Engine, PIXIEngine, LittleEngine y DOMEngine. El networking es independiente del renderizado.

Para la UI de lobby (crear/unirse/copiar código), usa **`OnlineLobby`** — ver [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md).

## ¿Para qué sirve?
Permite que dos o más jugadores se conecten entre sí sin necesidad de configurar ni mantener un servidor backend complejo (como Node.js o Socket.io). Uno de los jugadores hace de "Host" (servidor) y los demás se unen a su sala usando un código corto.

## ¿Cuándo utilizarlo?
Para juegos multijugador en tiempo real o por turnos donde los jugadores puedan compartir un código de sala para jugar con sus amigos. No es recomendado para juegos masivos en línea (MMO) o partidas competitivas con rankings oficiales (ya que al ser P2P, los jugadores pueden hacer trampas modificando el cliente).

---

## Ciclo de Vida y Eventos

El módulo funciona mediante eventos (callbacks) que debes configurar antes de iniciar una conexión.

```javascript
// Configura qué pasa cuando recibes datos, cuando alguien se conecta, etc.
Online.on('onHostReady', (code) => {
    // Se ejecuta solo para el Host cuando la sala se crea exitosamente
    console.log(`Pasa este código a tu amigo: ${code}`);
});

Online.on('onConnected', (role) => {
    // role puede ser 'host' o 'guest'
    console.log(`Conectado al juego con rol: ${role}`);
});

Online.on('onData', (data, peerId) => {
    // Cada vez que recibes un mensaje
    console.log(`Datos de ${peerId}:`, data);
});

Online.on('onDisconnect', (peerId) => {
    console.log(`El jugador ${peerId} se ha ido.`);
});

Online.on('onError', (err) => {
    console.error('Error de conexión:', err);
});
```

---

## Crear una Partida (Host)

Para iniciar una sala, llama a `Online.host()`. Internamente generará un código corto de sala de 5 caracteres.

```javascript
Online.host((code) => {
    // Muestra este código en la interfaz de tu juego
    document.getElementById('room-code-display').innerText = code;
});
```
*Nota: El Host también actuará como jugador. El código de tu juego debe encargarse de mantener el estado oficial de la partida y retransmitirlo a los demás.*

---

## Unirse a una Partida (Guest)

Para unirte a una sala existente, el jugador debe ingresar el código que le dio el Host.

```javascript
const userCode = document.getElementById('room-code-input').value;
Online.join(userCode);
```

---

## Enviar y Recibir Datos

Una vez conectados (después de que se dispare `onConnected`), pueden enviarse objetos JSON entre sí.

### Métodos de Envío

- **`Online.send(data, connId)`**
  Envía un mensaje. Si eres un *Guest*, no necesitas especificar `connId`, el mensaje irá directo al Host. Si eres el *Host* y quieres responder a un cliente en específico, pasas su `connId`.
  
- **`Online.sendToAll(data)`**
  *(Solo para el Host)*: Envía el mismo mensaje a todos los clientes conectados a la sala. Muy útil para sincronizar posiciones o estados.

### Ejemplo de Comunicación Completa

**En el Guest (Jugador 2):**
```javascript
// Cada frame o al presionar una tecla, el Guest avisa al Host
if (Input.isPressed('Space')) {
    Online.send({ action: 'jump', player: 'player2' });
}
```

**En el Host (Servidor/Jugador 1):**
```javascript
// El host recibe la acción y actualiza el mundo
Online.on('onData', (data, peerId) => {
    if (data.action === 'jump') {
        gameState.players[data.player].jump();
        
        // Notifica a todos (incluyendo al que saltó para confirmación) el nuevo estado
        Online.sendToAll({ type: 'stateSync', state: gameState });
    }
});
```

---

## Limpieza

Cuando el juego termine o el jugador salga al menú principal, asegúrate de destruir la conexión para liberar recursos y permitir la creación de una nueva sala.

```javascript
Online.destroy();
OnlineLobby.cancel(); // destruye conexión y oculta overlay DOM
```
