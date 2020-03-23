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
    elementById('userInputContainer').style.display = 'none';
    const hostController = WordBowlHostController.create();

    hostController.gameId().then(gameId => {
      elementById('hostPendingGameContainer').style.display = '';
      elementById('textHostGameId').innerHTML = gameId;
      joinGame(gameId);
      btnStartGame.onclick = () => {
        hostController.startGame().then(() => {
          elementById('hostPendingGameContainer').style.display = 'none';
        });
      };
    });

    hostController.onRoundFinished(nextRoundStarter => {
      elementById('hostPendingGameContainer').style.display = '';
      btnStartGame.onclick = () => {
        nextRoundStarter().then(() => {
          elementById('hostPendingGameContainer').style.display = 'none';
        });
      };
    });
  };
  btnJoinGame.onclick = () => {
    elementById('userInputContainer').style.display = 'none';
    const joinGameId = inputJoinGame.value;
    joinGame(joinGameId);
  };

  // Local functions
  function joinGame(gameId) {
    const clientController = ClientController.create({ name: myName, words: myWords });

    const connectionFailedCatcher = () => {
      const tryAgain = confirm('Connection to host failed. Try again...');
      if (tryAgain) {
        clientController.joinGame(gameId).catch(connectionFailedCatcher);
      } else {
        location.reload()
      }
    };
    clientController.joinGame(gameId).catch(connectionFailedCatcher);

    clientController.onPlayersReceived(players => {
      if (players?.length > 0) {
        elementById('playersSectionContainer').style.display = '';
        elementById('playersContainer').innerHTML = players
          .map(p => `<span class="tag is-info is-light" id="player${p.name}">${p.name} (${p.score})</span>\n`)
          .join('');
      } else {
        elementById('playersSectionContainer').style.display = 'none';
      }
    });
    clientController.onCurrentTurnReceived(currentTurn => {
      elementById(`player${currentTurn.player}`).classList.remove('is-light');

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
      elementById('myTurnContainer').style.display = 'none';
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
