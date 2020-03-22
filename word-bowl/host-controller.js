class WordBowlHostController {
  static create() {
    const peer = wordBowlPeer();
    return new WordBowlHostController(peer);
  }

  _peer = null;
  _hostState = {
    players: [],
    currentTurn: null // { turnId: uuid, player : players[x], word: players[y].words[z] }
  };

  constructor(peer) {
    this._peer = peer;
    this.registerForIncomingGameJoins();
  }

  /**
   * @returns {Promise<string>} the hosted game ID
   */
  gameId() {
    return new Promise((resolve, _) => {
      if (this._peer.id) {
        resolve(wordBowlPeer.id);
      } else {
        this._peer.on('open', id => {
          resolve(id);
        });
      }
    });
  }

  /**
   * @returns {Promise<void>} resolved when game is started.
   */
  startGame() {
    //TODO: Make command that comes via Peer
    //TODO: Make player member of team in order to have the correct order.
    return new Promise((resolve, _) => {
      this.updateStateForNextTurn();
      this.sendPublicStateToPlayers();
      resolve();
    });
  }

  registerForIncomingGameJoins() {
    this._peer.on('connection', conn => {
      conn.on('open', () => {
        let player = this._hostState.players.find(p => p.name === conn.metadata.name);
        if (player) {
          player.conn.close();
          player.conn = conn;
        } else {
          player = {
            name: conn.metadata.name,
            words: conn.metadata.words.map(w => ({ value: w, guessed: false })),
            score: 0,
            conn: conn
          };
          this._hostState.players.push(player);
        }
        this.registerForPlayerActions(player);
        this.sendPublicStateToPlayers();
      });
    });
  }

  registerForPlayerActions(player) {
    player.conn.on('data', guessAction => {
      const currentTurn = this._hostState.currentTurn;
      if (guessAction.id === currentTurn?.turnId) {
        currentTurn.player.score += guessAction.correct ? 1 : 0;
        currentTurn.word.guessed = guessAction.correct;

        this.updateStateForNextTurn();
        this.sendPublicStateToPlayers();
      }
    });
  }

  updateStateForNextTurn() {
    const remainingWords = this._hostState.players.flatMap(p => p.words.filter(w => !w.guessed));

    if (remainingWords.length > 0) {
      this._hostState.currentTurn = {
        turnId: uuid(),
        player: this._hostState.players.elementAfter(this._hostState.currentTurn?.player) ?? this._hostState.players[0],
        word: remainingWords.sample()
      };
    } else {
      this._hostState.currentTurn = null;
    }
  }

  sendPublicStateToPlayers() {
    const mutualPlayerState = {
      players: this._hostState.players.map(p => ({ name: p.name, score: p.score }))
    };

    const currentTurn = this._hostState.currentTurn;
    this._hostState.players.forEach(player => {
      const playerState = Object.assign({}, mutualPlayerState);
      if (currentTurn) {
        playerState.currentTurn = {
          player: currentTurn.player.name
        };
        if (currentTurn.player === player) {
          playerState.currentTurn.turnId = currentTurn.turnId;
          playerState.currentTurn.word = currentTurn.word.value;
        }
      }

      player.conn.send(playerState);
    });
  }
}
