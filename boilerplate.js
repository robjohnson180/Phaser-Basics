//Create Phaser game config
var config = {
    type: Phaser.AUTO,
    width: 512,
    height: 512,
    scene: {
        preload: preload,
        create: create,
        update: update
    },

    pixelArt: true,

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 }
        }
    }
};

//Initialise game
var game = new Phaser.Game(config);

//Initialise variables
var player;
var cursors;

//***************** PHASER.SCENE BUILT-IN FUNCTIONS ************//

function preload() {
    console.log(this);

    //Load images
    this.load.image("background", "../assets/background.png");

    //Load spritesheets
    this.load.spritesheet(
        "player",
        "../assets/player.png",
        {frameWidth: 24, frameHeight: 24}
    );
}

function create() {
    createBackground.call(this);

    //Start loading in the tilemap here

    //Change camera settings

    createCollision.call(this);
    createObjectAnimations.call(this);
    createKeys.call(this);
}

function update() {
    checkPlayerMovement();
}

//***************** NON PHASER.SCENE FUNCTIONS ************//
//*************** CREATE FUNCTIONS*************************//

//Create the background image
function createBackground() {
    var background = this.add.image(256, 256, "background");
    background.setScale(2.2, 2.5);
}

//Create the player object from the playerSpawn location
function createPlayer(playerSpawn) {
    player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, 'player', 4);
    player.setCollideWorldBounds(true);

    createPlayerAnimations.call(this);
}

//Create the collision and overlap events
function createCollision() {

}

//Create the cursor keys
function createKeys() {
    cursors = this.input.keyboard.createCursorKeys();
}

//*************** ANIMATION FUNCTIONS*************************//

//Create the animations that the player will use
function createPlayerAnimations() {
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('player', {start: 5, end: 10}),
        frameRate: 15,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('player', {frames: [1, 4]}),
        frameRate: 3,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: [{key: 'player', frame: 3}],
        frameRate: 15
    });

    this.anims.create({
        key: 'fall',
        frames: [{key: 'player', frame: 2}],
        frameRate: 15
    });
}

//Create the animations for any objects that are not the player or enemies
function createObjectAnimations() {

}

//*************** GAMEPLAY FUNCTIONS *************//

//Check for cursor key presses and move the player accordingly
function checkPlayerMovement() {
    //Right
    if (cursors.right.isDown) {
        player.setVelocityX(100);
        player.anims.play('walk', true);
        player.flipX = false;

        //Changes the size and position of the hitbox (no longer floating on your tail!)
        player.setSize(14, 24);
        player.setOffset(7, 0);
    }
    //Left
    else if (cursors.left.isDown) {
        player.setVelocityX(-100);
        player.anims.play('walk', true);
        player.flipX = true;

        //Changes the size and position of the hitbox (no longer floating on your tail!)
        player.setSize(14, 24);
        player.setOffset(3, 0);
    }
    //Down
    else if (cursors.down.isDown) {
        player.setVelocityX(0);
        player.anims.play('down', true);
    }
    //Idle
    else {
        player.setVelocityX(0);
        player.anims.play('idle', true);
    }

    //Reset jumpCount. Important for double jumping.
    if (player.body.blocked.down) {
        player.jumpCount = 0;
    }

    //Check for the spacebar having JUST been pressed, and whether the player has any jumps left - Important for double jumping.
    //Then, jump.
    if (Phaser.Input.Keyboard.JustDown(cursors.space) && player.jumpCount < player.maxJump) {
        player.jumpCount++;
        player.setVelocityY(-200);
    }

    //Display jumping or falling animations
    if (player.body.velocity.y < 0) {
        player.anims.play('jump', true);
    } else if (player.body.velocity.y > 0) {
        player.anims.play('fall', true);
    }
}