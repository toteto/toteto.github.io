main();

function main() {
  const peer = configurePeerJs();
  var myName,
    myPeerId = '';
  var myWords = [];

  peer.on('open', id => {
    myPeerId = id;
    document.getElementById('startingGameContainer').style.display = 'block';
  });

  myName = document.getElementById('inputName').value;
  document.getElementById('inputName').oninput = _e => {
    myName = document.getElementById('inputName').value.trim();
    validateMyData(myName, myWords);
  };
  myWords = parseMyWords(document.getElementById('inputWords').value);
  document.getElementById('inputWords').oninput = _e => {
    myWords = parseMyWords(document.getElementById('inputWords').value);
    validateMyData(myName, myWords);
  };
  validateMyData(myName, myWords);

  document.getElementById('btnHostGame').onclick = () => {
    hideMyDataInputs();
    document.getElementById('btnHostGame').style.display = 'none';
    document.getElementById('joinGameContainer').style.display = 'none';
    document.getElementById('textHostGameId').innerText = `Game ID: ${myPeerId}`;
    document.getElementById('btnStartGame').style.display = 'block';

    const myFakePeerConnection = {
      send: publicState => updateFromPublicState(publicState)
    };
    document.getElementById('btnCorrect').onclick = () => {
      updateStateForNextTurn(true);
      broadcastPublicState();
    };
    document.getElementById('btnIncorrect').onclick = () => {
      updateStateForNextTurn(false);
      broadcastPublicState();
    };
    const hostState = {
      players: [
        { name: myName, words: myWords.map(w => ({ value: w, guessed: false })), score: 0, conn: myFakePeerConnection }
      ]
      // currentTurn: {
      //   player: element from hostState.players,
      //   word: element from hostState.players.words
      // }
    };
    broadcastPublicState();
    peer.on('connection', conn => {
      conn.on('open', () => {
        hostState.players.push({
          name: conn.metadata.name,
          words: conn.metadata.words.map(w => ({ value: w, guessed: false })),
          score: 0,
          conn: conn
        });
        conn.on('data', correctGuess => {
          updateStateForNextTurn(correctGuess);
          broadcastPublicState();
        });
        broadcastPublicState();
      });
    });

    function broadcastPublicState() {
      console.error(hostState);

      const currentPlayerName = hostState.currentTurn?.player.name;
      const mutualPlayerState = {
        players: hostState.players.map(p => ({ name: p.name, score: p.score })),
        currentPlayer: currentPlayerName
      };
      hostState.players.forEach(player => {
        const playerState = Object.assign({}, mutualPlayerState);
        if (hostState.currentTurn?.player === player) {
          playerState.currentWord = hostState.currentTurn.word.value;
        }
        player.conn.send(playerState);
      });
    }

    document.getElementById('btnStartGame').onclick = () => {
      document.getElementById('btnStartGame').style.display = 'none';
      updateStateForNextTurn();
      broadcastPublicState();
    };

    function updateStateForNextTurn(isCorrectGuess) {
      if (isCorrectGuess) {
        hostState.currentTurn.player.score += 1;
        hostState.currentTurn.word.guessed = true;
      }
      const remainingWords = hostState.players.flatMap(p => p.words.filter(w => !w.guessed));
      if (remainingWords.length > 0) {
        hostState.currentTurn = {
          player:
            hostState.players[
              (hostState.players.findIndex(p => p === hostState.currentTurn?.player) + 1) % hostState.players.length
            ],
          word: remainingWords.sample()
        };
      } else {
        hostState.currentTurn = undefined;
        hostState.players.forEach(p => p.words.forEach(w => (w.guessed = false)));
        document.getElementById('btnStartGame').style.display = 'block';
      }
    }
  };

  document.getElementById('btnJoinGame').onclick = () => {
    hideMyDataInputs();
    document.getElementById('hostGameContainer').style.display = 'none';

    const joinGameId = document.getElementById('inputJoinGameId').value;

    Promise.resolve(peer.connect(joinGameId, { metadata: { name: myName, words: myWords } })).then(conn =>
      conn.on('open', () => {
        document.getElementById('joinGameContainer').style.display = 'none';
        joinedGame(conn);
      })
    );
  };
}

/**
 * @param {DataConnection} conn
 */
function joinedGame(conn) {
  conn.on('data', publicState => {
    console.log(publicState);
    updateFromPublicState(publicState);

    document.getElementById('btnCorrect').onclick = () => conn.send(true);
    document.getElementById('btnIncorrect').onclick = () => conn.send(false);
  });
}

function updateFromPublicState(publicState) {
  document.getElementById('textPlayers').innerText = `Players: ${publicState.players.map(
    p => `\n${p.name} (${p.score})`
  )}`;

  if (publicState.currentPlayer) {
    // game is in progress
    document.getElementById('gameInProgressContainer').style.display = 'block';
    document.getElementById('currentTurn').innerText = `Current player: ${publicState.currentPlayer}`;
    if (publicState.currentWord) {
      // my turn
      document.getElementById('myTurnContainer').style.display = 'block';
      document.getElementById('wordToGuess').innerText = publicState.currentWord;
    } else {
      // someone else turn
      document.getElementById('myTurnContainer').style.display = 'none';
    }
  } else {
    document.getElementById('gameInProgressContainer').style.display = 'none';
  }
}

/**
 * @param {string} csvWords
 */
function parseMyWords(csvWords) {
  return csvWords
    .split(',')
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

function validateMyData(name, words) {
  const isValid = name.length > 0 && words.length > 0;
  document.getElementById('btnHostGame').disabled = document.getElementById('btnJoinGame').disabled = !isValid;
}

function hideMyDataInputs() {
  document.getElementById('inputName').style.display = document.getElementById('inputWords').style.display = 'none';
}

function configurePeerJs() {
  return new Peer({
    config: {
      iceServers: [
        {
          url: 'turn:numb.viagenie.ca',
          username: 'antonioivanovski@gmail.com',
          credential: 'LfeuhHqbto8JM+JwMYDbdjWdV'
        }
      ]
    }
  });
}

Array.prototype.sample = function() {
  return this[Math.floor(Math.random() * this.length)];
};
