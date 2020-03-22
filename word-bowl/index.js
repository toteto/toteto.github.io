(function() {
  const inputName = elementById('inputName');
  const inputWords = elementById('inputWords');
  const inputJoinGame = elementById('inputJoinGameId');
  const btnHostGame = elementById('btnHostGame');
  const btnJoinGame = elementById('btnJoinGame');
  const btnStartGame = elementById('btnStartGame');

  // User input
  myName = inputName.value;
  inputName.oninput = () => {
    myName = inputName.value;
    validateMyData(myName, myWords);
  };
  myWords = parseMyWords(inputWords.value);
  inputWords.oninput = () => {
    myWords = parseMyWords(inputWords.value);
    validateMyData(myName, myWords);
  };
  validateMyData(myName, myWords);

  // User actions
  btnHostGame.onclick = () => {
    elementById('hostOrJoinGameContainer').style.display = 'none';
    elementById('userInputContainer').style.display = 'none';
    const hostController = WordBowlHostController.create();

    hostController.gameId().then(gameId => {
      elementById('textHostGameId').innerHTML = `Game ID: <b>${gameId}</b>`;
      btnStartGame.style.display = '';
      joinGame(gameId);
      btnStartGame.onclick = () => {
        hostController.startGame().then(() => {
          elementById('pendingGameContainer').style.display = 'none';
        });
      };
    });
  };
  btnJoinGame.onclick = () => {
    elementById('hostOrJoinGameContainer').style.display = 'none';
    elementById('userInputContainer').style.display = 'none';
    const joinGameId = inputJoinGame.value;
    joinGame(joinGameId);
  };

  // Local functions
  function joinGame(gameId) {
    const clientController = ClientController.create({ name: myName, words: myWords });
    // const clientController = ClientController.create({ name: myName, words: myWords });

    clientController.joinGame(gameId).catch(() => {
      alert('Connection to host timed out. Try again.');
      elementById('hostOrJoinGameContainer').style.display = '';
    });

    clientController.onPlayersReceived(players => {
      elementById('textPlayers').innerText = `Players: ${players.map(p => `\n${p.name} (${p.score})`)}`;
    });
    clientController.onCurrentTurnReceived(currentTurn => {
      elementById('gameInProgressContainer').style.display = '';

      elementById('currentTurn').innerHTML = `Current player: <b>${currentTurn.player}</b>`;

      if (currentTurn.word) {
        elementById('myTurnContainer').style.display = '';
        elementById('wordToGuess').innerText = currentTurn.word;
        elementById('btnCorrect').onclick = () => currentTurn.correct();
        elementById('btnIncorrect').onclick = () => currentTurn.incorrect();
      } else {
        elementById('myTurnContainer').style.display = 'none';
      }
    });
    clientController.onNoCurrentTurnAvailable(() => {
      elementById('gameInProgressContainer').style.display = 'none';
    });
  }

  function validateMyData(name, words) {
    btnHostGame.disabled = btnJoinGame.disabled = !(name.length > 0 && words.length > 0);
  }
})();

/**
 * @param {string} csvWords
 */
function parseMyWords(csvWords) {
  return csvWords
    .split(',')
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

function elementById(id) {
  return document.getElementById(id);
}
