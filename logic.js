class VRHoodGame {
  constructor(firebaseDb, userId, leftController, rightController) {
    // Player state
    this.position = { x: 0, y: 0, z: 0 };
    this.isRunning = false;
    this.speed = 0.1; // walk speed
    this.runMultiplier = 2;

    // Controllers
    this.leftController = leftController;
    this.rightController = rightController;

    this.stickThreshold = 0.15;

    // Firebase
    this.firebaseDb = firebaseDb;
    this.userId = userId;
  }

  updateControllers() {
    this.leftInput = this._getInput(this.leftController);
    this.rightInput = this._getInput(this.rightController);
  }

  _getInput(controller) {
    if (!controller || !controller.gamepad) return null;

    const gp = controller.gamepad;

    // Left stick (axes 0,1) for walk
    const lx = Math.abs(gp.axes[0]) > this.stickThreshold ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > this.stickThreshold ? gp.axes[1] : 0;

    // Right stick (axes 2,3) for turn (only x axis used)
    const rxRaw = gp.axes[2];
    const turn = Math.abs(rxRaw) > this.stickThreshold ? rxRaw : 0;

    // Buttons
    const gripPressed = gp.buttons[1]?.pressed || gp.buttons[6]?.pressed || false;
    const xPressed = gp.buttons[3]?.pressed || false;
    const leftTriggerPressed = gp.buttons[0]?.pressed || false;
    const rightTriggerPressed = gp.buttons[7]?.pressed || false;
    const bothTriggersHeld = leftTriggerPressed && rightTriggerPressed;

    return {
      walkX: lx,
      walkY: ly,
      turn: turn,
      grip: gripPressed,
      reload: xPressed,
      bothTriggers: bothTriggersHeld
    };
  }

  movePlayer() {
    if (!this.leftInput) return;

    // Speed and run toggle
    this.isRunning = this.leftInput.bothTriggers; // example: hold both triggers to run (or change logic)
    const moveSpeed = this.isRunning ? this.speed * this.runMultiplier : this.speed;

    // Move X and Z axis (assuming y is up)
    this.position.x += this.leftInput.walkX * moveSpeed;
    this.position.z += this.leftInput.walkY * moveSpeed;

    // Add turning from right stick
    if (this.rightInput) {
      this.rotationY = (this.rotationY || 0) - this.rightInput.turn * 0.05; // smooth turn
    }
  }

  async savePosition() {
    try {
      await this.firebaseDb.collection('players').doc(this.userId).set({
        position: this.position,
        timestamp: Date.now()
      });
      console.log('Position saved:', this.position);
    } catch (e) {
      console.error('Error saving position:', e);
    }
  }

  async loadPosition() {
    try {
      const doc = await this.firebaseDb.collection('players').doc(this.userId).get();
      if (doc.exists) {
        this.position = doc.data().position;
        console.log('Loaded position:', this.position);
      } else {
        console.log('No saved position found, starting fresh');
      }
    } catch (e) {
      console.error('Error loading position:', e);
    }
  }

  checkActions() {
    if (!this.leftInput || !this.rightInput) return;

    if (this.leftInput.grip || this.rightInput.grip) {
      // grab action
      console.log('Grab triggered');
    }
    if (this.leftInput.reload) {
      // reload action
      console.log('Reload triggered');
    }
    if (this.leftInput.bothTriggers) {
      // open inventory
      console.log('Inventory opened');
    }
  }

  update() {
    this.updateControllers();
    this.movePlayer();
    this.checkActions();
  }
}

// Usage example:
// const game = new VRHoodGame(firebaseDb, userId, leftController, rightController);
// await game.loadPosition();
// In your game loop:
// game.update();
// await game.savePosition(); // when needed

export default VRHoodGame;
