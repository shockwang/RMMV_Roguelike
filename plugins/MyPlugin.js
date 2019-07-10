// my plugin

(function() {
    MapData = function(floorId, original, x, y) {
        this.base = floorId;
        this.bush = 0;
        this.decorate1 = 0;
        this.decorate2 = 0;
        this.shadow = 0;
        this.region = 0;
        
        // data added for explored/visible
        this.isExplored = false;
        this.isVisible = false;
        
        // original tile
        this.originalTile = original;
        
        // add for path finding
        this.x = x;
        this.y = y;
    }
    
    // need more configuration
    StairData = function() {
        // 0: stair up, 1: stair down
        this.type = 0;
        this.x = 0;
        this.y = 0;
        this.toMapId = -1;
        this.toX = -1;
        this.toY = -1;
    }
    
    MapVariable = function(mapData, rmDataMap) {
        this.mapData = mapData;
        this.rmDataMap = rmDataMap;
        
        // indicates map attributes
        this.generateRandom = false;
        this.stairList = [];
    }
    
    Coordinate = function(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // class defined for player transfer
    TransferInfo = function(toMapId, x, y) {
        this.toMapId = toMapId;
        this.nowX = x;
        this.nowY = y;
    }
    
    rawDataOld = [
        ['C','C','C','C','C'],
        ['C','W','F','F','C'],
        ['C','W','F','F','C'],
        ['C','W','F','F','C'],
        ['C','C','C','C','C']
    ];
    var FLOOR = '□';
    var CEILING = '■';
    var WALL = 'Ⅲ';
    
    // ----------map constants----------
    var ceilingCenter = 5888;
    var wallCenter = 6282;
    var floorCenter = 2816;
    var warFogCenter = 3536;
    var upStair = 19;
    var downStair = 27;
    
    // view parameters
    var viewDistance = 8;
    
    // room parameters
    var roomNum = 5, minRoomSize = 4, maxRoomSize = 9;
    
    // ----------end of map constants----------
    
    //-----------------------------------------------------------------------------------
    // MapUtils
    //
    // All random map related algorithm/functions
    
    MapUtils = function() {
        throw new Error('This is a static class');
    };
    
    MapUtils.initialize = function() {
        // define map variables here
        for (var i = 0; i < 2; i++) {
            $gameVariables[i+1] = new MapVariable(null, null);
        }
        $gameVariables[2].generateRandom = true;
    }
    
    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    };
    
    function getRandomIntRange(min, max) {
        if (min == max) {
            return min;
        }
        return Math.floor(Math.random() * Math.floor(max - min)) + min;
    }
    
    // this function should be called twice (src must be a Game_Event)
    function updateVisible(src, distance, x, y, mapData) {
        var visible = false;
        if (Math.abs(src._x - x) <= distance && Math.abs(src._y - y) <= distance) {
            // around player, check visibility
            visible = true;
            if (src._x != x) {
                var path = [];
                var m = (src._y - y) / (src._x - x);
                var startX, endX, lastY;
                if (src._x - x > 0) {
                    startX = x;
                    endX = src._x;
                    lastY = y;
                } else {
                    startX = src._x;
                    endX = x;
                    lastY = src._y;
                }

                // start to check if vision blocked
                for (var i = startX+1; i <= endX; i++) {
                    var estimatedY = Math.round(m * (i - src._x) + src._y);
                    
                    // fill y-axis coordinates
                    if (Math.abs(lastY - estimatedY) > 1) {
                        var startY = (lastY - estimatedY > 0) ? estimatedY : lastY;
                        var endY = (lastY - estimatedY > 0) ? lastY : estimatedY;
                        for (var j = startY+1; j < endY; j++) {
                            var estimatedX = Math.round((j - src._y) / m + src._x);
                            path.push(new Coordinate(estimatedX, j));
                        }
                    }
                    path.push(new Coordinate(i, estimatedY));
                    lastY = estimatedY;
                }
                
                for (var i = 0; i < path.length; i++) {
                    // does not count the (x, y) point
                    if (mapData[path[i].x][path[i].y].originalTile != FLOOR && !(path[i].x == x && path[i].y == y)) {
                        visible = false;
                        break;
                    }
                }
            } else {
                var start = (src._y - y > 0) ? y : src._y;
                var end = (src._y - y > 0) ? src._y : y;
                
                // start to check if vision blocked
                for (var i = start+1; i < end; i++) {
                    if (mapData[x][i].originalTile != FLOOR) {
                        visible = false;
                        break;
                    }
                }
            }
            
            // ceiling followed by wall check
            if (visible && mapData[x][y].originalTile == WALL) {
                mapData[x][y-1].isVisible = true;
            }
            
            // other ceiling check
            if (!visible && mapData[x][y].originalTile == CEILING) {
                if (y+1 < mapData[0].length && mapData[x][y+1].originalTile == WALL && mapData[x][y+1].isVisible) {
                    // ceiling attached with wall
                    visible = true;
                } else {
                    var xVisible = false, yVisible = false;
                    if ((x-1 >= 0 && mapData[x-1][y].isVisible) || (x+1 < mapData.length && mapData[x+1][y].isVisible)) {
                        xVisible = true;
                    }
                    if ((y-1 >= 0 && mapData[x][y-1].isVisible) || (y+1 < mapData[0].length && mapData[x][y+1].isVisible)) {
                        yVisible = true;
                    }
                    if (xVisible && yVisible) {
                        // corner case
                        visible = true;
                    }
                }
            }
        }
        
        mapData[x][y].isVisible = visible;
    }
    
    function refineMapTile(east, west, south, north, centerTile) {
        var result = centerTile;
        if (east) {
            if (west) {
                if (north) {
                    if (south) {
                        result += 46;
                    } else {
                        result += 42;
                    }
                } else {
                    if (south) {
                        result += 44;
                    } else {
                        result += 32;
                    }
                }
            } else {
                if (north) {
                    if (south) {
                        result += 45;
                    } else {
                        result += 36;
                    }
                } else {
                    if (south) {
                        result += 38;
                    } else {
                        result += 24;
                    }
                }
            }
        } else {
            if (west) {
                if (north) {
                    if (south) {
                        result += 43;
                    } else {
                        result += 34;
                    }
                } else {
                    if (south) {
                        result += 40;
                    } else {
                        result += 16;
                    }
                }
            } else {
                if (north) {
                    if (south) {
                        result += 33;
                    } else {
                        result += 20;
                    }
                } else {
                    if (south) {
                        result += 28;
                    } else {
                        result += 0;
                    }
                }
            }
        }
        return result;
    }
    
    MapUtils.translateMap = function(rawData){
        var mapData = new Array(rawData.length);
        for (var i = 0; i < mapData.length; i++) {
            mapData[i] = new Array(rawData[0].length);
            for (var j = 0; j < rawData[0].length; j++) {
                mapData[i][j] = new MapData(floorCenter, rawData[i][j], i, j);
            }
        }
        
        // deal with tile IDs
        var north, south, east, west;
        for (var j = 0; j < rawData[0].length; j++) {
            for (var i = 0; i < rawData.length; i++) {
                if (rawData[i][j] == FLOOR) {
                    // deal with shadow
                    if (i-1 >= 0 && j-1 >= 0 && rawData[i][j] == FLOOR && rawData[i-1][j] != FLOOR && rawData[i-1][j-1] != FLOOR) {
                        mapData[i][j].shadow = 5;
                    }
                    // skip the floor tunning
                    continue;
                } else if (rawData[i][j] == CEILING) {
                    // deal with ceiling
                    north = false, south = false, east = false, west = false;
                    // check east
                    if (i+1 < rawData.length && rawData[i+1][j] != CEILING) {
                        east = true;
                    }
                    // check west
                    if (i-1 >= 0 && rawData[i-1][j] != CEILING) {
                        west = true;
                    }
                    // check north
                    if (j-1 >= 0 && rawData[i][j-1] != CEILING) {
                        north = true;
                    }
                    // check south
                    if (j+1 < rawData.length && rawData[i][j+1] != CEILING) {
                        south = true;
                    }
                    
                    // now decide tile type
                    mapData[i][j].base = refineMapTile(east, west, south, north, ceilingCenter);
                } else if (rawData[i][j] == WALL) {
                    // deal with wall
                    east = false, west = false;
                    // check east
                    if (i+1 < rawData.length && rawData[i+1][j] != WALL) {
                        east = true;
                    }
                    // check west
                    if (i-1 >= 0 && rawData[i-1][j] != WALL) {
                        west = true;
                    }
                    
                    // now decide tile type
                    var result = wallCenter;
                    if (east) {
                        if (west) {
                            result += 5;
                        } else {
                            result += 4;
                        }
                    } else {
                        if (west) {
                            result += 1;
                        } else {
                            result += 0;
                        }
                    }
                    mapData[i][j].base = result;
                }
            }
        }
        
        return mapData;
    };
    
    MapUtils.drawMap = function(mapData, mapArray) {
        for (var i = 0; i < mapArray.length; i++) {
            mapArray[i] = 0;
        }
        
        // first time update visibility
        for (var j = 0; j < mapData[0].length; j++) {
            for (var i = 0; i < mapData.length; i++) {
                updateVisible($gamePlayer, viewDistance, i, j, mapData);
            }
        }
        
        var index = 0;
        var shadowOffset = mapData.length * mapData[0].length * 4;
        var warFogOffset = mapData.length * mapData[0].length;
        var stairOffset = mapData.length * mapData[0].length * 3;
        for (var j = 0; j < mapData[0].length; j++) {
            for (var i = 0; i < mapData.length; i++) {
                // second time update visibility
                updateVisible($gamePlayer, viewDistance, i, j, mapData);
                if (mapData[i][j].isVisible || mapData[i][j].isExplored) {
                    mapArray[index] = mapData[i][j].base;
                    mapArray[shadowOffset + index] = mapData[i][j].shadow;
                    mapData[i][j].isExplored = true;
                }
                if (!mapData[i][j].isVisible && mapData[i][j].isExplored) {
                    mapArray[warFogOffset + index] = warFogCenter;
                }
                if (mapData[i][j].isExplored) {
                    mapArray[stairOffset + index] = mapData[i][j].decorate2;
                }
                index++;
            }
        }
    }
    
    MapUtils.drawEvents = function(mapData) {
        for (var i = 0; i < $gameMap.events().length; i++) {
            var event = $gameMap.events()[i];
            if (mapData[event._x][event._y].isVisible) {
                event.setOpacity(500);
            } else {
                event.setOpacity(0);
            }
        }
    }
    
    MapUtils.transferCharacter = function(character) {
        // check if this stair already exists
        var stair = null;
        var mapVariable = $gameVariables[$gameMap.mapId()];
        for (var i = 0; i < mapVariable.stairList.length; i++) {
            var candidate = mapVariable.stairList[i];
            if (character._x == candidate.x && character._y == candidate.y) {
                stair = candidate;
                break;
            }
        }
        if (!stair) {
            console.log("MapUtils.transferCharacter ERROR: stair should be exist.");
            return;
        }
        
        stair.toMapId = (stair.type == 0) ? $gameMap.mapId() - 1 : $gameMap.mapId() + 1;
        if (character == $gamePlayer) {
            $gameVariables[0] = new TransferInfo(stair.toMapId, character._x, character._y);
            $gameScreen.startFadeOut(1);
            setTimeout('$gameScreen.startFadeIn(1);TimeUtils.afterPlayerMoved();', 400);
            if (stair.toX == -1) {
                // not assigned yet, go to default position
                $gamePlayer.setPosition(-10, -10);
                $gamePlayer.reserveTransfer(stair.toMapId, 0, 0, 0, 2);
            } else {
                $gamePlayer.locate(stair.toX, stair.toY);
                $gamePlayer.reserveTransfer(stair.toMapId, stair.toX, stair.toY, 0, 2);
            }
        }
    }
    
    var RNG = [
        [0, 1, 2, 3],
        [0, 1, 3, 2],
        [0, 2, 1, 3],
        [0, 2, 3, 1],
        [0, 3, 1, 2],
        [0, 3, 2, 1],
        [1, 0, 2, 3],
        [1, 0, 3, 2],
        [1, 2, 0, 3],
        [1, 2, 3, 0],
        [1, 3, 0, 2],
        [1, 3, 2, 0],
        [2, 0, 1, 3],
        [2, 0, 3, 1],
        [2, 1, 0, 3],
        [2, 1, 3, 0],
        [2, 3, 0, 1],
        [2, 3, 1, 0],
        [3, 0, 1, 2],
        [3, 0, 2, 1],
        [3, 1, 0, 2],
        [3, 1, 2, 0],
        [3, 2, 0, 1],
        [3, 2, 1, 0]
    ];

    function genMapToMap(genMap) {
        // initialize map
        var map = new Array(genMap.length * 2 + 1);
        for (var i = 0; i < genMap.length * 2 + 1; i++) {
            map[i] = new Array(genMap[0].length * 2 + 1);
        }
        
        // fill the map
        for (var i = 0; i < map.length; i++) {
            map[i][0] = CEILING;
        }
        for (var j = 0; j < map[0].length; j++) {
            map[0][j] = CEILING;
        }
        
        var index = 1;
        for (var i = 0; i < genMap.length; i++) {
            for (var j = 0; j < genMap[i].length; j++) {
                map[i * 2 + index][j * 2 + index] = FLOOR;
                map[i * 2 + 1 + index][j * 2 + 1 + index] = CEILING;
                // check if inside of room
                if (genMap[i][j].isRoom && !genMap[i][j].northWall && !genMap[i][j].eastWall) {
                    map[i * 2 + 1 + index][j * 2 + 1 + index] = FLOOR;
                }
                
                var north;
                if (genMap[i][j].northWall) {
                    north = CEILING;
                } else {
                    north = FLOOR;
                }
                map[i * 2 + index][j * 2 + 1 + index] = north;
                
                var east;
                if (genMap[i][j].eastWall) {
                    east = CEILING;
                } else {
                    east = FLOOR;
                }
                map[i * 2 + 1 + index][j * 2 + index] = east;
            }
        }
        return map;
    }

    function addWall(map) {
        var map2 = new Array(map.length);
        for (var i = 0; i < map.length; i++) {
            map2[i] = new Array(Math.floor(map[0].length * 1.5));
        }

        var index = 0;
        for (var j = 0; j < map[0].length; j++) {
            var needWall = false;
            for (var i = 0; i < map.length; i++) {
                map2[i][j+index] = map[i][j];
                if (j+1 < map[0].length && map[i][j+1] == FLOOR && map[i][j] == CEILING) {
                    needWall = true;
                    map2[i][j+index+1] = WALL;
                } else {
                    map2[i][j+index+1] = map[i][j];
                }
            }
            if (needWall) {
                index++;
            }
        }
        return map2;
    }

    // map data structure definition
    function Cell(x, y) {
        this.x = x;
        this.y = y;
        this.northWall = true;
        this.eastWall = true;
        this.done = false;
        // room indicator
        this.isRoom = false;
        // region indicator
        this.regionId = 0;
    }
    
    function BaseRoom(startX, startY, width, height) {
        this.start = new Coordinate(startX, startY);
        this.width = width;
        this.height = height;
        // center coordinate for distance calculation
        this.center = new Coordinate(Math.round((2*startX+width)/2), Math.round((2*startY+height)/2));
    }
    
    function ExitCandidate(cell, direction) {
        this.cell = cell;
        this.direction = direction;
    }
    
    function fillMaze(map, startX, startY, regionId) {
        // generate map
        var queue = [];
        var x = startX, y = startY;
        var xNext, yNext;
        queue.push(map[x][y]);
        while (queue.length > 0) {
            map[x][y].done = true;
            map[x][y].regionId = regionId;
            xNext = x, yNext = y;
            var direction = RNG[getRandomInt(24)];
            var moved = false;
            for (var i = 0; i < direction.length; i++) {
                switch (direction[i]) {
                    case 0: // east
                        if (x+1 < map.length && !map[x+1][y].done) {
                            map[x][y].eastWall = false;
                            xNext++;
                        }
                        break;
                    case 1: // north
                        if (y+1 < map[0].length && !map[x][y+1].done) {
                            map[x][y].northWall = false;
                            yNext++;
                        }
                        break;
                    case 2: // west
                        if (x-1 >= 0 && !map[x-1][y].done) {
                            map[x-1][y].eastWall = false;
                            xNext--;
                        }
                        break;
                    case 3: // south
                        if (y-1 >= 0 && !map[x][y-1].done) {
                            map[x][y-1].northWall = false;
                            yNext--;
                        }
                        break;
                }
                // if moved
                if (x != xNext || y != yNext) {
                    x = xNext, y = yNext;
                    queue.push(map[x][y]);
                    moved = true;
                    break;
                } 
            }
            if (!moved) { // no way to go
                var nextCell = queue.shift();
                x = nextCell.x, y = nextCell.y;
            }
        }
    }
    
    function initMaze(width, height) {
        // initialize
        var map = new Array(width);
        for (var i = 0; i < width; i++) {
            map[i] = new Array(height);
            for (var j = 0; j < height; j++) {
                map[i][j] = new Cell(i, j);
            }
        }
        return map;
    }

    genMapFullMaze = function(width, height) {
        var map = initMaze(width, height);
        fillMaze(map, 0, 0, 0);
        return map;
    }
    
    function fillRoomSetup(map, newRoom) {
        for (var j = newRoom.start.y; j < newRoom.start.y + newRoom.height; j++) {
            for (var i = newRoom.start.x; i < newRoom.start.x + newRoom.width; i++) {
                if (j+1 < newRoom.start.y + newRoom.height) {
                    // not y-axis border
                    map[i][j].northWall = false;
                }
                if (i+1 < newRoom.start.x + newRoom.width) {
                    // not x-axis border
                    map[i][j].eastWall = false;
                }
                map[i][j].isRoom = true;
                map[i][j].done = true;
            }
        }
    }
    
    function createRooms(map) {
        var width = map.length;
        var height = map[0].length;
    
        // generate rooms (randomly)
        var rooms = [];
        var retryCount = 0;
        while (rooms.length < roomNum && retryCount < 10) {
            var roomWidth = getRandomIntRange(2, Math.round(width / 3));
            var minRoomHeight = Math.round(minRoomSize / roomWidth);
            var maxRoomHeight = Math.round(maxRoomSize / roomWidth);
            if (minRoomHeight < height && maxRoomHeight < height && maxRoomHeight >= minRoomHeight && maxRoomHeight >= 2) {
                if (minRoomHeight == 1) {
                    minRoomHeight++;
                }
                var roomHeight = getRandomIntRange(minRoomHeight, maxRoomHeight);
                
                // decide starting point
                var startX, startY;
                var findPlaceRetryCount = 0, newRoom = null;
                while (!newRoom && findPlaceRetryCount < 10) {
                    startX = getRandomInt(width - roomWidth);
                    startY = getRandomInt(height - roomHeight);
                    // check if room location conflicts
                    var conflict = false;
                    for (var i = 0; i < rooms.length; i++) {
                        if (!(rooms[i].start.x > startX + roomWidth || rooms[i].start.x + rooms[i].width < startX) &&
                            !(rooms[i].start.y > startY + roomHeight || rooms[i].start.Y + rooms[i].height < startY)) {
                                conflict = true;
                                break;
                        }
                    }
                    if (conflict) {
                        findPlaceRetryCount++;
                    } else {
                        newRoom = new BaseRoom(startX, startY, roomWidth, roomHeight);
                        findPlaceRetryCount = 0;
                    }
                }
                if (newRoom) {
                    rooms.push(newRoom);
                    retryCount = 0;
                } else {
                    retryCount++;
                }
            }
        }
        
        // fill room setup
        for (var i = 0; i < rooms.length; i++) {
            fillRoomSetup(map, rooms[i]);
        }
        
        // generate rooms (from empty space lefts)
        while (rooms.length < roomNum) {
            // find largest empty space
            // initialize an 0 room size
            var candidateArea = null;
            for (var j = 0; j < map[0].length; j++) {
                for (var i = 0; i < map.length; i++) {
                    if (map[i][j].done) {
                        continue;
                    }
                    var startX = i, startY = j;
                    var toX = i, toY = j;
                    // check x-axis available range
                    for (var k = startX; k < map.length; k++) {
                        if (map[k][startY].done) {
                            break;
                        }
                        toX++;
                    }
                    // check y-axis available range
                    toY = map[0].length;
                    for (var l = startY; l < map[0].length; l++) {
                        for (var k = startX; k < toX; k++) {
                            if (map[k][l].done) {
                                toY = (toY > l) ? l : toY;
                                break;
                            }
                        }
                    }
                    // room edge length must > 1
                    if (toX - startX > 1 && toY - startY > 1) {
                        // check area size
                        var size = (toX - startX) * (toY - startY);
                        if (size >= minRoomSize) {
                            if (!candidateArea || size > candidateArea.width * candidateArea.height) {
                                candidateArea = new BaseRoom(startX, startY, toX - startX, toY - startY);
                            }
                        }
                    }
                }
            }
            if (!candidateArea) {
                // unable to find more empty space meet the requirement
                break;
            }
            
            // generate a suitable room from candidateArea
            var newRoom = null;
            while (!newRoom) {
                var roomWidth = getRandomIntRange(2, candidateArea.width);
                var roomHeight = getRandomIntRange(2, candidateArea.height);
                if (roomWidth * roomHeight >= minRoomSize && roomWidth * roomHeight <= maxRoomSize) {
                    // randomize start position
                    var xOffset = getRandomInt(candidateArea.width - candidateArea.start.x);
                    var yOffset = getRandomInt(candidateArea.height - candidateArea.start.y);
                    newRoom = new BaseRoom(candidateArea.start.x + xOffset, candidateArea.start.y + yOffset, roomWidth, roomHeight);
                }
            }
            rooms.push(newRoom);
            fillRoomSetup(map, newRoom);
        }
        return rooms;
    }
    
    genMapRoomsFullMaze = function(width, height) {
        var map = initMaze(width, height);
        var rooms = createRooms(map);
        
        // fill the rest with maze
        var regionId = 0;
        for (var j = 0; j < map[0].length; j++) {
            for (var i = 0; i < map.length; i++) {
                if (!map[i][j].done) {
                    fillMaze(map, i, j, regionId);
                    regionId++;
                }
            }
        }
        
        // add exists to each room, connect all isolated regions
        var maxRegions = 20;
        for (var i = 0; i < rooms.length; i++) {
            var regions = new Array(maxRegions);
            for (var j = 0; j < regions.length; j++) {
                regions[j] = [];
            }
            // search edge of the room, divided by regionId
            var room = rooms[i];
            // handle with x-axis direction
            for (var j = room.start.x; j < room.start.x + room.width; j++) {
                if (room.start.y - 1 >= 0 && !map[j][room.start.y-1].isRoom) {
                    regions[map[j][room.start.y-1].regionId].push(new ExitCandidate(map[j][room.start.y], "SOUTH"));
                }
                if (room.start.y + room.height < map[0].length && !map[j][room.start.y+room.height].isRoom) {
                    regions[map[j][room.start.y+room.height].regionId].push(new ExitCandidate(map[j][room.start.y+room.height-1], "NORTH"));
                }
            }
            // handle with y-axis direction
            for (var j = room.start.y; j < room.start.y + room.height; j++) {
                if (room.start.x - 1 >= 0 && !map[room.start.x-1][j].isRoom) {
                    regions[map[room.start.x-1][j].regionId].push(new ExitCandidate(map[room.start.x][j], "WEST"));
                }
                if (room.start.x + room.width < map.length && !map[room.start.x+room.width][j].isRoom) {
                    regions[map[room.start.x+room.width][j].regionId].push(new ExitCandidate(map[room.start.x+room.width-1][j], "EAST"));
                }
            }
            
            // now generate exits for each region
            var totalExits = 0;
            for (var j = 0; j < regions.length; j++) {
                if (regions[j].length == 0) {
                    continue;
                }
                var thisRegion = regions[j];
                var exit = thisRegion[getRandomInt(thisRegion.length)];
                // create exit
                switch (exit.direction) {
                    case "SOUTH":
                        map[exit.cell.x][exit.cell.y-1].northWall = false;
                        break;
                    case "NORTH":
                        exit.cell.northWall = false;
                        exit.cell.isRoom = false;
                        break;
                    case "WEST":
                        map[exit.cell.x-1][exit.cell.y].eastWall = false;
                        break;
                    case "EAST":
                        exit.cell.eastWall = false;
                        exit.cell.isRoom = false;
                        break;
                }
                totalExits++;
            }
            if (totalExits == 0) {
                // surrounded by rooms, create 1 exit
                var done = false;
                while (!done) {
                    switch (getRandomInt(4)) {
                        case 0: // north
                            if (room.start.y + room.height == map[0].length) {
                                continue;
                            }
                            var x = getRandomIntRange(room.start.x, room.start.x + room.width);
                            var y = room.start.y + room.height - 1;
                            map[x][y].northWall = false;
                            map[x][y].isRoom = false;
                            done = true;
                            break;
                        case 1: // south
                            if (room.start.y == 0) {
                                continue;
                            }
                            var x = getRandomIntRange(room.start.x, room.start.x + room.width);
                            var y = room.start.y - 1;
                            map[x][y].northWall = false;
                            map[x][y].isRoom = false;
                            done = true;
                            break;
                        case 2: // east
                            if (room.start.x + room.width == map.length) {
                                continue;
                            }
                            var x = room.start.x + room.width - 1;
                            var y = getRandomIntRange(room.start.y, room.start.y + room.height);
                            map[x][y].eastWall = false;
                            map[x][y].isRoom = false;
                            done = true;
                            break;
                        case 3: // west
                            if (room.start.x == 0) {
                                continue;
                            }
                            var x = room.start.x - 1;
                            var y = getRandomIntRange(room.start.y, room.start.y + room.height);
                            map[x][y].eastWall = false;
                            map[x][y].isRoom = false;
                            done = true;
                            break;
                    }
                }
            }
        }
        return map;
    }
    
    function findShortestPossiblePath(map, path, targetRoom) {
        var found = false;
        var nowX = path[path.length - 1].x;
        var nowY = path[path.length - 1].y;
        while (!found) {
            
        }
        return found;
    }
    
    function findPathBetweenRooms(map, room1, room2) {
        var pathFound = false;
        var path = [];
        while (!pathFound) {
            var steps = RNG[getRandomInt(24)];
            for (var i = 0; i < steps.length; i++) {
                var x, y;
                switch (steps[i]) {
                    case 0: // east
                        x = room1.start.x + room1.width - 1;
                        y = getRandomIntRange(room1.start.y, room1.start.y + room1.height);
                        path.push(map[x][y]);
                        path.push(map[x+1][y]);
                }
            }
        }
    }
    
    MapUtils.getDistance = function(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }
    
    genMapRoomsRoguelike = function(width, height) {
        var map = initMaze(width, height);
        var rooms = createRooms(map);
        
        var connectedRooms = [];
        // start to connect all rooms
        while (rooms.length > 0) {
            var roomNow = rooms[getRandomInt(rooms.length)];
            var candidate = null;
            var shortest = 1000;
            for (var i = 0; i < rooms.length; i++) {
                if (rooms[i] == roomNow) {
                    continue;
                }
                // calculate the distance between each rooms, choose the shortest one
                var distance = Math.sqrt(Math.pow(roomNow.center.x - rooms[i].center.x, 2) + Math.pow(roomNow.center.y - rooms[i].center.y, 2));
                if (distance < shortest) {
                    distance = shortest;
                    candidate = rooms[i];
                }
            }
            
        }
        return map;
    }
    
    MapUtils.generateMapData = function(genMapFunction, width, height) {
        var mapRaw = genMapFunction(width, height);
        var mapPixel = genMapToMap(mapRaw);
        //return mapPixel;
        return addWall(mapPixel);
    }
    
    MapUtils.getNearbyCoordinate = function(x, y, index) {
        var result = new Coordinate(x, y);
        switch (index) { // check path clock-wise
            case 0: // east
                result.x++;
                break;
            case 1: // east-south
                result.x++;
                result.y--;
                break;
            case 2: // south
                result.y--;
                break;
            case 3: // west-south
                result.x--;
                result.y--;
                break;
            case 4: // west
                result.x--;
                break;
            case 5: // west-north
                result.x--;
                result.y++;
                break;
            case 6: // north
                result.y++;
                break;
            case 7: // east-north
                result.x++;
                result.y++;
                break;
        }
        return result;
    }
    
    // find route between two events (not very useful...put away by now)
    MapUtils.findShortestRoute = function(x1, y1, x2, y2) {
        var mapData = $gameVariables[$gameMap.mapId()].mapData;
        var path = [], explored = [];
        if (mapData[x1][y1].originalTile != FLOOR || mapData[x2][y2].originalTile != FLOOR) {
            console.log("MapUtils.findShortestRoute() error: point not on FLOOR.");
            return null;
        }
        var hasPath = true, dstReached = false;
        var curX = x1, curY = y1;
        var nextX, nextY;
        // first add src point being explored
        explored.push(mapData[x1][y1]);
        while (hasPath && !dstReached) {
            hasPath = false;
            for (var i = 0; i < 8; i++) {
                nextX = curX, nextY = curY;
                var nextCoordinate = getNearbyCoordinate(curX, curY, i);
                nextX = nextCoordinate.x;
                nextY = nextCoordinate.y;
                if (mapData[nextX][nextY].originalTile == FLOOR 
                    && !explored.includes(mapData[nextX][nextY])
                    && !path.includes(mapData[nextX][nextY])) {
                    hasPath = true;
                    // check if destination reached
                    if (nextX == x2 && nextY == y2) {
                        dstReached = true;
                    } else {
                        //console.log("node pushed. x: %d, y: %d", nextX, nextY);
                        path.push(mapData[nextX][nextY]);
                        explored.push(mapData[nextX][nextY]);
                        curX = nextX;
                        curY = nextY;
                    }
                    break;
                }
            }
            if (!hasPath) {
                // dead end, try to go back and try another node from the current path
                path.pop();
                if (path.length > 0) {
                    var lastNode = path[path.length - 1];
                    curX = lastNode.x;
                    curY = lastNode.y;
                    hasPath = true;
                }
            }
        }
        console.log("original path length: %d", path.length);
        for (var i = 0; i < path.length; i++) {
            console.log("x: %d, y: %d", path[i].x, path[i].y);
        }
        // refine the path
        var index = 0;
        while (index < path.length) {
            for (var i = path.length - 1; i > index; i--) {
                if (MapUtils.isNearBy(path[index].x, path[index].y, path[i].x, path[i].y)
                    && i - index > 1) {
                    // redundant path between path[index] & path[i]
                    path.splice(index + 1, i - index - 1);
                    break;
                }
            }
            index++;
        }
        console.log("refined path length: %d", path.length);
        for (var i = 0; i < path.length; i++) {
            console.log("x: %d, y: %d", path[i].x, path[i].y);
        }
        return path;
    }
    
    MapUtils.isNearBy = function(x1, y1, x2, y2) {
        if (Math.abs(x1 - x2) < 2 && Math.abs(y1 - y2) < 2) {
            return true;
        }
        return false;
    }
    
    MapUtils.setupNewMap = function(mapId) {
        // first load map
        console.log("first load map: " + mapId);
        var rawMap = MapUtils.generateMapData(genMapRoomsFullMaze, 15, 10);
        var newMapData = MapUtils.translateMap(rawMap);
        $dataMap.width = rawMap.length;
        $dataMap.height = rawMap[0].length;
        $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
        $gameVariables[mapId].mapData = newMapData;
        $gameVariables[mapId].rmDataMap = $dataMap;
    }
    
    //-----------------------------------------------------------------------------------
    // DataManager
    //
    // override map loading mechanism
    DataManager.onLoad = function(object) {
        var array;
        if (object === $dataMap) {
            if ($gameMap.mapId() > 0) {
                var targetMapId = ($gameVariables[0]) ? $gameVariables[0].toMapId : $gameMap.mapId();
                if ($gameVariables[targetMapId].generateRandom) {
                    if (!$gameVariables[targetMapId].mapData) {
                        // first time assign data
                        MapUtils.setupNewMap(targetMapId);
                        // connect upper stairs
                        
                        // collect all FLOOR tiles
                        var mapVariable = $gameVariables[$gameMap.mapId()];
                        var targetMapData = $gameVariables[targetMapId].mapData;
                        var floors = [];
                        for (var j = 0; j < targetMapData[0].length; j++) {
                            for (var i = 0; i < targetMapData.length; i++) {
                                if (targetMapData[i][j].originalTile == FLOOR) {
                                    floors.push(targetMapData[i][j]);
                                }
                            }
                        }
                        for (var i = 0; i < mapVariable.stairList.length; i++) {
                            var toConnect = mapVariable.stairList[i];
                            if (toConnect.type != 1) {
                                // only deal with stairs going down
                                continue;
                            }
                            var positionFound = false;
                            var toX, toY;
                            while (!positionFound) {
                                positionFound = true;
                                var candidate = floors[getRandomInt(floors.length)];
                                for (var j = 0; j < $gameVariables[targetMapId].stairList.length; j++) {
                                    var toCheck = $gameVariables[targetMapId].stairList[j];
                                    if (candidate.x == toCheck.x && candidate.y == toCheck.y) {
                                        positionFound = false;
                                        break;
                                    }
                                }
                                if (positionFound) {
                                    var newStair = new StairData();
                                    newStair.type = (toConnect.type == 0) ? 1 : 0;
                                    newStair.x = candidate.x;
                                    newStair.y = candidate.y;
                                    newStair.toMapId = $gameMap.mapId();
                                    newStair.toX = toConnect.x;
                                    newStair.toY = toConnect.y;
                                    $gameVariables[targetMapId].stairList.push(newStair);
                                    targetMapData[newStair.x][newStair.y].decorate2 = (newStair.type == 0) ? upStair : downStair;
                                    
                                    toConnect.toMapId = targetMapId;
                                    toConnect.toX = newStair.x;
                                    toConnect.toY = newStair.y;
                                }
                            }
                        }
                        var nowStair = null;
                        for (var i = 0; i < $gameVariables[$gameMap.mapId()].stairList.length; i++) {
                            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
                            if (candidate.x == $gameVariables[0].nowX && candidate.y == $gameVariables[0].nowY) {
                                nowStair = candidate;
                                break;
                            }
                        }
                        $gamePlayer.reserveTransfer(targetMapId, nowStair.toX, nowStair.toY, 0, 2);
                        setTimeout('SceneManager.goto(Scene_Map);', 200);
                    } else if ($gameVariables[targetMapId].mapData) {
                        // assign map data here
                        console.log("assign map data.");
                        $dataMap = $gameVariables[targetMapId].rmDataMap;
                        MapUtils.drawMap($gameVariables[targetMapId].mapData, $dataMap.data);
                        setTimeout('MapUtils.drawEvents($gameVariables[$gameMap.mapId()].mapData)', 200);
                    }
                }
            }
            this.extractMetadata(object);
            array = object.events;
        } else {
            array = object;
        }
        if (Array.isArray(array)) {
            for (var i = 0; i < array.length; i++) {
                var data = array[i];
                if (data && data.note !== undefined) {
                    this.extractMetadata(data);
                }
            }
        }
        if (object === $dataSystem) {
            Decrypter.hasEncryptedImages = !!object.hasEncryptedImages;
            Decrypter.hasEncryptedAudio = !!object.hasEncryptedAudio;
            Scene_Boot.loadSystemImages();
        }
    };
    
    //-----------------------------------------------------------------------------------
    // Game_Player
    //
    // handle map change when player moved
    Game_Player.prototype.moveStraight = function(d) {
        var moved = false;
        if (this.canPass(this.x, this.y, d)) {
            this._followers.updateMove();
            moved = true;
        }
        Game_Character.prototype.moveStraight.call(this, d);
        if (moved) {
            TimeUtils.afterPlayerMoved();
        }
    };

    Game_Player.prototype.moveDiagonally = function(horz, vert) {
        var moved = false;
        if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
            this._followers.updateMove();
            moved = true;
        }
        Game_Character.prototype.moveDiagonally.call(this, horz, vert);
        if (moved) {
            TimeUtils.afterPlayerMoved();
        }
    };
    
    //-----------------------------------------------------------------------------------
    // Game_CharacterBase
    // 
    // Modify moveDiagonally(), so it can trigger diagonal events
    Game_CharacterBase.prototype.moveDiagonally = function(horz, vert) {
        this.setMovementSuccess(this.canPassDiagonally(this._x, this._y, horz, vert));
        var moved = false;
        if (this.isMovementSucceeded()) {
            this._x = $gameMap.roundXWithDirection(this._x, horz);
            this._y = $gameMap.roundYWithDirection(this._y, vert);
            this._realX = $gameMap.xWithDirection(this._x, this.reverseDir(horz));
            this._realY = $gameMap.yWithDirection(this._y, this.reverseDir(vert));
            this.increaseSteps();
            moved = true;
        }
        if (this._direction === this.reverseDir(horz)) {
            this.setDirection(horz);
        }
        if (this._direction === this.reverseDir(vert)) {
            this.setDirection(vert);
        }
        // check diagonal event
        if (!moved) {
            this.checkEventTriggerTouchDiagonal(horz, vert);
        }
    };
    
    // add check function for diagonal events
    Game_CharacterBase.prototype.checkEventTriggerTouchDiagonal = function(horz, vert) {
        var x2 = $gameMap.roundXWithDirection(this._x, horz);
        var y2 = $gameMap.roundYWithDirection(this._y, vert);
        this.checkEventTriggerTouch(x2, y2);
    };
    
    // modify canPassDiagonally(), so character can move as long as target tile is empty
    Game_CharacterBase.prototype.canPassDiagonally = function(x, y, horz, vert) {
        var x2 = $gameMap.roundXWithDirection(x, horz);
        var y2 = $gameMap.roundYWithDirection(y, vert);
        if ($gameVariables[$gameMap.mapId()].mapData) { // map generated
            var mapData = $gameVariables[$gameMap.mapId()].mapData;
            if (mapData[x][y].originalTile == mapData[x2][y2].originalTile) {
                // check if there's event on target tile which priority is as same as player
                var canPass = true;
                for (var i = 0; i < $gameMap.events().length; i++) {
                    var toCheck = $gameMap.events()[i];
                    if (!toCheck._erased && toCheck._x == x2 && toCheck._y == y2 && toCheck._priorityType == 1) {
                        canPass = false;
                        break;
                    }
                }
                return canPass;
            }
        } else { // original logic
            if (this.canPass(x, y, vert) && this.canPass(x, y2, horz)) {
                return true;
            }
            if (this.canPass(x, y, horz) && this.canPass(x2, y, vert)) {
                return true;
            }
        }
        return false;
    };
    
    //-----------------------------------------------------------------------------------
    // Game_Map
    // 
    // Modify isPassable() to fit map design
    Game_Map.prototype.isPassable = function(x, y, d) {
        // check if this map is generated
        if ($gameVariables[$gameMap.mapId()].generateRandom) {
            // check original map tile if can pass
            switch (d) {
                case 2: // down
                    y++;
                    break;
                case 4: // left
                    x--;
                    break;
                case 6: // right
                    x++;
                    break;
                case 8: // up
                    y--;
                    break;
            }
            if ($gameVariables[$gameMap.mapId()].mapData[x][y].originalTile != FLOOR) {
                return false;
            }
            return true;
        } else {
            // use original logic
            return this.checkPassage(x, y, (1 << (d / 2 - 1)) & 0x0f);
        }
    }
    
    // try to modify setupEvents, so we can create different type events
    Game_Map.prototype.setupEvents = function() {
        this._events = [];
        for (var i = 0; i < $dataMap.events.length; i++) {
            if ($dataMap.events[i]) {
                if ($dataMap.events[i].type == 'MOB') {
                    this._events[i] = new Game_Mob($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i]);
                } else {
                    this._events[i] = new Game_Event(this._mapId, i);
                }
            }
        }
        this._commonEvents = this.parallelCommonEvents().map(function(commonEvent) {
            return new Game_CommonEvent(commonEvent.id);
        });
        this.refreshTileEvents();
    };
    
    //-----------------------------------------------------------------------------------
    // Game_Mob
    //
    // The game object class for a mob (aggressive/passive), define mob status in
    // it. (HP/MP/attribute, etc)
    
    function cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    newDataMapEvent = function(fromObj, id, x, y) {
        var newObj = cloneObject(fromObj);
        newObj.id = id;
        newObj.x = x;
        newObj.y = y;
        return newObj;
    }

    Game_Mob = function() {
        this.initialize.apply(this, arguments);
    }

    Game_Mob.prototype = Object.create(Game_Event.prototype);
    Game_Mob.prototype.constructor = Game_Mob;
    
    Game_Mob.prototype.fromEvent = function(src, target) {
        target._hp = src._hp;
        target.awareDistance = src.awareDistance;
        target.type = src.type;
        target.x = src.x;
        target.y = src.y;
    }
    
    Game_Mob.prototype.initStatus = function(event) {
        // NOTE: attribute name must be the same as Game_Actor
        event._hp = 100;
        event.awareDistance = 8;
        event.type = 'MOB';
    }
    
    Game_Mob.prototype.updateDataMap = function() {
        for (var i = 0; i < $gameMap._events.length; i++) {
            if ($gameMap._events[i] == this) {
                Game_Mob.prototype.fromEvent(this, $dataMap.events[i]);
                break;
            }
        }
    }

    Game_Mob.prototype.initialize = function(x, y, fromData) {
        var eventId = -1;
        if (fromData) {
            for (var i = 1; i < $dataMap.events.length; i++) {
                if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
                    eventId = i;
                    Game_Mob.prototype.fromEvent($dataMap.events[i], this);
                    break;
                }
            }
        } else {
            // find empty space for new event
            var emptyFound = false;
            for (var i = 1; i < $dataMap.events.length; i++) {
                if (!$dataMap.events[i]) {
                    // found empty space to place new event
                    emptyFound = true;
                    eventId = i;
                    $dataMap.events[i] = newDataMapEvent($dataMap.events[1], eventId, x, y);
                    Game_Mob.prototype.initStatus($dataMap.events[i]);
                    break;
                }
            }
            if (!emptyFound) {
                // add new event at the bottom of list
                eventId = $dataMap.events.length;
                $dataMap.events.push(newDataMapEvent($dataMap.events[1], eventId, x, y));
                Game_Mob.prototype.initStatus($dataMap.events[$dataMap.events.length-1]);
            }
            Game_Mob.prototype.initStatus(this);
        }
        // store new events back to map variable
        $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
        Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
        $gameMap._events[eventId] = this;
    };
    
    Game_Mob.prototype.action = function() {
        // check if player is nearby
        if (Math.abs(this._x - $gamePlayer._x) < 2 && Math.abs(this._y - $gamePlayer._y) < 2) {
            this.turnTowardCharacter($gamePlayer);
            BattleUtils.meleeAttack(this, $gamePlayer);
        } else if (MapUtils.getDistance(this._x, this._y, $gamePlayer._x, $gamePlayer._y) < this.awareDistance) {
            this.moveTowardCharacter($gamePlayer);
        } else {
            this.moveRandom();
        }
        
        // store data back to $dataMap
        this.updateDataMap();
    }
    
    // Override moveTowardCharacter() function so mobs can move diagonally
    Game_Mob.prototype.moveTowardCharacter = function(character) {
        var mapData = $gameVariables[$gameMap.mapId()].mapData;
        var candidate = [], distanceRecord = [];
        var nowDistance = MapUtils.getDistance(this._x, this._y, character._x, character._y);
        for (var i = 0; i < 8; i++) {
            var coordinate = MapUtils.getNearbyCoordinate(this._x, this._y, i);
            if (mapData[coordinate.x][coordinate.y].originalTile != FLOOR) {
                continue;
            }
            var distance = MapUtils.getDistance(coordinate.x, coordinate.y, character._x, character._y);
            if (distance < nowDistance) {
                if (candidate.length == 0) {
                    candidate.push(coordinate);
                    distanceRecord.push(distance);
                } else {
                    var added = false;
                    for (var i = 0; i < candidate.length; i++) {
                        if (distance < distanceRecord[i]) {
                            candidate.splice(i, 0, coordinate);
                            distanceRecord.splice(i, 0, distance);
                            added = true;
                            break;
                        }
                    }
                    if (!added) {
                        candidate.push(coordinate);
                        distanceRecord.push(distance);
                    }
                }
            }
        }
        for (var i = 0; i < candidate.length; i++) {
            var horz = 0, vert = 0;
            var sx = this.deltaXFrom(candidate[i].x);
            var sy = this.deltaYFrom(candidate[i].y);
            if (sx > 0) {
                horz = 4;
            } else if (sx < 0) {
                horz = 6;
            }
            if (sy > 0) {
                vert = 8;
            } else if (sy < 0) {
                vert = 2;
            }
            if (sx == 0 || sy == 0) {
                this.moveStraight((sx == 0) ? vert : horz);
            } else {
                this.moveDiagonally(horz, vert);
            }
            if (this.isMovementSucceeded()) {
                break;
            }
        }
        return this.isMovementSucceeded();
    }
    
    // Override moveRandom() function so mobs can move diagonally
    Game_Mob.prototype.moveRandom = function() {
        var moveType = Math.randomInt(2);
        if (moveType == 0) { // straight
            Game_Event.prototype.moveRandom.call(this);
        } else { // diagonal
            var horz = 4 + Math.randomInt(2) * 2;
            var vert = 2 + Math.randomInt(2) * 6;
            if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
                this.moveDiagonally(horz, vert);
            }
        }
    }
    
    //-----------------------------------------------------------------------------------
    // Input
    //
    // try to add key defined by Input class
    // NOTE: find keyCode using Input._onKeyDown() in rpg_core.js
    Input.keyMapper[190] = '.'; // keyCode for '.'
    Input.keyMapper[12] = 'Numpad5'; // same function as '.'
    Input.keyMapper[101] = 'Numpad5';
    Input.keyMapper[36] = 'Numpad7'; // player move left-up (notebook fn+key)
    Input.keyMapper[103] = 'Numpad7'; // (pc keyboard)
    Input.keyMapper[33] = 'Numpad9'; // player move right-up
    Input.keyMapper[105] = 'Numpad9';
    Input.keyMapper[35] = 'Numpad1'; // player move left-down
    Input.keyMapper[97] = 'Numpad1';
    Input.keyMapper[34] = 'Numpad3'; // player move right-down
    Input.keyMapper[99] = 'Numpad3';
    
    // modify _signX & signY, so arrow key triggered only once when pressed.
    Input._signX = function() {
        var x = 0;

        if (this.isTriggered('left')) {
            x--;
        }
        if (this.isTriggered('right')) {
            x++;
        }
        return x;
    };

    Input._signY = function() {
        var y = 0;

        if (this.isTriggered('up')) {
            y--;
        }
        if (this.isTriggered('down')) {
            y++;
        }
        return y;
    };
    
    // override this function for user-defined key detected (only on Scene_Map)
    Input._onKeyDown = function(event) {
        if (SceneManager._scene instanceof Scene_Map) {
            switch (event.key) {
                case '>': // try to go down
                    var stair = null;
                    for (var i in $gameVariables[$gameMap.mapId()].stairList) {
                        var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
                        if (candidate.x == $gamePlayer._x && candidate.y == $gamePlayer._y && candidate.type == 1) {
                            stair = candidate;
                            break;
                        }
                    }
                    if (stair) {
                        MapUtils.transferCharacter($gamePlayer);
                    } else {
                        $gameMessage.add("這裡沒有往下的樓梯.");
                    }
                    break;
                case '<': // try to go up
                    var stair = null;
                    for (var i in $gameVariables[$gameMap.mapId()].stairList) {
                        var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
                        if (candidate.x == $gamePlayer._x && candidate.y == $gamePlayer._y && candidate.type == 0) {
                            stair = candidate;
                            break;
                        }
                    }
                    if (stair) {
                        MapUtils.transferCharacter($gamePlayer);
                    } else {
                        $gameMessage.add("這裡沒有往上的樓梯.");
                    }
                    break;
            }
        }
        if (this._shouldPreventDefault(event.keyCode)) {
            event.preventDefault();
        }
        if (event.keyCode === 144) {    // Numlock
            this.clear();
        }
        var buttonName = this.keyMapper[event.keyCode];
        if (ResourceHandler.exists() && buttonName === 'ok') {
            ResourceHandler.retry();
        } else if (buttonName) {
            this._currentState[buttonName] = true;
        }
    };
    
    //-----------------------------------------------------------------------------------
    // InputUtils
    //
    // Deal with user-defined move actions
    
    InputUtils = function() {
        throw new Error('This is a static class');
    }
    
    InputUtils.checkKeyPressed = function() {
        if (Input.isTriggered('.') || Input.isTriggered('Numpad5')) {
            // player waits for 1 turn
            TimeUtils.afterPlayerMoved();
        } else if (Input.isTriggered('Numpad7')) {
            $gamePlayer.moveDiagonally(4, 8);
        } else if (Input.isTriggered('Numpad9')) {
            $gamePlayer.moveDiagonally(6, 8);
        } else if (Input.isTriggered('Numpad1')) {
            $gamePlayer.moveDiagonally(4, 2);
        } else if (Input.isTriggered('Numpad3')) {
            $gamePlayer.moveDiagonally(6, 2);
        }
    }
    
    //-----------------------------------------------------------------------------------
    // TimeUtils
    //
    // time system to update the whole world
    TimeUtils = function() {
        throw new Error('This is a static class');
    }
    
    TimeUtils.afterPlayerMoved = function() {
        //console.log("1 turn passed.");
        // update all mobs & items
        for (var i = 0; i < $gameMap._events.length; i++) {
            if ($gameActors._data[1]._hp <= 0) {
                // player died, stop mob action
                break;
            }
            var event = $gameMap._events[i];
            if (!event || event._erased) {
                continue;
            }
            if (event instanceof Game_Mob) {
                event.action();
            }
        }
        if ($gameVariables[$gameMap.mapId()].generateRandom) {
            // only update maps in random layer
            MapUtils.drawMap($gameVariables[$gameMap.mapId()].mapData, $dataMap.data);
            MapUtils.drawEvents($gameVariables[$gameMap.mapId()].mapData);
            //setTimeout('SceneManager.goto(Scene_Map)', 250);
            // try to use the following code, which make screen update not lag so much
            var scene = SceneManager._scene;
            scene.removeChild(scene._fadeSprite);
            scene.removeChild(scene._mapNameWindow);
            scene.removeChild(scene._windowLayer);
            scene.removeChild(scene._spriteset);
            scene.createDisplayObjects();
            scene.setupStatus();
        }
    }
    
    //-----------------------------------------------------------------------------------
    // BattleUtils
    //
    // handles battle on map
    BattleUtils = function() {
        throw new Error('This is a static class');
    }
    
    BattleUtils.meleeAttack = function(src, target) {
        // TODO: need to implement attack damage formula
        var value = 10;
        var realTarget = (target == $gamePlayer) ? $gameActors._data[1] : target;
        $gameSystem.createPopup(0, "", "\\c[02]  -" + value, target);
        realTarget._hp -= value;
        // hit animation
        target.requestAnimation(16);
        if (realTarget._hp <= 0) {
            if (target == $gamePlayer) {
                // TODO: implement player dead mechanism
                $gameMessage.add("\\N[1]不幸被殭屍咬死了...");
                SceneManager.goto(Scene_Gameover);
            } else {
                // remove target event from $dataMap.events
                // NOTE: Do not remove it from $gameMap._events! will cause crash
                $gameMap.eraseEvent(target._eventId);
                //target._x = 0;
                //target._y = 0;
                $dataMap.events[target._eventId] = null;
            }
        }
        if (src == $gamePlayer) {
            TimeUtils.afterPlayerMoved();
        }
    }
})();