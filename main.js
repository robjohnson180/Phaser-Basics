//Create Phaser game config
var config = {
    type: Phaser.AUTO,
    width: 512,
    height: 512,
    scene: {
        preload: preload,
        create: create,
        update: update,
        key: 'level2'
    },

    pixelArt: true,

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 }
        }
    },
    callbacks: {
        postBoot: function () {
            resize();
        }
    }
};

//Initialise game
var game = new Phaser.Game(config);

//Initialise variables
var player, jewels, powerUps, skulls, bats;
var cursors;
var score = 0, scoreText;
var music = {}, sfx = {};

//***************** PHASER.SCENE BUILT-IN FUNCTIONS ************//

function preload() {
    //console.log(this);

    //Load images
    this.load.image("background", "../assets/background.png");
    this.load.image("landscape", "../assets/landscape-tileset.png");
    this.load.image("props", "../assets/props-tileset.png");

    //Load audio
    this.load.audio('overgroundMusic', '../assets/audio/music/A056_Nothing Calls Sweet Joy.mp3');
    this.load.audio('undergroundMusic', '../assets/audio/music/B096_Coming With Man.mp3');

    this.load.audio('jumpSFX', '../assets/audio/sfx/Jump 1.wav');
    this.load.audio('collectJewelSFX', '../assets/audio/sfx/Fruit collect 1.wav');
    this.load.audio('damageSFX', '../assets/audio/sfx/Blow 2.wav');

    //Load tilemap
    this.load.tilemapTiledJSON("tilemap", "../assets/level2.json");

    //Load spritesheets
    this.load.spritesheet(
        "player",
        "../assets/player.png",
        { frameWidth: 24, frameHeight: 24 }
    );

    this.load.spritesheet(
        "cherry",
        "../assets/cherry-sheet.png",
        { frameWidth: 16, frameHeight: 16 }
    );

    this.load.spritesheet(
        "jewel",
        "../assets/jewel-sheet.png",
        { frameWidth: 16, frameHeight: 16 }
    );
    this.load.image("skull", "../assets/skull.png");

    this.load.spritesheet('bat', '../assets/bat.png', { frameWidth: 64, frameHeight: 38 });
}

function create() {
    createBackground.call(this);

    var map = createTilemap.call(this);

    setCamera.call(this, map);
    createScoreText.call(this);
    createCollision.call(this, map);
    createObjectAnimations.call(this);
    createKeys.call(this);

    //Create audio

    music.overground = this.sound.add('overgroundMusic', { loop: true, volume: 0.5 });
    music.underground = this.sound.add('undergroundMusic', { loop: true, volume: 0.5 });

    sfx.jump = this.sound.add('jumpSFX');
    sfx.collectJewel = this.sound.add('collectJewelSFX');
    sfx.damage = this.sound.add('damageSFX');

    //Create bats


    this.anims.create({
        key: 'fly',
        frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 2 }),
        framerate: 15,
        repeat: -1
    })
    bats = this.physics.add.group();

    var batSpawn, batDest, line, bat;
    var batPoints = findPoints.call(this, map, 'objectLayer', 'bat');
    var len = batPoints.length / 2;

    for (var i = 1; i < len + 1; i++) {
        batSpawn = findPoint.call(this, map, 'objectLayer', 'bat', 'batSpawn' + i);
        batDest = findPoint.call(this, map, 'objectLayer', 'bat', 'batDest' + i);
        line = new Phaser.Curves.Line(batSpawn, batDest);
        bat = this.add.follower(line, batSpawn.x, batSpawn.y, 'bat');
        bat.startFollow({
            duration: Phaser.Math.Between(1500, 2500),
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut'
        })
        bat.anims.play('fly', true);
        bats.add(bat);
        bat.body.allowGravity = false;
    }

    this.physics.add.overlap(player, bats, batAttack, null, this);

}

function update() {
    //11
    checkPlayerMovement();
    playObjectAnimations();

    if (!music.overground.isPlaying && player.body.x < (16 * 11)) {
        music.overground.play();
        music.underground.pause();
    }
    //audio
    if (!music.underground.isPlaying && player.body.x > (16 * 11)) {
        music.underground.play();
        music.overground.pause();
    }
}

//***************** NON PHASER.SCENE FUNCTIONS ************//
//*************** CREATE FUNCTIONS*************************//

//Create the background image
function createBackground() {
    var background = this.add.image(256, 256, "background");
    background.setScale(2.2, 2.5);
}

//Create the tilemap from the JSON file
function createTilemap() {
    //Load in tilemap assets
    var map = this.make.tilemap({ key: "tilemap" });
    var landscape = map.addTilesetImage("landscape-tileset", "landscape");
    var props = map.addTilesetImage("props-tileset", "props");

    //Create first three layers
    map.createStaticLayer('backgroundLayer2', [landscape, props], 0, 0);
    map.createStaticLayer('backgroundLayer', [landscape, props], 0, 0);
    map.createStaticLayer('collisionLayer', [landscape, props], 0, 0);

    //Find the playerSpawn point
    var playerSpawn = map.findObject("objectLayer", function (object) {
        if (object.type === "player") {
            return object;
        }
    });

    //Create player object
    createPlayer.call(this, playerSpawn);

    //Create groups
    jewels = this.physics.add.staticGroup();
    powerUps = this.physics.add.staticGroup();
    skulls = this.physics.add.staticGroup();

    //Find objects and create sprite for relevant group
    map.findObject("objectLayer", function (object) {
        if (object.type === "pickUp" && object.name === "jewel") {
            jewels.create(object.x + map.tileWidth / 2, object.y - map.tileHeight / 2, "jewel");
        }

        if (object.type === "powerUp" && object.name === "doubleJump") {
            powerUps.create(object.x + map.tileWidth / 2, object.y - map.tileHeight / 2, "cherry");
        }
        if (object.type === "pickUp" && object.name === "skull") {
            skulls.create(object.x + map.tileWidth / 2, object.y - map.tileHeight / 2, "skull");
        }
    });

    //Create foreground layer
    map.createStaticLayer('foregroundLayer', landscape, 0, 1);

    //Return the map
    return map;
}

//Create the player object from the playerSpawn location
function createPlayer(playerSpawn) {
    player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, 'player', 4);
    player.setCollideWorldBounds(true);

    //Set the maxJump for the player. Important for double jumping.
    player.maxJump = 1;
    player.jumpCount = 0;

    player.invincible = false;

    createPlayerAnimations.call(this);
}

//Position and zoom the camera
function setCamera(map) {
    var camera = this.cameras.getCamera("");

    //Follow the player but do not allow the camera to look out of the map's bounds.
    camera.startFollow(player);
    camera.setBounds(0, 0, map.width * map.tileWidth, map.height * map.tileHeight);
    camera.zoom = 2;
}

//Create the scoreText display
function createScoreText() {
    scoreText = this.add.text(130, 130, 'Score: 0', { fontSize: '16px', fill: '#000' });
    scoreText.setOrigin(0);
    scoreText.setScrollFactor(0);
}

//Create the collision and overlap events
function createCollision(map) {
    //Enable collision for the collisionLayer
    var collisionLayer = map.getLayer("collisionLayer").tilemapLayer;
    collisionLayer.setCollisionBetween(0, 1000);

    //Add collision and overlaps
    this.physics.add.collider(player, collisionLayer);
    this.physics.add.overlap(player, jewels, pickUpJewel);
    this.physics.add.overlap(player, powerUps, pickUpPowerUp);
    this.physics.add.overlap(player, skulls, pickUpSkull);
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
        frames: this.anims.generateFrameNumbers('player', { start: 5, end: 10 }),
        frameRate: 15,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('player', { frames: [1, 4] }),
        frameRate: 3,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: [{ key: 'player', frame: 3 }],
        frameRate: 15
    });

    this.anims.create({
        key: 'fall',
        frames: [{ key: 'player', frame: 2 }],
        frameRate: 15
    });

    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { start: 11, end: 12 }),
        frameRate: 3,
        repeat: -1
    });
}

//Create the animations for any objects that are not the player or enemies
function createObjectAnimations() {
    this.anims.create({
        key: 'jewelAnims',
        frames: this.anims.generateFrameNumbers('jewel', { start: 0, end: 4 }),
        frameRate: 10,
        repeat: -1,
    });

    this.anims.create({
        key: 'cherryAnims',
        frames: this.anims.generateFrameNumbers('cherry', { start: 0, end: 6 }),
        frameRate: 6,
        repeat: -1,
    });
}

//Play the animations for any objects that are not the player or enemies
function playObjectAnimations() {
    powerUps.playAnimation("cherryAnims", true);
    jewels.playAnimation("jewelAnims", true);
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
        sfx.jump.play();
    }

    //Display jumping or falling animations
    if (player.body.velocity.y < 0) {
        player.anims.play('jump', true);
    } else if (player.body.velocity.y > 0) {
        player.anims.play('fall', true);
    }
}

//What should happen when a player overlaps with a jewel
function pickUpJewel(player, jewel) {
    score++;
    scoreText.setText("Score: " + score);
    jewel.disableBody(true, true);
    sfx.collectJewel.play();
}

function pickUpSkull(player, skull) {
    score += 20;
    scoreText.setText("Score: " + score);
    skull.disableBody(true, true);
    sfx.collectJewel.play();
}

//What should happen when a player overlaps with a powerUp
function pickUpPowerUp(player, powerUp) {
    score += 10;
    scoreText.setText("Score: " + score);
    powerUp.disableBody(true, true);
    player.maxJump++; //Enable double jump
    sfx.collectJewel.play();
}
function resize() {
    var canvas = document.querySelector("canvas");
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var windowRatio = windowWidth / windowHeight;
    var gameRatio = game.config.width / game.config.height;

    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}

function batAttack(player, bat) {
    //this.physics.pause();
    player.setTint(0xff0000);
    /*bats.children.each(function (bat) {
        bat.stopFollow();
        bat.anims.stop();
    }, this);*/
    if (!player.invincible) {
        player.invincible = true;
        sfx.damage.play();
        game.scene.getScene('level2').time.addEvent({
            delay: 500,
            callback: function () {
                player.invincible = false;
                player.setTint(0xffffff);
            }
        });
    }
}

function findPoint(map, layer, type, name) {
    var loc = map.findObject(layer, function (object) {
        if (object.type === type && object.name === name) {
            //console.log(object);
            return object;
        }
    });
    return loc
}

function findPoints(map, layer, type) {
    //var locs = map.filterObjects(layer, obj => obj.type === type);
    var locs = map.filterObjects(layer, function (object) {
        if (object.type === type) {
            return object
        }
    });
    return locs
}