class ClientController {
  static create(userData) {
    const peer = wordBowlPeer();
    return new ClientController(userData, peer);
  }

  _peer = null;
  _userData = null;

  constructor(userData, peer) {
    this._peer = peer;
    this._userData = userData;

    this._peer.on('connection', conn => {
      this.joinGame(conn.peer);
      conn.close();
    });
  }

  /**
   * @param {string} gameId The ID of the game to join.
   * @returns {Promise<void>}
   */
  joinGame(gameId) {
    return new Promise((resolve, reject) => {
      const { name, words } = this._userData;
      const conn = this._peer.connect(gameId, {
        metadata: { name, words },
        serialization: 'json',
        reliable: true
      });

      const timeoutId = setTimeout(() => {
        conn.close();
        reject();
      }, 10000);

      conn.on('open', () => {
        clearTimeout(timeoutId);
        this._registerForGameStateUpdates(conn);
        this._registerForCoupOpportunity(conn);
        resolve();
      });
    });
  }

  _onPlayersReceiver = null;
  /**
   * @param {({name: string, score: number}[]) => void} callback
   */
  onPlayersReceived(receiver) {
    this._onPlayersReceiver = receiver;
  }

  _onCurrentTurnReceiver = null;
  /**
   *
   * @param {({player: string, word: string, correct: () => Promise<void>, incorrect: () => Promise<void>}) => void} receiver
   */
  onCurrentTurnReceived(receiver) {
    this._onCurrentTurnReceiver = receiver;
  }

  _onNoCurrentTurnReceiver = null;
  /**
   * @param {() => void} receiver
   */
  onNoCurrentTurnAvailable(receiver) {
    this._onNoCurrentTurnReceiver = receiver;
  }

  _onOpportunityForCoup = null;
  /**
   *
   * @param {(performCoup : () => Promise<WordBowlHostController>) => void} opportunist
   */
  onOpportunityForCoup(opportunist) {
    this._onOpportunityForCoup = opportunist;
  }

  _registerForGameStateUpdates(conn) {
    conn.on('data', gameState => {
      console.log(gameState);

      this._hostState = gameState.hostState;
      this._onPlayersReceiver?.(gameState.players);

      const currentTurn = gameState.currentTurn;
      if (currentTurn) {
        this._onCurrentTurnReceiver?.({
          player: currentTurn.player,
          word: currentTurn.word,
          correct: () => this._guess(conn, currentTurn, true),
          incorrect: () => this._guess(conn, currentTurn, false)
        });
      } else {
        this._onNoCurrentTurnReceiver?.();
      }
    });
  }

  /**
   * @type {{playerIds: [{id : string}]}}
   */
  _hostState = null;
  _registerForCoupOpportunity(conn) {
    conn.on('close', () => {
      console.log('coup time', this._hostState);

      this._onOpportunityForCoup(() => {
        const hostController = WordBowlHostController.create();
        return Promise.all(
          // TODO: not the right place to perform coup, fine for now.
          this._hostState.playerIds.map(
            p =>
              // TODO: Find a way to pass player score to the host controller and bind it to the existing user. Maybe the client could send his own score?
              new Promise((connResolve, _) => {
                const conn = hostController._peer.connect(p.id, { serialization: 'json', reliable: true });
                conn.on('open', () => {
                  connResolve(conn);
                });
              })
          )
        ).then(() => hostController);
      });
    });
  }

  /**
   * @returns {Promise<void>}
   */
  _guess(conn, currentTurn, correctGuess) {
    return new Promise((resolve, _) => {
      resolve(conn.send({ id: currentTurn.turnId, correct: correctGuess }));
    });
  }
}
