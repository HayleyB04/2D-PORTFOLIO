import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomctx";
import { displayDialogue, setCamScale } from "./utils";

# Set up animations for character
k.loadSprite("spritesheet", "./spritesheet.png", {
    sliceX: 39,
    sliceY: 31,
    anims: {
        "idle-down": 956,
        "walk-down": {from: 956, to: 959, loop: true, speed: 8 },
        "idle-side": 995,
        "walk-side": {from: 995, to: 998, loop: true, speed: 8 },
        "idle-up": 1034,
        "walk-up": {from: 1034, to: 1037, loop: true, speed: 8 },
    },
});

# Set map
k.loadSprite("map", "./map.png");

# Set background color
k.setBackground(k.Color.fromHex("#311047"));

# Fetch and store layers of map
k.scene("main", async () => {
    const mapData = await (await fetch("./map.json")).json();
    const layers = mapData.layers;

    # Add map at correct position and scale
    const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);

    # Creates the components needed for the player
    const player = k.make([
        k.sprite("spritesheet", { anim: "idle-down" }), 
        k.area({
            shape: new k.Rect(k.vec2(0, 3), 10, 10)
        }),
        k.body(),
        k.anchor("center"),
        k.pos(),
        k.scale(scaleFactor),
        {
           speed: 250,
           direction: "down",
           isInDialogue: false, 
        },
        "player",
    ]);

    # Iterates through each layer, adds boundary with collision area, position, name
    for (const layer of layers) {
        if (layer.name === "boundaries") {
          for (const boundary of layer.objects) {
            map.add([
              k.area({
                shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
              }),
              k.body({ isStatic: true }),
              k.pos(boundary.x, boundary.y),
              boundary.name,
            ]);

              # Collision handling
            if (boundary.name) {
              player.onCollide(boundary.name, () => {
                player.isInDialogue = true;
                displayDialogue(
                  dialogueData[boundary.name],
                  () => (player.isInDialogue = false)
                );
              });
            }
          }
    
          continue;
        }

        # Set spawnpoint position and add player
        if (layer.name === "spawnpoints") {
            for (const entity of layer.objects) {
                if (entity.name === "player") {
                    player.pos = k.vec2(
                        (map.pos.x + entity.x) * scaleFactor,
                        (map.pos.y + entity.y) * scaleFactor
                    );
                    k.add(player);
                    continue;
                }
            }
        }
    }

    setCamScale(k);

    k.onResize(() => {
      setCamScale(k);  
    });

    # Camera to move based on player position
    k.onUpdate(() => {
        k.camPos(player.pos.x, player.pos.y - 100);
    });

    # Event listener for mouse, must be left click and not in dialogue
    k.onMouseDown((mouseBtn) => {
        if (mouseBtn !== "left" || player.isInDialogue) return;

        # Move player to mouse position at correct speed
        const worldMousePos = k.toWorld(k.mousePos());
        player.moveTo(worldMousePos, player.speed);

        # Calculate angle between player and mouse
        const mouseAngle = player.pos.angle(worldMousePos);

        # Using the mouse angle to determine which direction the player will travel in
        const lowerBound = 50;
        const upperBound = 125;

        if (
            mouseAngle > lowerBound &&
            mouseAngle < upperBound &&
            player.curAnim() !== "walk-up"
        ) {
            player.play("walk-up");
            player.direction = "up";
            return;
        }

        if (
            mouseAngle < -lowerBound &&
            mouseAngle > -upperBound &&
            player.curAnim() !== "walk-down"
        ) {
            player.play("walk-down");
            player.direction = "down";
            return;
        }

        if (Math.abs(mouseAngle) > upperBound) {
            player.flipX = false;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "right";
            return;
        }

        if (Math.abs(mouseAngle) < lowerBound) {
            player.flipX = true;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "left";
            return;
        }
    });

    # When mouse is released player animation is based on direction
    k.onMouseRelease(() => {
        if (player.direction === "down") {
            player.play("idle-down");
            return;
        }
        if (player.direction === "up") {
            player.play("idle-up");
            return;
        }

        player.play("idle-side");
    })
});

# Start the main scene
k.go("main");
