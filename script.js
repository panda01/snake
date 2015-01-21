(function() {

    // the most basic element for position, and direction
    function Vector(x, y) {
        var xPos = x,
            yPos = y;
        
        this.x = function(val) {
            var ret = xPos;
            if(_.isNumber(val)) {
                xPos = val;
            }
            return ret;
        }
        this.y = function(val) {
            var ret = yPos;
            if(_.isNumber(val)) {
                yPos = val;
            }
            return ret;
        }
        this.toString = function() { return [xPos, yPos].join(', '); }
        this.add = function(vector) { return new Vector(xPos + vector.x() , yPos + vector.y()); }
        this.subtract = function(vector) { return new Vector(xPos - vector.x() , yPos - vector.y()); }
        this.multiply = function(operand) { return new Vector(xPos * operand, yPos * operand); }
        this.distance = function(vector) { return new Vector(Math.abs(xPos - vector.x()), Math.abs(yPos - vector.y())); }
        this.isSame = function(vector) {
            return (vector.x() === xPos && vector.y() === yPos);
        }
        // override this for a operator overriding
        this.valueOf = function() { }
        // return which direction the other vector is in
        this.cardinalDirection = function(vector) {
            var ret = '';
            // if this vector is somewhere north of here 
            if(yPos < vector.y()) {
                ret += 'S';         // south
            } else if(yPos > vector.y()) {      // if this vector is south of the other
                ret += 'N';         // north
            }

            // if this is vector is somewhere West of here
            if(xPos < vector.x()) {
                ret += 'E';
            } else if(xPos > vector.x()) { // if this vector is somewhere east of here
                ret += 'W';
            }

            return ret;
        }
        this.cardinalVector = function(dir) {
            var ret = new Vector(0, 0),
                strHas = function(str, q) { return str.indexOf(q) > -1; }
            if(strHas(dir, 'E')) {
                ret.x(1);
            } else if(strHas(dir, 'W')) {
                ret.x(-1);
            } 
            if(strHas(dir, 'N')) {
                ret.y(-1);
            } else if(strHas(dir, 'S')) {
                ret.y(1);
            } 

            return ret;
        };
        this.moveXSpacesTowards = function(x, target) {
            // create a new vector that is that x closer to where we want to go
            return this.cardinalVector(this.cardinalDirection(target))
                        .multiply(x)
                        .add(this);
        }
    }

    function Snake(context, canvasVector) {
        var snakeObj = {
                length: 1,
                speed: 12,// has to equal the size of the snake square and one side of spacing
                position: new Vector(120, 48),
                pastPositions: [new Vector(120, 48)],
                direction: new Vector(1, 0)
            },
            collisions = {
                tail: false,
                food: false,
                wall: false
            },
            randomNumber = function(max) { return Math.floor(Math.random() * max); },
            food = null,
            canvasContext = context,
            canvasSize = canvasVector;

        var checkRectangleCollision = function(rect1, rect2) {
            return ((rect1[0].y() <= rect2[1].y()) 
                && (rect1[0].x() <= rect2[1].x())
                && (rect1[1].y() >= rect2[0].y())
                && (rect1[1].x() >= rect2[0].x()));
        };

        this.move = function() {
            snakeObj.position = snakeObj.position.add(snakeObj.direction.multiply(snakeObj.speed));
        };
        this.score = function() { return snakeObj.length - 1; };
        this.rect = function(pos) {
            canvasContext.fillRect(pos.x(), pos.y(), 10, 10);
        }
        this.prepare = function() {
            // draw the food
            if(_.isNull(food)) {
                food = this.makeFood();
            }
        }
        this.draw = function() {
            var lastIdx = 0,
                positionToDraw = snakeObj.position,
                targetPosition = null,
                cardinalDirection = null;

            context.fillStyle = '#f00';
            this.rect(food[0]);

            // Draw the snake
            // for every square of the snake
            for(var i = 0; i < snakeObj.length && !_.isUndefined(targetPosition = snakeObj.pastPositions[lastIdx]); i++) {
                // make the head of the snake red
                if(i > 0) {
                    context.fillStyle = '#000';
                }
                // save which direction we're going in
                cardinalDirection = positionToDraw.cardinalDirection(targetPosition);

                // move 12 in the direction of the the next position
                this.rect(positionToDraw);

                // move the pen to the next position
                positionToDraw = positionToDraw.moveXSpacesTowards(12, targetPosition)

                // if moving 12 won't put you past the other targetPosition
                if(positionToDraw.cardinalDirection(targetPosition) !== cardinalDirection) {
                    lastIdx++;
                }
            }
            // make sure the array of past positions doesn't get too big
            snakeObj.pastPositions.splice(lastIdx + 1, snakeObj.pastPositions.length);

            if(collisions.food) {
                snakeObj.length++;
                food = null;
                game.framerate(game.framerate() * 1.025);
            }
            // reset the snake if it collides with itself
            if( collisions.tail || collisions.wall ) {
                snakeObj.length = 1;
                game.endGame();
            }

            this.resetCollisions();
        };
        this.resetCollisions = function() {
            collisions = {
                food: false,
                tail: false,
                wall: false
            }
        }
        this.detectCollision = function() {
            var makeSnakeSectionsRects = function(positionsArr) {
                    var ret = positionsArr.map(function(pos, idx, arr) {
                        if(idx + 1 < arr.length) {
                            return [pos, arr[idx + 1]];
                        }
                    });
                    // remove the last element, it is undefined
                    ret.pop();
                    return ret;
                },
                snakeHeadRect = [snakeObj.position, snakeObj.position.add(new Vector(10, 10))];
            if(snakeObj.pastPositions.length > 1 ) {
                // make rectanlgles for collision detection function
                collisions.tail = makeSnakeSectionsRects(snakeObj.pastPositions).reduce(function(prev, rect) {
                    return prev || checkRectangleCollision(snakeHeadRect, rect);
                }, false);
            }

            if(snakeHeadRect[0].x() < 0 
                || snakeHeadRect[0].y() < 0
                || snakeHeadRect[1].x() > canvasSize.x()
                || snakeHeadRect[1].y() > canvasSize.y()) {
                    collisions.wall = true;
                }


            // check for collision with the food
            collisions.food = checkRectangleCollision(snakeHeadRect, food);
        };
        this.setDirection = function(dir) {
            // if direction isn't the inverse of which direction we're going in now
            if(dir.x() * -1 === snakeObj.direction.x() && dir.y() * -1 === snakeObj.direction.y()) {
                // stop the snake from going back over itself
                return;
            }
            snakeObj.direction = dir;
            // if it's not the same position as the last one
            if(!snakeObj.pastPositions[snakeObj.pastPositions.length - 1].isSame(snakeObj.position)) {
                // add the current position to the past positions list
                snakeObj.pastPositions.unshift(snakeObj.position);
            }
        };
        this.makeFood = function() {
            // -30 +  10 to make it 10px away from the border all of the time
            var pos = new Vector(randomNumber(canvasSize.x() - 30) + 10, randomNumber(canvasSize.y() - 30) + 10);
            return [pos, pos.add(new Vector(10, 10))] 
        };
    }

    function Game2D() {
        var that = this,
            context = null,
            initialFramerate = 12,
            framerate = initialFramerate,
            $canvas = null, $score = null;
        // Snake
        var now = function() { return (new Date()).getTime(); },
            lastDrawTime = now(),
            gamePaused = false,
            snake = null;

        var draw = function() {
            // TODO check before vs. after for speed optimizations with requestAnimationFrame
            requestAnimationFrame(draw);

            // last draw
            if(now() - lastDrawTime < 1000/framerate || gamePaused) {
                return;
            }
            lastDrawTime = now();

            // clear the board
            $canvas.width = $canvas.width;

            // actually do all the things you need to for a render
            that.renderCycle();
        }


        // propertie of a 2D Game
        this.keyEvents = [];
        this.tangibles = [];


        // functions of a 2D Game
        this.init = function() {
            document.addEventListener('DOMContentLoaded', function() {
                $canvas = document.getElementById('game-canvas');
                $score = document.getElementById('score');
                context = $canvas.getContext('2d');
                that.startGame();
            });
        }
        this.startGame = function() {
            snake = new Snake(context, new Vector($canvas.width, $canvas.height));
            draw();
        }
        this.endGame = function() {
            gamePaused = true;
            snake = false;
            framerate = initialFramerate;
        }
        this.framerate = function(amount) {
            var ret = framerate;
            framerate = amount;
            return ret;
        }
        this.initEvents = function() {
            var that = this;
            document.addEventListener('keydown', function(evt) {
                if(evt.which === 32 && snake) {        // Spacebar
                    gamePaused = !gamePaused;
                } else {
                    that.keyEvents.push(evt);
                }
            });
            document.addEventListener('mousedown', function(evt) {
                if(evt.target.attributes && evt.target.attributes.id && evt.target.attributes.id.value === 'game-canvas') {
                    that.endGame();
                    that.startGame();
                    gamePaused = false;
                }
            });
        }
        this.handleKeyBoardEvents = function() {
            // for all of the key events process them
            this.keyEvents.forEach(function(evt) {
                var key = evt.which;
                if(key === 37) {        //Left
                    snake.setDirection(new Vector(-1, 0));
                } else if(key === 38) {        // Up
                    snake.setDirection(new Vector(0, -1));
                } else if(key === 39) {        // Right
                    snake.setDirection(new Vector(1, 0));
                } else if(key === 40) {        // Down
                    snake.setDirection(new Vector(0, 1));
                }
            });
            // clear out the keys array;
            this.keyEvents = [];
        };
        // the custom part of the 2D game engine
        this.renderCycle = function() {
            $score.innerHTML = snake.score();
            this.handleKeyBoardEvents();
            snake.prepare();
            snake.move();
            snake.detectCollision();
            snake.draw(context);
        }

        this.init();
        this.initEvents();
    }

    var game = new Game2D();
}())
