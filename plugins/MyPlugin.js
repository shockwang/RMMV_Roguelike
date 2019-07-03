// my plugin

(function() {
    MapData = function(floorId, original) {
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
    }
    
    MapVariable = function(mapData, rmDataMap) {
        this.mapData = mapData;
        this.rmDataMap = rmDataMap;
    }
    
    Coordinate = function(x, y) {
        this.x = x;
        this.y = y;
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
    
    // view parameters
    var viewDistance = 8;
    
    // room parameters
    var roomNum = 5, minRoomSize = 4, maxRoomSize = 9;
    
    // ----------end of map constants----------
    
    MapUtils = function() {
        throw new Error('This is a static class');
    };
    
    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    };
    
    function getRandomIntRange(min, max) {
        if (min == max) {
            return min;
        }
        return Math.floor(Math.random() * Math.floor(max - min)) + min;
    }
    
    // this function should be called twice
    function updateVisible(x, y, mapData) {
        var visible = false;
        if (Math.abs($gamePlayer._x - x) <= viewDistance && Math.abs($gamePlayer._y - y) <= viewDistance) {
            // around player, check visibility
            visible = true;
            if ($gamePlayer._x != x) {
                var path = [];
                var m = ($gamePlayer._y - y) / ($gamePlayer._x - x);
                var startX, endX, lastY;
                if ($gamePlayer._x - x > 0) {
                    startX = x;
                    endX = $gamePlayer._x;
                    lastY = y;
                } else {
                    startX = $gamePlayer._x;
                    endX = x;
                    lastY = $gamePlayer._y;
                }

                // start to check if vision blocked
                for (var i = startX+1; i <= endX; i++) {
                    var estimatedY = Math.round(m * (i - $gamePlayer._x) + $gamePlayer._y);
                    
                    // fill y-axis coordinates
                    if (Math.abs(lastY - estimatedY) > 1) {
                        var startY = (lastY - estimatedY > 0) ? estimatedY : lastY;
                        var endY = (lastY - estimatedY > 0) ? lastY : estimatedY;
                        for (var j = startY+1; j < endY; j++) {
                            var estimatedX = Math.round((j - $gamePlayer._y) / m + $gamePlayer._x);
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
                var start = ($gamePlayer._y - y > 0) ? y : $gamePlayer._y;
                var end = ($gamePlayer._y - y > 0) ? $gamePlayer._y : y;
                
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
                mapData[i][j] = new MapData(floorCenter, rawData[i][j]);
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
                updateVisible(i, j, mapData);
            }
        }
        
        var index = 0;
        var shadowOffset = mapData.length * mapData[0].length * 4;
        var warFogOffset = mapData.length * mapData[0].length;
        for (var j = 0; j < mapData[0].length; j++) {
            for (var i = 0; i < mapData.length; i++) {
                // second time update visibility
                updateVisible(i, j, mapData);
                if (mapData[i][j].isVisible || mapData[i][j].isExplored) {
                    mapArray[index] = mapData[i][j].base;
                    mapArray[shadowOffset + index] = mapData[i][j].shadow;
                    mapData[i][j].isExplored = true;
                }
                if (!mapData[i][j].isVisible && mapData[i][j].isExplored) {
                    mapArray[warFogOffset + index] = warFogCenter;
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
    
    // override map loading mechanism
    DataManager.isMapLoaded = function() {
        if ($gameMap && $gameMap.mapId() > 0) {
            if ($dataMap && !$gameVariables[$gameMap.mapId()]) {
                // first load map
                console.log("first load map: " + $gameMap.mapId());
                var rawMap = MapUtils.generateMapData(genMapRoomsFullMaze, 15, 10)
                var newMapData = MapUtils.translateMap(rawMap);
                $dataMap.width = rawMap.length;
                $dataMap.height = rawMap[0].length;
                $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
                MapUtils.drawMap(newMapData, $dataMap.data);
                MapUtils.drawEvents(newMapData);
                $gameVariables[$gameMap.mapId()] = new MapVariable(newMapData, $dataMap);
            } else if ($dataMap && $gameVariables[$gameMap.mapId()]) {
                // assign map data here
                console.log("assign map data.");
                $dataMap = $gameVariables[$gameMap.mapId()].rmDataMap;
                MapUtils.drawMap($gameVariables[$gameMap.mapId()].mapData, $dataMap.data);
                MapUtils.drawEvents($gameVariables[$gameMap.mapId()].mapData);
            }
        }
        this.checkError();
        return !!$dataMap;
    };
    
    // handle map change when player moved
    Game_Player.prototype.moveStraight = function(d) {
        var moved = false;
        if (this.canPass(this.x, this.y, d)) {
            this._followers.updateMove();
            moved = true;
        }
        Game_Character.prototype.moveStraight.call(this, d);
        if (moved) {
            MapUtils.drawMap($gameVariables[$gameMap.mapId()].mapData, $dataMap.data);
            MapUtils.drawEvents($gameVariables[$gameMap.mapId()].mapData);
            // add for steam RMMV project
            setTimeout('SceneManager.goto(Scene_Map)', 250);
        }
    };

    Game_Player.prototype.moveDiagonally = function(horz, vert) {
        if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
            this._followers.updateMove();
            // put operations here
        }
        Game_Character.prototype.moveDiagonally.call(this, horz, vert);
    };
    
    //-----------------------------------------------------------------------------
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
        this.hp = 10;
    }

    Game_Mob.prototype = Object.create(Game_Event.prototype);
    Game_Mob.prototype.constructor = Game_Mob;

    Game_Mob.prototype.initialize = function(x, y) {
        // find empty space for new event
        var emptyFound = false;
        var eventId;
        for (var i = 1; i < $dataMap.events.length; i++) {
            if (!$dataMap.events[i]) {
                // found empty space to place new event
                emptyFound = true;
                eventId = i;
                $dataMap.events[i] = newDataMapEvent($dataMap.events[1], eventId, x, y);
                break;
            }
        }
        if (!emptyFound) {
            // add new event at the bottom of list
            eventId = $dataMap.events.length;
            $dataMap.events.push(newDataMapEvent($dataMap.events[1], eventId, x, y));
        }
        // store new events back to map variable
        $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
        Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
        $gameMap._events[eventId] = this;
    };
    
    Game_Mob.prototype.takeDamage = function(value) {
        $gameSystem.createPopup(0, "", "\\c[02]  -" + value, this);
        this.hp -= value;
        // hit animation
        this.requestAnimation(16);
        if (this.hp <= 0) {
            // remove this event. 
            // NOTE: Do not remove it from $gameMap._events! will cause crash
            $gameMap.eraseEvent(this._eventId);
            $dataMap.events[this._eventId] = null;
        }
    }
})();